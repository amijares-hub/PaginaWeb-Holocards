import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.18.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const { items, currency = 'eur', shippingCost = 0 } = await req.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('El carrito está vacío o es inválido')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const productIds = items.map((i: any) => i.id)

    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('id, base_price, price, precio')
      .in('id', productIds)

    if (dbError) throw dbError

    let calculatedTotal = 0
    for (const item of items) {
      const dbProduct = products?.find(p => p.id === item.id)
      if (!dbProduct) {
        throw new Error(`Producto no encontrado en la base de datos: ${item.id}`)
      }
      const price = parseFloat(dbProduct.base_price ?? dbProduct.price ?? dbProduct.precio ?? 0)
      calculatedTotal += price * (item.quantity || 1)
    }

    // Calcula el total final con el costo de envío (en céntimos)
    const amount = Math.round((calculatedTotal + shippingCost) * 100)

    if (amount <= 0) {
      throw new Error('El monto calculado es inválido')
    }

    // Crea el PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error al crear PaymentIntent:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
