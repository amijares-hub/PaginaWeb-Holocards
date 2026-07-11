/**
 * CheckoutForm.tsx — Fase 21: Pasarela de Pagos Stripe
 *
 * Arquitectura:
 * - <Elements> provider con tema Dark Premium de HoloCards
 * - <PaymentElement /> → Tarjeta, Bizum, Apple/Google Pay (automático por dispositivo)
 * - Mock mode: cuando no hay clientSecret real, simula el flujo visualmente
 * - PayPal placeholder estilizado con diseño oficial amarillo
 */

import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────
// STRIPE APPEARANCE — Dark Premium HoloCards
// ─────────────────────────────────────────────
const stripeAppearance: StripeElementsOptions['appearance'] = {
  theme: 'night',
  variables: {
    colorPrimary: '#F3B91C',        // Amarillo HoloCards
    colorBackground: '#18181b',     // card dark
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorDanger: '#ef4444',
    colorSuccess: '#22c55e',
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSizeBase: '14px',
    borderRadius: '12px',
    spacingUnit: '4px',
    spacingGridColumn: '16px',
    spacingGridRow: '16px',
  },
  rules: {
    '.Input': {
      border: '1px solid #27272a',
      boxShadow: 'none',
      padding: '12px 16px',
      backgroundColor: '#09090b',
      transition: 'border-color 0.2s ease',
    },
    '.Input:focus': {
      border: '1px solid #F3B91C',
      boxShadow: '0 0 0 3px rgba(243, 185, 28, 0.08)',
      outline: 'none',
    },
    '.Input--invalid': {
      border: '1px solid #ef4444',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.08)',
    },
    '.Label': {
      fontSize: '10px',
      fontWeight: '800',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#a1a1aa',
      marginBottom: '6px',
    },
    '.Tab': {
      border: '1px solid #27272a',
      backgroundColor: '#09090b',
      borderRadius: '12px',
    },
    '.Tab:hover': {
      border: '1px solid #3f3f46',
      backgroundColor: '#18181b',
    },
    '.Tab--selected': {
      border: '1px solid #F3B91C',
      backgroundColor: '#18181b',
      boxShadow: '0 0 0 3px rgba(243, 185, 28, 0.08)',
    },
    '.TabIcon--selected': {
      fill: '#F3B91C',
    },
    '.TabLabel--selected': {
      color: '#F3B91C',
    },
    '.Block': {
      backgroundColor: '#18181b',
      borderRadius: '12px',
      border: '1px solid #27272a',
    },
    '.Error': {
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.05em',
    },
  },
};

// ─────────────────────────────────────────────
// INNER FORM — usa hooks de Stripe (debe estar dentro de <Elements>)
// ─────────────────────────────────────────────
interface InnerFormProps {
  totalAmount: number;
  isMockMode: boolean;
  stripe: any;
  elements: any;
  onSuccess: (orderId: string) => void;
  onError: (msg: string) => void;
}

