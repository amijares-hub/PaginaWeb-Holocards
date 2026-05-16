import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Lock, CreditCard, 
  Truck, Mail, Phone, MapPin, 
  CheckCircle2, ArrowRight, Loader2,
  ShieldCheck, HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../lib/cartStore';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { simulateOrderEmails } from '../lib/emailService';

type Step = 'contact' | 'shipping' | 'payment';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    province: 'Canarias',
    paymentMethod: 'bank_transfer'
  });

  const subtotal = getTotalPrice();
  
  // Shipping logic
  const getShippingCost = () => {
    if (subtotal >= 100) return 0;
    return formData.province === 'Canarias' ? 5 : 10;
  };

  const shippingCost = getShippingCost();
  const totalWithShipping = subtotal + shippingCost;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 'contact') setCurrentStep('shipping');
    else if (currentStep === 'shipping') setCurrentStep('payment');
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_email: formData.email,
          customer_phone: formData.phone,
          shipping_address: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            address: formData.address,
            city: formData.city,
            zipCode: formData.zipCode,
            province: formData.province
          },
          total_amount: totalWithShipping,
          shipping_cost: shippingCost,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time_of_purchase: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Send Notifications via Simulation Mode (Async)
      const itemsSummary = items.map(item => `${item.name} (x${item.quantity}) - €${(item.price * item.quantity).toFixed(2)}`).join('\n');
      
      simulateOrderEmails({
        order_id: order.id,
        customer_email: formData.email,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        total_amount: `€${totalWithShipping.toFixed(2)}`,
        shipping_address: `${formData.address}, ${formData.city} (${formData.province})`,
        items_summary: itemsSummary,
        payment_instructions: "Bizum: 600 000 000 | IBAN: ES21 0000 0000 0000 0000 0000"
      }).catch(err => console.error('Failed to simulate emails:', err));

      // 4. Success
      clearCart();
      navigate(`/gracias/${order.id}`);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Hubo un error al procesar tu pedido. Por favor, inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col lg:flex-row transition-colors">
      {/* LEFT: Checkout Form */}
      <div className="flex-1 px-6 lg:px-20 py-12 lg:py-20 max-w-4xl mx-auto w-full">
        <div className="mb-12 flex items-center justify-between">
          <Link to="/carrito" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Regresar al carrito
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Lock className="w-3 h-3" /> Pago Seguro SSL
          </div>
        </div>

        <div className="space-y-12">
          {/* STEP 1: CONTACT */}
          <section className={cn("space-y-8", currentStep !== 'contact' && "opacity-40 grayscale pointer-events-none")}>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black">01</span>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Información de Contacto</h2>
            </div>
            
            {currentStep === 'contact' && (
              <form onSubmit={handleNext} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Teléfono</label>
                  <input 
                    required 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+34 600 000 000"
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors text-foreground"
                  />
                </div>
                <button className="md:col-span-2 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                  Continuar al Envío <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </section>

          {/* STEP 2: SHIPPING */}
          <section className={cn("space-y-8", currentStep !== 'shipping' && "opacity-40 grayscale pointer-events-none")}>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black">02</span>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Dirección de Envío</h2>
            </div>

            {currentStep === 'shipping' && (
              <form onSubmit={handleNext} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <input 
                    required 
                    placeholder="Nombre"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <input 
                    required 
                    placeholder="Apellidos"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <input 
                    required 
                    placeholder="Calle y Número"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <input 
                    required 
                    placeholder="Ciudad"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <input 
                    required 
                    placeholder="Código Postal"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <select 
                    title="Seleccionar provincia de envío"
                    value={formData.province}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors appearance-none text-foreground"
                  >
                    <option value="Canarias">Islas Canarias (Envío Local)</option>
                    <option value="Península">Península / Baleares</option>
                  </select>
                </div>
                <button className="md:col-span-2 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                  Continuar al Pago <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </section>

          {/* STEP 3: PAYMENT */}
          <section className={cn("space-y-8", currentStep !== 'payment' && "opacity-40 grayscale pointer-events-none")}>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black">03</span>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Método de Pago</h2>
            </div>

            {currentStep === 'payment' && (
              <div className="space-y-6">
                <div className="bg-card border border-primary/30 rounded-2xl p-6 flex items-center gap-4 transition-colors">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Transferencia Bancaria</h4>
                    <p className="text-[10px] text-muted-foreground uppercase">Recibirás los datos del IBAN tras confirmar.</p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-4 border-primary bg-background" />
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3">
                   <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                   <p className="text-[10px] text-emerald-200/70 font-medium uppercase tracking-wider">
                     Tus datos están protegidos por encriptación de grado militar.
                   </p>
                </div>

                <button 
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full py-6 bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-red-900/40 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>CONFIRMAR PEDIDO €{totalWithShipping.toFixed(2)}</>
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* RIGHT: Order Summary (Minimalist) */}
      <div className="w-full lg:w-[450px] bg-card border-l border-border p-8 lg:p-12 transition-colors">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-10">Resumen del Pedido</h3>
        
        <div className="space-y-6 mb-10 overflow-y-auto max-h-[40vh] scrollbar-hide">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 items-center">
              <div className="w-14 h-18 bg-muted rounded-lg overflow-hidden border border-border shrink-0">
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="text-[11px] font-black uppercase leading-tight line-clamp-1 text-foreground">{item.name}</h4>
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Cant: {item.quantity}</p>
              </div>
              <span className="text-xs font-black italic text-foreground">€{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-8 border-t border-border">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span>Subtotal</span>
            <span className="text-foreground">€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span>Envío ({formData.province === 'Canarias' ? 'Local' : 'Nacional'})</span>
            {shippingCost === 0 ? (
              <span className="text-emerald-500 font-black tracking-widest italic">¡GRATIS!</span>
            ) : (
              <span className="text-foreground">€{shippingCost.toFixed(2)}</span>
            )}
          </div>
          {subtotal < 100 && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
              <p className="text-[8px] font-black uppercase tracking-widest text-primary text-center">
                Añade €{(100 - subtotal).toFixed(2)} más para obtener <span className="text-foreground">ENVÍO GRATIS</span>
              </p>
            </div>
          )}
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm font-black uppercase tracking-widest text-white">Total</span>
            <span className="text-3xl font-black text-red-600 italic">€{totalWithShipping.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-12 p-6 bg-white/5 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3 mb-4">
             <HelpCircle className="w-5 h-5 text-zinc-600" />
             <h4 className="text-[10px] font-black uppercase tracking-widest">¿Necesitas ayuda?</h4>
          </div>
          <p className="text-[9px] text-zinc-500 font-medium uppercase leading-relaxed tracking-wider mb-4">
            Si tienes dudas sobre tu pedido en las Islas Canarias o envíos internacionales, contacta con nuestro equipo de soporte.
          </p>
          <button className="text-[9px] font-black text-white uppercase tracking-widest hover:text-red-500 transition-colors">Contactar Soporte</button>
        </div>
      </div>
    </div>
  );
}
