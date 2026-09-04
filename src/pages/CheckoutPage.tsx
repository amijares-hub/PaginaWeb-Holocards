"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
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

const CANARY_CP_MAP: Record<string, CanaryLocation> = {
  // --- GRAN CANARIA (35000 - 35499) ---
  '35001': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35002': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35003': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35004': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35005': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35006': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35007': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35008': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35009': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35010': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35011': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35012': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35013': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35014': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35015': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35016': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35017': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35018': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35019': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35100': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35108': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35109': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35110': { municipality: 'Santa Lucía de Tirajana', island: 'Gran Canaria' },
  '35118': { municipality: 'Santa Lucía de Tirajana', island: 'Gran Canaria' },
  '35120': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35130': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35138': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35140': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35200': { municipality: 'Telde', island: 'Gran Canaria' },
  '35210': { municipality: 'Telde', island: 'Gran Canaria' },
  '35211': { municipality: 'Telde', island: 'Gran Canaria' },
  '35212': { municipality: 'Telde', island: 'Gran Canaria' },
  '35213': { municipality: 'Telde', island: 'Gran Canaria' },
  '35214': { municipality: 'Telde', island: 'Gran Canaria' },
  '35215': { municipality: 'Telde', island: 'Gran Canaria' },
  '35218': { municipality: 'Telde', island: 'Gran Canaria' },
  '35220': { municipality: 'Telde', island: 'Gran Canaria' },
  '35230': { municipality: 'Valsequillo de Gran Canaria', island: 'Gran Canaria' },
  '35240': { municipality: 'Ingenio', island: 'Gran Canaria' },
  '35250': { municipality: 'Ingenio', island: 'Gran Canaria' },
  '35260': { municipality: 'Agüimes', island: 'Gran Canaria' },
  '35270': { municipality: 'Telde', island: 'Gran Canaria' },
  '35280': { municipality: 'Santa Brígida', island: 'Gran Canaria' },
  '35290': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35300': { municipality: 'Santa Brígida', island: 'Gran Canaria' },
  '35310': { municipality: 'Vega de San Mateo', island: 'Gran Canaria' },
  '35320': { municipality: 'Vega de San Mateo', island: 'Gran Canaria' },
  '35330': { municipality: 'Teror', island: 'Gran Canaria' },
  '35340': { municipality: 'Valleseco', island: 'Gran Canaria' },
  '35350': { municipality: 'Artenara', island: 'Gran Canaria' },
  '35360': { municipality: 'Tejeda', island: 'Gran Canaria' },
  '35400': { municipality: 'Arucas', island: 'Gran Canaria' },
  '35411': { municipality: 'Arucas', island: 'Gran Canaria' },
  '35412': { municipality: 'Arucas', island: 'Gran Canaria' },
  '35413': { municipality: 'Firgas', island: 'Gran Canaria' },
  '35420': { municipality: 'Moya', island: 'Gran Canaria' },
  '35430': { municipality: 'Firgas', island: 'Gran Canaria' },
  '35440': { municipality: 'Moya', island: 'Gran Canaria' },
  '35450': { municipality: 'Santa María de Guía', island: 'Gran Canaria' },
  '35460': { municipality: 'Gáldar', island: 'Gran Canaria' },
  '35470': { municipality: 'La Aldea de San Nicolás', island: 'Gran Canaria' },
  '35480': { municipality: 'Agaete', island: 'Gran Canaria' },

  // --- LANZAROTE Y LA GRACIOSA (35500 - 35599) ---
  '35500': { municipality: 'Arrecife', island: 'Lanzarote' },
  '35508': { municipality: 'Teguise', island: 'Lanzarote' },
  '35509': { municipality: 'San Bartolomé', island: 'Lanzarote' },
  '35510': { municipality: 'Tías', island: 'Lanzarote' },
  '35520': { municipality: 'Haría', island: 'Lanzarote' },
  '35530': { municipality: 'Teguise', island: 'Lanzarote' },
  '35540': { municipality: 'Haría', island: 'Lanzarote' },
  '35541': { municipality: 'Teguise', island: 'La Graciosa' },
  '35542': { municipality: 'Haría', island: 'Lanzarote' },
  '35543': { municipality: 'Haría', island: 'Lanzarote' },
  '35550': { municipality: 'San Bartolomé', island: 'Lanzarote' },
  '35559': { municipality: 'Tinajo', island: 'Lanzarote' },
  '35560': { municipality: 'Tinajo', island: 'Lanzarote' },
  '35570': { municipality: 'Yaiza', island: 'Lanzarote' },
  '35571': { municipality: 'Yaiza', island: 'Lanzarote' },
  '35572': { municipality: 'Tías', island: 'Lanzarote' },
  '35580': { municipality: 'Yaiza', island: 'Lanzarote' },

  // --- FUERTEVENTURA (35600 - 35699) ---
  '35600': { municipality: 'Puerto del Rosario', island: 'Fuerteventura' },
  '35610': { municipality: 'Antigua', island: 'Fuerteventura' },
  '35611': { municipality: 'Antigua', island: 'Fuerteventura' },
  '35612': { municipality: 'Puerto del Rosario', island: 'Fuerteventura' },
  '35613': { municipality: 'Puerto del Rosario', island: 'Fuerteventura' },
  '35620': { municipality: 'Tuineje', island: 'Fuerteventura' },
  '35625': { municipality: 'Pájara', island: 'Fuerteventura' },
  '35626': { municipality: 'Pájara', island: 'Fuerteventura' },
  '35627': { municipality: 'Pájara', island: 'Fuerteventura' },
  '35628': { municipality: 'Tuineje', island: 'Fuerteventura' },
  '35630': { municipality: 'Betancuria', island: 'Fuerteventura' },
  '35640': { municipality: 'La Oliva', island: 'Fuerteventura' },

  // --- TENERIFE (38000 - 38699) ---
  '38001': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38002': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38003': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38004': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38005': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38006': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38007': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38008': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38009': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38010': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38107': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38108': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38109': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38201': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38202': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38203': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38204': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38205': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38206': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38207': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38208': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38280': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38290': { municipality: 'El Rosario', island: 'Tenerife' },
  '38291': { municipality: 'Tacoronte', island: 'Tenerife' },
  '38292': { municipality: 'Tegueste', island: 'Tenerife' },
  '38296': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38300': { municipality: 'La Orotava', island: 'Tenerife' },
  '38310': { municipality: 'La Orotava', island: 'Tenerife' },
  '38311': { municipality: 'La Orotava', island: 'Tenerife' },
  '38312': { municipality: 'La Orotava', island: 'Tenerife' },
  '38320': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38350': { municipality: 'Tacoronte', island: 'Tenerife' },
  '38355': { municipality: 'El Sauzal', island: 'Tenerife' },
  '38360': { municipality: 'La Matanza de Acentejo', island: 'Tenerife' },
  '38370': { municipality: 'La Victoria de Acentejo', island: 'Tenerife' },
  '38380': { municipality: 'Santa Úrsula', island: 'Tenerife' },
  '38390': { municipality: 'La Orotava', island: 'Tenerife' },
  '38400': { municipality: 'Puerto de la Cruz', island: 'Tenerife' },
  '38410': { municipality: 'Los Realejos', island: 'Tenerife' },
  '38420': { municipality: 'San Juan de la Rambla', island: 'Tenerife' },
  '38429': { municipality: 'La Guancha', island: 'Tenerife' },
  '38430': { municipality: 'Icod de los Vinos', island: 'Tenerife' },
  '38440': { municipality: 'Garachico', island: 'Tenerife' },
  '38450': { municipality: 'Los Silos', island: 'Tenerife' },
  '38460': { municipality: 'Buenavista del Norte', island: 'Tenerife' },
  '38470': { municipality: 'El Tanque', island: 'Tenerife' },
  '38480': { municipality: 'Santiago del Teide', island: 'Tenerife' },
  '38500': { municipality: 'Güímar', island: 'Tenerife' },
  '38510': { municipality: 'Candelaria', island: 'Tenerife' },
  '38520': { municipality: 'Arico', island: 'Tenerife' },
  '38530': { municipality: 'Candelaria', island: 'Tenerife' },
  '38540': { municipality: 'Arafo', island: 'Tenerife' },
  '38570': { municipality: 'Fasnia', island: 'Tenerife' },
  '38580': { municipality: 'Arico', island: 'Tenerife' },
  '38590': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38591': { municipality: 'San Miguel de Abona', island: 'Tenerife' },
  '38594': { municipality: 'Vilaflor de Chasna', island: 'Tenerife' },
  '38600': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38611': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38612': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38620': { municipality: 'San Miguel de Abona', island: 'Tenerife' },
  '38626': { municipality: 'Arona', island: 'Tenerife' },
  '38630': { municipality: 'Arona', island: 'Tenerife' },
  '38631': { municipality: 'Arona', island: 'Tenerife' },
  '38639': { municipality: 'Arona', island: 'Tenerife' },
  '38640': { municipality: 'Arona', island: 'Tenerife' },
  '38650': { municipality: 'Arona', island: 'Tenerife' },
  '38660': { municipality: 'Adeje', island: 'Tenerife' },
  '38670': { municipality: 'Adeje', island: 'Tenerife' },
  '38680': { municipality: 'Guía de Isora', island: 'Tenerife' },
  '38683': { municipality: 'Santiago del Teide', island: 'Tenerife' },

  // --- LA PALMA (38700 - 38799) ---
  '38700': { municipality: 'Santa Cruz de La Palma', island: 'La Palma' },
  '38710': { municipality: 'Breña Alta', island: 'La Palma' },
  '38711': { municipality: 'Breña Baja', island: 'La Palma' },
  '38715': { municipality: 'Puntallana', island: 'La Palma' },
  '38720': { municipality: 'San Andrés y Sauces', island: 'La Palma' },
  '38726': { municipality: 'Barlovento', island: 'La Palma' },
  '38727': { municipality: 'Garafía', island: 'La Palma' },
  '38730': { municipality: 'Villa de Mazo', island: 'La Palma' },
  '38739': { municipality: 'Fuencaliente de La Palma', island: 'La Palma' },
  '38750': { municipality: 'El Paso', island: 'La Palma' },
  '38760': { municipality: 'Los Llanos de Aridane', island: 'La Palma' },
  '38770': { municipality: 'Tazacorte', island: 'La Palma' },
  '38780': { municipality: 'Tijarafe', island: 'La Palma' },
  '38788': { municipality: 'Puntagorda', island: 'La Palma' },

  // --- LA GOMERA (38800 - 38899) ---
  '38800': { municipality: 'San Sebastián de La Gomera', island: 'La Gomera' },
  '38810': { municipality: 'Hermigua', island: 'La Gomera' },
  '38811': { municipality: 'Agulo', island: 'La Gomera' },
  '38820': { municipality: 'Vallehermoso', island: 'La Gomera' },
  '38870': { municipality: 'Valle Gran Rey', island: 'La Gomera' },
  '38880': { municipality: 'Alajeró', island: 'La Gomera' },

  // --- EL HIERRO (38900 - 38999) ---
  '38900': { municipality: 'Valverde', island: 'El Hierro' },
  '38911': { municipality: 'Frontera', island: 'El Hierro' },
  '38912': { municipality: 'El Pinar de El Hierro', island: 'El Hierro' },
};

