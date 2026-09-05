"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { 
  ArrowLeft, 
  Lock, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Plus, 
  Minus,
  Trash2,
  Check, 
  HelpCircle,
  Tag,
  CheckCircle2,
  X,
  Loader2,
  MapPin
} from "lucide-react"
import { useCartStore } from "../lib/cartStore"
import { supabase } from "../lib/supabase"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { CheckoutForm as VerificationForm } from "../components/CheckoutForm"

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_PLACEHOLDER';
const stripePromise = loadStripe(publishableKey);

export interface CanaryLocation {
  municipality: string;
  island: string;
}

export const CANARY_MUNICIPALITIES_BY_ISLAND: Record<string, string[]> = {
  "Tenerife": [
    "Adeje", "Arafo", "Arico", "Arona", "Buenavista del Norte", "Candelaria",
    "El Rosario", "El Sauzal", "El Tanque", "Fasnia", "Garachico", "Granadilla de Abona",
    "Guía de Isora", "Güímar", "Icod de los Vinos", "La Guancha", "La Matanza de Acentejo",
    "La Orotava", "La Victoria de Acentejo", "Los Realejos", "Los Silos", "Puerto de la Cruz",
    "San Cristóbal de La Laguna", "San Juan de la Rambla", "San Miguel de Abona",
    "Santa Cruz de Tenerife", "Santa Úrsula", "Santiago del Teide", "Tacoronte", "Tegueste", "Vilaflor de Chasna"
  ],
  "Gran Canaria": [
    "Agaete", "Agüimes", "Artenara", "Arucas", "Firgas", "Gáldar", "Ingenio",
    "La Aldea de San Nicolás", "Las Palmas de Gran Canaria", "Mogán", "Moya",
    "San Bartolomé de Tirajana", "Santa Brígida", "Santa Lucía de Tirajana",
    "Santa María de Guía", "Tejeda", "Telde", "Teror", "Valleseco", "Valsequillo de Gran Canaria", "Vega de San Mateo"
  ],
  "Lanzarote": [
    "Arrecife", "Haría", "San Bartolomé", "Teguise", "Tías", "Tinajo", "Yaiza"
  ],
  "Fuerteventura": [
    "Antigua", "Betancuria", "La Oliva", "Pájara", "Puerto del Rosario", "Tuineje"
  ],
  "La Palma": [
    "Barlovento", "Breña Alta", "Breña Baja", "El Paso", "Fuencaliente de La Palma",
    "Garafía", "Los Llanos de Aridane", "Puntagorda", "Puntallana", "San Andrés y Sauces",
    "Santa Cruz de La Palma", "Tazacorte", "Tijarafe", "Villa de Mazo"
  ],
  "La Gomera": [
    "Agulo", "Alajeró", "Hermigua", "San Sebastián de La Gomera", "Valle Gran Rey", "Vallehermoso"
  ],
  "El Hierro": [
    "El Pinar de El Hierro", "Frontera", "Valverde"
  ],
  "La Graciosa": [
    "La Graciosa"
  ]
};

