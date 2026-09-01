import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MIN_MARGIN = parseFloat(process.env.MIN_MARGIN || '0.15');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') 
    ? process.env.VITE_SUPABASE_ANON_KEY! 
    : process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * MIDDLEWARE: Verificación JWT — Valida el token Bearer del cliente.
 * Extrae el usuario autenticado y lo adjunta a req.body.authenticatedUserId.
 */
const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  req.body.authenticatedUserId = user.id;
  next();
};

/**
 * 1. MOTOR DE PRECIOS Y LOGÍSTICA
 * GET /api/cards - Catálogo optimizado con mejor oferta y tiempo de entrega
 */
app.get('/api/cards', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        inventory:product_inventory (
          sale_price,
          cost_price,
          stock,
          supplier:suppliers (id, name, delivery_time_avg, is_active)
        )
      `);

    if (error) throw error;

    const processedProducts = products.map(product => {
      // Filtrar ofertas válidas: Proveedor activo, stock > 0 y margen mínimo
      const validOffers = (product.inventory as any[])
        .filter(item => 
          item.supplier.is_active && 
          item.stock > 0 && 
          ((item.sale_price - item.cost_price) / item.sale_price) >= MIN_MARGIN
        )
        .sort((a, b) => a.sale_price - b.sale_price);

      if (validOffers.length === 0) return null;

      const bestOffer = validOffers[0];
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        description: product.description,
        image_url: `${product.image_url}?format=webp`, // Implantación WebP
        price: bestOffer.sale_price,
        stock: bestOffer.stock,
        delivery_time: bestOffer.supplier.delivery_time_avg,
        supplier_name: bestOffer.supplier.name,
        rarity: product.meta_tags?.rarity || 'Common',
        set: product.meta_tags?.set || 'Base Set'
      };
    }).filter(Boolean);

    res.json(processedProducts);
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar el catálogo inteligente' });
  }
});

/**
 * 2. ALGORITMO DE CUELLO DE BOTELLA
 * POST /api/checkout/logistics - Calcula entrega final para el carrito
 */
app.post('/api/checkout/logistics', async (req, res) => {
  const { cart_items } = req.body; // [{ product_id, quantity }]

  try {
    const promises = cart_items.map(async (item: any) => {
      const { data: bestOffer } = await supabase
        .from('product_inventory')
        .select('suppliers(delivery_time_avg)')
        .eq('product_id', item.product_id)
        .order('sale_price', { ascending: true })
        .limit(1)
        .single();
      
      return (bestOffer as any)?.suppliers?.delivery_time_avg || 3;
    });

    const times = await Promise.all(promises);
    const maxDeliveryTime = Math.max(...times);

    res.json({
      estimated_days: `${maxDeliveryTime}-${maxDeliveryTime + 2}`,
      bottleneck: maxDeliveryTime
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en el cálculo de logística' });
  }
});

/**
 * 3. PUENTE CONTABLE ODOO
 * Endpoint para disparar facturación legal tras pago confirmado
 */
app.post('/api/webhooks/payment-confirmed', requireAuth, async (req, res) => {
  const { authenticatedUserId, order_id } = req.body;

  try {
    // 1. Obtener datos del pedido y cliente
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (error || !order) throw new Error('Pedido no encontrado');

    // 2. Enviar a Odoo (Mock de llamada a account.move)
    // En producción, aquí se usaría el protocolo XML-RPC o el Odoo JSON-RPC
    const odooPayload = {
      partner_id: order.customer_nif,
      invoice_date: new Date().toISOString().split('T')[0],
      move_type: 'out_invoice',
      invoice_line_ids: [
        // Aquí se mapearían las líneas del pedido
        [0, 0, { name: 'Venta de Cartas Pokémon', quantity: 1, price_unit: order.total_amount }]
      ],
      fiscal_position_id: 'Régimen Nacional'
    };

    // Ejemplo de integración con Odoo API (sustituir con credenciales reales)
    const odooResponse = await axios.post(`${process.env.ODOO_URL}/api/v1/invoice`, odooPayload, {
      headers: { 'X-Odoo-API-Key': process.env.ODOO_API_KEY }
    });

    // 3. Actualizar el pedido con el ID de factura de Odoo
    await supabase
      .from('orders')
      .update({ odoo_invoice_id: odooResponse.data.invoice_id, status: 'invoiced' })
      .eq('id', order_id);

    res.json({ status: 'success', message: 'Factura generada en Odoo' });

  } catch (err: any) {
    console.error('Odoo Sync Error:', err.message);
    res.status(500).json({ error: 'Error en la sincronización contable' });
  }
});

/**
 * 4. CHECKOUT SIMULADO (Transacción Atómica y Gamificación)
 */
app.post('/api/checkout/simulate', requireAuth, async (req, res) => {
  const { authenticatedUserId: userId, cart, fiscalData } = req.body;

  try {
    // 1. Validación de Stock Preventiva
    for (const item of cart) {
      const { data: inv } = await supabase
        .from('product_inventory')
        .select('stock')
        .eq('product_id', item.id)
        .single();

      if (!inv || inv.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuficiente para ${item.name}. Disponible: ${inv?.stock || 0}` });
      }
    }

    // 2. Creación del Pedido (Estatus inicial: pending)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        customer_nif: fiscalData.nif,
        billing_address: fiscalData.address,
        total_amount: cart.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
        tax_amount: 0, 
        status: 'pending'
      })
      .select()
      .single();

    if (oErr) throw oErr;

    // 3. Desglose de Items y Resta de Stock mediante RPC (Atómico)
    for (const item of cart) {
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price
      });

      // RPC decrement_stock asegura que no bajemos de 0
      const { error: sErr } = await supabase.rpc('decrement_stock', { p_id: item.id, qty: item.quantity });
      if (sErr) throw sErr;
    }

    // SIMULACIÓN DE PAGO: Actualizamos el pedido a 'paid' para disparar el Trigger SQL
    await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);

    // Damos tiempo mínimo para que el trigger termine de procesar si hay delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // 4. Obtener progreso actualizado (El trigger de Postgres ya procesó EXP y BP)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    res.json({
      status: 'success',
      orderId: order.id,
      progress: {
        level: profile?.level || 1,
        exp: profile?.exp || 0,
        pokeballs: profile?.pokeballs || 0,
        message: '¡Pago procesado! Has recibido +100 EXP y puntos de Battle Pass.'
      }
    });

  } catch (err: any) {
    console.error('Checkout Simulation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. MOTOR DEL MINIJUEGO DE CAPTURA
 */
app.post('/api/minigame/capture', requireAuth, async (req, res) => {
  const { authenticatedUserId: userId, productId } = req.body;

  try {
    // Verificar recursos
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    
    if (!profile || profile.pokeballs <= 0) {
      return res.status(400).json({ error: 'No tienes Pokéballs suficientes para este intento.' });
    }

    // Probabilidad Logarítmica: Base 30% + Bonus por Nivel
    const baseRate = 0.30;
    const levelBonus = profile.level * 0.01; // +1% por cada nivel
    const successRate = baseRate + levelBonus;
    const roll = Math.random();
    
    // Generación de Data de Animación (Determina cuántas veces tiembla la pokéball)
    let shakes = 1;
    if (roll < successRate + 0.2) shakes = 2;
    if (roll < successRate + 0.1) shakes = 3;

    const success = roll < successRate;

    // Ejecutar consumo de Pokéball
    await supabase.from('user_profiles').update({ pokeballs: profile.pokeballs - 1 }).eq('id', userId);

    if (success) {
      await supabase.from('user_collection').insert({
        user_id: userId,
        product_id: productId,
        method: 'captured'
      });
    }

    res.json({
      success,
      animation_data: {
        shakes: success ? 3 : shakes,
        isCaptured: success,
        theme: success ? 'gold' : 'standard',
        message: success ? '¡Captura Exitosa!' : 'La carta ha escapado...'
      },
      stats: {
        remaining_pokeballs: profile.pokeballs - 1,
        new_exp: profile.exp + (success ? 25 : 5) // Bonus por intento
      }
    });

    // Inyectar EXP por intento de captura
    await supabase.from('user_profiles').update({ exp: profile.exp + (success ? 25 : 5) }).eq('id', userId);

  } catch (err: any) {
    console.error('Minigame Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * STRIPE — Crear PaymentIntent dinámico en Euros
 * POST /api/create-payment-intent
 * Body: { amount: number } — importe en CÉNTIMOS (ej: 12000 = 120.00€)
 */
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'amount debe ser un número positivo en céntimos' });
      return;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en el servidor' });
      return;
    }

    const params = new URLSearchParams();
    params.append('amount', String(Math.round(amount)));
    params.append('currency', 'eur');
    params.append('automatic_payment_methods[enabled]', 'true');

    const response = await axios.post(
      'https://api.stripe.com/v1/payment_intents',
      params,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json({ clientSecret: response.data.client_secret });
  } catch (err: any) {
    console.error('Stripe Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Sasori Smart Backend running on port ${PORT}`);
});