export function getCanaryLocationByZip(cp: string): CanaryLocation | null {
  const cleanCp = cp.trim();
  if (cleanCp.length < 5) return null;

  if (CANARY_CP_MAP[cleanCp]) {
    return CANARY_CP_MAP[cleanCp];
  }

  if (cleanCp.startsWith('35')) {
    const num = parseInt(cleanCp, 10);
    if (num >= 35500 && num <= 35599) return { municipality: '', island: 'Lanzarote' };
    if (num >= 35600 && num <= 35699) return { municipality: '', island: 'Fuerteventura' };
    return { municipality: '', island: 'Gran Canaria' };
  }

  if (cleanCp.startsWith('38')) {
    const num = parseInt(cleanCp, 10);
    if (num >= 38700 && num <= 38799) return { municipality: '', island: 'La Palma' };
    if (num >= 38800 && num <= 38899) return { municipality: '', island: 'La Gomera' };
    if (num >= 38900 && num <= 38999) return { municipality: '', island: 'El Hierro' };
    return { municipality: '', island: 'Tenerife' };
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
          const address = profile?.address_street || "";
          const city = profile?.address_city || "";
          const postalCode = profile?.address_zip || "";

          setContactData({ email, phone });

          if (profile) {
            setShippingData(prev => {
              const updated = {
                ...prev,
                firstName: profile.full_name?.split(' ')[0] || prev.firstName,
                lastName: profile.full_name?.split(' ').slice(1).join(' ') || prev.lastName,
                address: address || prev.address,
                city: city || prev.city,
                postalCode: postalCode || prev.postalCode,
              };

              if (postalCode && postalCode.trim().length === 5) {
                const detected = getCanaryLocationByZip(postalCode);
                if (detected) {
                  if (detected.municipality) updated.city = detected.municipality;
                  if (detected.island) updated.province = detected.island;
                }
              }
              return updated;
            });
          }

          if (address && city && postalCode) {
            setStep("payment");
          }
        }
      } catch (e) {
        console.warn("Aviso inicializando usuario en checkout:", e);
      }
    };
    fetchUserAndPreFill();
  }, []);

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZip = e.target.value;
    setShippingData(prev => {
      const updated = { ...prev, postalCode: newZip };
      if (newZip.trim().length === 5) {
        const detected = getCanaryLocationByZip(newZip);
        if (detected) {
          if (detected.municipality) updated.city = detected.municipality;
          if (detected.island) updated.province = detected.island;
        }
      }
      return updated;
    });
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
                    <input 
                      type="text"
                      placeholder="Escribe o autodetectado con CP..."
                      value={shippingData.city}
                      onChange={e => setShippingData({...shippingData, city: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                    />
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