function CheckoutFormUI({ totalAmount, isMockMode, stripe, elements, onSuccess, onError }: InnerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('processing');
    setErrorMsg(null);

    try {
      if (isMockMode) {
        // ── MOCK MODE: simulación visual de 2 segundos ──
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setSubmitStatus('success');
        // Genera un orderId de prueba
        const mockOrderId = `mock_${Date.now()}`;
        setTimeout(() => onSuccess(mockOrderId), 600);
        return;
      }

      // ── MODO REAL ──
      if (!stripe || !elements) {
        throw new Error('Stripe no está inicializado correctamente.');
      }
      
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dev-store/gracias`,
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message ?? 'Error desconocido al procesar el pago.');
      }

      setSubmitStatus('success');
      const mockOrderId = `stripe_${Date.now()}`;
      setTimeout(() => onSuccess(mockOrderId), 600);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el pago.';
      setSubmitStatus('error');
      setErrorMsg(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Stripe PaymentElement ── */}
      <div className="relative">
        {isMockMode && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl border border-yellow-500/30">
            <div className="text-center px-6 py-4">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-yellow-400 mb-1">
                Modo Test Activo
              </p>
              <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">
                Los campos aparecerán con tu clave real de Stripe
              </p>
            </div>
          </div>
        )}

        {/* Formulario visual de placeholder cuando está en mock */}
        {isMockMode ? (
          <div className="space-y-4 p-5 bg-[#09090b] rounded-xl border border-[#27272a]">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a1a1aa]">Número de tarjeta</p>
              <div className="h-11 bg-[#18181b] rounded-xl border border-[#27272a]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a1a1aa]">Caducidad</p>
                <div className="h-11 bg-[#18181b] rounded-xl border border-[#27272a]" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a1a1aa]">CVC</p>
                <div className="h-11 bg-[#18181b] rounded-xl border border-[#27272a]" />
              </div>
            </div>
          </div>
        ) : (
          <PaymentElement
            options={{
              layout: { type: 'tabs', defaultCollapsed: false },
              fields: { billingDetails: { name: 'auto' } },
              wallets: { applePay: 'auto', googlePay: 'auto' },
            }}
          />
        )}
      </div>

      {/* ── Badge de seguridad ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">
          Pago cifrado con TLS 1.3 · Procesado por Stripe · No guardamos datos de tarjeta
        </p>
      </motion.div>

      {/* ── Error message ── */}
      <AnimatePresence>
        {submitStatus === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Botón principal CONFIRMAR Y PAGAR ── */}
      <motion.button
        type="submit"
        disabled={isSubmitting || submitStatus === 'success'}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative w-full py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-[11px]',
          'flex items-center justify-center gap-3',
          'transition-all duration-300 overflow-hidden',
          'shadow-2xl',
          submitStatus === 'success'
            ? 'bg-emerald-500 text-white shadow-emerald-900/40'
            : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-900/50 hover:from-red-500 hover:to-red-600',
          isSubmitting && 'opacity-80 cursor-wait',
          submitStatus === 'success' && 'cursor-default',
        )}
      >
        {/* Shimmer effect on idle */}
        {submitStatus === 'idle' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
          />
        )}

        <AnimatePresence mode="wait">
          {submitStatus === 'processing' && (
            <motion.span
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando pago...
            </motion.span>
          )}
          {submitStatus === 'success' && (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              ¡Pago confirmado!
            </motion.span>
          )}
          {(submitStatus === 'idle' || submitStatus === 'error') && (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <Lock className="w-4 h-4" />
              Confirmar y Pagar €{totalAmount.toFixed(2)}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </form>
  );
}

// ─────────────────────────────────────────────
// PAYPAL PLACEHOLDER
// ─────────────────────────────────────────────
function PayPalPlaceholder() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="space-y-4 mt-2">
      {/* Separador "o paga con" */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
          o paga con
        </span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Botón PayPal oficial */}
      <motion.button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileTap={{ scale: 0.98 }}
        className="relative w-full py-4 rounded-2xl overflow-hidden transition-all duration-300 group"
        style={{
          background: isHovered
            ? 'linear-gradient(135deg, #f5a623 0%, #FFD000 100%)'
            : 'linear-gradient(135deg, #FFC439 0%, #FFD040 100%)',
          boxShadow: isHovered
            ? '0 8px 32px rgba(255, 196, 57, 0.35)'
            : '0 4px 16px rgba(255, 196, 57, 0.20)',
        }}
        title="PayPal disponible próximamente"
        aria-label="Pagar con PayPal"
      >
        {/* Logo PayPal SVG oficial */}
        <div className="flex items-center justify-center gap-2">
          <svg
            className="h-5"
            viewBox="0 0 101 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* PayPal wordmark colores oficiales */}
            <path
              d="M 12.237 2.8 L 4.437 2.8 C 3.937 2.8 3.437 3.2 3.337 3.7 L 0.237 23.7 C 0.137 24.1 0.437 24.4 0.837 24.4 L 4.537 24.4 C 5.037 24.4 5.537 24 5.637 23.5 L 6.437 18.1 C 6.537 17.6 6.937 17.2 7.537 17.2 L 10.037 17.2 C 15.137 17.2 18.137 14.7 18.937 9.8 C 19.237 7.7 18.937 6 17.937 4.8 C 16.837 3.5 14.837 2.8 12.237 2.8 Z M 13.137 10.1 C 12.737 12.9 10.537 12.9 8.537 12.9 L 7.337 12.9 L 8.137 7.7 C 8.137 7.4 8.437 7.2 8.737 7.2 L 9.237 7.2 C 10.637 7.2 11.937 7.2 12.637 8 C 13.137 8.4 13.337 9.1 13.137 10.1 Z"
              fill="#003087"
            />
            <path
              d="M 35.437 10 L 31.737 10 C 31.437 10 31.137 10.2 31.137 10.5 L 30.937 11.6 L 30.637 11.2 C 29.737 9.9 27.837 9.5 25.937 9.5 C 21.637 9.5 17.937 12.8 17.237 17.4 C 16.837 19.7 17.337 21.9 18.737 23.4 C 19.937 24.8 21.737 25.4 23.737 25.4 C 27.237 25.4 29.237 23.1 29.237 23.1 L 29.037 24.2 C 28.937 24.6 29.237 25 29.637 25 L 33.037 25 C 33.537 25 34.037 24.6 34.137 24.1 L 36.137 10.9 C 36.237 10.4 35.937 10 35.437 10 Z M 30.337 17.6 C 29.937 19.8 28.237 21.3 26.037 21.3 C 24.937 21.3 24.037 21 23.437 20.3 C 22.837 19.6 22.637 18.7 22.837 17.7 C 23.137 15.5 24.937 14 27.137 14 C 28.237 14 29.137 14.4 29.737 15 C 30.337 15.8 30.537 16.7 30.337 17.6 Z"
              fill="#003087"
            />
            <path
              d="M 55.337 10 L 51.637 10 C 51.237 10 50.937 10.2 50.737 10.5 L 45.537 18.1 L 43.337 10.8 C 43.237 10.3 42.737 10 42.337 10 L 38.637 10 C 38.237 10 37.837 10.4 38.037 10.9 L 42.137 23.3 L 38.237 28.9 C 37.937 29.3 38.237 29.9 38.737 29.9 L 42.437 29.9 C 42.837 29.9 43.137 29.7 43.337 29.4 L 55.837 10.9 C 56.137 10.5 55.837 10 55.337 10 Z"
              fill="#003087"
            />
            <path
              d="M 67.737 2.8 L 59.937 2.8 C 59.437 2.8 58.937 3.2 58.837 3.7 L 55.737 23.6 C 55.637 24 55.937 24.3 56.337 24.3 L 60.337 24.3 C 60.737 24.3 61.037 24 61.037 23.7 L 61.937 18 C 62.037 17.5 62.437 17.1 63.037 17.1 L 65.537 17.1 C 70.637 17.1 73.637 14.6 74.437 9.7 C 74.737 7.6 74.437 5.9 73.437 4.7 C 72.337 3.5 70.337 2.8 67.737 2.8 Z M 68.637 10.1 C 68.237 12.9 66.037 12.9 64.037 12.9 L 62.837 12.9 L 63.637 7.7 C 63.637 7.4 63.937 7.2 64.237 7.2 L 64.737 7.2 C 66.137 7.2 67.437 7.2 68.137 8 C 68.637 8.4 68.837 9.1 68.637 10.1 Z"
              fill="#009CDE"
            />
            <path
              d="M 90.937 10 L 87.237 10 C 86.937 10 86.637 10.2 86.637 10.5 L 86.437 11.6 L 86.137 11.2 C 85.237 9.9 83.337 9.5 81.437 9.5 C 77.137 9.5 73.437 12.8 72.737 17.4 C 72.337 19.7 72.837 21.9 74.237 23.4 C 75.437 24.8 77.237 25.4 79.237 25.4 C 82.737 25.4 84.737 23.1 84.737 23.1 L 84.537 24.2 C 84.437 24.6 84.737 25 85.137 25 L 88.537 25 C 89.037 25 89.537 24.6 89.637 24.1 L 91.637 10.9 C 91.737 10.4 91.437 10 90.937 10 Z M 85.737 17.6 C 85.337 19.8 83.637 21.3 81.437 21.3 C 80.337 21.3 79.437 21 78.837 20.3 C 78.237 19.6 78.037 18.7 78.237 17.7 C 78.537 15.5 80.337 14 82.537 14 C 83.637 14 84.537 14.4 85.137 15 C 85.737 15.8 85.937 16.7 85.737 17.6 Z"
              fill="#009CDE"
            />
            <path
              d="M 95.337 3.3 L 92.137 23.6 C 92.037 24 92.337 24.3 92.737 24.3 L 95.937 24.3 C 96.437 24.3 96.937 23.9 97.037 23.4 L 100.237 3.5 C 100.337 3.1 100.037 2.8 99.637 2.8 L 96.037 2.8 C 95.637 2.8 95.437 3 95.337 3.3 Z"
              fill="#009CDE"
            />
          </svg>
        </div>

        {/* Badge "Próximamente" */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          className="absolute top-1.5 right-3 px-2 py-0.5 bg-black/40 rounded-full"
        >
          <p className="text-[8px] font-black uppercase tracking-widest text-black/70">
            Próximamente
          </p>
        </motion.div>
      </motion.button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 pt-2">
        {['Visa', 'Mastercard', 'Bizum', 'Apple Pay'].map((brand) => (
          <span key={brand} className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
            {brand}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORT PRINCIPAL — CheckoutForm
// ─────────────────────────────────────────────
interface CheckoutFormProps {
  totalAmount: number;
  onSuccess: (orderId: string) => void;
  onError?: (msg: string) => void;
}

// Singleton de Stripe (se carga una sola vez)
let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(key: string) {
  if (!stripePromise) {
    const activeKey = key || 'pk_test_TYooMQauvdEDq54NiTphI7jx'; // default testing key to render UI
    stripePromise = loadStripe(activeKey);
  }
  return stripePromise;
}

// Wrapper para modo real que llama a los hooks dentro del contexto de <Elements>
function RealStripeFormWrapper(props: Omit<InnerFormProps, 'isMockMode' | 'stripe' | 'elements'>) {
  const stripe = useStripe();
  const elements = useElements();
  return <CheckoutFormUI {...props} isMockMode={false} stripe={stripe} elements={elements} />;
}

export default function CheckoutForm({ totalAmount, onSuccess, onError }: CheckoutFormProps) {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
  const isMockMode = !stripeKey || stripeKey.includes('REEMPLAZAR') || stripeKey === 'pk_test_PLACEHOLDER';

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingIntent, setIsLoadingIntent] = useState(!isMockMode);

  useEffect(() => {
    if (isMockMode) return;

    // En modo real: llamar a la Edge Function para crear el PaymentIntent
    const amountCents = Math.round(totalAmount * 100);
    
    supabase.functions
      .invoke('create-payment-intent', {
        body: { amount: amountCents, currency: 'eur' },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No clientSecret returned');
        }
      })
      .catch((err) => {
        console.error('[Stripe] Error al invocar Edge Function create-payment-intent:', err);
        onError?.('No se pudo iniciar el proceso de pago. Inténtalo de nuevo.');
      })
      .finally(() => setIsLoadingIntent(false));
  }, [totalAmount, isMockMode, onError]);

  const elementsOptions: StripeElementsOptions = {
    clientSecret: clientSecret ?? undefined,
    appearance: stripeAppearance,
    locale: 'es',
  };

  if (isLoadingIntent && !isMockMode) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-yellow-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Iniciando pasarela de pago...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Elements stripe={getStripePromise(stripeKey)} options={elementsOptions}>
        <RealStripeFormWrapper
          totalAmount={totalAmount}
          onSuccess={onSuccess}
          onError={onError ?? (() => {})}
        />
      </Elements>
      
      {/* ── PayPal Placeholder (siempre debajo del PaymentElement) ── */}
      <PayPalPlaceholder />
    </div>
  );
}
