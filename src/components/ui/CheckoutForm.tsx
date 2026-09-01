import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const stripeAppearance: StripeElementsOptions['appearance'] = {
  theme: 'night',
  variables: {
    colorPrimary: '#F3B91C',
    colorBackground: '#18181b',
    colorText: '#fafafa',
    colorDanger: '#ef4444',
  },
};

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

function InnerForm({ totalAmount, onSuccess, onError }: { totalAmount: number; onSuccess: (id: string) => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const safeTotal = Number(totalAmount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/gracias`,
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message ?? 'Error al procesar la tarjeta.');
      }

      onSuccess(`stripe_${Date.now()}`);
    } catch (err: any) {
      const message = err?.message || 'Fallo en la transacción.';
      setErrorMsg(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={!stripe || isSubmitting}
        className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs bg-yellow-400 hover:bg-yellow-300 text-black flex items-center justify-center gap-3 transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Procesando pago...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> Pagar {safeTotal.toFixed(2)}€
          </span>
        )}
      </button>
    </form>
  );
}

export default function CheckoutForm({ totalAmount, onSuccess, onError }: { totalAmount: number; onSuccess: (id: string) => void; onError?: (msg: string) => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(true);

  useEffect(() => {
    const amountCents = Math.round((Number(totalAmount) || 0) * 100);
    
    supabase.functions
      .invoke('create-payment-intent', { body: { amount: amountCents, currency: 'eur' } })
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.clientSecret) setClientSecret(data.clientSecret);
        else throw new Error('Respuesta inválida de Stripe');
      })
      .catch((err) => {
        console.error('[Stripe] Error PaymentIntent:', err);
        onError?.('No se pudo inicializar la pasarela.');
      })
      .finally(() => setLoadingIntent(false));
  }, [totalAmount, onError]);

  if (loadingIntent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
        <span className="text-[10px] font-black uppercase text-zinc-500">Conectando pasarela de pago...</span>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements stripe={getStripePromise()} options={{ clientSecret, appearance: stripeAppearance, locale: 'es' }}>
      <InnerForm totalAmount={totalAmount} onSuccess={onSuccess} onError={onError || (() => {})} />
    </Elements>
  );
}