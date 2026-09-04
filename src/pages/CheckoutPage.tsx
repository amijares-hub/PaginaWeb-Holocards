"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { 
  ArrowLeft, 
  Lock, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus,
  Trash2,
  Check, 
  HelpCircle,
  Tag,
  CheckCircle2,
  X,
  Loader2
} from "lucide-react"
import { useCartStore } from "../lib/cartStore"
import { supabase } from "../lib/supabase"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { CheckoutForm as VerificationForm } from "../components/CheckoutForm"

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_PLACEHOLDER';
const stripePromise = loadStripe(publishableKey);

type RelatedProduct = {
  id: string
  name: string
  price: number
  imgUrl: string
  set?: string
}

type AppliedCoupon = {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed' | 'free_shipping'
  discount_value: number
  calculated_discount?: number
  is_free_shipping?: boolean
}

const CheckoutForm = ({ 
  amount, 
  contactData, 
  shippingData, 
  items, 
  clearCart 
}: { 
  amount: number;
  contactData: { email: string; phone: string };
  shippingData: any;
  items: any[];
  clearCart: () => void;
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_email: contactData.email,
          customer_phone: contactData.phone,
          shipping_address: shippingData,
          total_amount: amount,
          status: 'paid'
        })
        .select()
        .single()

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError;

      await supabase.functions.invoke('send-order-email', {
        body: {
          order_id: order.id,
          customer_email: order.customer_email,
          type: 'order_confirmation'
        }
      });

      clearCart();

      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success?order=${order.id}`,
        },
      })

      if (stripeError) {
        setErrorMessage(stripeError.message ?? "Ocurrió un error inesperado con el pago.")
      }
    } catch (err: any) {
      console.error("Error al procesar el pedido:", err)
      setErrorMessage(err.message || "Error al guardar la orden.")
    }
    
    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMessage && <div className="text-red-400 text-[10px] font-bold text-center mt-2">{errorMessage}</div>}
      <button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full mt-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? (
           <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
        ) : (
           <>Pagar {(Number(amount) || 0).toFixed(2)}€</>
        )}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const { items, addItem, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore()
  
  const [step, setStep] = useState<"verification" | "contact" | "shipping" | "payment">("verification")
  const [userProfile, setUserProfile] = useState<any>(null)

  const [contactData, setContactData] = useState({ email: "", phone: "" })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [shippingData, setShippingData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    province: "Las Palmas"
  })

  const [couponCodeInput, setCouponCodeInput] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  useEffect(() => {
    const fetchUserAndPreFill = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const email = user.email || "";
        const phone = profile?.phone || user.user_metadata?.phone || "";
        const address = profile?.address_street || "";
        const city = profile?.address_city || "";
        const postalCode = profile?.address_zip || "";

        setContactData({ email, phone });

        if (profile) {
          setShippingData(prev => ({
            ...prev,
            firstName: profile.full_name?.split(' ')[0] || prev.firstName,
            lastName: profile.full_name?.split(' ').slice(1).join(' ') || prev.lastName,
            address: address || prev.address,
            city: city || prev.city,
            postalCode: postalCode || prev.postalCode,
          }));
        }

        if (address && city && postalCode) {
          setStep("payment");
        }
      }
    };
    fetchUserAndPreFill();
  }, []);

  useEffect(() => {
    if (step !== 'payment') return
    if (clientSecret) return

    const fetchPaymentIntent = async () => {
      setPaymentLoading(true)
      setPaymentError(null)
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { 
            items: items.map(i => ({ id: i.id, quantity: i.quantity })),
            shippingCost: shippingCost 
          }
        })
        if (error || !data?.clientSecret) {
          throw new Error(error?.message || data?.error || 'No se pudo iniciar el pago')
        }
        setClientSecret(data.clientSecret)
      } catch (err: any) {
        setPaymentError(err.message || 'Error al conectar con el servidor de pagos')
      } finally {
        setPaymentLoading(false)
      }
    }

    fetchPaymentIntent()
  }, [step])

  const stripeOptions = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: { 
        theme: 'night' as const, 
        variables: { 
          colorPrimary: '#facc15', 
          colorBackground: '#030c1a', 
          colorText: '#ffffff', 
          colorDanger: '#f87171' 
        } 
      }
    };
  }, [clientSecret]);

  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [carouselIndex, setCarouselPage] = useState(0)
  const [addedTempIds, setAddedTempIds] = useState<Set<string>>(new Set())

  const subtotal = Number(getTotalPrice()) || 0

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0
    if (appliedCoupon.is_free_shipping || appliedCoupon.discount_type === 'free_shipping') {
      return 0
    }
    if (appliedCoupon.discount_type === 'percentage') {
      return (subtotal * appliedCoupon.discount_value) / 100
    }
    return Math.min(subtotal, appliedCoupon.discount_value)
  }, [subtotal, appliedCoupon])

  const subtotalWithDiscount = Math.max(0, subtotal - discountAmount)
  const isFreeShippingByCoupon = appliedCoupon?.is_free_shipping || appliedCoupon?.discount_type === 'free_shipping'
  const shippingCost = (isFreeShippingByCoupon || subtotalWithDiscount >= 100 || subtotalWithDiscount === 0) ? 0 : 4.95
  const freeShippingThreshold = 100.00
  const remainingForFreeShipping = isFreeShippingByCoupon ? 0 : Math.max(0, freeShippingThreshold - subtotalWithDiscount)
  const total = subtotalWithDiscount + shippingCost

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        if (!supabase) return
        const { data } = await supabase.from("products").select("*").limit(10)
        
        if (data) {
          const cartIds = new Set(items.map(i => String(i.id)))
          
          const formatted: RelatedProduct[] = data
            .filter((p: any) => !cartIds.has(String(p.id)))
            .map((p: any) => {
              let img = p.image_url || p.img_url || p.images?.[0] || ""
              return {
                id: String(p.id),
                name: p.name || p.title || "Producto TCG",
                price: parseFloat(p.base_price) || parseFloat(p.price) || parseFloat(p.precio) || 0,
                imgUrl: img,
                set: p.set || "TCG"
              }
            })
          setRelatedProducts(formatted)
        }
      } catch (err) {
        console.warn("Aviso cargando productos relacionados:", err)
      }
    }

    fetchRelated()
  }, [items])

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = couponCodeInput.trim().toUpperCase()
    if (!cleanCode) return

    setCouponLoading(true)
    setCouponError(null)

    try {
      if (!supabase) throw new Error("Conexión no disponible")

      // Validación con la función RPC para consultar promo_codes
      const { data, error } = await supabase.rpc('validate_and_apply_promo_code', {
        p_code: cleanCode,
        p_user_id: userProfile?.id || null,
        p_order_amount: subtotal,
        p_shipping_cost: 4.95
      })

      if (error) throw error

      if (!data || !data.valid) {
        setCouponError(data?.message || "Código inválido o expirado")
        return
      }

      setAppliedCoupon({
        id: data.promo_id,
        code: data.code,
        discount_type: data.discount_type === 'free_shipping' ? 'free_shipping' : (data.discount_type === 'percentage' ? 'percentage' : 'fixed'),
        discount_value: Number(data.discount_value) || 0,
        calculated_discount: Number(data.calculated_discount) || 0,
        is_free_shipping: Boolean(data.is_free_shipping)
      })

      setCouponCodeInput("")
      setCouponError(null)
    } catch (err: any) {
      console.error("Error al validar código:", err)
      setCouponError(err.message || "Error al validar el código")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
  }

  const handleAddRelatedToCart = (prod: RelatedProduct) => {
    addItem({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      image_url: prod.imgUrl,
      rarity: prod.set || "TCG",
      set: prod.set || "TCG",
      stock: 10
    }, 1)

    setAddedTempIds(prev => new Set(prev).add(prod.id))
  }

  const visibleRelated = useMemo(() => {
    return relatedProducts.slice(carouselIndex, carouselIndex + 2)
  }, [relatedProducts, carouselIndex])

  const handleNextRelated = () => {
    if (carouselIndex + 2 < relatedProducts.length) {
      setCarouselPage(prev => prev + 1)
    } else {
      setCarouselPage(0)
    }
  }

  const handlePrevRelated = () => {
    if (carouselIndex > 0) {
      setCarouselPage(prev => prev - 1)
    } else {
      setCarouselPage(Math.max(0, relatedProducts.length - 2))
    }
  }

  return (
    <div className="min-h-screen bg-[#060c17] text-white font-sans flex flex-col justify-between">
      <div className="w-full border-b border-white/10 bg-[#0a1628]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link 
          to="/catalogo" 
          className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Regresar al Catálogo
        </Link>

        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
          <Lock className="w-3.5 h-3.5 text-yellow-400" /> Pago Seguro SSL
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8 flex-1">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className={`bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${step !== "verification" ? "hidden" : ""}`}>
            <VerificationForm 
              userProfile={userProfile}
              onProceedToPayment={(data: any) => {
                setShippingData(prev => ({
                  ...prev,
                  postalCode: data.zipCode,
                  province: data.island
                }));
                setStep("contact");
              }}
            />
          </div>

          <div className={`bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${step === "verification" ? "hidden" : step !== "contact" ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs ${step === "contact" ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-400"}`}>
                01
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-white m-0">
                Información de Contacto
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Email</label>
                <input 
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={contactData.email}
                  onChange={e => setContactData({...contactData, email: e.target.value})}
                  className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Teléfono</label>
                <input 
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={contactData.phone}
                  onChange={e => setContactData({...contactData, phone: e.target.value})}
                  className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <button 
              onClick={() => setStep("shipping")}
              className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-2"
            >
              Continuar al Envío →
            </button>
          </div>

          <div className={`bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${step === "verification" || step === "contact" ? "hidden" : step !== "shipping" ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs ${step === "shipping" ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-400"}`}>
                02
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-white m-0">
                Dirección de Envío
              </h2>
            </div>

            {step === "shipping" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Nombre</label>
                    <input 
                      type="text"
                      placeholder="Tu nombre"
                      value={shippingData.firstName}
                      onChange={e => setShippingData({...shippingData, firstName: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Apellidos</label>
                    <input 
                      type="text"
                      placeholder="Tus apellidos"
                      value={shippingData.lastName}
                      onChange={e => setShippingData({...shippingData, lastName: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Dirección</label>
                    <input 
                      type="text"
                      placeholder="Calle, número, piso..."
                      value={shippingData.address}
                      onChange={e => setShippingData({...shippingData, address: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Ciudad / Municipio (Canarias)</label>
                    <select
                      value={shippingData.city}
                      onChange={e => setShippingData({...shippingData, city: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400 appearance-none"
                    >
                      <option value="">Selecciona tu municipio...</option>
                      <optgroup label="Tenerife">
                        <option value="Santa Cruz de Tenerife">Santa Cruz de Tenerife</option>
                        <option value="San Cristóbal de La Laguna">San Cristóbal de La Laguna</option>
                        <option value="Arona">Arona</option>
                        <option value="Adeje">Adeje</option>
                        <option value="La Orotava">La Orotava</option>
                        <option value="Puerto de la Cruz">Puerto de la Cruz</option>
                        <option value="Granadilla de Abona">Granadilla de Abona</option>
                      </optgroup>
                      <optgroup label="Gran Canaria">
                        <option value="Las Palmas de Gran Canaria">Las Palmas de Gran Canaria</option>
                        <option value="Telde">Telde</option>
                        <option value="Santa Lucía de Tirajana">Santa Lucía de Tirajana</option>
                        <option value="Arucas">Arucas</option>
                        <option value="Maspalomas">Maspalomas</option>
                      </optgroup>
                      <optgroup label="Otras Islas">
                        <option value="Arrecife">Arrecife (Lanzarote)</option>
                        <option value="Puerto del Rosario">Puerto del Rosario (Fuerteventura)</option>
                        <option value="Santa Cruz de La Palma">Santa Cruz de La Palma (La Palma)</option>
                        <option value="San Sebastián de La Gomera">San Sebastián de La Gomera (La Gomera)</option>
                        <option value="Valverde">Valverde (El Hierro)</option>
                      </optgroup>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Código Postal</label>
                    <input 
                      type="text"
                      placeholder="Ej: 35001"
                      value={shippingData.postalCode}
                      onChange={e => setShippingData({...shippingData, postalCode: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setStep("payment")}
                  className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-2"
                >
                  Continuar al Pago →
                </button>
              </>
            )}
          </div>

          <div className={`bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${step !== "payment" ? "hidden" : ""}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs ${step === "payment" ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-400"}`}>
                03
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-white m-0">
                Método de Pago
              </h2>
            </div>
            
            {step === "payment" && (
              paymentLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-widest">Preparando pago seguro...</span>
                </div>
              ) : paymentError ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-red-400 text-xs font-bold text-center">{paymentError}</p>
                  <button
                    onClick={() => { setClientSecret(null); setPaymentError(null); setStep('payment'); }}
                    className="text-xs font-black uppercase text-yellow-400 hover:underline"
                  >
                    Reintentar →
                  </button>
                </div>
              ) : clientSecret && stripeOptions ? (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm 
                    amount={total} 
                    contactData={contactData}
                    shippingData={shippingData}
                    items={items}
                    clearCart={clearCart}
                  />
                </Elements>
              ) : null
            )}
          </div>

        </div>

        <div className="lg:col-span-5 bg-[#0a1628] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 h-fit">
          <div className="flex flex-col items-center gap-1.5 pb-4 border-b border-white/10">
            <img
              src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
              alt="HoloCards"
              className="h-10 object-contain"
            />
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center leading-relaxed">
              HOLOCARDS<br />
              <span className="font-light normal-case tracking-normal">Ctra. Monte Las Mercedes, 127 · 38293 San Cristóbal de La Laguna · S/C de Tenerife</span>
            </p>
          </div>

          <h2 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/10 pb-3 m-0">
            Resumen del Pedido
          </h2>

          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => {
              const price = Number(item.price) || 0;
              const itemTotal = price * (item.quantity || 1);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-[#0a1628]/80 rounded-2xl p-3 border border-white/10 shadow-lg"
                >
                  <div className="w-14 h-14 bg-[#050914] rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 border border-white/5">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-white text-xs font-bold uppercase truncate leading-tight tracking-wide">
                      {item.name}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors active:scale-90"
                          title="Reducir cantidad"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-white font-black text-xs w-6 text-center select-none">
                          {item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors active:scale-90"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-white font-black text-sm tracking-tight">
                      {itemTotal.toFixed(2)}€
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-b border-white/10 py-3 flex flex-col gap-2">
            {!appliedCoupon ? (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="CÓDIGO PROMOCIONAL"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 uppercase font-mono tracking-wider"
                  />
                </div>
                <button
                  type="submit"
                  disabled={couponLoading || !couponCodeInput.trim()}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5 shrink-0"
                >
                  {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider font-mono">
                    {appliedCoupon.code} ({
                      appliedCoupon.is_free_shipping || appliedCoupon.discount_type === 'free_shipping'
                        ? 'Envío Gratis 🚚'
                        : appliedCoupon.discount_type === 'percentage' 
                          ? `-${appliedCoupon.discount_value}%` 
                          : `-${appliedCoupon.discount_value}€`
                    })
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-gray-400 hover:text-red-400 p-1 transition-colors"
                  title="Quitar descuento"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {couponError && (
              <span className="text-[10px] text-red-400 font-bold ml-1">{couponError}</span>
            )}
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span className="font-bold uppercase">Subtotal</span>
              <span className="font-black text-white">{subtotal.toFixed(2)}€</span>
            </div>

            {appliedCoupon && !isFreeShippingByCoupon && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span className="uppercase">Descuento ({appliedCoupon.code})</span>
                <span>-{discountAmount.toFixed(2)}€</span>
              </div>
            )}

            <div className="flex justify-between text-gray-400">
              <span className="font-bold uppercase">Envío</span>
              <span className="font-black text-white">
                {shippingCost === 0 ? "GRATIS" : `${shippingCost.toFixed(2)}€`}
              </span>
            </div>

            <div className="flex justify-between items-center bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl mt-2">
              <span className="text-xs sm:text-sm font-black uppercase text-cyan-400 tracking-wider">IGIC / Exención Fiscal</span>
              <span className="text-xs sm:text-sm font-black text-cyan-400">Exento / 0%</span>
            </div>
          </div>

          {remainingForFreeShipping > 0 && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-3 text-center">
              <p className="text-[11px] font-black text-white uppercase tracking-tight m-0">
                Añade <span className="text-yellow-400">€{remainingForFreeShipping.toFixed(2)}</span> más para obtener <span className="text-yellow-400">ENVÍO GRATIS</span>
              </p>
            </div>
          )}

          {relatedProducts.length > 0 && (
            <div className="bg-[#030c1a] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Completa tu pedido
                </span>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={handlePrevRelated}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={handleNextRelated}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {visibleRelated.map((prod) => {
                  const isAdded = addedTempIds.has(prod.id);
                  const prodPrice = Number(prod.price) || 0;

                  return (
                    <div 
                      key={prod.id}
                      className="bg-[#0a1628] border border-white/10 rounded-xl p-2 flex flex-col justify-between hover:border-yellow-400/40 transition-all group"
                    >
                      <div className="w-full h-16 bg-[#030c1a] rounded-lg overflow-hidden flex items-center justify-center p-1 mb-1.5">
                        {prod.imgUrl ? (
                          <img src={prod.imgUrl} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 text-gray-600" />
                        )}
                      </div>

                      <h4 className="text-[10px] font-bold text-white leading-tight truncate uppercase mb-1">
                        {prod.name}
                      </h4>

                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[11px] font-black text-yellow-400">
                          {prodPrice.toFixed(2)}€
                        </span>

                        <button
                          onClick={() => handleAddRelatedToCart(prod)}
                          disabled={isAdded}
                          className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            isAdded 
                              ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                              : "bg-yellow-400 hover:bg-yellow-300 text-black active:scale-95"
                          }`}
                          title="Añadir al pedido"
                        >
                          {isAdded ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3 stroke-[3]" />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <span className="text-sm font-black uppercase text-white">Total</span>
            <span className="text-2xl font-black text-yellow-400 tracking-tight">
              {total.toFixed(2)}€
            </span>
          </div>

          <div className="bg-[#030c1a] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <HelpCircle className="w-4 h-4 text-yellow-400" />
              <span>¿Necesitas ayuda?</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed font-light m-0">
              Si tienes dudas sobre tu pedido en las Islas Canarias o envíos internacionales, contacta con nuestro equipo de soporte.
            </p>
            <a 
              href="mailto:soporte@holocardscanarias.com" 
              className="text-[10px] font-black uppercase text-yellow-400 hover:underline mt-1"
            >
              soporte@holocardscanarias.com
            </a>
          </div>

          <div className="border-t border-white/5 pt-3">
            <p className="text-xs sm:text-sm font-medium text-gray-300 tracking-wide text-center leading-relaxed mt-4 opacity-90">
              *Exención Franquicia Fiscal, Ley 7/2017, de 27 de diciembre, de Presupuestos Generales de la Comunidad Autónoma de Canarias*
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}