export function getCanaryLocationByZip(cp: string): CanaryLocation | null {
  const cleanCp = cp.trim();
  if (cleanCp.length < 5) return null;
  const num = parseInt(cleanCp, 10);
  if (isNaN(num)) return null;

  if (num >= 35000 && num <= 35499) {
    const island = 'Gran Canaria';
    if (num <= 35020) return { municipality: 'Las Palmas de Gran Canaria', island };
    if (num >= 35100 && num <= 35109) return { municipality: 'San Bartolomé de Tirajana', island };
    if (num >= 35110 && num <= 35119) return { municipality: 'Santa Lucía de Tirajana', island };
    if (num >= 35120 && num <= 35140) return { municipality: 'Mogán', island };
    if (num >= 35200 && num <= 35229) return { municipality: 'Telde', island };
    if (num >= 35230 && num <= 35239) return { municipality: 'Valsequillo de Gran Canaria', island };
    if (num >= 35240 && num <= 35259) return { municipality: 'Ingenio', island };
    if (num >= 35260 && num <= 35279) return { municipality: 'Agüimes', island };
    if (num >= 35280 && num <= 35309) return { municipality: 'Santa Brígida', island };
    if (num >= 35310 && num <= 35329) return { municipality: 'Vega de San Mateo', island };
    if (num >= 35330 && num <= 35339) return { municipality: 'Teror', island };
    if (num >= 35340 && num <= 35349) return { municipality: 'Valleseco', island };
    if (num >= 35350 && num <= 35359) return { municipality: 'Artenara', island };
    if (num >= 35360 && num <= 35399) return { municipality: 'Tejeda', island };
    if (num >= 35400 && num <= 35412) return { municipality: 'Arucas', island };
    if (num >= 35413 && num <= 35419) return { municipality: 'Firgas', island };
    if (num >= 35420 && num <= 35429) return { municipality: 'Moya', island };
    if (num >= 35430 && num <= 35439) return { municipality: 'Firgas', island };
    if (num >= 35440 && num <= 35449) return { municipality: 'Moya', island };
    if (num >= 35450 && num <= 35459) return { municipality: 'Santa María de Guía', island };
    if (num >= 35460 && num <= 35469) return { municipality: 'Gáldar', island };
    if (num >= 35470 && num <= 35479) return { municipality: 'La Aldea de San Nicolás', island };
    if (num >= 35480 && num <= 35499) return { municipality: 'Agaete', island };
    return { municipality: 'Las Palmas de Gran Canaria', island };
  }

  if (num >= 35500 && num <= 35599) {
    if (num === 35541) return { municipality: 'Teguise', island: 'La Graciosa' };
    const island = 'Lanzarote';
    if (num <= 35507) return { municipality: 'Arrecife', island };
    if (num <= 35508) return { municipality: 'Teguise', island };
    if (num <= 35509) return { municipality: 'San Bartolomé', island };
    if (num <= 35519) return { municipality: 'Tías', island };
    if (num <= 35529) return { municipality: 'Haría', island };
    if (num <= 35539) return { municipality: 'Teguise', island };
    if (num <= 35549) return { municipality: 'Haría', island };
    if (num <= 35558) return { municipality: 'San Bartolomé', island };
    if (num <= 35569) return { municipality: 'Tinajo', island };
    if (num <= 35599) return { municipality: 'Yaiza', island };
    return { municipality: 'Arrecife', island };
  }

  if (num >= 35600 && num <= 35699) {
    const island = 'Fuerteventura';
    if (num <= 35619) return { municipality: 'Puerto del Rosario', island };
    if (num <= 35624) return { municipality: 'Tuineje', island };
    if (num <= 35627) return { municipality: 'Pájara', island };
    if (num <= 35629) return { municipality: 'Tuineje', island };
    if (num <= 35639) return { municipality: 'Betancuria', island };
    if (num <= 35699) return { municipality: 'La Oliva', island };
    return { municipality: 'Puerto del Rosario', island };
  }

  if (num >= 38000 && num <= 38699) {
    const island = 'Tenerife';
    if (num <= 38119) return { municipality: 'Santa Cruz de Tenerife', island };
    if (num >= 38201 && num <= 38209) return { municipality: 'San Cristóbal de La Laguna', island };
    if (num >= 38240 && num <= 38289) return { municipality: 'San Cristóbal de La Laguna', island };
    if (num === 38290) return { municipality: 'El Rosario', island };
    if (num === 38291) return { municipality: 'Tacoronte', island };
    if (num >= 38292 && num <= 38295) return { municipality: 'Tegueste', island };
    if (num >= 38296 && num <= 38299) return { municipality: 'San Cristóbal de La Laguna', island };
    if (num >= 38300 && num <= 38315) return { municipality: 'La Orotava', island };
    if (num >= 38320 && num <= 38339) return { municipality: 'San Cristóbal de La Laguna', island };
    if (num >= 38340 && num <= 38354) return { municipality: 'Tacoronte', island };
    if (num >= 38355 && num <= 38359) return { municipality: 'El Sauzal', island };
    if (num >= 38360 && num <= 38369) return { municipality: 'La Matanza de Acentejo', island };
    if (num >= 38370 && num <= 38379) return { municipality: 'La Victoria de Acentejo', island };
    if (num >= 38380 && num <= 38389) return { municipality: 'Santa Úrsula', island };
    if (num >= 38390 && num <= 38399) return { municipality: 'La Orotava', island };
    if (num === 38400) return { municipality: 'Puerto de la Cruz', island };
    if (num >= 38410 && num <= 38419) return { municipality: 'Los Realejos', island };
    if (num >= 38420 && num <= 38428) return { municipality: 'San Juan de la Rambla', island };
    if (num === 38429) return { municipality: 'La Guancha', island };
    if (num >= 38430 && num <= 38439) return { municipality: 'Icod de los Vinos', island };
    if (num >= 38440 && num <= 38449) return { municipality: 'Garachico', island };
    if (num >= 38450 && num <= 38459) return { municipality: 'Los Silos', island };
    if (num >= 38460 && num <= 38469) return { municipality: 'Buenavista del Norte', island };
    if (num >= 38470 && num <= 38479) return { municipality: 'El Tanque', island };
    if (num >= 38480 && num <= 38499) return { municipality: 'Santiago del Teide', island };
    if (num >= 38500 && num <= 38509) return { municipality: 'Güímar', island };
    if (num >= 38510 && num <= 38519) return { municipality: 'Candelaria', island };
    if (num >= 38520 && num <= 38529) return { municipality: 'Arico', island };
    if (num >= 38530 && num <= 38539) return { municipality: 'Candelaria', island };
    if (num >= 38540 && num <= 38549) return { municipality: 'Arafo', island };
    if (num >= 38550 && num <= 38569) return { municipality: 'Güímar', island };
    if (num >= 38570 && num <= 38579) return { municipality: 'Fasnia', island };
    if (num >= 38580 && num <= 38589) return { municipality: 'Arico', island };
    if (num === 38590) return { municipality: 'Granadilla de Abona', island };
    if (num >= 38591 && num <= 38593) return { municipality: 'San Miguel de Abona', island };
    if (num >= 38594 && num <= 38599) return { municipality: 'Vilaflor de Chasna', island };
    if (num >= 38600 && num <= 38619) return { municipality: 'Granadilla de Abona', island };
    if (num >= 38620 && num <= 38625) return { municipality: 'San Miguel de Abona', island };
    if (num >= 38626 && num <= 38659) return { municipality: 'Arona', island };
    if (num >= 38660 && num <= 38679) return { municipality: 'Adeje', island };
    if (num >= 38680 && num <= 38699) return { municipality: 'Guía de Isora', island };
    return { municipality: 'Santa Cruz de Tenerife', island };
  }

  if (num >= 38700 && num <= 38799) {
    const island = 'La Palma';
    if (num <= 38709) return { municipality: 'Santa Cruz de La Palma', island };
    if (num === 38710) return { municipality: 'Breña Alta', island };
    if (num >= 38711 && num <= 38714) return { municipality: 'Breña Baja', island };
    if (num >= 38715 && num <= 38719) return { municipality: 'Puntallana', island };
    if (num >= 38720 && num <= 38725) return { municipality: 'San Andrés y Sauces', island };
    if (num === 38726) return { municipality: 'Barlovento', island };
    if (num >= 38727 && num <= 38729) return { municipality: 'Garafía', island };
    if (num >= 38730 && num <= 38738) return { municipality: 'Villa de Mazo', island };
    if (num >= 38739 && num <= 38749) return { municipality: 'Fuencaliente de La Palma', island };
    if (num >= 38750 && num <= 38759) return { municipality: 'El Paso', island };
    if (num >= 38760 && num <= 38769) return { municipality: 'Los Llanos de Aridane', island };
    if (num >= 38770 && num <= 38779) return { municipality: 'Tazacorte', island };
    if (num >= 38780 && num <= 38787) return { municipality: 'Tijarafe', island };
    if (num >= 38788 && num <= 38799) return { municipality: 'Puntagorda', island };
    return { municipality: 'Santa Cruz de La Palma', island };
  }

  if (num >= 38800 && num <= 38899) {
    const island = 'La Gomera';
    if (num <= 38809) return { municipality: 'San Sebastián de La Gomera', island };
    if (num === 38810) return { municipality: 'Hermigua', island };
    if (num >= 38811 && num <= 38819) return { municipality: 'Agulo', island };
    if (num >= 38820 && num <= 38869) return { municipality: 'Vallehermoso', island };
    if (num >= 38870 && num <= 38879) return { municipality: 'Valle Gran Rey', island };
    if (num >= 38880 && num <= 38899) return { municipality: 'Alajeró', island };
    return { municipality: 'San Sebastián de La Gomera', island };
  }

  if (num >= 38900 && num <= 38999) {
    const island = 'El Hierro';
    if (num <= 38910) return { municipality: 'Valverde', island };
    if (num === 38911) return { municipality: 'Frontera', island };
    if (num >= 38912 && num <= 38999) return { municipality: 'El Pinar de El Hierro', island };
    return { municipality: 'Valverde', island };
  }

  return null;
}

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
      sessionStorage.removeItem('holocards_applied_coupon');

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
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMessage && <div className="text-red-400 text-[10px] font-bold text-center mt-2">{errorMessage}</div>}
      <button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full mt-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
  const [searchParams] = useSearchParams()
  
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
    province: "Tenerife"
  })

  const [couponCodeInput, setCouponCodeInput] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() => {
    try {
      const saved = sessionStorage.getItem('holocards_applied_coupon')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const subtotal = Number(getTotalPrice()) || 0

  useEffect(() => {
    const fetchUserAndPreFill = async () => {
      try {
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
          const address = profile?.address_street || profile?.address || "";
          let city = profile?.address_city || profile?.city || "";
          let postalCode = profile?.address_zip || profile?.postal_code || profile?.zip_code || "";
          let province = profile?.address_province || profile?.island || "Tenerife";

          if (postalCode && postalCode.trim().length === 5) {
            const detected = getCanaryLocationByZip(postalCode);
            if (detected) {
              if (detected.municipality && !city) city = detected.municipality;
              if (detected.island) province = detected.island;
            }
          }

          const fullName = profile?.full_name || user.user_metadata?.full_name || "";
          const firstName = fullName.split(' ')[0] || "";
          const lastName = fullName.split(' ').slice(1).join(' ') || "";

          setContactData({ email, phone });

          setShippingData({
            firstName,
            lastName,
            address,
            city,
            postalCode,
            province
          });

          // Si el usuario registrado ya tiene su dirección/CP guardados, pasa directamente al paso de pago de Stripe
          if (address && city && postalCode) {
            setStep("payment");
          } else if (email) {
            setStep("shipping");
          }
        }
      } catch (e) {
        console.warn("Aviso inicializando usuario en checkout:", e);
      }
    };
    fetchUserAndPreFill();
  }, []);

  // Autodetección reactiva cuando cambia el código postal
  useEffect(() => {
    const zip = shippingData.postalCode?.trim() || "";
    if (zip.length === 5) {
      const detected = getCanaryLocationByZip(zip);
      if (detected) {
        setShippingData(prev => ({
          ...prev,
          city: detected.municipality || prev.city,
          province: detected.island || prev.province
        }));
      }
    }
  }, [shippingData.postalCode]);

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZip = e.target.value;
    const detected = getCanaryLocationByZip(newZip);
    setShippingData(prev => ({
      ...prev,
      postalCode: newZip,
      city: newZip.trim().length === 5 && detected?.municipality ? detected.municipality : prev.city,
      province: newZip.trim().length === 5 && detected?.island ? detected.island : prev.province
    }));
  };

  const handleCitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    let foundIsland = shippingData.province;

    for (const [island, munis] of Object.entries(CANARY_MUNICIPALITIES_BY_ISLAND)) {
      if (munis.includes(selectedCity)) {
        foundIsland = island;
        break;
      }
    }

    setShippingData(prev => ({
      ...prev,
      city: selectedCity,
      province: foundIsland
    }));
  };

  const validateCouponCode = useCallback(async (codeToValidate: string) => {
    const cleanCode = codeToValidate.trim().toUpperCase()
    if (!cleanCode) return

    setCouponLoading(true)
    setCouponError(null)

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 3500)
    )

    try {
      if (!supabase) throw new Error("Conexión no disponible")

      const executionPromise = (async () => {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('validate_and_apply_promo_code', {
            p_code: cleanCode,
            p_user_id: userProfile?.id || null,
            p_order_amount: subtotal || 1,
            p_shipping_cost: 4.95
          })

          if (!rpcError && rpcData && rpcData.valid) {
            return {
              id: rpcData.promo_id || `promo_${Date.now()}`,
              code: rpcData.code || cleanCode,
              discount_type: (rpcData.discount_type === 'free_shipping' ? 'free_shipping' : (rpcData.discount_type === 'percentage' ? 'percentage' : 'fixed')) as any,
              discount_value: Number(rpcData.discount_value) || 0,
              calculated_discount: Number(rpcData.calculated_discount) || 0,
              is_free_shipping: Boolean(rpcData.is_free_shipping)
            }
          }
        } catch (rpcErr) {
          console.warn("[Coupon] RPC no disponible, intentando fallback directo...", rpcErr)
        }

        const { data: promoData } = await supabase
          .from('promo_codes')
          .select('*')
          .ilike('code', cleanCode)
          .eq('is_active', true)
          .maybeSingle()

        if (promoData) {
          return {
            id: String(promoData.id),
            code: promoData.code,
            discount_type: (promoData.discount_type === 'free_shipping' ? 'free_shipping' : (promoData.discount_type === 'percentage' ? 'percentage' : 'fixed')) as any,
            discount_value: Number(promoData.discount_value || promoData.value || 0),
            is_free_shipping: promoData.discount_type === 'free_shipping'
          }
        }

        const { data: couponData } = await supabase
          .from('coupons')
          .select('*')
          .ilike('code', cleanCode)
          .eq('is_active', true)
          .maybeSingle()

        if (couponData) {
          return {
            id: String(couponData.id),
            code: couponData.code,
            discount_type: couponData.discount_type === 'percentage' ? 'percentage' : 'fixed',
            discount_value: Number(couponData.discount_value || 0)
          }
        }

        throw new Error("Código de descuento no encontrado o no válido")
      })()

      const result = await Promise.race([executionPromise, timeoutPromise]) as AppliedCoupon

      setAppliedCoupon(result)
      sessionStorage.setItem('holocards_applied_coupon', JSON.stringify(result))
      setCouponCodeInput("")
      setCouponError(null)

    } catch (err: any) {
      console.error("[Coupon] Error validando cupón:", err)
      if (err.message === "TIMEOUT") {
        setCouponError("Error de conexión. Inténtalo de nuevo.")
      } else {
        setCouponError(err.message || "Código no válido")
      }
    } finally {
      setCouponLoading(false)
    }
  }, [subtotal, userProfile]);

  useEffect(() => {
    const codeFromUrl = searchParams.get('code') || searchParams.get('promo') || searchParams.get('coupon');
    if (codeFromUrl && !appliedCoupon) {
      setCouponCodeInput(codeFromUrl.toUpperCase());
      validateCouponCode(codeFromUrl);
    }
  }, [searchParams, appliedCoupon, validateCouponCode]);

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
    if (step !== 'payment') return;
    if (clientSecret) return;
    if (!items || items.length === 0 || total <= 0) return;

    const fetchPaymentIntent = async () => {
      setPaymentLoading(true);
      setPaymentError(null);
      try {
        const amountInCents = Math.round(total * 100);
        
        if (amountInCents < 50) {
          throw new Error('El importe mínimo para procesar el pago con tarjeta es 0.50€');
        }

        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { 
            amount: amountInCents,
            currency: 'eur',
            items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
            shippingCost: shippingCost
          }
        });

        if (error) {
          let customMsg = '';
          try {
            if (error.context && typeof error.context.json === 'function') {
              const jsonErr = await error.context.json();
              customMsg = jsonErr?.error || jsonErr?.message || '';
            }
          } catch (e) {
            console.warn('Error extrayendo cuerpo de la respuesta:', e);
          }

          if (!customMsg || customMsg.includes('non-2xx status code')) {
            customMsg = 'Error en la pasarela de Stripe. Verifica que la variable STRIPE_SECRET_KEY esté configurada en los Secrets de Supabase.';
          }

          throw new Error(customMsg);
        }

        if (!data?.clientSecret) {
          throw new Error(data?.error || 'No se pudo generar la clave secreta de la pasarela de pago');
        }

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setPaymentError(err.message || 'Error al conectar con el servidor de pagos');
      } finally {
        setPaymentLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [step, total, clientSecret, items, shippingCost]);

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

  const handleApplyCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateCouponCode(couponCodeInput)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
    sessionStorage.removeItem('holocards_applied_coupon')
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
                const zip = data.zipCode || "";
                const detected = getCanaryLocationByZip(zip);
                setShippingData(prev => ({
                  ...prev,
                  postalCode: zip,
                  city: detected?.municipality || prev.city,
                  province: detected?.island || data.island || prev.province
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
              className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Código Postal (Canarias)</label>
                    <input 
                      type="text"
                      placeholder="Ej: 38200"
                      maxLength={5}
                      value={shippingData.postalCode}
                      onChange={handlePostalCodeChange}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Municipio</label>
                    <div className="relative">
                      <select
                        value={shippingData.city}
                        onChange={handleCitySelectChange}
                        className="w-full bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400 appearance-none cursor-pointer pr-10"
                      >
                        <option value="" disabled className="bg-[#0a1628] text-gray-400">
                          Selecciona tu municipio...
                        </option>
                        {Object.entries(CANARY_MUNICIPALITIES_BY_ISLAND).map(([island, munis]) => (
                          <optgroup key={island} label={island} className="bg-[#0a1628] text-yellow-400 font-bold">
                            {munis.map(muni => (
                              <option key={muni} value={muni} className="bg-[#0a1628] text-white font-normal">
                                {muni}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Isla de Canarias</label>
                    <div className="relative">
                      <input 
                        type="text"
                        readOnly
                        value={shippingData.province || "Tenerife"}
                        className="w-full bg-[#030c1a]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-yellow-400 font-bold cursor-not-allowed uppercase"
                      />
                      <MapPin className="w-4 h-4 text-yellow-400 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep("payment")}
                  className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
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
                    className="text-xs font-black uppercase text-yellow-400 hover:underline cursor-pointer"
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
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors active:scale-90 cursor-pointer"
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
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors active:scale-90 cursor-pointer"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
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
              <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
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
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
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
                  className="text-gray-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
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
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={handleNextRelated}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
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
                          className={`p-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
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