# Project Files

## vite.config.ts
```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
```

## backend\server.ts
```ts
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
```

## src\types.ts
```ts
export interface Card {
  id: string;
  name: string;
  rarity: string;
  price: number;
  stock: number;
  set: string;
  image_url: string;
  images?: string[];
  threshold?: number;
  isFeatured?: boolean;
  supplier_id?: string;
  game_type?: 'pokemon' | 'mtg';
}
```

## src\hooks\useAuth.ts
```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  role?: string;
  email?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_zip?: string;
  address_country?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        if (mounted) setUser(session.user);

        // Usamos .maybeSingle() para evitar el error HTTP 406 si el registro no existe
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Aviso de lectura de perfil:', profileError.message);
        }

        if (mounted) {
          setProfile(profileData || null);
        }
      } catch (err) {
        console.error('Excepción al verificar sesión:', err);
      } finally {
        // Garantiza SIEMPRE apagar el spinner de carga
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setProfile(profileData || null);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
```

## src\hooks\useProductImage.ts
```ts
import { useStore } from '../lib/StoreContext';

/**
 * Hook to get a product image, prioritizing synced storage images.
 */
export function useProductImage() {
  const { storageImages } = useStore();

  const getImageUrl = (index: number, fallback: string) => {
    if (storageImages && storageImages.length > 0) {
      // Use index hash or similar to consistently pick an image if not explicitly assigned
      return storageImages[index % storageImages.length];
    }
    return fallback;
  };

  return { getImageUrl, hasStorageImages: storageImages.length > 0 };
}
```

## src\lib\cartStore.ts
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Card } from '../types';
import { getRealPrice } from './utils';

export interface CartItem extends Card {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (product: Card, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setIsOpen: (open) => set({ isOpen: open }),

      addItem: (product, quantity = 1) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === product.id);
        const realPrice = getRealPrice(product);

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + (quantity || 1), price: realPrice }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: quantity || 1, price: realPrice }] });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + getRealPrice(item) * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'holocards-cart-storage',
    }
  )
);
```

## src\lib\emailService.ts
```ts
/**
 * Email Service (Mock Simulation Mode)
 * Este servicio simula el envío de correos transaccionales para desarrollo.
 * En producción, estos console.logs se sustituirán por llamadas a la Edge Function o Resend.
 */

interface OrderData {
  order_id: string;
  customer_name: string;
  customer_email: string;
  total_amount: string;
  shipping_address: string;
  items_summary: string;
  payment_instructions: string;
}

/**
 * Genera la plantilla HTML premium para el cliente
 */
const generateCustomerEmailTemplate = (data: OrderData) => {
  const shortId = data.order_id.slice(0, 8).toUpperCase();
  return `
    ------------------------------------------------------------
    PARA: ${data.customer_email}
    ASUNTO: ¡Tu pedido #${shortId} está reservado! Instrucciones de pago
    ------------------------------------------------------------
    HTML TEMPLATE (Premium Dark Mode):
    
    <div style="background: #09090b; color: #fff; padding: 40px; font-family: sans-serif;">
      <h1 style="color: #dc2626; font-style: italic;">HOLO CARDS</h1>
      <p>Hola ${data.customer_name},</p>
      <p>Tu pedido #${shortId} ha sido registrado con éxito.</p>
      <div style="border: 1px solid #27272a; padding: 20px; border-radius: 12px;">
        <p><strong>Total:</strong> ${data.total_amount}</p>
        <p><strong>Envío:</strong> ${data.shipping_address}</p>
        <p><strong>Productos:</strong>\n${data.items_summary}</p>
      </div>
      <div style="background: #000; border: 1px solid #dc2626; padding: 20px; margin-top: 20px;">
        <h3 style="color: #dc2626;">INSTRUCCIONES DE PAGO</h3>
        <p>Realiza el pago e indica el concepto #${shortId}</p>
        <p>${data.payment_instructions}</p>
      </div>
    </div>
    ------------------------------------------------------------
  `;
};

/**
 * Genera la plantilla HTML para el administrador
 */
const generateAdminEmailTemplate = (data: OrderData) => {
  const shortId = data.order_id.slice(0, 8).toUpperCase();
  return `
    ------------------------------------------------------------
    PARA: amijares@sasorilabs.io
    ASUNTO: 🚨 NUEVA VENTA - Pedido #${shortId}
    ------------------------------------------------------------
    HTML TEMPLATE (Admin Alert):
    
    <div style="background: #000; color: #fff; padding: 20px; border-left: 4px solid #dc2626;">
      <h2 style="color: #dc2626;">NUEVO PEDIDO PENDIENTE DE PAGO</h2>
      <p>ID: #${shortId}</p>
      <p>Cliente: ${data.customer_email}</p>
      <p>Total: ${data.total_amount}</p>
      <p>Acción: Revisa el panel de control una vez verificado el cobro.</p>
    </div>
    ------------------------------------------------------------
  `;
};

/**
 * Simula el envío de correos
 */
export const simulateOrderEmails = async (data: OrderData) => {
  console.log('📧 [EmailService] Iniciando envío de correos (Modo Simulación)...');

  // Simular retraso de red
  await new Promise(resolve => setTimeout(resolve, 1200));

  const customerHtml = generateCustomerEmailTemplate(data);
  const adminHtml = generateAdminEmailTemplate(data);

  console.log('%c✅ [EMAIL ENVIADO AL CLIENTE]', 'color: #10b981; font-weight: bold;', customerHtml);
  console.log('%c✅ [ALERTA ENVIADA AL ADMIN]', 'color: #3b82f6; font-weight: bold;', adminHtml);

  return { success: true };
};
```

## src\lib\inventory-db.ts
```ts
import { Card } from '../types';

export const INITIAL_CARDS: Card[] = [
  { id: '1', name: 'Charizard VMAX', rarity: 'Secret Rare', price: 450, stock: 2, set: 'Phantasmal Flames', image_url: '/Imagenes/me03-slider-logo-es.png', images: ['/Imagenes/me04-booster-bundle-169-es.png'], threshold: 5, isFeatured: true, game_type: 'pokemon' },
  { id: '2', name: 'Pikachu V', rarity: 'Ultra Rare', price: 120, stock: 8, set: 'Ninja Spinner', image_url: '/Imagenes/me04-booster-display-box-es.png', images: [], threshold: 5, isFeatured: true, game_type: 'pokemon' },
  { id: '3', name: 'Mewtwo GX', rarity: 'Full Art', price: 85, stock: 15, set: 'Munikis Zero', image_url: '/Imagenes/me04-build-battle-box-es.png', images: [], threshold: 10, game_type: 'pokemon' },
  { id: '4', name: 'Rayquaza VMAX', rarity: 'Alt Art', price: 600, stock: 1, set: 'Evolving Skies', image_url: '/Imagenes/me04-elite-trainer-box-169-es.png', images: [], threshold: 2, isFeatured: true, supplier_id: 'vault_imp', game_type: 'pokemon' },
  { id: '5', name: 'Umbreon VMAX', rarity: 'Alt Art', price: 900, stock: 1, set: 'Eevee Heroes', image_url: '/Imagenes/me04-slider-logo-es.png', images: [], threshold: 3, isFeatured: true, game_type: 'pokemon' },
  { id: '6', name: 'Black Lotus', rarity: 'Mythic', price: 3500, stock: 1, set: 'Alpha', image_url: '/Imagenes/Magic%20The%20Gathering/magic-realidad-fracturada-mazo-de-commander-multiverso-reforjado-castellano.webp', images: [], threshold: 1, isFeatured: true, game_type: 'mtg' },
  { id: '7', name: 'Jace, the Mind Sculptor', rarity: 'Mythic', price: 280, stock: 3, set: 'Worldwake', image_url: '/Imagenes/Magic%20The%20Gathering/magic-the-gathering-vraska-the-unseen-0oq6rgvt7kjlbji4.webp', images: [], threshold: 5, isFeatured: true, game_type: 'mtg' },
  { id: '8', name: 'Liliana of the Veil', rarity: 'Mythic', price: 190, stock: 5, set: 'Innistrad', image_url: '/Imagenes/Magic%20The%20Gathering/71llfWQ1bpL.webp', images: [], threshold: 5, game_type: 'mtg' },
];

export const getInventory = (): Card[] => {
  const saved = localStorage.getItem('sasori_inventory');
  if (saved) return JSON.parse(saved);
  localStorage.setItem('sasori_inventory', JSON.stringify(INITIAL_CARDS));
  return INITIAL_CARDS;
};

export const saveInventory = (cards: Card[]) => {
  localStorage.setItem('sasori_inventory', JSON.stringify(cards));
};
```

## src\lib\notifications.ts
```ts
import { supabase } from './supabase';

/**
 * SASORI NOTIFICATION ENGINE - WHATSAPP HOOK
 * 
 * This module handles outgoing communications to the user's mobile device
 * using the phone number stored in the Identity Matrix.
 */

export interface NotificationPayload {
  userId: string;
  type: 'airdrop' | 'order_update' | 'security_alert';
  message: string;
}

export const sendWhatsAppNotification = async ({ userId, type, message }: NotificationPayload) => {
  // 1. Fetch user phone from Identity Matrix
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('phone, email')
    .eq('id', userId)
    .single();

  if (error || !user?.phone) {
    console.warn(`NOTIFY_ERROR: No phone number detected for user ${userId}. Protocol aborted.`);
    return { success: false, error: 'NO_PHONE' };
  }

  // 2. Prepare payload for future API (Twilio / MessageBird / Meta Cloud API)
  const payload = {
    to: user.phone,
    body: `[SASORI_${type.toUpperCase()}] ${message}`,
    metadata: {
      userId,
      email: user.email,
      timestamp: new Date().toISOString()
    }
  };

  // 3. Log to internal audit table (Optional but recommended)
  console.log('--- WHATSAPP PAYLOAD PREPARED ---');
  console.log(payload);
  console.log('--------------------------------');

  /**
   * FUTURE IMPLEMENTATION:
   * 
   * const response = await fetch('YOUR_WHATSAPP_API_ENDPOINT', {
   *   method: 'POST',
   *   headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}` },
   *   body: JSON.stringify(payload)
   * });
   */

  return { success: true, message: 'Payload transmitted to queue.' };
};
```

## src\lib\supabase.ts
```ts
import { createClient } from '@supabase/supabase-js';

// We use placeholders if keys are missing to allow the app to boot.
// The app will still show errors when trying to connect, but won't crash on load.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'SASORI_WARNING: Supabase credentials are not configured. UI features requiring Auth or Database will not function correctly. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}
```

## src\lib\taxonomyStore.ts
```ts
import { create } from 'zustand';
import { supabase } from './supabase';

export interface Game {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  game_id: string;
  name: string;
  slug: string;
}

export interface Expansion {
  id: string;
  game_id: string;
  name: string;
  slug: string;
}

interface TaxonomyState {
  games: Game[];
  categories: Category[];
  expansions: Expansion[];
  loading: boolean;
  error: string | null;
  fetchTaxonomy: () => Promise<void>;
}

export const useTaxonomyStore = create<TaxonomyState>((set) => ({
  games: [],
  categories: [],
  expansions: [],
  loading: false,
  error: null,
  fetchTaxonomy: async () => {
    set({ loading: true, error: null });
    try {
      const [gamesRes, categoriesRes, expansionsRes] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('expansions').select('*').order('name')
      ]);

      if (gamesRes.error) throw gamesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (expansionsRes.error) throw expansionsRes.error;

      console.log('Taxonomy fetched successfully:', {
        games: gamesRes.data,
        categories: categoriesRes.data,
        expansions: expansionsRes.data
      });

      set({
        games: gamesRes.data as Game[],
        categories: categoriesRes.data as Category[],
        expansions: expansionsRes.data as Expansion[],
        loading: false
      });
    } catch (err: any) {
      console.error('Error fetching taxonomy details:', err);
      set({ error: err.message, loading: false });
    }
  }
}));
```

## src\lib\useThemeStore.ts
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default theme
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: nextTheme });
        updateDocumentTheme(nextTheme);
      },
      setTheme: (theme) => {
        set({ theme });
        updateDocumentTheme(theme);
      },
    }),
    {
      name: 'holocard-theme-storage',
    }
  )
);

// Helper to update the DOM class
export const updateDocumentTheme = (theme: 'light' | 'dark') => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};
```

## src\lib\utils.ts
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export const getRealPrice = (p: any): number => {
  const price = parseFloat(p?.base_price ?? p?.price ?? p?.precio ?? 0);
  return isNaN(price) ? 0 : price;
};
```

## src\services\imageSync.ts
```ts
import { supabase } from '../lib/supabase';

export const BUCKET_NAME = 'products';

export async function fetchStorageImages() {
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('Error fetching images from Supabase Storage:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('No images found in Supabase Storage bucket:', BUCKET_NAME);
      return [];
    }

    const imageUrls = data
      .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .map(file => {
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
        return publicUrlData.publicUrl;
      });

    console.log(`Successfully synced ${imageUrls.length} images from Supabase Storage [${BUCKET_NAME}]`);
    return imageUrls;
  } catch (err) {
    console.error('Unexpected error in image sync:', err);
    return [];
  }
}

/**
 * Gets a reliable image URL, falling back to a placeholder if needed.
 */
export function getProductImage(index: number, storageImages: string[], fallback: string) {
  if (storageImages.length > 0) {
    return storageImages[index % storageImages.length];
  }
  return fallback;
}
```

## supabase\functions\create-correos-shipment\index.ts
```ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { order_id, nombre, direccion, cp, ciudad, provincia, telefono, email } = payload;

    if (!order_id || !nombre || !direccion || !cp || !ciudad) {
      throw new Error("Faltan datos obligatorios para el envío (order_id, nombre, direccion, cp, ciudad)");
    }

    const clientId = Deno.env.get("CORREOS_CLIENT_ID");
    const clientSecret = Deno.env.get("CORREOS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error("Faltan las credenciales de Correos en las variables de entorno");
    }

    // 1. Obtener Token de Correos (Sandbox)
    // Endpoint típicamente usado para API REST de Correos
    const tokenUrl = "https://api.pre.correos.es/oauth2/token"; 
    
    // Auth Basic con Base64(client_id:client_secret)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Error autenticando con Correos: ${errorText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Crear el envío en Correos (API Admisión)
    const admisionUrl = "https://api.pre.correos.es/api-integracion/envios/v1/admision";
    
    const correosPayload = {
      "fechaOperacion": new Date().toISOString().split('T')[0],
      "codEtiqueta": "2", // PDF/ZPL según contrato
      "remitente": {
        "nombre": "HoloCards Canarias",
        "direccion": "Calle Ficticia 123", // Reemplazar por real
        "localidad": "Santa Cruz de Tenerife",
        "provincia": "Santa Cruz de Tenerife", // o Las Palmas
        "cp": "38001",
        "telefono": "600000000",
        "email": "soporte@holocardscanarias.com"
      },
      "destinatario": {
        "nombre": nombre,
        "direccion": direccion,
        "localidad": ciudad,
        "provincia": provincia || ciudad,
        "cp": cp,
        "telefono": telefono || "",
        "email": email || ""
      },
      "envio": {
        "numBultos": 1,
        "codProducto": "PAQ_STANDARD", 
        "referenciaCliente": order_id,
        "pesos": {
          "pesoReal": "500" // gramos
        }
      }
    };

    let trackingNumber = `TEST-CORREOS-${Math.floor(Math.random() * 1000000)}`;
    let labelUrl = "https://example.com/label.pdf";

    // Hacemos el llamado a la API de Correos
    const admisionRes = await fetch(admisionUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(correosPayload)
    });

    if (!admisionRes.ok) {
      // Nota para Sandbox: Muchas veces las peticiones a Sandbox fallan si el Client ID
      // no tiene configurado un contrato virtual válido en el backend de Correos.
      // Atrapamos el error y simulamos el éxito si ocurre para no romper el flujo local.
      console.warn("La API de Correos devolvió un error (común en Sandbox sin contrato configurado). Fallback a tracking simulado.");
      const errorText = await admisionRes.text();
      console.error("Error Correos:", errorText);
    } else {
      const admisionData = await admisionRes.json();
      trackingNumber = admisionData.numeroEnvio || trackingNumber;
      labelUrl = admisionData.etiqueta || labelUrl;
    }

    // 3. Actualizar la base de datos de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error: dbError } = await supabase
        .from('orders')
        .update({ 
          tracking_number: trackingNumber,
          status: 'processing'
        })
        .eq('id', order_id);
        
      if (dbError) {
        throw new Error(`Error actualizando DB: ${dbError.message}`);
      }
    } else {
      console.warn("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrados. No se actualiza DB.");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      tracking_number: trackingNumber, 
      label_url: labelUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error en create-correos-shipment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
```

## supabase\functions\create-payment-intent\index.ts
```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.18.0?target=deno'

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
    const { amount, currency = 'eur' } = await req.json()

    if (!amount) {
      throw new Error('El campo amount es requerido')
    }

    // Crea el PaymentIntent. automatic_payment_methods habilita Bizum, Apple Pay, etc.
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
```

## supabase\functions\send-order-email\index.ts
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, customer_email, customer_name, total_amount, shipping_address, items_summary, payment_instructions } = await req.json();

    const shortId = order_id.slice(0, 8).toUpperCase();

    // 1. Email for Customer
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; font-style: italic; color: #ffffff; text-transform: uppercase; }
          .logo span { color: #dc2626; }
          .status-badge { display: inline-block; background: rgba(220, 38, 38, 0.1); color: #dc2626; padding: 8px 16px; border-radius: 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
          h1 { font-size: 32px; font-weight: 900; font-style: italic; margin: 0 0 10px 0; }
          p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
          .order-details { margin: 30px 0; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a; padding: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .detail-label { color: #71717a; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .payment-box { background: #000000; border-radius: 16px; padding: 24px; margin-top: 30px; border: 1px solid #dc262633; }
          .payment-title { color: #dc2626; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; display: block; }
          .payment-info { font-family: monospace; font-size: 16px; color: #ffffff; font-weight: bold; }
          .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <div className="logo">HOLO<span>CARDS</span></div>
          </div>
          <div className="status-badge">Pedido Reservado</div>
          <h1>¡Hola ${customer_name}!</h1>
          <p>Tu pedido <strong>#${shortId}</strong> ha sido registrado con éxito en HoloCard Vault. Estamos listos para preparar tu envío en cuanto confirmemos el pago.</p>
          
          <div className="order-details">
            <div className="detail-row">
              <span className="detail-label">Total a Pagar</span>
              <span style="color: #ffffff; font-weight: 900;">${total_amount}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Envío a</span>
              <span style="color: #ffffff;">${shipping_address}</span>
            </div>
          </div>

          <div className="payment-box">
            <span className="payment-title">Instrucciones de Pago</span>
            <p style="color: #ffffff; margin-bottom: 20px;">Realiza el pago e indica el concepto <strong>#${shortId}</strong></p>
            <div style="margin-bottom: 15px;">
              <span style="color: #71717a; font-size: 10px; text-transform: uppercase;">Bizum:</span><br/>
              <span className="payment-info">600 000 000</span>
            </div>
            <div>
              <span style="color: #71717a; font-size: 10px; text-transform: uppercase;">IBAN:</span><br/>
              <span className="payment-info">ES21 0000 0000 0000 0000 0000</span>
            </div>
          </div>

          <div className="footer">
            Gracias por confiar en Sasori Labs & HoloCards
          </div>
        </div>
      </body>
      </html>
    `;

    // 2. Email for Admin
    const adminEmailHtml = `
      <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #dc2626;">🚨 NUEVA VENTA DETECTADA</h1>
        <p>Se ha registrado un nuevo pedido pendiente de pago manual.</p>
        <ul>
          <li><strong>ID Pedido:</strong> #${shortId}</li>
          <li><strong>Cliente:</strong> ${customer_email}</li>
          <li><strong>Total:</strong> ${total_amount}</li>
        </ul>
        <p>Revisa el panel de administración para gestionar el envío una vez verifiques el cobro.</p>
      </div>
    `;

    // Send using Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify([
        {
          from: "HoloCards <pedidos@sasorilabs.io>",
          to: customer_email,
          subject: `¡Tu pedido #${shortId} está reservado! Instrucciones de pago`,
          html: customerEmailHtml,
        },
        {
          from: "HoloCard Vault <sistema@sasorilabs.io>",
          to: "amijares@sasorilabs.io",
          subject: `🚨 NUEVA VENTA - Pedido #${shortId}`,
          html: adminEmailHtml,
        },
      ]),
    });

    const resData = await res.json();

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

## src\App.tsx
```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StoreProvider, useStore } from './lib/StoreContext';
import { ShieldAlert } from 'lucide-react';
import FloatingChatBot from './components/ui/FloatingChatBot';
import { useThemeStore, updateDocumentTheme } from './lib/useThemeStore';
import { useAuth } from './hooks/useAuth';

// Pages
import Catalog from './pages/Catalog';
import LandingPageV2 from './pages/LandingPageV2';
import Login from './pages/Login';
import UserProfile from './pages/UserProfile';
import ProfileSettings from './pages/ProfileSettings';

import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import ProductPage from './pages/ProductPage';
import LegalPage from './pages/LegalPage';
import AboutUs from './components/AboutUs';

function ProtectedProfile() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }
  return <UserProfile />;
}

function ProfileSettingsRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!loading && !user) return <Navigate to="/login" replace />;
  return <ProfileSettings />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/perfil" replace />;
  return <Login />;
}

function AppInner() {
  const { systemSettings } = useStore();

  return (
    <Router>
      <RouterContent systemSettings={systemSettings} />
    </Router>
  );
}

function RouterContent({ systemSettings }: { systemSettings: any }) {
  const { pathname } = useLocation();
  const isBypassPath = pathname === '/login';

  if (systemSettings['system_maintenance'] && !isBypassPath) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full animate-pulse"></div>
          <ShieldAlert className="w-24 h-24 text-red-600 mb-8 mx-auto relative z-10" />
          <h1 className="text-6xl font-black text-foreground tracking-tighter uppercase italic mb-4 relative z-10">System Offline</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-[0.3em] mb-12 relative z-10">Protocol Omega Active // Maintenance in Progress</p>
          <div className="max-w-md mx-auto space-y-4 relative z-10">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-600"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="text-[10px] text-red-500/50 font-black uppercase tracking-widest">Re-authorization required by sector 01</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes>

          {/* ══════════════════════════════════════════════
               🏠 LANDING PRINCIPAL — ÚNICA PÁGINA DE ENTRADA
          ══════════════════════════════════════════════ */}
          <Route path="/" element={<LandingPageV2 />} />

          {/* Redirecciones de rutas antiguas → nueva raíz */}
          <Route path="/v2-landing" element={<Navigate to="/" replace />} />
          <Route path="/dev-store" element={<Navigate to="/" replace />} />

          {/* ══════════════════════════════════════════════
               🛍️ CATÁLOGO Y TIENDA
          ══════════════════════════════════════════════ */}
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/producto/:id" element={<ProductPage />} />

          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/gracias/:orderId" element={<SuccessPage />} />
          <Route path="/perfil" element={<ProtectedProfile />} />
          <Route path="/perfil/ajustes" element={<ProfileSettingsRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/sobre-nosotros" element={<AboutUs />} />

          {/* Rutas legacy del dev-store → redirigen a nuevas */}
          <Route path="/dev-store/catalog" element={<Navigate to="/catalogo" replace />} />
          <Route path="/dev-store/catalogo" element={<Navigate to="/catalogo" replace />} />
          <Route path="/dev-store/producto/:id" element={<Navigate to="/producto/:id" replace />} />
          <Route path="/dev-store/product/:id" element={<Navigate to="/producto/:id" replace />} />

          {/* Catch-all → Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {!isBypassPath && <FloatingChatBot />}
    </>
  );
}

export default function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Sync theme
    updateDocumentTheme(theme);
  }, [theme]);

  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
```

## src\main.tsx
```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## src\components\AboutUs.tsx
```tsx
"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { 
  ShieldCheck, 
  Award, 
  ArrowRight, 
  X, 
  Info, 
  FileText, 
  Scale, 
  Lock, 
  Truck 
} from "lucide-react"
import HeaderV2 from "./layout/HeaderV2"

interface SectionData {
  id: string
  label: string
  title: string
  highlight: string
  icon: React.ReactNode
  shortDescription: string
  fullContent: React.ReactNode
  features: { icon: React.ReactNode; title: string; subtitle: string }[]
}

const SECTIONS: SectionData[] = [
  {
    id: "sobre-nosotros",
    label: "Sobre Nosotros",
    title: "SOBRE",
    highlight: "HOLOCARDS",
    icon: <Info className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "En HoloCards vivimos y respiramos la pasión por los Trading Card Games. Nacimos con el objetivo de ofrecer a entrenadores y coleccionistas un espacio seguro, rápido y especializado para conseguir sus productos favoritos de Pokémon TCG, Magic The Gathering y One Piece TCG.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "100% OFICIAL", subtitle: "Stock verificado" },
      { icon: <Award className="w-4 h-4" />, title: "ENVÍOS RÁPIDOS", subtitle: "Sin aduanas sorpresa" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <p>
          En <strong className="text-yellow-400">HoloCards Canarias</strong> vivimos y respiramos la pasión por los Trading Card Games. Nuestra tienda nació con el compromiso de conectar a jugadores y coleccionistas con los productos más exclusivos y buscados del mercado.
        </p>
        <p>
          Trabajamos de forma directa con distribuidores autorizados para garantizar que cada caja de sobres, booster pack, blister o accesorio que llega a tus manos sea 100% original, oficial y sellado de fábrica.
        </p>
        <p>
          Especializados en envíos exclusivos a todas las Islas Canarias, garantizamos empaquetados ultra protegidos para que tus cartas y colecciones lleguen en estado impecable (*Mint Condition*).
        </p>
      </div>
    )
  },
  {
    id: "terminos",
    label: "Términos y Condiciones",
    title: "TÉRMINOS Y",
    highlight: "CONDICIONES",
    icon: <FileText className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Regulación general sobre el acceso, compras de productos TCG, preventas, uso permitido de la tienda y límites de compra en productos demandados.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "COMPRA SEGURA", subtitle: "Pasarelas cifradas SSL" },
      { icon: <Award className="w-4 h-4" />, title: "PREVENTAS REGULADAS", subtitle: "Sujetas a distribución" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Objeto y Usuarios</h4>
        <p>
          Las presentes condiciones regulan el uso del sitio web HOLOCARDS CANARIAS dedicado a la venta de TCG. El acceso es libre. Para comprar o registrarse será necesario facilitar datos veraces. Menores de 16 años deberán contar con autorización de sus padres o tutores.
        </p>
        <h4 className="text-white font-bold text-base">2. Productos y Preventas</h4>
        <p>
          Las imágenes tienen carácter ilustrativo; los fabricantes pueden introducir variaciones de embalaje. Las preventas están sujetas a disponibilidad del distribuidor. En productos de alta demanda se podrán establecer límites de compra por usuario.
        </p>
        <h4 className="text-white font-bold text-base">3. Responsabilidad</h4>
        <p>
          HOLOCARDS CANARIAS no será responsable de interrupciones del servicio, errores derivados de terceros o causas de fuerza mayor. Estas condiciones podrán modificarse en cualquier momento.
        </p>
      </div>
    )
  },
  {
    id: "avisos",
    label: "Avisos Legales",
    title: "AVISOS",
    highlight: "LEGALES",
    icon: <Scale className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Información fiscal oficial del titular del sitio web, domicilio, NIF de contacto y derechos de propiedad intelectual de marcas registradas.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "TITULAR FISCAL", subtitle: "Elisa González Rojas" },
      { icon: <Award className="w-4 h-4" />, title: "CONTACTO OFICIAL", subtitle: "soporte@holocardscanarias.com" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Datos Identificativos del Titular</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Titular:</strong> Elisa González Rojas</li>
          <li><strong>NIF:</strong> 51148236P</li>
          <li><strong>Domicilio:</strong> CTRA Monte Las Mercedes N127</li>
          <li><strong>Email:</strong> soporte@holocardscanarias.com</li>
          <li><strong>Dominio:</strong> holocardscanarias.com</li>
        </ul>
        <h4 className="text-white font-bold text-base">2. Propiedad Intelectual</h4>
        <p>
          Todos los contenidos del sitio web son propiedad de HOLOCARDS CANARIAS o de sus respectivos titulares. Queda prohibida su reproducción sin autorización. Pokémon, Magic The Gathering, One Piece y sus logotipos pertenecen a sus respectivos fabricantes.
        </p>
      </div>
    )
  },
  {
    id: "privacidad",
    label: "Política de Privacidad y Cookies",
    title: "PRIVACIDAD Y",
    highlight: "COOKIES",
    icon: <Lock className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Protección de datos conforme al Reglamento (UE) 2016/679, tratamiento de datos identificativos, derechos de usuario y uso de cookies técnicas y analíticas.",
    features: [
      { icon: <ShieldCheck className="w-4 h-4" />, title: "RGPD / LOPD", subtitle: "Protección de datos" },
      { icon: <Award className="w-4 h-4" />, title: "GOOGLE ANALYTICS", subtitle: "Cookies técnicas/analíticas" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Finalidad y Datos Tratados</h4>
        <p>
          Tratamos datos identificativos, de contacto y de envío para gestión de pedidos, cuentas, incidencias, comunicaciones comerciales (con consentimiento) y cumplimiento legal. Los datos bancarios son gestionados directamente por pasarelas seguras (PayPal/Entidades bancarias).
        </p>
        <h4 className="text-white font-bold text-base">2. Destinatarios y Conservación</h4>
        <p>
          Los datos se comunicarán a empresas de transporte, proveedores tecnológicos, PayPal, bancos y Administraciones Públicas por obligación legal. Se conservarán durante la relación contractual y los plazos legales requeridos.
        </p>
        <h4 className="text-white font-bold text-base">3. Ejercicio de Derechos</h4>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación y portabilidad escribiendo a <strong className="text-yellow-400">marketing@holocardscanarias.com</strong>. También tienes derecho a reclamar ante la AEPD.
        </p>
        <h4 className="text-white font-bold text-base">4. Uso de Cookies</h4>
        <p>
          Utilizamos cookies técnicas necesarias y Google Analytics para medir la navegación con previo consentimiento del usuario.
        </p>
      </div>
    )
  },
  {
    id: "envios",
    label: "Política de Envíos y Devoluciones",
    title: "ENVÍOS Y",
    highlight: "DEVOLUCIONES",
    icon: <Truck className="w-3.5 h-3.5 text-yellow-400" />,
    shortDescription: "Envíos exclusivos a las Islas Canarias. Tarifas de 4,95€, envíos gratis a partir de 100€, plazos de 24/72h y política transparente sobre apertura de sobres.",
    features: [
      { icon: <Truck className="w-4 h-4" />, title: "ENVÍOS CANARIAS", subtitle: "Tenerife 24-48h / Resto 24-72h" },
      { icon: <Award className="w-4 h-4" />, title: "ENVÍO GRATIS >100€", subtitle: "Tarifa estándar 4,95€" }
    ],
    fullContent: (
      <div className="space-y-4 text-gray-300 text-sm font-light leading-relaxed">
        <h4 className="text-white font-bold text-base">1. Ámbito, Plazos y Tarifas</h4>
        <p>
          Realizamos envíos <strong>exclusivamente a todas las Islas Canarias</strong>. 
          <br />• <strong>Tenerife:</strong> 24 a 48 horas laborables.
          <br />• <strong>Resto de Islas Canarias:</strong> 24 a 72 horas laborables.
          <br />Coste estándar de envío: <strong>4,95 €</strong>. ¡Envío <strong>GRATIS</strong> en pedidos superiores a 100 €!
        </p>
        <h4 className="text-white font-bold text-base">2. Recepción e Incidencias</h4>
        <p>
          Si el paquete presenta daños visibles por el transporte, indícalo al transportista y escríbenos cuanto antes a <strong>soporte@holocardscanarias.com</strong>.
        </p>
        <h4 className="text-white font-bold text-base">3. Devoluciones y Desistimiento</h4>
        <p>
          Productos sin abrir pueden devolverse en un plazo de 14 días si están en perfecto estado y con su embalaje original. <strong>No se aceptan devoluciones de productos abiertos o manipulados</strong> salvo defecto de fabricación comprobable.
        </p>
        <h4 className="text-white sm:text-yellow-400 font-bold text-base bg-yellow-400/10 p-3 rounded-xl border border-yellow-400/20">
          🎰 Recordatorio Coleccionista: El "Factor Sorpresa"
        </h4>
        <p className="italic text-gray-300">
          Todos queremos abrir un sobre y sacar la carta más rara. Sin embargo, un "mal drop" no constituye un defecto del producto. No aceptamos devoluciones de sobres o cajas abiertas porque la suerte no haya acompañado. ¡La emoción del coleccionismo está en la sorpresa!
        </p>
      </div>
    )
  }
]

export function AboutUs() {
  const [activeTabId, setActiveTabId] = useState<string>("sobre-nosotros")
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const sectionParam = searchParams.get("section")
    if (sectionParam && SECTIONS.some(s => s.id === sectionParam)) {
      setActiveTabId(sectionParam)
    }
  }, [searchParams])

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  const activeSection = SECTIONS.find((s) => s.id === activeTabId) || SECTIONS[0]

  return (
    <>
      <HeaderV2 />
      <div className="w-full min-h-[calc(100vh-73px)] py-4 sm:py-6 bg-[#050914] text-white flex flex-col justify-center relative overflow-hidden">
        
        {/* FONDO DE PÁGINA */}
        <img
          src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Fondos/Fondo.webp"
          alt="Fondo Holocards"
          className="absolute inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none mix-blend-screen"
        />

        <div className="absolute -top-20 -left-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* BOTONES EXTENDIDOS A LO ANCHO SIN FLECHAS */}
        <div className="relative z-20 w-full px-4 sm:px-8 mt-2 sm:mt-4 flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-6xl w-full">
            {SECTIONS.map((section) => {
              const isSelected = activeTabId === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTabId(section.id)}
                  className={`relative px-4 sm:px-6 h-[38px] sm:h-[46px] md:h-[48px] rounded-full text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-200 flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "text-black translate-y-[2px]"
                      : "bg-gradient-to-b from-[#1c2e4a] to-[#0a1222] border border-[#2c446b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_0_#02040a,0_6px_10px_rgba(0,0,0,0.6)] text-gray-300 hover:text-white hover:brightness-110 active:translate-y-[2px]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-about-tab-bg"
                      className="absolute inset-0 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.3),0_0_15px_rgba(250,204,21,0.6)] border border-yellow-200"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                    {section.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* BLOQUES BAJADOS Y CENTRADOS */}
        <main className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 mt-6 lg:mt-10 mb-4">
          <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            
            {/* BLOQUE 1 (IZQUIERDA) - LOGO OFICIAL DE LA EMPRESA (SIN FRAME) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full lg:w-[28%] h-48 lg:h-auto flex items-center justify-center relative shrink-0"
            >
              <motion.img
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Iso%20Transparente.png"
                alt="Logo HoloCards Iso"
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="w-full h-full max-h-[280px] lg:max-h-[320px] object-contain filter drop-shadow-[0_0_25px_rgba(250,204,21,0.35)] pointer-events-none"
              />
            </motion.div>

            {/* BLOQUE 2 (CENTRO) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-full lg:w-[46%] bg-[#0a1628]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between relative overflow-hidden h-full max-h-[480px]"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80" />

              <div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight leading-tight text-white mb-3">
                      {activeSection.title}{" "}
                      <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                        {activeSection.highlight}
                      </span>
                    </h1>

                    <p className="text-gray-300 text-xs sm:text-sm font-light leading-relaxed mb-6">
                      {activeSection.shortDescription}
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.6)] transition-all duration-300 active:scale-95"
                    >
                      Ver Más <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CARACTERÍSTICAS BASE */}
              <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/10">
                {activeSection.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shrink-0">
                      {feat.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] sm:text-[11px] font-black text-white uppercase leading-none">
                        {feat.title}
                      </p>
                      <p className="text-[9px] text-gray-400 font-light mt-0.5">
                        {feat.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* BLOQUE 3 (DERECHA) - VUELVE A LA IMAGEN ENMARCADA ORIGINAL */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full lg:w-[28%] h-48 lg:h-auto flex items-center justify-center shrink-0"
            >
              <div className="relative w-full max-w-[280px] lg:max-w-none aspect-[3/4] max-h-[380px] bg-[#030c1a] rounded-2xl lg:rounded-[2rem] p-3 border border-yellow-400/40 shadow-[0_0_40px_rgba(250,204,21,0.2)] overflow-hidden group">
                <div className="w-full h-full rounded-xl lg:rounded-[1.5rem] bg-[#0a1628]/80 border border-white/10 overflow-hidden relative flex items-center justify-center p-4">
                  <img
                    src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Promo.webp"
                    alt="Enmarcado HoloCards"
                    className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-400/50 text-[9px] font-black uppercase tracking-widest text-yellow-400">
                    Garantía HoloCards
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </main>

        {/* POP-UP MODAL */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 260, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[85vh] bg-[#0a1628] border border-yellow-400/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(250,204,21,0.3)] flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500" />

                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                      {activeSection.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                      {activeSection.label}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 max-h-[50vh] hide-scrollbar my-2">
                  {activeSection.fullContent}
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    HoloCards TCG Store
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  )
}

export default AboutUs;
```

## src\components\layout\AnnouncementBar.tsx
```tsx
import React from 'react';
import { motion } from 'framer-motion';

export default function AnnouncementBar() {
  const text = "BIENVENIDO A HOLOCARDS OFICIAL • WELCOME TO HOLOCARDS • ";
  const repeatedText = text.repeat(8);

  return (
    <div className="bg-gradient-to-r from-cyan-900 to-blue-900 text-white text-xs py-1.5 overflow-hidden relative flex whitespace-nowrap items-center font-bold tracking-[0.2em] z-50 border-b border-cyan-500/20">
      <motion.div
        className="flex"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
      >
        <span>{repeatedText}</span>
      </motion.div>
    </div>
  );
}
```

## src\components\layout\CartDrawer.tsx
```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../lib/cartStore';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const subtotal = getTotalPrice() || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-background/95 border-l border-border backdrop-blur-2xl z-[101] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20"><ShoppingBag className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-black text-foreground uppercase">Tu Carrito</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{items.length} {items.length === 1 ? 'Producto' : 'Productos'}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                  <p className="text-foreground font-bold uppercase tracking-widest text-xs">El carrito está vacío</p>
                </div>
              ) : (
                items.map((item) => {
                  const price = Number(item.price) || 0;
                  return (
                    <div key={item.id} className="bg-card border border-border p-4 rounded-2xl flex gap-4">
                      <div className="w-20 h-24 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                          <p className="text-sm font-black text-foreground">{(price * item.quantity).toFixed(2)}€</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 bg-muted/50 border-t border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-primary">{subtotal.toFixed(2)}€</span>
                </div>
                <button onClick={() => { setIsOpen(false); navigate('/checkout'); }} className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                  <CreditCard className="w-4 h-4" /> Proceder al Pago <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

## src\components\layout\HeaderV2.tsx
```tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Search, User, ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../lib/cartStore';
import { useAuth } from '../../hooks/useAuth';

// ─── CART SIDEBAR DRAWER ───
function CartSidebar({ onClose }: { onClose: () => void }) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const navigate = useNavigate();

  const total = getTotalPrice() || 0;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150]"
      />

      {/* Panel lateral */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed top-0 right-0 bottom-0 w-[90vw] max-w-[400px] bg-[#050914] border-l border-cyan-900/40 z-[160] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-black uppercase tracking-widest text-sm">Mi Carrito</span>
            {items.length > 0 && (
              <span className="px-2 py-0.5 bg-cyan-400 text-black text-[10px] font-black rounded-full">
                {items.reduce((acc, i) => acc + (i.quantity || 0), 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <ShoppingCart className="w-16 h-16 text-gray-700" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Tu carrito está vacío</p>
              <button
                onClick={() => { navigate('/catalogo'); onClose(); }}
                className="px-6 py-3 bg-cyan-400 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-300 transition-colors active:scale-95"
              >
                Ver Catálogo
              </button>
            </div>
          ) : (
            items.map((item) => {
              const price = Number(item.price) || 0;
              const itemTotal = price * (item.quantity || 1);
              return (
                <div key={item.id} className="flex gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                  {/* Imagen */}
                  <div className="w-16 h-16 bg-[#0a1628] rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate leading-snug">{item.name}</p>
                    <p className="text-cyan-400 text-[11px] font-black mt-0.5">
                      {price.toFixed(2)}€
                    </p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-red-500/30 rounded-md transition-colors"
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                      <span className="text-white text-xs font-black w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-cyan-500/30 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal + borrar */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-md hover:bg-red-400/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white text-xs font-black">
                      {itemTotal.toFixed(2)}€
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con total y botón directo de compra */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total</span>
              <span className="text-white text-xl font-black">{total.toFixed(2)}€</span>
            </div>
            <button
              onClick={() => { navigate('/checkout'); onClose(); }}
              className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs rounded-xl active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Finalizar Compra →
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

interface HeaderV2Props {
  onHomeClick?: () => void;
  onFranchiseClick?: () => void;
}

export default function HeaderV2({ onHomeClick, onFranchiseClick }: HeaderV2Props) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();
  const itemCount = useCartStore((state) =>
    state.items.reduce((acc, i) => acc + (i.quantity || 0), 0)
  );

  return (
    <>
      <header className="sticky top-0 z-[100] w-full backdrop-blur-xl bg-[#050914]/90 border-b border-cyan-900/30 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Lado Izquierdo: Logo */}
            <div className="flex-shrink-0 flex items-center">
              {onHomeClick ? (
                <button onClick={onHomeClick} className="flex items-center gap-2">
                  <img
                    src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                    alt="Holocards"
                    className="h-10 object-contain"
                  />
                </button>
              ) : (
                <Link to="/" className="flex items-center gap-2">
                  <img
                    src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                    alt="Holocards"
                    className="h-10 object-contain"
                  />
                </Link>
              )}
            </div>

            {/* Centro: Navegación */}
            <nav className="hidden md:flex space-x-8">
              {onHomeClick ? (
                <button
                  onClick={onHomeClick}
                  className="text-sm font-semibold tracking-wide text-gray-300 hover:text-cyan-400 transition-colors flex items-center uppercase"
                >
                  Inicio
                </button>
              ) : (
                <Link
                  to="/"
                  className="text-sm font-semibold tracking-wide text-gray-300 hover:text-cyan-400 transition-colors flex items-center uppercase"
                >
                  Inicio
                </Link>
              )}

              {/* ─── DROPDOWN: FRANQUICIAS ─── */}
              <div className="relative group">
                <button 
                  onClick={() => onFranchiseClick && onFranchiseClick()}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-wide py-2"
                >
                  Pokémon / Magic / One Piece
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#0a1628]/95 backdrop-blur-xl border border-cyan-900/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col overflow-hidden z-50">
                  <Link to="/catalogo?brand=pokemon" className="px-4 py-3 text-sm text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 flex items-center gap-2">
                    <span className="text-yellow-400 text-xs">◆</span>Pokémon TCG
                  </Link>
                  <Link to="/catalogo?brand=magic" className="px-4 py-3 text-sm text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 flex items-center gap-2">
                    <span className="text-blue-400 text-xs">◆</span>Magic The Gathering
                  </Link>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      alert("La sección One Piece TCG estará disponible próximamente.");
                    }}
                    className="opacity-50 cursor-not-allowed px-4 py-3 text-sm text-gray-200 transition-colors border-b border-white/5 flex items-center justify-between gap-2 w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs">◆</span>One Piece Card Game
                    </div>
                    <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-black">PROXIMAMENTE</span>
                  </button>
                  <Link to="/catalogo?brand=accesorios" className="px-4 py-3 text-sm text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors flex items-center gap-2">
                    <span className="text-purple-400 text-xs">◆</span>Accesorios
                  </Link>
                </div>
              </div>

              {/* ─── DROPDOWN: TIPOS DE PRODUCTO ─── */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm font-semibold text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-wide py-2">
                  Productos
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#0a1628]/95 backdrop-blur-xl border border-cyan-900/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col overflow-hidden z-50 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <Link to="/catalogo?category=binders"           className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Binders</Link>
                  <Link to="/catalogo?category=blister"           className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Blister</Link>
                  <Link to="/catalogo?category=cajas-de-mazo"     className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cajas de Mazo</Link>
                  <Link to="/catalogo?category=cajas-de-sobres"   className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cajas de Sobres</Link>
                  <Link to="/catalogo?category=cajas-etb"         className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cajas ETB</Link>
                  <Link to="/catalogo?category=cartas-gradeadas"  className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cartas Gradeadas</Link>
                  <Link to="/catalogo?category=colecciones"       className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Colecciones</Link>
                  <Link to="/catalogo?category=commander"         className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Commander</Link>
                  <Link to="/catalogo?category=fundas-toploader"  className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors uppercase tracking-wider">Fundas / Toploader</Link>
                </div>
              </div>

              {/* MÁS INFORMACIÓN Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm font-semibold text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-wide py-2">
                  Más Información
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-68 bg-[#0a1628]/95 backdrop-blur-xl border border-cyan-900/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col overflow-hidden z-50">
                  <Link to="/sobre-nosotros?section=sobre-nosotros" className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Sobre Nosotros</Link>
                  <Link to="/sobre-nosotros?section=terminos"       className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Términos y Condiciones</Link>
                  <Link to="/sobre-nosotros?section=avisos"         className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Avisos Legales</Link>
                  <Link to="/sobre-nosotros?section=privacidad"     className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Política de Privacidad y Cookies</Link>
                  <Link to="/sobre-nosotros?section=envios"         className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors uppercase tracking-wider">Política de Envíos y Devoluciones</Link>
                </div>
              </div>
            </nav>

            {/* Lado Derecho: Iconos */}
            <div className="flex items-center space-x-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors" aria-label="Buscar">
                <Search className="w-5 h-5" />
              </button>
              <Link to={user ? "/perfil" : "/login"} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors" aria-label="Mi Cuenta">
                <User className="w-5 h-5" />
              </Link>

              {/* CARRITO */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors relative active:scale-95"
                aria-label="Abrir carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 text-[10px] font-black text-black border-2 border-[#050914] shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* CART SIDEBAR DRAWER */}
      <AnimatePresence>
        {isCartOpen && <CartSidebar onClose={() => setIsCartOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
```

## src\components\layout\PublicLayout.tsx
```tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { StoreFooter } from './StoreFooter';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1">
        <Outlet />
      </div>
      <StoreFooter />
    </div>
  );
};
```

## src\components\layout\StoreDrawer.tsx
```tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { useCartStore } from '../../lib/cartStore';
import { formatCurrency, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface StoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tab: 'cart' | 'favorites';
}

export const StoreDrawer: React.FC<StoreDrawerProps> = ({ isOpen, onClose, tab: initialTab }) => {
  const { items: cart, removeItem: removeFromCart, updateQuantity } = useCartStore();
  const { favorites, toggleFavorite, addToCart } = useStore();
  const [activeTab, setActiveTab] = React.useState<'cart' | 'favorites'>(initialTab);
  const navigate = useNavigate();

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const cartTotal = cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * (item.quantity || 1)), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 z-[130] w-full max-w-md bg-background border-l border-border flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('cart')} className={cn("text-xs font-black uppercase px-4 py-2 rounded-xl", activeTab === 'cart' ? "bg-white text-black" : "text-zinc-500")}>
                  Carrito ({cart.length})
                </button>
                <button onClick={() => setActiveTab('favorites')} className={cn("text-xs font-black uppercase px-4 py-2 rounded-xl", activeTab === 'favorites' ? "bg-white text-black" : "text-zinc-500")}>
                  Favoritos ({favorites.length})
                </button>
              </div>
              <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'cart' ? (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image_url} className="w-20 h-24 object-cover rounded-xl bg-zinc-900 shrink-0" alt="" />
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="flex justify-between">
                          <h4 className="text-sm font-black uppercase">{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-black">{formatCurrency((Number(item.price) || 0) * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {favorites.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image_url} className="w-20 h-24 object-cover rounded-xl bg-zinc-900 shrink-0" alt="" />
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <h4 className="text-sm font-black uppercase">{item.name}</h4>
                        <button onClick={() => { const { quantity, ...card } = item as any; addToCart(card); }} className="text-xs font-black uppercase bg-white text-black px-3 py-1.5 rounded-lg">
                          Añadir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeTab === 'cart' && cart.length > 0 && (
              <div className="p-6 border-t border-border bg-card/50 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase text-muted-foreground">Total</span>
                  <span className="text-2xl font-black">{formatCurrency(cartTotal)}</span>
                </div>
                <button onClick={() => { onClose(); navigate('/checkout'); }} className="w-full bg-primary text-white font-black uppercase h-14 rounded-2xl flex items-center justify-center gap-3">
                  Continuar Checkout <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

## src\components\layout\StoreFooter.tsx
```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Layers, Mail, Phone, MapPin } from 'lucide-react';

export const StoreFooter = () => {
  return (
    <footer className="bg-card border-t border-border pt-20 pb-10 transition-colors">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <Layers className="w-8 h-8 text-foreground" />
              <span className="text-xl font-black uppercase italic">HoloCards <span className="text-muted-foreground">Store</span></span>
            </Link>
            <p className="text-muted-foreground text-sm uppercase font-bold">
              El refugio definitivo para coleccionistas en Canarias. Piezas auténticas y envíos garantizados.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Navegación</h3>
            <ul className="space-y-4">
              <li><Link to="/" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Inicio</Link></li>
              <li><Link to="/catalogo" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Catálogo Completo</Link></li>
              <li><Link to="/perfil" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Mi Cuenta</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Legal & Soporte</h3>
            <ul className="space-y-4">
              <li><Link to="/sobre-nosotros?section=terminos" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Términos y Condiciones</Link></li>
              <li><Link to="/sobre-nosotros?section=privacidad" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Política de Privacidad</Link></li>
              <li><Link to="/sobre-nosotros?section=envios" className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase">Envíos y Devoluciones</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Contacto</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase"><Mail className="w-4 h-4 text-primary" /> soporte@holocardscanarias.com</li>
              <li className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase"><MapPin className="w-4 h-4 text-primary" /> Canarias, España</li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-border flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground">
          <p>&copy; 2026 HoloCards Canarias. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
```

## src\components\layout\StoreNavbar.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, Layers, Clock, Menu, X, Sun, Moon } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { cn } from '../../lib/utils';
import { useCartStore } from '../../lib/cartStore';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeStore } from '../../lib/useThemeStore';
import { useAuth } from '../../hooks/useAuth';

export const StoreNavbar = () => {
  const { homepageDesign, marketing } = useStore();
  const { user } = useAuth();
  const { getItemCount, setIsOpen } = useCartStore();
  const navigate = useNavigate();
  const cartCount = getItemCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const countdownActive = marketing?.countdown?.isActive;
  const endDateStr = marketing?.countdown?.endDate;

  useEffect(() => {
    if (!countdownActive || !endDateStr) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endDateStr).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('00:00:00');
        clearInterval(timer);
        return;
      }

      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, endDateStr]);

  const headerData = homepageDesign['ui_header'] || {
    logo_url: '',
    menu_items: [
      { label: 'INICIO', path: '/' },
      { label: 'CATÁLOGO', path: '/catalogo' },
      { label: 'OFERTAS', path: '/catalogo?filter=deals' }
    ]
  };

  return (
    <>
      {marketing?.countdown?.isActive && (
        <div className="fixed top-0 left-0 right-0 z-[120] h-10 flex items-center justify-center gap-4 bg-red-600 text-white shadow-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">
            {marketing.countdown.message} <span className="font-mono text-xs ml-2">{timeLeft}</span>
          </p>
        </div>
      )}

      <nav className={cn(
        "fixed left-0 right-0 z-[100] bg-background text-foreground border-b border-border shadow-sm",
        marketing?.countdown?.isActive ? "top-10" : "top-0"
      )}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <button className="lg:hidden p-2 text-muted-foreground" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/" className="flex items-center gap-3 shrink-0">
            {headerData.logo_url ? (
              <img src={headerData.logo_url} alt="HoloCards" className="h-10 w-auto object-contain" />
            ) : (
              <Layers className="w-8 h-8 text-foreground" />
            )}
            <span className="text-xl font-black uppercase italic">HoloCards</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {headerData.menu_items.map((item: any) => (
              <Link key={item.label} to={item.path} className="text-[12px] font-black uppercase tracking-widest hover:text-primary transition-colors">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link to={user ? "/perfil" : "/login"} className="text-muted-foreground hover:text-foreground">
              <User className="w-5 h-5" />
            </Link>

            <button onClick={() => setIsOpen(true)} className="relative text-muted-foreground hover:text-foreground">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
```

## src\components\ui\button.tsx
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## src\components\ui\call-to-action-cta.tsx
```tsx
// components/ui/cta-card.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";

// Define the props for the CtaCard component
interface CtaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  title: string;
  description: string;
  inputPlaceholder?: string;
  buttonText: string;
  onButtonClick?: (email: string) => void;
}

const CtaCard = React.forwardRef<HTMLDivElement, CtaCardProps>(
  (
    {
      className,
      imageSrc,
      title,
      description,
      inputPlaceholder = "Email address",
      buttonText,
      onButtonClick,
      ...props
    },
    ref
  ) => {
    const [email, setEmail] = React.useState("");
    const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success'>('idle');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!email || status === 'submitting') return;
      
      setStatus('submitting');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (onButtonClick) {
        onButtonClick(email);
      }
      setStatus('success');
      console.log("Email submitted:", email);
    };

    // Animation variants for Framer Motion
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.2,
          delayChildren: 0.1,
        },
      },
    };

    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 12,
        },
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-black text-card-foreground shadow-2xl",
          className
        )}
        {...props}
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={imageSrc}
            alt="Background"
            className="h-full w-full object-cover opacity-40 mix-blend-luminosity grayscale"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-red-600/5 mix-blend-overlay" />
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 grid h-full grid-cols-1 items-center gap-12 p-10 md:grid-cols-2 md:p-16 lg:p-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="flex flex-col items-start text-left">
            <motion.div 
               variants={itemVariants}
               className="flex items-center gap-2 mb-6"
            >
                <div className="p-2 bg-red-600/20 text-red-500 rounded-lg">
                    <Sparkles className="size-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Premium_Access</span>
            </motion.div>
            
            <motion.h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black italic tracking-tighter uppercase text-white leading-[0.9]"
              variants={itemVariants}
            >
              {title}
            </motion.h2>
            <motion.p
              className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg md:text-xl font-medium text-zinc-400 uppercase tracking-wide leading-relaxed"
              variants={itemVariants}
            >
              {description}
            </motion.p>
          </div>

          <motion.div className="flex w-full max-w-md flex-col items-center justify-center relative" variants={itemVariants}>
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center p-8 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 w-full"
                >
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-red-600/40">
                    <CheckCircle2 className="text-white w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">¡Suscrito con éxito!</h3>
                  <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Revisa tu bandeja de entrada para una sorpresa especial de Sasori Labs.</p>
                  <Button 
                    variant="ghost" 
                    className="mt-6 text-zinc-500 hover:text-white"
                    onClick={() => setStatus('idle')}
                  >
                    Volver a registrarse
                  </Button>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full flex-col gap-4 p-8 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Newsletter_Registration</label>
                    <Input
                      type="email"
                      placeholder={inputPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full border-white/10 bg-black/40 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-red-600 rounded-2xl transition-all"
                      aria-label={inputPlaceholder}
                      disabled={status === 'submitting'}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="h-14 w-full bg-red-600 text-white hover:bg-red-700 font-black italic uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-95"
                  >
                    {status === 'submitting' ? "Procesando..." : buttonText}
                    {status !== 'submitting' && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                  <p className="text-center text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Sin compromiso • Solo contenido exclusivo</p>
                </form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    );
  }
);

CtaCard.displayName = "CtaCard";

export { CtaCard };
```

## src\components\ui\CheckoutForm.tsx
```tsx
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
```

## src\components\ui\ChevronDivider.tsx
```tsx
import React from 'react';

interface ChevronDividerProps {
  direction?: 'down' | 'up';
}

export default function ChevronDivider({ direction = 'down' }: ChevronDividerProps) {
  const isDown = direction === 'down';

  // Points para V hacia abajo o ^ hacia arriba
  const outer  = isDown ? "0,0 1000,0 500,220"    : "500,0 0,220 1000,220";
  const middle = isDown ? "60,0 940,0 500,190"     : "500,10 60,220 940,220";
  const inner  = isDown ? "160,0 840,0 500,155"    : "500,30 160,220 840,220";

  const gradientId = `chevronGrad_${direction}`;
  const x1 = isDown ? "50%" : "50%";
  const y1 = isDown ? "0%"  : "100%";
  const y2 = isDown ? "100%": "0%";

  return (
    <div className="w-full overflow-hidden leading-[0] my-2">
      <svg
        viewBox="0 0 1000 225"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-24 md:h-36 lg:h-44"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1={x1} y1={y1} x2={x1} y2={y2}>
            <stop offset="0%"   stopColor="#0d1117" />
            <stop offset="60%"  stopColor="#1a2a3a" />
            <stop offset="100%" stopColor="#00bfff" />
          </linearGradient>
        </defs>

        {/* Capa exterior — gris oscuro */}
        <polygon points={outer}  fill="#1c2333" />

        {/* Capa media — gris medio */}
        <polygon points={middle} fill="#252e42" />

        {/* Capa interior — gradiente cian */}
        <polygon points={inner}  fill={`url(#${gradientId})`} />
      </svg>
    </div>
  );
}
```

## src\components\ui\ExactWaveBackground.tsx
```tsx
import React from 'react';

// URL base del bucket para recursos visuales
const BUCKET_URL = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/";

export default function ExactWaveBackground() {
  return (
    // 🌟 CONTENEDOR DE FONDO: Absoluto, cubriendo todo, centrado, z-0
    <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0 bg-black pointer-events-none overflow-hidden">
      
      {/* 🌟 IMAGEN DEL PATRÓN: Cargando el asset exacto (Recurso 22) y centrándolo */}
      <img 
        src={`${BUCKET_URL}Recurso%2022.png`}
        alt="Neon Line Pattern Background"
        // 🌟 Posicionamiento exacto: 'object-contain' asegura que el asset completo se muestre centrado sin recorte
        className="w-full h-full object-contain opacity-40 select-none"
      />

    </div>
  );
}
```

## src\components\ui\feature-carousel.tsx
```tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FireIcon,
  ZapIcon,
  DropletIcon,
  CloudIcon,
  EyeIcon,
  Shield01Icon,
  StarIcon,
  MagicWandIcon,
  PackageIcon,
  CircleIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "../../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";

// Customized for Sasori Labs / HoloCard Pokémon Branding
const FEATURES = [
  {
    id: "authentication",
    label: "Holo-Shield™ Auth",
    icon: Shield01Icon,
    image: "/Imagenes/ME03_ES_14.png",
    description: "Multi-point verification for every high-value asset.",
  },
  {
    id: "market",
    label: "Live Market Flux",
    icon: FireIcon,
    image: "/Imagenes/ME03_ES_19.png",
    description: "Real-time pricing data synced from global exchanges.",
  },
  {
    id: "vault",
    label: "Physical Vaulting",
    icon: PackageIcon,
    image: "/Imagenes/ME03_ES_22.png",
    description: "Temperature-controlled secure storage for your grails.",
  },
  {
    id: "curation",
    label: "Expert Curation",
    icon: EyeIcon,
    image: "/Imagenes/ME03_ES_28.png",
    description: "Seasoned collectors hand-picking every inventory item.",
  },
  {
    id: "glow",
    label: "Holo-Glow Display",
    icon: MagicWandIcon,
    image: "/Imagenes/ME03_ES_6.png",
    description: "Premium digital showcases for your rare findings.",
  },
];

const AUTO_PLAY_INTERVAL = 4000;
const ITEM_HEIGHT = 65;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function FeatureCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentIndex =
    ((step % FEATURES.length) + FEATURES.length) % FEATURES.length;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + FEATURES.length) % FEATURES.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = FEATURES.length;

    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;

    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <div className="w-full max-w-7xl mx-auto md:p-8 py-20 px-4">
      <div className="relative overflow-hidden rounded-[2.5rem] lg:rounded-[4rem] flex flex-col lg:flex-row min-h-[600px] lg:aspect-video border border-white/10 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
        <div className="w-full lg:w-[40%] min-h-[350px] md:min-h-[450px] lg:h-full relative z-30 flex flex-col items-start justify-center overflow-hidden px-8 md:px-16 lg:pl-16 bg-red-600">
          <div className="absolute inset-x-0 top-0 h-12 md:h-20 lg:h-16 bg-gradient-to-b from-red-600 via-red-600/80 to-transparent z-40" />
          <div className="absolute inset-x-0 bottom-0 h-12 md:h-20 lg:h-16 bg-gradient-to-t from-red-600 via-red-600/80 to-transparent z-40" />
          
          <div className="relative w-full h-full flex items-center justify-center lg:justify-start z-20">
            {FEATURES.map((feature, index) => {
              const isActive = index === currentIndex;
              const distance = index - currentIndex;
              const wrappedDistance = wrap(
                -(FEATURES.length / 2),
                FEATURES.length / 2,
                distance
              );

              return (
                <motion.div
                  key={feature.id}
                  style={{
                    height: ITEM_HEIGHT,
                    width: "fit-content",
                  }}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: 1 - Math.abs(wrappedDistance) * 0.35,
                    scale: isActive ? 1.1 : 0.9,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 90,
                    damping: 22,
                    mass: 1,
                  }}
                  className="absolute flex items-center justify-start"
                >
                  <button
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className={cn(
                      "relative flex items-center gap-4 px-6 md:px-10 lg:px-8 py-3.5 md:py-5 lg:py-4 rounded-full transition-all duration-700 text-left group border",
                      isActive
                        ? "bg-white text-red-600 border-white z-10 shadow-xl"
                        : "bg-transparent text-white/50 border-white/10 hover:border-white/40 hover:text-white"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center transition-colors duration-500",
                        isActive ? "text-red-600" : "text-white/40"
                      )}
                    >
                      <HugeiconsIcon
                        icon={feature.icon}
                        size={18}
                        strokeWidth={2}
                      />
                    </div>

                    <span className="font-black text-xs md:text-sm tracking-widest whitespace-nowrap uppercase italic">
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-[500px] md:min-h-[600px] lg:h-full relative bg-black/40 flex items-center justify-center py-16 md:py-24 lg:py-16 px-6 md:px-12 lg:px-10 overflow-hidden border-t lg:border-t-0 lg:border-l border-white/5">
          <div className="relative w-full max-w-[420px] aspect-[4/5] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";

              return (
                <motion.div
                  key={feature.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -120 : isNext ? 120 : 0,
                    scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.6,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.3 : 0,
                    rotate: isPrev ? -5 : isNext ? 5 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 rounded-[2.5rem] overflow-hidden border-4 md:border-8 border-[#09090b] bg-zinc-900 shadow-2xl"
                >
                  <img
                    src={feature.image}
                    alt={feature.label}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-1000",
                      isActive
                        ? "grayscale-0 scale-100"
                        : "grayscale scale-110 brightness-50 contrast-125"
                    )}
                  />

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="absolute inset-x-0 bottom-0 p-8 pt-32 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end pointer-events-none"
                      >
                        <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] w-fit shadow-lg mb-3 italic">
                          PROTOCOL_{index + 1} • {feature.label}
                        </div>
                        <p className="text-white font-black italic text-xl md:text-3xl leading-[0.9] tracking-tighter uppercase drop-shadow-lg">
                          {feature.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className={cn(
                      "absolute top-8 left-8 flex items-center gap-3 transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_15px_#dc2626]" />
                    <span className="text-white font-bold text-[10px] uppercase tracking-[0.3em] font-mono italic">
                      SECURE_NODE_0{index + 1}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
```

## src\components\ui\FeatureIconsBanner.tsx
```tsx
import React from 'react';

export default function FeatureIconsBanner() {
  // URLs reales proporcionadas en orden
  const icons = [
    { 
      id: 1, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2018.png", 
      alt: "Confianza y Garantía" 
    },
    { 
      id: 2, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2013.png", 
      alt: "Novedades y Destacados" 
    },
    { 
      id: 3, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Envios.png", 
      alt: "Envíos Rápidos" 
    },
    { 
      id: 4, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2025.png", 
      alt: "Compra Segura" 
    }
  ];

  return (
    <div className="w-full py-16 my-8 flex items-center justify-center">
      <div className="max-w-5xl w-full flex justify-between md:justify-around items-center px-4 md:px-12 gap-4">
        {icons.map((icon) => (
          <div key={icon.id} className="group cursor-pointer flex justify-center w-1/4">
            <img 
              src={icon.src} 
              alt={icon.alt} 
              // Tamaños escalables y efecto hover con brillo azul cyan para que resalte
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 object-contain transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.5)] opacity-80 group-hover:opacity-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## src\components\ui\FloatingChatBot.tsx
```tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatbotConfig {
  id: string;
  is_active: boolean;
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  quick_replies: string[];
}

interface Message {
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

export default function FloatingChatBot() {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConfig();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_config')
        .select('*')
        .single();

      if (!error && data) {
        setConfig(data);
        setMessages([
          {
            sender: 'bot',
            text: data.welcome_message,
            timestamp: new Date()
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading chatbot config:', err);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  if (!config || !config.is_active) {
    return null;
  }

  const getFAQAnswer = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('pedido') || q.includes('dónde') || q.includes('donde') || q.includes('localizar')) {
      return "📦 Para localizar tu pedido en tiempo real, por favor introduce tu código de seguimiento de HoloCards (ej. `#HC-48293`) o inicia sesión en el menú superior para ver tu historial de envíos.";
    }
    if (q.includes('envío') || q.includes('envio') || q.includes('política') || q.includes('canarias') || q.includes('islas')) {
      return "✈️ Realizamos envíos diarios asegurados a todas las Islas Canarias. Los tiempos de entrega estimados son de 24h a 48h en islas capitalinas y hasta 72h en islas no capitalinas.";
    }
    if (q.includes('humano') || q.includes('hablar') || q.includes('persona') || q.includes('soporte')) {
      return "👨‍💻 Entendido. He enviado una alerta a la central de Sasori Labs. Un agente humano se pondrá en contacto contigo en este mismo chat en breve. ¡Gracias por tu paciencia!";
    }
    return "💡 ¡Excelente pregunta! He registrado tu consulta y la he derivado a nuestro soporte técnico. Si necesitas una respuesta inmediata, te sugiero utilizar nuestros accesos rápidos o escribir directamente a soporte@holocards.com.";
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const cleanText = text.trim();
    const userMsg: Message = {
      sender: 'user',
      text: cleanText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const botReplyText = getFAQAnswer(cleanText);
      const botMsg: Message = {
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      <div className="fixed bottom-6 right-4 sm:right-6 z-[200] safe-bottom">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all group"
          style={{ 
            backgroundColor: config.primary_color,
            boxShadow: `0 8px 30px ${config.primary_color}44` 
          }}
          title={`Chat con ${config.bot_name}`}
          aria-label={`Abrir chat con ${config.bot_name}`}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-90 duration-300" />
          ) : (
            <MessageSquare className="w-6 h-6 transition-transform hover:scale-110 duration-200" />
          )}

          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20 pointer-events-none" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-2 sm:right-6 w-[calc(100vw-16px)] sm:w-[400px] h-[75vh] sm:h-[550px] max-h-[600px] bg-background/95 dark:bg-zinc-950/95 border border-border/80 rounded-[2.5rem] shadow-2xl z-[200] overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div 
              className="p-5 flex items-center justify-between text-white"
              style={{ backgroundColor: config.primary_color }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative border border-white/10">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase italic tracking-wider leading-none">
                    {config.bot_name}
                  </h3>
                  <p className="text-[9px] uppercase tracking-widest text-white/70 font-mono mt-1">
                    Soporte Inteligente
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all"
                title="Minimizar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex gap-3 max-w-[85%] items-end",
                    msg.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-xs shadow-sm",
                    msg.sender === 'user' 
                      ? "bg-slate-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200" 
                      : "bg-white dark:bg-zinc-900 border-border"
                  )}
                  style={{
                    color: msg.sender === 'user' ? undefined : config.primary_color,
                    borderColor: msg.sender === 'user' ? undefined : `${config.primary_color}22`
                  }}
                  >
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div 
                    className={cn(
                      "p-4 text-xs leading-relaxed shadow-sm font-medium",
                      msg.sender === 'user' 
                        ? "text-white rounded-[1.5rem] rounded-br-none" 
                        : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-border/50 rounded-[1.5rem] rounded-bl-none"
                    )}
                    style={{
                      backgroundColor: msg.sender === 'user' ? config.primary_color : undefined
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%] items-end">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-white dark:bg-zinc-900 shrink-0 shadow-sm"
                    style={{ color: config.primary_color }}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 bg-white dark:bg-zinc-900 border border-border/50 rounded-[1.5rem] rounded-bl-none shadow-sm flex items-center gap-1.5 min-w-[60px]">
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {config.quick_replies && config.quick_replies.length > 0 && (
              <div className="p-4 border-t border-border/50 bg-slate-50/20 dark:bg-black/10 flex flex-wrap gap-2 shrink-0">
                {config.quick_replies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(reply)}
                    className="px-3.5 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-border/70 rounded-full text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:scale-[1.02] shadow-sm flex items-center"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-4 border-t border-border/80 bg-background flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-slate-100 dark:bg-zinc-900 border border-border rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/10"
                style={{ backgroundColor: config.primary_color }}
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

## src\components\ui\HomePageContent.tsx
```tsx
import { useState } from "react";
import HeaderV2 from "../layout/HeaderV2";
import { InteractiveHero } from "../ui/InteractiveHero";
import AnnouncementBar from "../layout/AnnouncementBar";

export default function HomePageContent() {
  const [showFranchise, setShowFranchise] = useState(false);

  const navigateToHome = () => {
    setShowFranchise(false);
  };

  const navigateToFranchise = () => {
    setShowFranchise(true);
  };

  return (
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col">
      <div className="shrink-0">
        <AnnouncementBar />
        <HeaderV2 onHomeClick={navigateToHome} onFranchiseClick={navigateToFranchise} />
      </div>
      
      <main className="flex-grow relative">
        <InteractiveHero 
          isHomePage={!showFranchise} 
          onFranchiseTabClick={() => setShowFranchise(true)}
        />
      </main>
    </div>
  );
}
```

## src\components\ui\input.tsx
```tsx
// Input.tsx
import * as React from "react"
import { cn } from "../../lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

## src\components\ui\InteractiveHero.tsx
```tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { 
  ShoppingCart, 
  ArrowRight, 
  Star, 
  RotateCcw, 
  X, 
  Truck,
  ShieldCheck,
  Award,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Lock
} from "lucide-react"
import { useCartStore } from "../../lib/cartStore"
import { Toast } from "./Toast"
import { getRealPrice } from "../../lib/utils"
import { supabase } from "../../lib/supabase"

type ProductCard = { 
  id: string; 
  imgUrl: string;
  extraImages: string[];
  name: string; 
  description: string;
  set: string;
  gameId?: string;
  rating: number;
  price: number;
  category: string;
  categoriesList: string[]; 
  rawCategory: any; 
  collection?: string;
  collectionIds: string[];
  collectionsList: string[];
  sku?: string;
}

type CollectionDb = {
  id: string;
  name: string;
}

const TAB_LOGOS: Record<string, string> = {
  "Pokémon TCG": "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/TCG%20LOGO%20FONDO%20AZUL.png",
  "Magic The Gathering": "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/magic-logo.webp",
  "One Piece TCG": "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/onepiece.png"
}

const sloganMap: Record<string, { main: string; sub: string }> = {
  "Pokémon TCG": { main: "Entrena a tus Pokémon", sub: "Y adéntrate al combate" },
  "Magic The Gathering": { main: "Aniquila a tus rivales", sub: "Y sé parte del mundo de MTG" },
  "One Piece TCG": { main: "A por el One PIECE", sub: "Reúne a tu equipo y batalla" },
  "Accesorios": { main: "Todo lo que necesitas", sub: "Para tus juegos TCG" },
}

const FEATURES = [
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2011.png", title: "100% Seguro", description: "Transacciones protegidas" },
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2013.png", title: "Calidad Asegurada", description: "Productos originales" },
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Envios.png", title: "Envíos a Canarias", description: "Rápido y sin aduanas sorpresa" },
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2025.png", title: "Conoce nuestro Stock", description: "Miles de cartas disponibles" }
]

const tabs = ["Pokémon TCG", "Magic The Gathering", "One Piece TCG", "Accesorios"]

interface InteractiveHeroProps {
  isHomePage?: boolean;
  onFranchiseTabClick?: () => void;
}

// Helpers locales
const normalizeText = (text: string = "") => {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const findValueByKeywords = (obj: any, keywords: string[]) => {
  if (!obj || typeof obj !== 'object') return null;
  const keys = Object.keys(obj);
  for (let key of keys) {
    const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (keywords.some(kw => normalizedKey.includes(kw))) {
      return obj[key];
    }
  }
  return null;
};

export function InteractiveHero({ isHomePage = true, onFranchiseTabClick }: InteractiveHeroProps) {
  const [activeTab, setActiveTab] = useState<string>(isHomePage ? "HomePageMode" : tabs[0])
  const [activeProduct, setActiveProduct] = useState<(ProductCard & { uniqueId: string }) | null>(null)
  const [isModalFlipped, setIsModalFlipped] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const [dbProducts, setDbProducts] = useState<ProductCard[]>([])
  const [dbCollections, setDbCollections] = useState<CollectionDb[]>([])
  const [dbGames, setDbGames] = useState<any[]>([])
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(["Todos"])
  
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")
  const [highlightType, setHighlightType] = useState<string>("")
  const [isHighlightDropdownOpen, setIsHighlightDropdownOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("Todos")

  const [carouselPage, setCarouselPage] = useState(0)

  const addItem = useCartStore((state) => state.addItem)
  const isInicioQuirurgico = activeTab === "HomePageMode";

  useEffect(() => {
    if (isHomePage) {
      setActiveTab("HomePageMode");
      setSelectedCategory("Todos");
    } else if (activeTab === "HomePageMode") {
      setActiveTab(tabs[0]);
      setSelectedCategory("Todos");
    }
  }, [isHomePage]);

  useEffect(() => {
    setCarouselPage(0);
  }, [activeTab, selectedCategory, highlightType, selectedCollectionId]);

  const fetchBackendData = async () => {
    try {
      if (!supabase) return;

      const { data: cols, error: colError } = await supabase.from('tags').select('*');
      let collectionsList: CollectionDb[] = [];

      if (!colError && cols && cols.length > 0) {
        collectionsList = cols.map((c: any) => ({
          id: String(c.id),
          name: String(c.name || c.nombre || c.title || "Colección").toUpperCase()
        }));
        setDbCollections(collectionsList);

        if (!selectedCollectionId || !collectionsList.some(c => c.id === selectedCollectionId)) {
          setSelectedCollectionId(collectionsList[0].id);
          setHighlightType(collectionsList[0].name);
        }
      }

      const [prodsRes, catRes, gamesRes, prodColsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('categories').select('*, games(name)'),
        supabase.from('games').select('*'),
        supabase.from('product_tags').select('*').then(res => res.error ? { data: [] } : res)
      ]);

      const prods = prodsRes.data || [];
      const dbCategories = catRes.data || [];
      const gamesList = gamesRes.data || [];
      const prodColsPivot = prodColsRes.data || [];
      setDbGames(gamesList);

      const collectionIdToName = new Map<string, string>();
      collectionsList.forEach(c => collectionIdToName.set(c.id, c.name));

      const prodToColIdsMap = new Map<string, Set<string>>();
      const prodToColNamesMap = new Map<string, Set<string>>();

      prodColsPivot.forEach((pc: any) => {
        const pId = String(pc.product_id);
        const cId = String(pc.tag_id);

        if (!prodToColIdsMap.has(pId)) prodToColIdsMap.set(pId, new Set());
        prodToColIdsMap.get(pId)!.add(cId);

        if (collectionIdToName.has(cId)) {
          if (!prodToColNamesMap.has(pId)) prodToColNamesMap.set(pId, new Set());
          prodToColNamesMap.get(pId)!.add(collectionIdToName.get(cId)!);
        }
      });

      const categoryIdToName = new Map<string, string>();
      dbCategories.forEach((cat: any) => {
        if (cat.id && cat.name) {
          categoryIdToName.set(cat.id, cat.name);
        }
      });

      let formattedProducts = prods.map((p: any) => {
        let rawImg = findValueByKeywords(p, ["imag", "img", "portad", "thumb", "foto", "pic", "image_url"]);
        let finalImg = rawImg || "";
        if (Array.isArray(finalImg)) finalImg = finalImg[0];
        if (typeof finalImg === 'object' && finalImg !== null) finalImg = Object.values(finalImg)[0];

        const extractedCategories = new Set<string>();
        if (p.category_id && categoryIdToName.has(p.category_id)) {
          const resolvedName = categoryIdToName.get(p.category_id)!;
          if (resolvedName.toUpperCase() !== "GENERAL") {
            extractedCategories.add(resolvedName);
          }
        }

        if (extractedCategories.size === 0) {
          let rawCat = findValueByKeywords(p, ["categor", "tag", "taxonom", "tipo", "label"]);
          const parseItem = (item: any) => {
            if (!item) return;
            if (typeof item === 'string') {
              if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(item)) return;
              item.split(',').forEach((sub: string) => {
                const clean = sub.trim();
                if (clean && clean.toUpperCase() !== "GENERAL") extractedCategories.add(clean);
              });
            } else if (typeof item === 'object' && item !== null) {
              const name = item.name || item.nombre || item.label || item.value || Object.values(item)[0];
              if (name && typeof name === 'string') {
                name.split(',').forEach((sub: string) => {
                  const clean = sub.trim();
                  if (clean && clean.toUpperCase() !== "GENERAL") extractedCategories.add(clean);
                });
              }
            }
          };

          if (Array.isArray(rawCat)) rawCat.forEach(parseItem);
          else parseItem(rawCat);
        }

        const catArray = Array.from(extractedCategories);
        const extractedColIds = prodToColIdsMap.get(String(p.id)) || new Set<string>();
        const extractedColNames = prodToColNamesMap.get(String(p.id)) || new Set<string>();

        if (p.collection_id) {
          extractedColIds.add(String(p.collection_id));
          if (collectionIdToName.has(String(p.collection_id))) {
            extractedColNames.add(collectionIdToName.get(String(p.collection_id))!);
          }
        }

        let rawColField = findValueByKeywords(p, ["collect", "coleccion", "tags", "etiqueta", "destacado"]);
        const parseColItem = (item: any) => {
          if (!item) return;
          if (typeof item === 'string') {
            item.split(',').forEach(sub => {
              const clean = sub.trim();
              if (clean) extractedColNames.add(clean.toUpperCase());
            });
          } else if (typeof item === 'object' && item !== null) {
            const name = item.name || item.nombre || item.label || item.value;
            if (name && typeof name === 'string') extractedColNames.add(name.trim().toUpperCase());
          }
        };

        if (Array.isArray(rawColField)) rawColField.forEach(parseColItem);
        else parseColItem(rawColField);

        const colArray = Array.from(extractedColNames);
        let rawSet = findValueByKeywords(p, ["franchis", "franquici", "brand", "marca", "juego", "linea", "set"]) || "";

        const extraImgs: string[] = [];
        const addIfNew = (img: any) => {
          if (img && typeof img === 'string' && img !== finalImg && !extraImgs.includes(img)) extraImgs.push(img);
        };
        if (Array.isArray(p.top_hits_images)) p.top_hits_images.forEach(addIfNew);
        else if (Array.isArray(p.images)) p.images.forEach(addIfNew);
        else if (Array.isArray(p.gallery)) p.gallery.forEach(addIfNew);

        return {
          id: String(p.id),
          imgUrl: finalImg,
          extraImages: extraImgs,
          name: p.name || p.title || p.producto || "Producto TCG",
          description: p.description || p.details || "",
          set: typeof rawSet === 'string' ? rawSet : JSON.stringify(rawSet),
          gameId: p.game_id || p.gameId || null,
          rating: p.rating || 5.0,
          price: Number(getRealPrice(p)) || 0,
          category: catArray[0] || "",
          categoriesList: catArray,
          rawCategory: catArray[0] || null,
          collection: colArray[0] || "",
          collectionIds: Array.from(extractedColIds),
          collectionsList: colArray,
          sku: p.sku || ""
        };
      });

      setDbProducts(formattedProducts);

      if (!isHomePage) {
        const categoriesWithProducts = new Set<string>();
        formattedProducts.forEach(p => {
          p.categoriesList.forEach(c => {
            if (c) categoriesWithProducts.add(c.trim().toLowerCase());
          });
        });

        const currentGame = gamesList.find((g: any) => {
          const gName = normalizeText(g.name);
          const tabNorm = normalizeText(activeTab);
          return gName.includes(tabNorm) || tabNorm.includes(gName);
        });

        let officialCategories: string[] = [];
        if (currentGame) {
          officialCategories = dbCategories
            .filter((c: any) => c.game_id === currentGame.id)
            .map((c: any) => c.name);
        }

        if (officialCategories.length === 0) {
          const catSet = new Set<string>();
          formattedProducts.forEach(p => {
            p.categoriesList.forEach(c => { if (c) catSet.add(c); });
          });
          officialCategories = Array.from(catSet);
        }

        const activeCategoriesOnly = officialCategories.filter(catName => 
          categoriesWithProducts.has(catName.trim().toLowerCase())
        );

        setDynamicCategories(["Todos", ...activeCategoriesOnly.sort()]);
      }

    } catch (error) {
      console.error("Error procesando datos del backend:", error);
      setDbProducts([]);
    }
  };

  useEffect(() => {
    fetchBackendData();

    if (!supabase) return;

    const channel = supabase
      .channel('realtime-hero-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchBackendData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => fetchBackendData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_tags' }, () => fetchBackendData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHomePage]);

  const currentCards = useMemo(() => {
    let cards = dbProducts;

    if (isHomePage) {
      if (!selectedCollectionId && !highlightType) return [];

      const targetColNorm = normalizeText(highlightType);

      let filtered = cards.filter(p => {
        const matchesId = selectedCollectionId && p.collectionIds.includes(selectedCollectionId);
        if (matchesId) return true;

        const matchesName = p.collectionsList.some(colName => {
          const colNorm = normalizeText(colName);
          return colNorm === targetColNorm || colNorm.includes(targetColNorm) || targetColNorm.includes(colNorm);
        });
        if (matchesName) return true;

        const fullProdStr = normalizeText(`${p.name} ${p.description} ${p.collection} ${JSON.stringify(p.collectionsList)}`);
        return fullProdStr.includes(targetColNorm);
      });

      if (filtered.length === 0) {
        return cards;
      }

      return filtered;
    }

    const currentGame = dbGames.find((g: any) => {
      const gName = normalizeText(g.name);
      const tabNorm = normalizeText(activeTab);
      return gName.includes(tabNorm) || tabNorm.includes(gName);
    });

    const keywordMap: Record<string, string[]> = {
      "Pokémon TCG": ["poke", "pokémon", "pokemon"],
      "Magic The Gathering": ["magic", "mtg", "gathering"],
      "One Piece TCG": ["piece", "one piece", "op"],
      "Accesorios": ["acces", "fundas", "sleeves", "deckbox", "carpetas", "binder", "toploader"]
    };

    const currentFranchiseKeywords = keywordMap[activeTab] || ["poke"];

    cards = cards.filter(card => {
      if (currentGame && card.gameId === currentGame.id) return true;

      const prodDataStr = normalizeText(`${card.set} ${card.sku} ${card.category} ${card.categoriesList.join(" ")} ${JSON.stringify(card.rawCategory)}`);
      return currentFranchiseKeywords.some(kw => prodDataStr.includes(kw));
    });

    if (selectedCategory !== "Todos") {
      const selNorm = normalizeText(selectedCategory);

      cards = cards.filter(card => {
        return card.categoriesList.some(c => normalizeText(c) === selNorm);
      });
    }

    return cards;
  }, [selectedCategory, activeTab, isHomePage, highlightType, selectedCollectionId, dbProducts, dbGames]);

  const visibleCards = useMemo(() => {
    const startIndex = carouselPage * 4;
    return currentCards.slice(startIndex, startIndex + 4);
  }, [currentCards, carouselPage]);

  const maxPages = Math.ceil(currentCards.length / 4);

  const handleNextPage = () => {
    if (carouselPage < maxPages - 1) {
      setCarouselPage(prev => prev + 1);
    } else {
      setCarouselPage(0);
    }
  };

  const handlePrevPage = () => {
    if (carouselPage > 0) {
      setCarouselPage(prev => prev - 1);
    } else {
      setCarouselPage(Math.max(0, maxPages - 1));
    }
  };

  const closeModal = () => {
    setActiveProduct(null);
    setSelectedImageIndex(0);
    setTimeout(() => setIsModalFlipped(false), 300);
  };

  const allProductImages = useMemo(() => {
    if (!activeProduct) return [];
    const imgs: string[] = [];
    if (activeProduct.imgUrl) imgs.push(activeProduct.imgUrl);
    activeProduct.extraImages.forEach(img => { if (!imgs.includes(img)) imgs.push(img); });
    return imgs;
  }, [activeProduct]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [activeProduct?.id]);

  const handleAddToCart = (card: ProductCard) => {
    const cardPrice = Number(card.price) || 0;
    addItem({
      id: card.id, name: card.name, price: cardPrice,
      image_url: card.imgUrl, rarity: card.category || card.categoriesList[0] || 'Rare', set: card.set, stock: 10
    }, 1);
    setShowToast(true);
  };

  const handleTabClick = (tab: string) => {
    if (tab === "One Piece TCG") return;
    setActiveTab(tab);
    setSelectedCategory("Todos");
    if (onFranchiseTabClick) {
      onFranchiseTabClick();
    }
  };

  const currentSlogan = sloganMap[activeTab] || sloganMap["Pokémon TCG"]

  const renderTabs = () => {
    return tabs.map((tab) => {
      const hasLogo = Boolean(TAB_LOGOS[tab]);
      const isSelected = activeTab === tab;
      const isOnePiece = tab === "One Piece TCG";

      return (
        <div key={tab} className="relative flex flex-col items-center group">
          {isOnePiece && (
            <div className="absolute bottom-[100%] mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex justify-center w-full min-w-max">
              <span className="bg-yellow-400/90 backdrop-blur-sm text-black text-[9px] sm:text-[10px] font-black uppercase tracking-tight py-0.5 px-2.5 rounded-full text-center shadow-[0_4px_15px_rgba(250,204,21,0.5)] whitespace-nowrap flex items-center gap-1">
                <Lock className="w-2.5 h-2.5"/> PROXIMAMENTE
              </span>
            </div>
          )}

          <button
            onClick={() => handleTabClick(tab)}
            disabled={isOnePiece}
            className={`relative px-4 sm:px-6 md:px-7 h-[38px] sm:h-[46px] md:h-[52px] rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center ${
              isOnePiece
                ? "opacity-75 cursor-not-allowed bg-black/50 border border-white/10"
                : isSelected 
                ? "text-black translate-y-[4px]" 
                : "bg-gradient-to-b from-[#1c2e4a] to-[#0a1222] border border-[#2c446b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_0_#02040a,0_6px_10px_rgba(0,0,0,0.6)] text-gray-300 hover:text-white hover:brightness-110 active:translate-y-[4px]"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="active-tab-bg"
                className="absolute inset-0 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.3),0_0_15px_rgba(250,204,21,0.6)] border border-yellow-200"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            <span className="relative z-10 flex items-center justify-center w-full h-full">
              {hasLogo ? (
                <img 
                  src={TAB_LOGOS[tab]} 
                  alt={tab} 
                  className={`w-auto object-contain transition-all duration-300 ${
                    tab === "Pokémon TCG" ? "h-[29px] sm:h-[34px] md:h-[38px]" : 
                    tab === "Magic The Gathering" ? "h-[16px] sm:h-[20px] md:h-[23px]" : 
                    tab === "One Piece TCG" ? "h-[34px] sm:h-[41px] md:h-[46px] max-w-[140px] sm:max-w-[190px] scale-135 brightness-125" : "h-6" 
                  } ${
                    isSelected 
                      ? "brightness-100 filter-none drop-shadow-md" 
                      : "brightness-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:brightness-125"
                  }`}
                />
              ) : (
                <span className={`text-[11px] sm:text-sm md:text-base font-black tracking-tight whitespace-nowrap ${
                  isSelected ? "" : "drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
                }`}>
                  {tab}
                </span>
              )}
            </span>
          </button>
        </div>
      );
    });
  };

  return (
    <div className={`w-full flex flex-col relative overflow-hidden ${isInicioQuirurgico ? 'pt-2 pb-2 gap-2' : 'h-[calc(100vh-80px)] min-h-[550px] pt-2 pb-2'}`}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <img 
        src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Fondos/Fondo.webp"
        alt="Fondo Holocards"
        className="absolute inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none mix-blend-screen"
      />

      {isInicioQuirurgico ? (
        <div className="relative z-20 w-full px-4 sm:px-12 mt-3 lg:mt-4 flex flex-col gap-1 transition-all">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-2 w-full">
            <div className="flex items-center justify-center xl:justify-start w-full xl:w-auto xl:flex-1 min-w-0 z-40">
              <div className="relative">
                <button 
                  onClick={() => setIsHighlightDropdownOpen(!isHighlightDropdownOpen)}
                  className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors group"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400"/>
                  <h2 className="text-base sm:text-lg lg:text-xl font-black uppercase tracking-tight m-0 leading-none whitespace-nowrap">
                    {highlightType || "SELECCIONAR COLECCIÓN"}
                  </h2>
                  <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-transform ${isHighlightDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isHighlightDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-3 w-64 bg-[#0a1628]/95 backdrop-blur-xl border border-yellow-400/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden z-50 flex flex-col"
                    >
                      {dbCollections.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            setSelectedCollectionId(col.id);
                            setHighlightType(col.name);
                            setIsHighlightDropdownOpen(false);
                          }}
                          className={`text-left px-4 py-3 text-sm font-bold transition-colors border-b last:border-0 border-white/5 uppercase tracking-wider ${
                            highlightType === col.name ? "text-yellow-400 bg-white/5" : "text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-300"
                          }`}
                        >
                          {col.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex justify-center shrink-0 z-30 w-full xl:w-auto mt-2 xl:mt-0">
              <div className="flex flex-wrap sm:flex-nowrap justify-center items-center gap-3 sm:gap-4 p-2 relative">
                {renderTabs()}
              </div>
            </div>

            <div className="hidden xl:flex xl:flex-1 min-w-0 justify-end items-center pr-4 xl:pr-8 z-30 pointer-events-none">
              <motion.img
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Iso%20Transparente.png"
                alt="HoloCards Iso"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="h-[84px] xl:h-[120px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-20 w-full px-4 sm:px-12 mt-4 lg:mt-6 flex flex-col gap-4 lg:gap-6 transition-all">
          <div className="flex justify-center shrink-0 z-30 w-full">
            <div className="flex flex-wrap sm:flex-nowrap justify-center items-center gap-3 sm:gap-4 p-2 relative">
              {renderTabs()}
            </div>
          </div>
          
          <div className="flex justify-center w-full z-30 relative">
            <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto hide-scrollbar w-full px-4 sm:px-10 py-1 scroll-smooth">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border ${
                    selectedCategory === cat
                      ? "bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                      : "bg-transparent text-gray-400 hover:text-white border-white/5 hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-10 z-20 my-4 flex items-center justify-center">
        <button
          type="button"
          onClick={handlePrevPage}
          className="absolute -left-2 md:left-2 top-1/2 -translate-y-1/2 p-2 hover:scale-110 transition-transform shrink-0 z-40 active:scale-95 group"
          title="Anterior"
        >
          <motion.img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Triangulo.png"
            alt="Anterior"
            animate={{ x: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-10 h-10 sm:w-13 sm:h-13 object-contain rotate-90 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] group-hover:drop-shadow-[0_0_18px_rgba(250,204,21,0.9)] transition-all"
          />
        </button>

        <div className="w-full flex justify-center items-center py-2">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${activeTab}-${selectedCategory}-${carouselPage}-${highlightType}-${selectedCollectionId}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full"
            >
              {visibleCards.length > 0 ? (
                visibleCards.map((card, index) => {
                  const uniqueId = `${card.id}-${index}-${carouselPage}`;
                  const cardPrice = Number(card.price) || 0;
                  
                  return (
                    <div 
                      key={uniqueId} 
                      className="flex flex-col w-[150px] sm:w-[170px] md:w-[185px] shrink-0 bg-[#0a1628]/85 backdrop-blur-md rounded-2xl border border-white/10 p-2.5 hover:border-yellow-400/60 hover:bg-[#0a1628]/95 transition-all duration-300 group shadow-2xl"
                    >
                      <motion.div 
                        layoutId={`hero-product-image-${uniqueId}`}
                        onClick={() => {
                          setIsModalFlipped(false);
                          setActiveProduct({ ...card, uniqueId });
                        }}
                        className="w-full h-24 sm:h-28 bg-[#030c1a] rounded-xl overflow-hidden relative shrink-0 cursor-zoom-in p-1.5 flex items-center justify-center"
                      >
                        {card.imgUrl ? (
                          <img 
                            src={card.imgUrl} 
                            alt={card.name} 
                            className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#0a1628] rounded-xl border border-white/5">
                            <span className="text-gray-600 font-black text-[10px] uppercase text-center px-2">Sin Imagen</span>
                          </div>
                        )}
                      </motion.div>

                      <div className="mt-2 flex-grow flex flex-col justify-start">
                        <h3 className="text-white font-bold text-xs sm:text-sm leading-tight group-hover:text-yellow-400 transition-colors line-clamp-1">
                          {card.name}
                        </h3>
                        
                        <p className="text-yellow-400 font-black text-sm sm:text-base mt-1.5 leading-none">
                          {cardPrice > 0 ? `${cardPrice.toFixed(2)}€` : "Consultar precio"}
                        </p>
                      </div>

                      <div className="mt-2.5 w-full flex flex-col gap-1.5 shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleAddToCart(card); 
                          }}
                          className="w-full bg-yellow-400 hover:bg-blue-600 text-black hover:text-white font-bold py-1.5 rounded-lg text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition-colors duration-300 active:scale-95 shadow-[0_0_10px_rgba(250,204,21,0.2)] uppercase tracking-wider"
                        >
                          <ShoppingCart className="w-3.5 h-3.5"/> 
                          Agregar a Carrito
                        </button>

                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsModalFlipped(false);
                            setActiveProduct({ ...card, uniqueId });
                          }}
                          className="w-full bg-transparent hover:bg-white/5 border border-white/10 hover:border-yellow-400/50 text-gray-300 hover:text-yellow-400 font-medium py-1.5 rounded-lg text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          Ver Más 
                          <ArrowRight className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="w-full py-12 flex flex-col items-center justify-center text-gray-500">
                  <LayoutGrid className="w-10 h-10 mb-2 opacity-30"/>
                  <p className="font-bold tracking-widest uppercase text-xs text-center">Cargando productos...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleNextPage}
          className="absolute -right-2 md:right-2 top-1/2 -translate-y-1/2 p-2 hover:scale-110 transition-transform shrink-0 z-40 active:scale-95 group"
          title="Siguiente"
        >
          <motion.img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Triangulo.png"
            alt="Siguiente"
            animate={{ x: [5, -5, 5] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-10 h-10 sm:w-13 sm:h-13 object-contain -rotate-90 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] group-hover:drop-shadow-[0_0_18px_rgba(250,204,21,0.9)] transition-all"
          />
        </button>
      </div>

      {!isInicioQuirurgico && (
        <motion.div 
          key={activeTab} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 text-center mt-3 mb-4 px-4 shrink-0"
        >
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight uppercase relative">
            <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] block mb-1">
              {currentSlogan.main}
            </span>
            <span className="text-white block">
              {currentSlogan.sub}
            </span>
          </h1>
        </motion.div>
      )}

      {isInicioQuirurgico && (
        <div className="relative z-20 w-screen px-12 mt-1 mb-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-4 md:p-5 bg-[#0a1628]/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl divide-y md:divide-y-0 md:divide-x divide-white/10">
            {FEATURES.map((item, index) => {
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 ${index !== 0 ? 'pt-3 md:pt-2' : ''}`}
                >
                  <div className="p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    <img 
                      src={item.iconUrl} 
                      alt={item.title} 
                      className="w-10 h-10 md:w-12 md:h-12 object-contain p-1.5"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-white font-extrabold text-xs md:text-sm tracking-tight leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-gray-400 text-[10px] md:text-xs font-light leading-tight mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
            onClick={closeModal} 
          >
            <div 
              className="relative max-w-5xl w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                layoutId={`hero-product-image-${activeProduct.uniqueId}`}
                className="relative w-full max-w-[320px] sm:max-w-sm aspect-[3/4.2] cursor-pointer group shrink-0"
                style={{ perspective: "1500px" }}
                onClick={() => setIsModalFlipped(!isModalFlipped)}
              >
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateY: isModalFlipped ? 180 : 0 }}
                  transition={{ duration: 0.7, type: "spring", stiffness: 200, damping: 25 }}
                >
                  <div 
                    className="absolute inset-0 bg-[#0a1628] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(250,204,21,0.3)] border border-yellow-400/50 flex items-center justify-center p-6 md:p-8" 
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {activeProduct.imgUrl ? (
                      <img
                        src={activeProduct.imgUrl}
                        alt={activeProduct.name}
                        className="w-full h-full object-contain filter drop-shadow-2xl" 
                      />
                    ) : (
                      <span className="text-gray-500 font-black uppercase text-sm">Sin Imagen</span>
                    )}
                    <div className="absolute bottom-4 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-xl">
                        <RotateCcw className="w-3.5 h-3.5"/> Haz clic para girar
                      </span>
                    </div>
                  </div>

                  <div 
                    className="absolute inset-0 bg-[#050914] rounded-2xl md:rounded-[2rem] overflow-hidden p-4 sm:p-5 border border-yellow-400/50 shadow-[0_0_80px_rgba(250,204,21,0.3)] flex flex-col justify-between" 
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                      <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                        {activeProduct.set}
                      </span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>
                    </div>

                    <div className="space-y-2 py-2 border-b border-white/10 text-left shrink-0">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 shrink-0">
                          <Truck className="w-4 h-4"/>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white leading-tight">Envíos a todo el país</p>
                          <p className="text-[9px] text-gray-400 font-light">Rápidos y seguros a todo el país.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 shrink-0">
                          <ShieldCheck className="w-4 h-4"/>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white leading-tight">Compra 100% segura</p>
                          <p className="text-[9px] text-gray-400 font-light">Tus datos y pagos están protegidos.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 shrink-0">
                          <Award className="w-4 h-4"/>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white leading-tight">Productos originales</p>
                          <p className="text-[9px] text-gray-400 font-light">Todos nuestros productos son oficiales.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 shrink-0 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full hover:text-white transition-colors">
                        <RotateCcw className="w-3 h-3"/> Volver a girar
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left bg-[#0a1628]/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-[2rem] shadow-2xl max-w-md w-full">
                
                <div className="relative w-full h-44 sm:h-52 bg-[#030c1a] rounded-xl overflow-hidden mb-5 border border-yellow-400/30 shadow-inner group p-2 flex items-center justify-center">
                  {allProductImages.length > 0 ? (
                    <img
                      src={allProductImages[Math.min(selectedImageIndex, allProductImages.length - 1)]}
                      alt={activeProduct.name}
                      className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-gray-500 font-black uppercase text-sm">Sin Imagen</span>
                  )}

                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-yellow-400 z-10">
                    {activeProduct.set}
                  </div>

                  {allProductImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allProductImages.length - 1); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-yellow-400 hover:text-black text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm"
                      >
                        <ChevronLeft className="w-4 h-4"/>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev < allProductImages.length - 1 ? prev + 1 : 0); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-yellow-400 hover:text-black text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm"
                      >
                        <ChevronRight className="w-4 h-4"/>
                      </button>

                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                        {allProductImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                            className={`h-1.5 rounded-full transition-all ${
                              selectedImageIndex === idx ? "bg-yellow-400 w-3" : "bg-white/40 hover:bg-white/70 w-1.5"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">
                  {activeProduct.name}
                </h2>
                <p className="text-2xl md:text-3xl font-black text-yellow-400 mb-6">
                  {(Number(activeProduct.price) || 0).toFixed(2)}€
                </p>

                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={() => handleAddToCart(activeProduct)}
                    className="w-full bg-yellow-400 hover:bg-blue-600 text-black hover:text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors duration-300 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5"/> 
                    Agregar al Carrito
                  </button>

                  <a 
                    href="/catalogo"
                    className="w-full bg-transparent hover:bg-white/5 border border-white/10 hover:border-yellow-400/50 text-gray-300 hover:text-yellow-400 font-bold uppercase tracking-widest py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    Ver Más
                    <ArrowRight className="w-4 h-4"/>
                  </a>
                </div>

              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); closeModal(); }}
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/60 backdrop-blur-md text-white p-3 rounded-full border border-white/10 hover:bg-yellow-400 hover:text-black transition-all hover:scale-110 z-50"
            >
              <X className="w-6 h-6"/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast 
        show={showToast} 
        message="¡Pieza añadida al carrito!" 
        onClose={() => setShowToast(false)} 
      />
    </div>
  )
}
```

## src\components\ui\label.tsx
```tsx
// Label.tsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root className={cn(labelVariants(), className)} ref={ref} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

## src\components\ui\product-carousel.tsx
```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { ArrowRight, ShoppingCart, Heart } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { Card as StoreCard } from '../../types';

interface Card {
  id: string;
  name: string;
  price: number;
  image: string;
  image_url?: string;
  category: string;
  rarity?: string;
}

interface ProductCarouselProps {
  cards: Card[];
}

export function ProductCarousel({ cards = [] }: ProductCarouselProps) {
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite } = useStore();
  
  if (!cards || cards.length === 0) return null;

  const displayCards = [...cards, ...cards, ...cards];
  const duration = Math.max(cards.length, 1) * 5;

  const handleAddToCart = (card: Card) => {
    const storeCard: StoreCard = {
      id: card.id,
      name: card.name,
      price: Number(card.price) || 0,
      image_url: card.image_url || card.image,
      rarity: card.rarity || card.category,
      stock: 1,
      set: 'Mystery',
      isFeatured: true
    };
    addToCart(storeCard);
  };

  const handleToggleFavorite = (card: Card) => {
    const storeCard: StoreCard = {
      id: card.id,
      name: card.name,
      price: Number(card.price) || 0,
      image_url: card.image_url || card.image,
      rarity: card.rarity || card.category,
      stock: 1,
      set: 'Mystery',
      isFeatured: true
    };
    toggleFavorite(storeCard);
  };

  return (
    <div className="relative w-full overflow-hidden py-12">
      <div className="absolute left-0 top-0 bottom-0 z-10 w-16 sm:w-32 bg-gradient-to-r from-[#09090b] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-16 sm:w-32 bg-gradient-to-l from-[#09090b] to-transparent pointer-events-none" />

      <motion.div
        className="flex gap-4 sm:gap-6 whitespace-nowrap"
        animate={{
          x: ['0%', '-33.333333%'],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: duration,
            ease: "linear",
          },
        }}
      >
        {displayCards.map((card, index) => (
          <div
            key={`${card.id}-${index}`}
            className="w-[200px] sm:w-[260px] md:w-80 group flex-shrink-0"
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/50">
              <img
                src={card.image_url || card.image}
                alt={card.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(card);
                }}
                className={cn(
                  "absolute top-4 left-4 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10",
                  isFavorite(card.id) ? "bg-red-600 text-white" : "bg-black/60 text-white/60 hover:text-white"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite(card.id) && "fill-current")} />
              </button>

              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-red-500 font-mono font-black italic text-[9px] uppercase tracking-[0.3em] mb-1 block">
                  {card.category}
                </span>
                <h3 className="text-base sm:text-xl font-black italic uppercase tracking-tighter text-white mb-0.5 sm:mb-1 truncate">
                  {card.name}
                </h3>
                <p className="text-[10px] sm:text-sm font-bold text-white/60">
                  {formatCurrency(Number(card.price) || 0)}
                </p>
              </div>
              
              <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/5 transition-colors duration-500" />
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 flex flex-col gap-2 items-center justify-center p-8 backdrop-blur-[2px]">
                <Button 
                  onClick={() => {
                    handleAddToCart(card);
                    navigate('/checkout');
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.2em] text-[8px] h-10 rounded-xl shadow-2xl shadow-red-600/40 border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all whitespace-nowrap"
                >
                  Checkout_Protocol
                  <ArrowRight className="w-3 h-3" />
                </Button>
                <Button 
                  onClick={() => handleAddToCart(card)}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-[0.2em] text-[8px] h-10 rounded-xl shadow-2xl border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all whitespace-nowrap"
                >
                  Add_To_Cart
                  <ShoppingCart className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
```

## src\components\ui\ProductCard.tsx
```tsx
import React from 'react';

interface ProductCardProps {
  name: string;
  info: string;
  price: string;
  badge?: 'NUEVO' | 'STOCK';
  imagePlaceholder?: string;
  image?: string;
}

export default function ProductCard({ name, info, price, badge, imagePlaceholder, image }: ProductCardProps) {
  const displayImage = image || imagePlaceholder;

  return (
    <div className="flex flex-col items-center group cursor-pointer w-full">
      
      {/* ─── CONTENEDOR DE LA IMAGEN ─── */}
      <div 
        className="w-full aspect-square rounded-[32px] relative flex items-center justify-center p-6 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-center bg-no-repeat bg-[length:100%_100%]"
        style={{ 
          backgroundImage: "url('https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Cuadrado%20para%20Stock.png')" 
        }}
      >
        {badge === 'NUEVO' && (
          <span className="absolute top-4 left-4 bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider z-10 shadow-lg">
            NUEVO
          </span>
        )}
        {badge === 'STOCK' && (
          <span className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider z-10 shadow-lg">
            STOCK
          </span>
        )}

        {/* Contenedor central de la imagen */}
        <div className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 z-0 drop-shadow-xl">
           {displayImage ? (
             <img src={displayImage} alt={name} className="w-full h-full object-contain" />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl">
               <span className="text-zinc-600 font-bold text-xs uppercase">HoloCards</span>
             </div>
           )}
        </div>
      </div>
      
      {/* ─── CONTENEDOR DE TEXTOS ─── */}
      <div className="flex flex-col items-center mt-5 text-center px-2">
        <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1 transition-colors group-hover:text-blue-300">
          {name}
        </h3>
        <p className="text-gray-300 text-xs md:text-sm font-light mb-0.5">
          {info}
        </p>
        <span className="text-gray-400 text-xs font-light tracking-wide">
          {price}
        </span>
      </div>
      
    </div>
  );
}
```

## src\components\ui\pulse-fit-hero.tsx
```tsx
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface ProgramCard {
  image: string;
  category: string;
  title: string;
  onClick?: () => void;
}

interface PulseFitHeroProps {
  title: string;
  subtitle: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  disclaimer?: string;
  socialProof?: {
    avatars: string[];
    text: string;
  };
  programs?: ProgramCard[];
  className?: string;
  children?: React.ReactNode;
}

export function PulseFitHero({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  disclaimer,
  socialProof,
  programs = [],
  className,
  children,
}: PulseFitHeroProps) {
  const duration = Math.max(programs.length, 1) * 5;

  return (
    <section
      className={cn(
        "relative w-full min-h-screen flex flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(9,9,11,0.5)_0%,rgba(24,24,27,0.7)_50%,rgba(9,9,11,1)_100%),url('/Imagenes/banner%201.png')] bg-cover bg-center bg-fixed",
        className
      )}
      role="banner"
      aria-label="Hero section"
    >
      {children ? (
        <div className="relative z-10 flex-1 flex items-center justify-center w-full">
          {children}
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center text-center max-w-4xl gap-8"
          >
            <h1 className="font-sans font-black italic uppercase tracking-tighter text-[#E1E0CC] text-[clamp(36px,6vw,72px)] leading-[1.1]">
              {title}
            </h1>

            <p className="font-sans font-medium uppercase tracking-widest text-[#E1E0CC] text-[clamp(14px,1.5vw,16px)] leading-[1.6] max-w-[700px]">
              {subtitle}
            </p>

            {(primaryAction || secondaryAction) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-4"
              >
                {primaryAction && (
                  <button
                    onClick={primaryAction.onClick}
                    className="flex flex-row items-center gap-2 px-8 py-4 rounded-full transition-all hover:scale-105 bg-red-600 shadow-2xl shadow-red-600/30 font-black italic uppercase tracking-widest text-xs text-white"
                  >
                    {primaryAction.label}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7 10H13M13 10L10 7M13 10L10 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}

                {secondaryAction && (
                  <button
                    onClick={secondaryAction.onClick}
                    className="px-8 py-4 rounded-full transition-all hover:scale-105 bg-white/5 border border-white/10 text-white font-black italic uppercase tracking-widest text-xs hover:bg-white/10"
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </motion.div>
            )}

            {disclaimer && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold"
              >
                {disclaimer}
              </motion.p>
            )}

            {socialProof && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-row items-center gap-3"
              >
                <div className="flex flex-row -space-x-2">
                  {socialProof.avatars.map((avatar, index) => (
                    <img
                      key={index}
                      src={avatar}
                      alt={`User ${index + 1}`}
                      className="rounded-full border-2 border-[#1a1a1a] w-10 h-10 object-cover"
                    />
                  ))}
                </div>
                <span className="font-sans font-bold uppercase tracking-wider text-white/40 text-[10px]">
                  {socialProof.text}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {programs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative z-10 w-full overflow-hidden py-10"
        >
          <div className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none w-[clamp(50px,10vw,150px)] bg-gradient-to-r from-[#09090b] to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none w-[clamp(50px,10vw,150px)] bg-gradient-to-l from-[#09090b] to-transparent" />

          <motion.div
            className="flex items-center gap-4 pl-4"
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: duration,
                ease: "linear",
              },
            }}
          >
            {[...programs, ...programs].map((program, index) => (
              <motion.div
                key={`${program.title}-${index}`}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
                onClick={program.onClick}
                className="flex-shrink-0 cursor-pointer relative overflow-hidden group w-[clamp(280px,80vw,356px)] h-[clamp(380px,60vh,480px)] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5"
              >
                <img
                  src={program.image}
                  alt={program.title}
                  className="transition-transform duration-700 group-hover:scale-110 w-full h-full object-cover"
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/80" />
                <div className="absolute bottom-0 left-0 right-0 p-8 z-20 flex flex-col gap-3">
                  <span className="font-mono font-black italic text-red-500 uppercase tracking-[0.3em] text-[10px]">
                    {program.category}
                  </span>
                  <h3 className="font-sans font-black italic uppercase tracking-tighter text-white text-[26px] leading-[1.1]">
                    {program.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
```

## src\components\ui\SectionHeading.tsx
```tsx
// SectionHeading.tsx
import React from 'react';

interface SectionHeadingProps {
  title: string;
}

export default function SectionHeading({ title }: SectionHeadingProps) {
  const starIconUrl = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Brillo%20para%20Categorias.png";

  return (
    <div className="flex items-center gap-3 mb-8">
      <img 
        src={starIconUrl} 
        alt="Estrella de Categoría" 
        className="w-6 h-6 md:w-7 md:h-7 object-contain"
      />
      <h2 className="text-white font-bold text-xl md:text-2xl uppercase tracking-wider">
        {title}
      </h2>
    </div>
  );
}
```

## src\components\ui\separator.tsx
```tsx
// Separator.tsx
"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "../../lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
```

## src\components\ui\sheet.tsx
```tsx
// Sheet.tsx
"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side: side as "top" | "right" | "bottom" | "left" }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border border-white/10 p-1">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
```

## src\components\ui\TcgCategoryMenu.tsx
```tsx
// TcgCategoryMenu.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface TcgCategoryMenuProps {
  active: string;
  setActive: (category: string) => void;
  accentColor?: 'blue' | 'yellow' | 'red';
  categories?: string[];
}

export default function TcgCategoryMenu({
  active,
  setActive,
  accentColor = 'blue',
  categories = ['BOOSTERS', 'SELLADOS', 'DECKS'],
}: TcgCategoryMenuProps) {
  const activeStyleMap = {
    blue: 'bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]',
    yellow: 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]',
    red: 'bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]',
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 my-10">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setActive(cat)}
          className={`relative px-8 py-2.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 border ${
            active === cat
              ? activeStyleMap[accentColor]
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-600'
          }`}
        >
          {active === cat && (
            <motion.span
              layoutId="tcg-category-pill"
              className="absolute inset-0 rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{cat}</span>
        </button>
      ))}
    </div>
  );
}
```

## src\components\ui\testimonials-carousel.tsx
```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

export interface Testimonial {
  text: string;
  highlight?: string;
  image: string;
  name: string;
  role: string;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  speed?: number;
  direction?: "left" | "right";
  cardHeight?: number;
  className?: string;
}

export const TestimonialsCarousel: React.FC<TestimonialsCarouselProps> = ({
  testimonials = [],
  speed = 20,
  direction = "left",
  cardHeight = 200,
  className,
}) => {
  if (!testimonials || testimonials.length === 0) return null;

  const loopTestimonials = [...testimonials, ...testimonials];

  return (
    <div className={`overflow-hidden w-full ${className || ''}`}>
      <motion.div
        animate={{
          x: direction === "left" ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          duration: Math.max(speed, 5),
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-6"
      >
        {loopTestimonials.map(({ text, highlight, image, name, role }, index) => {
          const uniqueKey = `${name}-${index}`;
          const hasHighlight = Boolean(highlight && highlight.trim().length > 0);

          return (
            <motion.div
              key={uniqueKey}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className="bg-card text-card-foreground my-3 border border-border rounded-3xl p-4 shadow-xl flex-shrink-0 w-[320px] transition-colors"
              style={{ height: cardHeight }}
            >
              <p className="text-sm leading-relaxed text-justify break-words whitespace-normal overflow-hidden">
                {hasHighlight && highlight
                  ? text.split(highlight).map((part, idx, arr) => (
                      <React.Fragment key={idx}>
                        {part}
                        {idx !== arr.length - 1 && (
                          <span className="text-red-500 dark:text-red-400 font-semibold">
                            {highlight}
                          </span>
                        )}
                      </React.Fragment>
                    ))
                  : text}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <img
                  src={image}
                  alt={name}
                  width={50}
                  height={50}
                  className="h-12 w-12 rounded-full object-cover border border-border"
                />
                <div className="flex flex-col">
                  <div className="font-bold text-sm leading-tight text-foreground">{name}</div>
                  <div className="text-xs text-muted-foreground">{role}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
```

## src\components\ui\text-marque.tsx
```tsx
'use client';

import React, { useRef, useEffect, forwardRef } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useAnimationFrame,
  useMotionValue,
} from 'framer-motion';
import { cn } from '../../lib/utils';

interface ComponentProps {
  children: string;
  baseVelocity: number;
  className?: string;
  scrollDependent?: boolean;
  delay?: number;
}

// Helper matemático inline para evitar dependencia de @motionone/utils
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const TextMarquee = forwardRef<HTMLDivElement, ComponentProps>(({
  children,
  baseVelocity = -5,
  className,
  scrollDependent = false,
  delay = 0,
}, ref) => {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], {
    clamp: false,
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef<number>(1);
  const hasStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      hasStarted.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useAnimationFrame((_, delta) => {
    if (!hasStarted.current) return;

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (scrollDependent) {
      if (velocityFactor.get() < 0) {
        directionFactor.current = -1;
      } else if (velocityFactor.get() > 0) {
        directionFactor.current = 1;
      }
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div ref={ref} className="overflow-hidden whitespace-nowrap flex flex-nowrap py-4 bg-red-600/5">
      <motion.div
        className="flex whitespace-nowrap gap-10 flex-nowrap"
        style={{ x }}
      >
        <span className={cn('block text-[8vw] font-black uppercase italic tracking-tighter', className)}>{children}</span>
        <span className={cn('block text-[8vw] font-black uppercase italic tracking-tighter', className)}>{children}</span>
        <span className={cn('block text-[8vw] font-black uppercase italic tracking-tighter', className)}>{children}</span>
        <span className={cn('block text-[8vw] font-black uppercase italic tracking-tighter', className)}>{children}</span>
      </motion.div>
    </div>
  );
});

TextMarquee.displayName = 'TextMarquee';

export default TextMarquee;
```

## src\components\ui\Toast.tsx
```tsx
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export const Toast = ({ show, message, onClose }: ToastProps) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onCloseRef.current(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] min-w-[320px]"
        >
          <div className="bg-card text-card-foreground p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tienda HoloCard</p>
                <p className="text-sm font-bold tracking-tight text-foreground">{message}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-accent hover:text-foreground rounded-lg transition-colors text-muted-foreground"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

## src\components\ui\WaveBackground.tsx
```tsx
import React from 'react';

export default function WaveBackground() {
  const totalLines = 24;
  const lineSpacing = 15;

  return (
    <div className="absolute inset-0 w-full h-full bg-black pointer-events-none z-0 overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 550"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="holocards-exact-neon-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />   
            <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.40" />  
            <stop offset="65%" stopColor="#2563eb" stopOpacity="0.30" />  
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.10" /> 
          </linearGradient>
        </defs>
        
        <g fill="none" stroke="url(#holocards-exact-neon-flow)" strokeWidth="1.3">
          {Array.from({ length: totalLines }).map((_, i) => {
            const baseY = i * lineSpacing - 100;
            
            return (
              <path
                key={i}
                d={`M -50 ${baseY + 180} 
                    C 300 ${baseY - 30}, 600 ${baseY + 60}, 950 ${baseY + 250} 
                    S 1300 ${baseY + 60}, 1550 ${baseY + 110}`}
              />
            );
          })}
        </g>
      </svg>
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-gray-950" />
    </div>
  );
}
```

## src\lib\StoreContext.tsx
```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card } from '../types';
import { fetchStorageImages } from '../services/imageSync';
import { supabase } from './supabase';
import { useCartStore } from './cartStore';

interface CartItem extends Card {
  quantity: number;
}

interface StoreContextType {
  cart: CartItem[];
  favorites: Card[];
  storageImages: string[];
  addToCart: (card: Card) => void;
  removeFromCart: (cardId: string) => void;
  updateQuantity: (cardId: string, quantity: number) => void;
  toggleFavorite: (card: Card) => void;
  isFavorite: (cardId: string) => boolean;
  clearCart: () => void;
  systemSettings: Record<string, any>;
  calculatePrice: (costPrice: number) => number;
  getLootProbability: (rarity: string) => number;
  freeShippingThreshold: number;
  announcement: { active: boolean; message: string; color: string };
  heroContent: { title: string; subtitle: string; disclaimer: string };
  activeSuppliers: string[];
  homepageDesign: Record<string, any>;
  marketing: Record<string, any>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    items: cartStoreItems, 
    addItem: zustandAddItem, 
    removeItem: zustandRemoveItem, 
    updateQuantity: zustandUpdateQuantity, 
    clearCart: zustandClearCart 
  } = useCartStore();

  const [favorites, setFavorites] = useState<Card[]>([]);
  const [storageImages, setStorageImages] = useState<string[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [homepageDesign, setHomepageDesign] = useState<Record<string, any>>({});

  useEffect(() => {
    const savedFavorites = localStorage.getItem('holocards_favorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    fetchStorageImages().then(images => {
      if (images && images.length > 0) {
        setStorageImages(images);
      }
    });

    const fetchSettings = async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (!error && data) {
        const settingsMap = data.reduce((acc: any, item: any) => {
          acc[item.id] = item.value?.value;
          return acc;
        }, {});
        setSystemSettings(settingsMap);
      }
    };
    fetchSettings();

    const fetchDesign = async () => {
      const { data, error } = await supabase.from('homepage_clon_design').select('*');
      if (!error && data) {
        const designMap = data.reduce((acc: any, item: any) => {
          acc[item.component_id] = item.ui_data;
          return acc;
        }, {});
        setHomepageDesign(designMap);
      }
    };
    fetchDesign();

    const settingsSub = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchSettings)
      .subscribe();

    const designSub = supabase
      .channel('homepage_design_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_clon_design' }, fetchDesign)
      .subscribe();

    return () => {
      settingsSub.unsubscribe();
      designSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('holocards_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToCart = (card: Card) => {
    zustandAddItem({
      id: card.id,
      name: card.name,
      price: Number(card.price) || 0,
      image_url: card.image_url,
      rarity: card.rarity || 'Rare',
      set: card.set || 'General',
      stock: card.stock || 10
    }, 1);
  };

  const removeFromCart = (cardId: string) => {
    zustandRemoveItem(cardId);
  };

  const updateQuantity = (cardId: string, quantity: number) => {
    zustandUpdateQuantity(cardId, quantity);
  };

  const toggleFavorite = (card: Card) => {
    setFavorites(prev => {
      const isFav = prev.some(item => item.id === card.id);
      if (isFav) {
        return prev.filter(item => item.id !== card.id);
      }
      return [...prev, card];
    });
  };

  const isFavorite = (cardId: string) => {
    return favorites.some(item => item.id === cardId);
  };

  const clearCart = () => zustandClearCart();

  const calculatePrice = (costPrice: number) => {
    const margin = systemSettings['financial_margin'] || 1.15;
    return (Number(costPrice) || 0) * margin;
  };

  const getLootProbability = (rarity: string) => {
    const tables = systemSettings['economy_loot_tables'] || {
      'Common': 70,
      'Uncommon': 40,
      'Rare': 20,
      'Ultra Rare': 10,
      'Secret Rare': 5
    };
    return tables[rarity] || 50;
  };

  const freeShippingThreshold = systemSettings['logistics_shipping']?.free_shipping_threshold || 50;
  const announcement = systemSettings['content_announcement'] || {
    active: true,
    message: "¡BIENVENIDO A HOLOCARDS! ENVÍOS GRATIS EN PEDIDOS SUPERIORES A 50€",
    color: "bg-red-600",
    scroll_speed: 5000
  };

  const heroContent = systemSettings['content_hero'] || {
    title: "EL SANTUARIO POKÉMON EN CANARIAS.",
    subtitle: "DESCUBRE EL COLECCIONISMO DE ÉLITE.",
    disclaimer: "*AUTENTICIDAD GARANTIZADA // ENVÍOS 24/48H"
  };

  const marketing = homepageDesign['ui_marketing'] || {
    countdown: { isActive: false, endDate: '', message: '', color: '#EF4444' },
    gamification: { popupEnabled: false, captureChance: 0.05, currentEntity: 'Charizard', popupMessage: '' }
  };

  const [activeSuppliers, setActiveSuppliers] = useState<string[]>([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase.from('suppliers').select('id').eq('active', true);
      if (!error && data) {
        setActiveSuppliers(data.map(s => s.id));
      }
    };
    fetchSuppliers();
  }, []);

  const cartItemsFormatted: CartItem[] = cartStoreItems.map(i => ({
    id: i.id,
    name: i.name,
    price: i.price,
    image_url: i.image_url,
    rarity: i.rarity,
    set: i.set,
    stock: i.stock,
    quantity: i.quantity,
    isFeatured: true
  }));

  return (
    <StoreContext.Provider value={{ 
      cart: cartItemsFormatted, 
      favorites, 
      storageImages,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      toggleFavorite, 
      isFavorite,
      clearCart,
      systemSettings,
      calculatePrice,
      getLootProbability,
      freeShippingThreshold,
      announcement,
      heroContent,
      activeSuppliers,
      homepageDesign,
      marketing
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
```

## src\pages\Catalog.tsx
```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart,
  ChevronDown,
  Filter,
  Check,
  Star,
  ChevronUp,
  X,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import { cn, getRealPrice } from '../lib/utils';
import { useCartStore } from '../lib/cartStore';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';

interface Product {
  id: string;
  name: string;
  base_price: number;
  image_url: string;
  category_id: string;
  base_stock: number;
  status: string;
  categories?: { name: string };
  games?: { name: string };
  game_type?: string;
  game_id?: string;
  set_name?: string;
  rarity?: string;
  set?: string;
  rating?: number;
  language?: string;
  description?: string;
  franchise?: string; 
  created_at?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  allIds: string[];
}

const LANGUAGE_OPTIONS = [
  { id: 'Chino', label: 'CN', url: 'https://flagcdn.com/w20/cn.png' },
  { id: 'Español', label: 'ES', url: 'https://flagcdn.com/w20/es.png' },
  { id: 'Inglés', label: 'GB', url: 'https://flagcdn.com/w20/gb.png' },
  { id: 'Japonés', label: 'JP', url: 'https://flagcdn.com/w20/jp.png' },
  { id: 'Coreano', label: 'KR', url: 'https://flagcdn.com/w20/kr.png' },
  { id: 'Multilenguaje', label: 'MULTI', emoji: '🌍' }
];

const FRANCHISE_OPTIONS = [
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'magic', label: 'Magic The Gathering' },
  { id: 'accesorios', label: 'Accesorios' }
];

const FilterSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-5 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] mb-3"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PriceDisplay = ({ price }: { price: number }) => {
  const safePrice = Number(price) || 0;
  if (safePrice <= 0) {
    return (
      <div className="flex items-start font-black text-yellow-400 mt-1">
        <span className="text-xl sm:text-2xl leading-none tracking-tight uppercase">Consultar</span>
      </div>
    );
  }
  const parts = safePrice.toFixed(2).split('.');
  return (
    <div className="flex items-start font-black text-foreground">
      <span className="text-3xl leading-none">{parts[0]}</span>
      <div className="flex flex-col ml-1">
        <span className="text-base leading-none mt-0.5">.{parts[1]}€</span>
      </div>
    </div>
  );
};

const FiltersPanel = ({
  categories,
  selectedCategories,
  selectedLanguages,
  selectedFranchises,
  priceRange,
  searchTerm,
  languageCounts,
  onToggleCategory,
  onToggleLanguage,
  onToggleFranchise,
  onPriceChange,
  onReset,
}: {
  categories: CategoryItem[];
  selectedCategories: string[];
  selectedLanguages: string[];
  selectedFranchises: string[];
  priceRange: [number, number];
  searchTerm: string;
  languageCounts: Record<string, number>;
  onToggleCategory: (id: string) => void;
  onToggleLanguage: (lang: string) => void;
  onToggleFranchise: (id: string) => void;
  onPriceChange: (val: number) => void;
  onReset: () => void;
}) => (
  <div>
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-6">
      <Filter className="w-4 h-4" /> Filtros Avanzados
    </div>

    <FilterSection title="Franquicia">
      <div className="space-y-3">
        {FRANCHISE_OPTIONS.map((fran) => (
          <label key={fran.id} className="flex items-center group cursor-pointer">
            <div 
              onClick={() => onToggleFranchise(fran.id)}
              className={cn(
                "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3 shrink-0",
                selectedFranchises.includes(fran.id) 
                  ? "bg-primary border-primary" 
                  : "bg-background border-border group-hover:border-primary/50"
              )}
            >
              {selectedFranchises.includes(fran.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
            </div>
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest transition-colors",
              selectedFranchises.includes(fran.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {fran.label}
            </span>
          </label>
        ))}
      </div>
    </FilterSection>

    <FilterSection title="Idioma">
      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((lang) => {
          const count = languageCounts[lang.id] || 0;
          return (
            <label key={lang.id} className="flex items-center group cursor-pointer">
              <div 
                onClick={() => onToggleLanguage(lang.id)}
                className={cn(
                  "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3 shrink-0",
                  selectedLanguages.includes(lang.id) 
                    ? "bg-primary border-primary" 
                    : "bg-background border-border group-hover:border-primary/50"
                )}
              >
                {selectedLanguages.includes(lang.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
              </div>
              <span className="text-sm mr-2 flex items-center justify-center w-5">
                {lang.url ? <img src={lang.url} alt={lang.label} className="w-4 h-3 object-cover rounded-sm shadow-sm" /> : lang.emoji}
              </span>
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-widest transition-colors flex gap-1",
                selectedLanguages.includes(lang.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {lang.label} <span className="opacity-50 font-normal">({count})</span>
              </span>
            </label>
          );
        })}
      </div>
    </FilterSection>

    <FilterSection title="Tipo de Producto">
      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
        {categories.map((cat) => (
          <label key={cat.id} className="flex items-center group cursor-pointer">
            <div 
              onClick={() => onToggleCategory(cat.id)}
              className={cn(
                "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3 shrink-0",
                selectedCategories.includes(cat.id) 
                  ? "bg-primary border-primary" 
                  : "bg-background border-border group-hover:border-primary/50"
              )}
            >
              {selectedCategories.includes(cat.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
            </div>
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest transition-colors",
              selectedCategories.includes(cat.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {cat.name}
            </span>
          </label>
        ))}
      </div>
    </FilterSection>

    <FilterSection title="Precio">
      <div className="space-y-4 pt-2">
        <input 
          type="range" 
          min="0" 
          max="500" 
          step="10"
          aria-label="Rango de precio máximo"
          value={priceRange[1]}
          onChange={(e) => onPriceChange(parseInt(e.target.value))}
          className="w-full accent-primary h-1 bg-muted rounded-full appearance-none cursor-pointer"
        />
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-input border border-border px-3 py-2 rounded-lg text-[10px] font-bold text-muted-foreground">
            {priceRange[0]}€
          </div>
          <span className="text-border">-</span>
          <div className="flex-1 bg-input border border-border px-3 py-2 rounded-lg text-[10px] font-bold text-muted-foreground text-right">
            {priceRange[1]}€
          </div>
        </div>
      </div>
    </FilterSection>

    {(selectedCategories.length > 0 || selectedLanguages.length > 0 || selectedFranchises.length > 0 || searchTerm) && (
      <button 
        onClick={onReset}
        className="mt-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-2"
      >
        <X className="w-3 h-3" /> Limpiar Filtros
      </button>
    )}
  </div>
);

const ProductCardItem = ({ 
  product, 
  quantity, 
  onUpdateQuantity, 
  onAddToCart,
  onImageClick 
}: { 
  product: Product; 
  quantity: number; 
  onUpdateQuantity: (id: string, delta: number) => void; 
  onAddToCart: (product: Product) => void; 
  onImageClick: (product: Product) => void;
  key?: string | number;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group flex flex-col"
    >
      <div className="aspect-square mb-3 sm:mb-6 relative w-full">
        <motion.div
          layoutId={`product-wrapper-${product.id}`}
          onClick={() => onImageClick(product)}
          className="absolute inset-0 bg-muted/80 backdrop-blur-md rounded-2xl overflow-hidden flex items-center justify-center p-3 sm:p-6 cursor-zoom-in transition-shadow duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 border border-white/5"
        >
          <img 
            src={product.image_url} 
            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
            alt={product.name} 
          />
          {product.base_stock < 5 && product.base_stock > 0 && (
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 sm:px-3 py-1 rounded-full shadow-lg">
              Últimas
            </div>
          )}
          {product.base_stock === 0 && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4">
              <span className="bg-foreground text-background text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl">Agotado</span>
            </div>
          )}
        </motion.div>
      </div>

      <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
            {product.set}
          </p>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 text-foreground">
            {product.name}
          </h3>
        </div>

        <div className="mt-auto space-y-3 sm:space-y-6">
          <PriceDisplay price={product.base_price} />

          <div className="flex gap-2 h-10 sm:h-12">
            <div className="flex items-center bg-input border border-border rounded-xl px-1 sm:px-2">
              <button 
                onClick={() => onUpdateQuantity(product.id, -1)}
                title="Disminuir cantidad"
                className="w-7 sm:w-8 h-full flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 sm:w-8 text-center text-[10px] sm:text-[11px] font-black">{quantity}</span>
              <button 
                onClick={() => onUpdateQuantity(product.id, 1)}
                title="Aumentar cantidad"
                className="w-7 sm:w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <button 
              onClick={() => onAddToCart(product)}
              disabled={product.base_stock === 0}
              className="flex-1 bg-primary hover:bg-foreground disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-xl shadow-primary/10"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Añadir</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>('recommended');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isModalFlipped, setIsModalFlipped] = useState(false);

  const [searchParams] = useSearchParams();
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    if (categories.length === 0) return;

    const brand = searchParams.get('brand');
    if (brand && FRANCHISE_OPTIONS.some(f => f.id === brand.toLowerCase())) {
      setSelectedFranchises([brand.toLowerCase()]);
    }

    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const normalize = (str: string) => str.toLowerCase().replace(/[\s\-\/]/g, '');
      const matchedCat = categories.find(c => normalize(c.name) === normalize(categoryParam));
      if (matchedCat) {
        setSelectedCategories([matchedCat.id]);
      }
    }
  }, [searchParams, categories]);

  const fetchData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    if (cats) {
      const uniqueMap = new Map<string, CategoryItem>();
      cats.forEach((c: any) => {
        const normName = (c.name || '').trim().toUpperCase();
        if (!normName) return;
        if (!uniqueMap.has(normName)) {
          uniqueMap.set(normName, { id: c.id, name: c.name.trim(), allIds: [c.id] });
        } else {
          uniqueMap.get(normName)!.allIds.push(c.id);
        }
      });
      setCategories(Array.from(uniqueMap.values()));
    }

    const { data: prods } = await supabase
      .from('products')
      .select('*, categories(name), games(name)')
      .eq('status', 'active');
    
    if (prods) {
      setProducts(prods.map(p => ({
        ...p,
        base_price: Number(getRealPrice(p)) || 0,
        rating: 4.5 + Math.random() * 0.5,
        rarity: 'Rare',
        set: p.categories?.name || 'General',
        description: p.description || 'Pieza de colección de alta demanda. Detalles exclusivos y acabado premium para los jugadores y coleccionistas más exigentes.'
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.language) {
        counts[p.language] = (counts[p.language] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(catId => {
        const selectedCat = categories.find(c => c.id === catId);
        if (!selectedCat) return false;
        
        const prodCatName = (product.categories?.name || '').trim().toUpperCase();
        const selCatName = selectedCat.name.trim().toUpperCase();
        
        return selectedCat.allIds.includes(product.category_id) || (prodCatName === selCatName);
      });

      const matchesPrice = product.base_price >= priceRange[0] && product.base_price <= priceRange[1];
      const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(product.language || '');
      
      const matchesFranchise = selectedFranchises.length === 0 || selectedFranchises.some(franchiseId => {
        const prodName = (product.name || '').toLowerCase();
        const catName = (product.categories?.name || '').toLowerCase();
        const gameName = (product.games?.name || '').toLowerCase();
        const gameType = (product.game_type || '').toLowerCase();
        const franchiseField = (product.franchise || '').toLowerCase();
        const setName = (product.set_name || product.set || '').toLowerCase();
        const description = (product.description || '').toLowerCase();

        const fullText = `${prodName} ${catName} ${gameName} ${gameType} ${franchiseField} ${setName} ${description}`;

        if (franchiseId === 'pokemon') {
          if (gameName.includes('pokemon') || gameName.includes('pokémon') || gameType.includes('pokemon')) return true;
          const pkmKeywords = [
            'pokemon', 'pokémon', 'pkmn', 'pkm', 'pikachu', 'charizard', 'mewtwo', 'scarlet', 'violet',
            'escarlata', 'púrpura', 'purpura', 'paldea', '151', 'paradox', 'obsidian', 'stellar', 'surging',
            'crown zenith', 'lost origin', 'silver tempest', 'fusion strike', 'brilliant stars', 'shrouded',
            'twilight', 'temporal', 'destinos', 'evoluciones', 'rivales', 'caos', 'etb', 'pokeball', 'pokéball'
          ];
          return pkmKeywords.some(kw => fullText.includes(kw));
        }

        if (franchiseId === 'magic') {
          if (gameName.includes('magic') || gameName.includes('mtg') || gameName.includes('gathering') || gameType.includes('magic') || gameType.includes('mtg')) return true;
          const magicKeywords = [
            'magic', 'mtg', 'gathering', 'commander', 'planeswalker', 'bloomburrow', 'duskmourn', 'tarkir',
            'ixalan', 'ravnica', 'eldraine', 'lorwyn', 'karlov', 'foundations', 'modern', 'draft booster',
            'play booster', 'collector booster', 'secret lair', 'multiverso', 'reforjado', 'malkor',
            'tales of middle-earth', 'outlaws', 'thunder junction', 'dominaria', 'innistrad', 'kamigawa',
            'phyrexia', 'unfinity', 'jumpstart', 'chandra', 'jace', 'liliana', 'ajani', 'nissa', 'teferi',
            'sorin', 'nicol bolas', 'atraxa', 'urza', 'yawgmoth', 'karn', 'garruk', 'star trek', 'marvel'
          ];
          return magicKeywords.some(kw => fullText.includes(kw));
        }

        if (franchiseId === 'onepiece') {
          if (gameName.includes('one piece') || gameName.includes('onepiece') || gameType.includes('onepiece')) return true;
          const opKeywords = [
            'one piece', 'onepiece', 'op-', 'op0', 'romance dawn', 'paramount war', 'pillars of strength',
            'kingdoms of intrigue', 'awakening of the new era', 'wings of the captain', '500 years in the future',
            'two legends', 'luffy', 'zoro', 'nami', 'sanji', 'law', 'kid', 'shanks', 'kaido', 'big mom', 'yamato', 'uta', 'don!!'
          ];
          return opKeywords.some(kw => fullText.includes(kw));
        }

        if (franchiseId === 'accesorios') {
          if (gameType.includes('accesorio') || catName.includes('accesorio')) return true;
          const accKeywords = [
            'accesorio', 'funda', 'binder', 'deck box', 'caja de mazo', 'sleeve', 'toploader',
            'carpetas', 'tapete', 'playmat', 'portadeck', 'álbum', 'album', 'hojas', 'dados', 'counters'
          ];
          return accKeywords.some(kw => fullText.includes(kw));
        }

        return false;
      });

      return matchesSearch && matchesCategory && matchesPrice && matchesLanguage && matchesFranchise;
    });

    if (sortOption === 'newest') {
      list = [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortOption === 'price-asc') {
      list = [...list].sort((a, b) => a.base_price - b.base_price);
    } else if (sortOption === 'price-desc') {
      list = [...list].sort((a, b) => b.base_price - a.base_price);
    }

    return list;
  }, [products, categories, searchTerm, selectedCategories, selectedLanguages, selectedFranchises, priceRange, sortOption]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleFranchise = (id: string) => {
    setSelectedFranchises(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = quantities[product.id] || 1;
    addItem({
      id: product.id,
      name: product.name,
      price: product.base_price,
      image_url: product.image_url,
      rarity: product.rarity || 'Common',
      set: product.set || 'General',
      stock: product.base_stock
    }, qty);
    setShowToast(true);
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedLanguages([]);
    setSelectedFranchises([]);
    setSearchTerm('');
    setSortOption('recommended');
  };

  const activeFilterCount = selectedCategories.length + selectedLanguages.length + selectedFranchises.length + (searchTerm ? 1 : 0);

  const closeModal = () => {
    setActiveProduct(null);
    setTimeout(() => setIsModalFlipped(false), 300);
  };

  return (
    <div className="min-h-screen bg-[#050914] font-sans selection:bg-cyan-400/30 text-white transition-colors duration-500 relative overflow-x-hidden">
      
      <img 
        src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Fondos/Fondo.webp"
        alt="Fondo Holocards"
        className="fixed inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none mix-blend-screen"
      />

      <div className="relative z-10">
        <AnnouncementBar />
        <HeaderV2 />

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              <Link to="/" className="hover:text-cyan-400 transition-colors">Inicio</Link>
              <span className="text-gray-700">/</span>
              <span className="text-white">Catálogo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight italic mb-4 text-white">Nuestro Catálogo</h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                {filteredProducts.length} Productos
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <input 
                    type="text" 
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-input border border-border rounded-xl px-4 py-2.5 pl-9 text-[10px] font-bold w-full sm:w-56 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-foreground"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                </div>

                <select 
                  title="Ordenar productos"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-input border border-border rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-foreground px-3 py-2.5 hidden sm:block"
                >
                  <option value="recommended">Recomendados</option>
                  <option value="newest">Más recientes</option>
                  <option value="price-asc">Precio: Bajo a Alto</option>
                  <option value="price-desc">Precio: Alto a Bajo</option>
                </select>

                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 relative"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-black text-[9px] font-black rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-32 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar pr-4 pb-8">
                <FiltersPanel
                  categories={categories}
                  selectedCategories={selectedCategories}
                  selectedLanguages={selectedLanguages}
                  selectedFranchises={selectedFranchises}
                  priceRange={priceRange}
                  searchTerm={searchTerm}
                  languageCounts={languageCounts}
                  onToggleCategory={toggleCategory}
                  onToggleLanguage={toggleLanguage}
                  onToggleFranchise={toggleFranchise}
                  onPriceChange={(val) => setPriceRange([priceRange[0], val])}
                  onReset={handleReset}
                />
              </div>
            </aside>

            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-x-8 sm:gap-y-16">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="aspect-square bg-muted animate-pulse rounded-2xl" />
                      <div className="h-3 w-3/4 bg-muted animate-pulse rounded-full" />
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                    <Filter className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Sin coincidencias</h3>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">No hay piezas que coincidan con tu búsqueda actual.</p>
                  <button onClick={handleReset} className="px-6 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-x-8 sm:gap-y-16">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product) => (
                      <ProductCardItem 
                        key={product.id}
                        product={product}
                        quantity={quantities[product.id] || 1}
                        onUpdateQuantity={handleUpdateQuantity}
                        onAddToCart={handleAddToCart}
                        onImageClick={(p) => {
                          setIsModalFlipped(false);
                          setActiveProduct(p);
                        }} 
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ─── MODAL MOBILE FILTER DRAWER ─── */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileFilterOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-[#0a1628] border-l border-white/10 p-6 overflow-y-auto flex flex-col justify-between z-[160]"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <h3 className="text-base font-black uppercase tracking-wider text-white">Filtros</h3>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <FiltersPanel
                  categories={categories}
                  selectedCategories={selectedCategories}
                  selectedLanguages={selectedLanguages}
                  selectedFranchises={selectedFranchises}
                  priceRange={priceRange}
                  searchTerm={searchTerm}
                  languageCounts={languageCounts}
                  onToggleCategory={toggleCategory}
                  onToggleLanguage={toggleLanguage}
                  onToggleFranchise={toggleFranchise}
                  onPriceChange={(val) => setPriceRange([priceRange[0], val])}
                  onReset={handleReset}
                />
              </div>

              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full mt-8 py-3 bg-yellow-400 text-black font-black uppercase rounded-xl text-xs"
              >
                Ver {filteredProducts.length} Resultados
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL ZOOM + GIRO 3D ─── */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
            onClick={closeModal}
          >
            <motion.div
              layoutId={`product-wrapper-${activeProduct.id}`}
              className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-[450px] aspect-[3/4] cursor-pointer group"
              style={{ perspective: "1500px" }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsModalFlipped(!isModalFlipped); 
              }}
            >
              <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: isModalFlipped ? 180 : 0 }}
                transition={{ duration: 0.7, type: "spring", stiffness: 200, damping: 25 }}
              >
                {/* CARA FRONTAL (IMAGEN) */}
                <div 
                  className="absolute inset-0 bg-[#0a1628] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.4)] border border-cyan-500/50 flex items-center justify-center p-4 md:p-8" 
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <img
                    src={activeProduct.image_url}
                    alt={activeProduct.name}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-6 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-xl">
                      <RotateCcw className="w-3.5 h-3.5" /> Haz clic para girar
                    </span>
                  </div>
                </div>

                {/* CARA TRASERA (DESCRIPCIÓN + BOTÓN CARRITO) */}
                <div 
                  className="absolute inset-0 bg-[#050914] rounded-2xl md:rounded-[2rem] overflow-hidden p-6 md:p-10 border border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.4)] flex flex-col items-center justify-start text-center" 
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <Star className="w-10 h-10 text-cyan-500/30 mb-4 shrink-0" />
                  <h3 className="text-white font-black text-lg md:text-2xl uppercase tracking-tighter mb-2 shrink-0">
                    {activeProduct.name}
                  </h3>
                  <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-white/10 pb-4 w-full shrink-0">
                    {activeProduct.set}
                  </p>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar w-full px-2 mb-4">
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed font-light">
                      {activeProduct.description}
                    </p>
                  </div>

                  <div className="w-full flex flex-col items-center gap-3 shrink-0">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleAddToCart(activeProduct); 
                      }}
                      disabled={activeProduct.base_stock === 0}
                      className="w-full bg-primary hover:bg-cyan-300 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-black uppercase tracking-widest py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> 
                      {activeProduct.base_stock === 0 ? "Agotado" : "Agregar al Carrito"}
                    </button>

                    <span className="bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 hover:text-white transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" /> Volver a girar
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <button
              onClick={(e) => { e.stopPropagation(); closeModal(); }}
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/60 backdrop-blur-md text-white p-3 rounded-full border border-white/10 hover:bg-cyan-500 hover:text-black transition-all hover:scale-110 z-50"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast 
        show={showToast} 
        message="¡Pieza añadida al carrito!" 
        onClose={() => setShowToast(false)} 
      />
    </div>
  );
}
```

## src\pages\CheckoutFunnel.tsx
```tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Minus, Maximize2, Trash2, ShieldCheck, Star,
  X, CreditCard, Zap, Award, ShoppingCart, Mail, Phone,
  ArrowRight, ChevronRight, Lock, Gift, Tag, Users, Check, Bell, Truck, Heart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { useStore } from '../lib/StoreContext';
import { Card } from '../types';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  reviews: number;
  rating: number;
  images: string[];
  pokePuntos: number;
  stock: number;
  rarity?: string;
}

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Envío Estándar', price: 4.90, time: '3-5 días laborables' },
  { id: 'express', name: 'Envío Express', price: 9.90, time: '1-2 días laborables' },
  { id: 'priority', name: 'Prioritario HoloCards', price: 14.90, time: 'Entrega 24h Garantizada' },
];

const getProduct = (id: string): Product => {
  return { 
    id: id || '1', 
    name: 'POKEPACK Base Set | 5 Sobres + Bonus | Mystery Box Base Set 1ed 1:25', 
    price: 79.90,
    oldPrice: 85.00,
    reviews: 61,
    rating: 4.8,
    images: [
      '/Imagenes/ME03_ES_104.png',
      '/Imagenes/ME03_ES_111.png'
    ],
    pokePuntos: 780,
    stock: 0, 
  };
};

export default function CheckoutFunnel() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite, storageImages, calculatePrice } = useStore();
  
  const product = React.useMemo(() => {
    const raw = getProduct(productId || '1');
    if (storageImages.length > 0) {
      const seed = (productId || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return {
        ...raw,
        images: storageImages.slice(seed % storageImages.length, (seed % storageImages.length) + 2)
      };
    }
    return raw;
  }, [productId, storageImages]);

  const card: Card = {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.images[0],
    rarity: product.rarity || 'Rare',
    stock: product.stock,
    set: 'Mystery',
    isFeatured: false
  };
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguage] = useState('EN');
  const [mainImage, setMainImage] = useState(product.images[0]);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [notifMode, setNotifMode] = useState<'email' | 'sms'>('email');
  const [notifContact, setNotifContact] = useState('');
  
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple' | 'google'>('card');

  const unitPrice = Number(calculatePrice(product.price)) || 0;
  const subtotal = unitPrice * quantity;
  const shippingCost = selectedShipping.price;
  const discountAmount = appliedDiscount?.amount || 0;
  const total = subtotal + shippingCost - discountAmount;

  const handleApplyDiscount = () => {
    if (discountCode.toUpperCase() === 'HOLOCARDS10') {
      setAppliedDiscount({ code: 'HOLOCARDS10', amount: subtotal * 0.1 });
    } else if (discountCode.toUpperCase() === 'FIRSTBUY') {
      setAppliedDiscount({ code: 'FIRSTBUY', amount: 5.00 * quantity });
    } else {
      alert('Código no válido');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-red-600/30 overflow-x-hidden relative">
      <StoreNavbar />
      <div className="pt-20">
        <div className="bg-[#000] text-red-600 px-6 py-2.5 flex justify-between items-center border-b border-white/5">
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] italic opacity-80">Secured via HoloCards // Authentic Asset Distribution</span>
           </div>
           <div className="hidden md:flex items-center gap-6 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
             <span>Protocol: v2.4.0</span>
             <span>Node: Canarias_Center</span>
           </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-8 md:py-16">
          <AnimatePresence mode="wait">
            {currentStep === 0 ? (
              <motion.div 
                key="step-product"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start"
              >
                <AnimatePresence>
                  {isZoomed && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsZoomed(false)}
                      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-20 cursor-zoom-out"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative max-w-5xl w-full aspect-square rounded-[3rem] overflow-hidden border border-white/10"
                      >
                        <img src={mainImage} className="w-full h-full object-contain" alt="" />
                        <button 
                          title="Cerrar Zoom"
                          className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-red-600 rounded-full transition-colors"
                        >
                          <X className="w-6 h-6 text-white" />
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6 lg:sticky lg:top-10">
                  <div 
                    onClick={() => setIsZoomed(true)}
                    className="relative aspect-square bg-[#111113] rounded-[2.5rem] overflow-hidden border border-white/5 group cursor-zoom-in"
                  >
                    <img src={mainImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                    <div className="absolute top-8 right-8 flex flex-col gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(card); }}
                        title={isFavorite(card.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                        className={cn(
                          "p-4 backdrop-blur-xl rounded-2xl border transition-all",
                          isFavorite(card.id) ? "bg-red-600 border-red-600 text-white" : "bg-black/40 border-white/10 text-zinc-400 hover:bg-red-600/20"
                        )}
                      >
                        <Heart className={cn("w-5 h-5", isFavorite(card.id) && "fill-current")} />
                      </button>
                      <div className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Maximize2 className="w-5 h-5 text-zinc-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {product.images.map((img, i) => (
                      <button 
                        key={i}
                        onClick={() => setMainImage(img)}
                        className={cn(
                          "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 relative",
                          mainImage === img ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "border-white/5 opacity-40 hover:opacity-100"
                        )}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-[#111113]/80 backdrop-blur-3xl p-8 md:p-14 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                    <div className="space-y-6">
                      <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tighter italic uppercase">{product.name}</h1>
                      <div className="flex flex-wrap items-center gap-6">
                         <div className="flex gap-1 text-red-600">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                         </div>
                         <span className="text-sm font-black text-zinc-500 uppercase tracking-widest">{product.reviews} VALORACIONES</span>
                      </div>
                    </div>

                    <div className="flex items-end gap-6 pt-2">
                       <div className="flex items-baseline gap-1">
                          <span className="text-7xl font-black text-white tracking-tighter italic">{Math.floor(unitPrice)}</span>
                          <span className="text-3xl font-black text-red-600 tracking-tighter italic">/{((unitPrice % 1) * 100).toFixed(0).padStart(2, '0')}€</span>
                       </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-black italic text-white">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <Button 
                           onClick={() => addToCart(card)}
                           className="h-18 bg-zinc-100 hover:bg-white text-black font-black uppercase italic tracking-widest rounded-2xl shadow-xl"
                         >
                           Añadir al Carrito
                         </Button>
                         <Button 
                           onClick={() => {
                             addToCart(card);
                             setCurrentStep(1);
                           }}
                           className="h-18 bg-red-600 hover:bg-red-700 text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl shadow-red-600/20"
                         >
                           Checkout Inmediato
                         </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step-checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid lg:grid-cols-12 gap-12 items-start"
              >
                <div className="lg:col-span-8 space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                      <button 
                        onClick={() => setCurrentStep(0)} 
                        className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-red-600/20 transition-all"
                      >
                       <X className="w-5 h-5 text-zinc-400" />
                     </button>
                     <h2 className="text-4xl font-black italic uppercase tracking-tighter">Bóveda de Pago_</h2>
                  </div>

                  <section className="bg-[#111113] p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                      <Truck className="w-6 h-6 text-red-600" />
                      <h3 className="text-xl font-black uppercase tracking-widest">Método de Envío</h3>
                    </div>
                    <div className="grid gap-4">
                      {SHIPPING_METHODS.map((method) => (
                        <div 
                          key={method.id}
                          onClick={() => setSelectedShipping(method)}
                          className={cn(
                            "p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between",
                            selectedShipping.id === method.id 
                              ? "bg-red-600/10 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.15)]" 
                              : "bg-white/2 border-white/5 hover:border-white/20"
                          )}
                        >
                          <span className="font-black uppercase italic tracking-widest text-white">{method.name}</span>
                          <span className="text-lg font-black text-white italic">{method.price.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-10">
                  <div className="bg-[#111113] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                     <h3 className="text-2xl font-black italic uppercase text-white">Resumen</h3>
                     <div className="flex justify-between items-end">
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Total</span>
                        <span className="text-4xl font-black italic tracking-tighter text-white">{total.toFixed(2)}€</span>
                     </div>
                     <Button className="w-full h-20 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.3em] rounded-3xl text-xl transition-all shadow-2xl shadow-red-600/30 flex items-center justify-center gap-4">
                       <Lock className="w-6 h-6" />
                       Finalizar Pago
                     </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
```

## src\pages\CheckoutPage.tsx
```tsx
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
  Check, 
  HelpCircle,
  Truck,
  CreditCard,
  ShieldCheck,
  Tag,
  CheckCircle2,
  X,
  Loader2
} from "lucide-react"
import { useCartStore } from "../lib/cartStore"
import { supabase } from "../lib/supabase"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

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
  discount_type: 'percentage' | 'fixed'
  discount_value: number
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
      // 1. Guardar la orden en Supabase
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

      // 2. Guardar los items de la orden
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

      // Disparar envío de correo tras confirmación de orden
      await supabase.functions.invoke('send-order-email', {
        body: {
          order_id: order.id,
          customer_email: order.customer_email,
          type: 'order_confirmation'
        }
      });

      // 3. Vaciar el carrito
      clearCart();

      // 4. Procesar el pago con Stripe
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
  const { items, addItem, getTotalPrice, clearCart } = useCartStore()
  
  const [step, setStep] = useState<"contact" | "shipping" | "payment">("contact")

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
    if (step !== 'payment') return
    if (clientSecret) return

    const fetchPaymentIntent = async () => {
      setPaymentLoading(true)
      setPaymentError(null)
      try {
        const amountInCents = Math.round(total * 100)
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { amount: amountInCents }
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
    if (appliedCoupon.discount_type === 'percentage') {
      return (subtotal * appliedCoupon.discount_value) / 100
    }
    return Math.min(subtotal, appliedCoupon.discount_value)
  }, [subtotal, appliedCoupon])

  const subtotalWithDiscount = Math.max(0, subtotal - discountAmount)
  const shippingCost = subtotalWithDiscount >= 100 || subtotalWithDiscount === 0 ? 0 : 5.00
  const freeShippingThreshold = 100.00
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotalWithDiscount)
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

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !data) {
        setCouponError("Código inválido o expirado")
        return
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError("Este código ha expirado")
        return
      }

      if (data.min_purchase && subtotal < parseFloat(data.min_purchase)) {
        setCouponError(`Compra mínima de ${parseFloat(data.min_purchase).toFixed(2)}€ requerida`)
        return
      }

      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setCouponError("Este código ha alcanzado el límite de usos")
        return
      }

      setAppliedCoupon({
        id: String(data.id),
        code: data.code,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value)
      })

      setCouponCodeInput("")
      setCouponError(null)
    } catch (err: any) {
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
      
      {/* NAVEGACIÓN SUPERIOR */}
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
        
        {/* COLUMNA IZQUIERDA: PASOS DEL CHECKOUT */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* PASO 1: INFORMACIÓN DE CONTACTO */}
          <div className="bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl">
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

          {/* PASO 2: DIRECCIÓN DE ENVÍO */}
          <div className={`bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${step !== "shipping" ? "opacity-50" : ""}`}>
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Ciudad</label>
                    <input 
                      type="text"
                      placeholder="Tu ciudad"
                      value={shippingData.city}
                      onChange={e => setShippingData({...shippingData, city: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Código Postal</label>
                    <input 
                      type="text"
                      placeholder="Ej: 35001"
                      value={shippingData.postalCode}
                      onChange={e => setShippingData({...shippingData, postalCode: e.target.value})}
                      className="bg-[#030c1a] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
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

          {/* PASO 3: MÉTODO DE PAGO */}
          <div className={`bg-[#0a1628]/80 border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${step !== "payment" ? "opacity-50" : ""}`}>
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

        {/* COLUMNA DERECHA: RESUMEN DEL PEDIDO */}
        <div className="lg:col-span-5 bg-[#0a1628] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 h-fit">
          <h2 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/10 pb-3 m-0">
            Resumen del Pedido
          </h2>

          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => {
              const itemPrice = Number(item.price) || 0;
              const itemTotal = itemPrice * (item.quantity || 1);

              return (
                <div key={item.id} className="flex items-center gap-3 bg-[#030c1a] p-2.5 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-[#0a1628] rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate uppercase">{item.name}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">CANT: {item.quantity}</span>
                  </div>

                  <span className="text-xs font-black text-white shrink-0">
                    {itemTotal.toFixed(2)}€
                  </span>
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
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 uppercase"
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
              <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-black uppercase text-green-400 tracking-wider">
                    {appliedCoupon.code} (-{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value}€`})
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

            {appliedCoupon && (
              <div className="flex justify-between text-green-400 font-bold">
                <span className="uppercase">Descuento ({appliedCoupon.code})</span>
                <span>-{discountAmount.toFixed(2)}€</span>
              </div>
            )}

            <div className="flex justify-between text-gray-400">
              <span className="font-bold uppercase">Envío (Canarias / Península)</span>
              <span className="font-black text-white">
                {shippingCost === 0 ? "GRATIS" : `${shippingCost.toFixed(2)}€`}
              </span>
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

        </div>

      </div>
    </div>
  )
}
```

## src\pages\LandingPageV2.tsx
```tsx
import HomePageContent from '../components/ui/HomePageContent';

export default function LandingPageV2() {
  return (
    <HomePageContent />
  );
}
```

## src\pages\LegalPage.tsx
```tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Scale, FileText, Truck } from 'lucide-react';
import { StoreNavbar } from '../components/layout/StoreNavbar';

const LEGAL_CONTENT: Record<string, any> = {
  terminos: {
    title: "Términos y Condiciones",
    icon: Scale,
    description: "Normativa de uso de la plataforma y acuerdos comerciales."
  },
  privacidad: {
    title: "Política de Privacidad",
    icon: ShieldCheck,
    description: "Tratamiento de datos personales y protección del usuario."
  },
  envios: {
    title: "Envíos y Devoluciones",
    icon: Truck,
    description: "Información logística y garantías de satisfacción."
  }
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? LEGAL_CONTENT[slug] : null;
  const Icon = content?.icon || FileText;

  if (!content) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-black mb-4 uppercase italic">Página no encontrada</h1>
        <Link to="/" className="text-red-500 font-black uppercase tracking-widest text-[10px]">Volver al Inicio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-red-500/30 overflow-x-hidden">
      <StoreNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-40 pb-20">
        <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-12">
          <ChevronLeft className="w-4 h-4" /> Volver a la Tienda
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="space-y-6">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-8">
              <Icon className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none">
              {content.title}
            </h1>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em]">
              Última actualización: Agosto 2026 // Protocolo Legal
            </p>
          </div>

          <div className="prose prose-invert prose-zinc max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white border-l-4 border-red-600 pl-4">1. Introducción</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Bienvenido a HoloCards Canarias. Al acceder a nuestro sitio web y utilizar nuestros servicios, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones. Por favor, léalos detenidamente antes de realizar cualquier transacción.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white border-l-4 border-red-600 pl-4">2. Compromiso de Calidad</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Garantizamos que todos nuestros productos son 100% oficiales y provenientes de distribuidores autorizados.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
```

## src\pages\Login.tsx
```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { User, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (authError) {
          setError(authError.message);
        } else if (data?.session) {
          const rawRedirect = searchParams.get('redirect') || '/perfil';
          const safeRedirect = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) 
            ? rawRedirect 
            : '/perfil';

          navigate(safeRedirect, { replace: true });
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess('Cuenta creada exitosamente. Ya puedes acceder.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[500px] bg-red-900/5 blur-[150px] rounded-full pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-[#18181b] backdrop-blur-3xl border border-[#27272a] rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-10 flex flex-col items-center">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group transition-transform hover:scale-105">
              <img
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                alt="Holocards"
                className="h-14 object-contain"
              />
            </Link>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2 italic">
              Acceso a Perfil
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              Autenticación Requerida
            </p>
          </div>

          <div className="flex bg-[#09090b]/50 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isLogin ? "bg-[#F3B91C] text-black shadow-lg shadow-yellow-500/20" : "text-zinc-500 hover:text-white"
              )}
            >
              LOGIN
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !isLogin ? "bg-[#F3B91C] text-black shadow-lg shadow-yellow-500/20" : "text-zinc-500 hover:text-white"
              )}
            >
              REGISTRO
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-red-500 text-xs font-bold text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-green-500/10 border border-green-500/50 p-3 rounded-lg text-green-500 text-xs font-bold text-center shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                Correo Electrónico / Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#F3B91C]/50 focus:ring-1 focus:ring-[#F3B91C]/50 font-mono transition-all text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Contraseña
                </label>
                {isLogin && (
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    ¿Olvidaste tu contraseña?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Tu contraseña..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#F3B91C]/50 focus:ring-1 focus:ring-[#F3B91C]/50 font-mono transition-all text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[#F3B91C] text-black rounded-xl font-black flex items-center justify-center gap-2 hover:bg-[#F3B91C]/90 transition-all shadow-[0_0_20px_rgba(243,185,28,0.2)] disabled:opacity-50 group"
            >
              {loading ? (isLogin ? 'Accediendo...' : 'Registrando...') : (isLogin ? 'Accede' : 'Registrarse')}
              {isLogin ? <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
```

## src\pages\PaginaMagicProductos.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import SectionHeading from '../components/ui/SectionHeading';
import ProductCard from '../components/ui/ProductCard';
import TcgCategoryMenu from '../components/ui/TcgCategoryMenu';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../lib/cartStore';
import { getRealPrice } from '../lib/utils';
import { Toast } from '../components/ui/Toast';

const DEFAULT_MAGIC = [
  { id: 'mtg-1', name: 'Booster Box The Lost Caverns of Ixalan', info: '36 sobres · Magic the Gathering', price: 149.99, badge: 'NUEVO' as const, image: '/Imagenes/Magic The Gathering/8dc45e2231b8616ff3a95a01dd32a80b.webp', category: 'BOOSTERS' },
  { id: 'mtg-2', name: 'Commander Masters Bundle', info: '8 boosters + 40 cartas land', price: 54.99, badge: 'STOCK' as const, image: '/Imagenes/Magic The Gathering/magic-realidad-fracturada-mazo-de-commander-multiverso-reforjado-castellano.webp', category: 'SELLADOS' },
  { id: 'mtg-3', name: 'Booster Box Murders at Karlov Manor', info: '36 sobres · Investigación', price: 139.99, image: '/Imagenes/Magic The Gathering/74077499_o.webp', category: 'BOOSTERS' },
  { id: 'mtg-4', name: 'Mazo Commander Duskmourn', info: '100 cartas · Listo para jugar', price: 49.99, image: '/Imagenes/Magic The Gathering/magic-the-gathering-vraska-the-unseen-0oq6rgvt7kjlbji4.webp', category: 'DECKS' },
];

export default function PaginaMagicProductos() {
  const [activeCategory, setActiveCategory] = useState('BOOSTERS');
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchMagicData = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('status', 'active')
          .limit(16);

        if (data && data.length > 0) {
          const magicOnly = data.filter((p: any) => {
            const str = `${p.name} ${p.description} ${p.categories?.name || ''}`.toLowerCase();
            return str.includes('magic') || str.includes('mtg') || str.includes('gathering');
          });

          if (magicOnly.length > 0) {
            setDbProducts(magicOnly);
          }
        }
      } catch (err) {
        console.warn("Aviso cargando productos Magic:", err);
      }
    };

    fetchMagicData();
  }, []);

  const handleAddToCart = (product: any) => {
    const priceVal = Number(getRealPrice(product)) || Number(product.price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: priceVal,
      image_url: product.image_url || product.image || '/Imagenes/Magic The Gathering/8dc45e2231b8616ff3a95a01dd32a80b.webp',
      rarity: product.categories?.name || 'Rare',
      set: product.categories?.name || 'Magic The Gathering',
      stock: product.base_stock || 10
    }, 1);
    setShowToast(true);
  };

  const displayProducts = dbProducts.length > 0 ? dbProducts : DEFAULT_MAGIC;

  // Filtrado activo basado en la pestaña seleccionada
  const filteredCategoryProducts = displayProducts.filter(p => {
    const catStr = `${p.name} ${p.description} ${p.categories?.name || p.info || p.category || ''}`.toLowerCase();
    if (activeCategory === 'BOOSTERS') return catStr.includes('booster') || catStr.includes('sobre') || catStr.includes('pack');
    if (activeCategory === 'SELLADOS') return catStr.includes('bundle') || catStr.includes('box') || catStr.includes('caja') || catStr.includes('etb');
    if (activeCategory === 'DECKS') return catStr.includes('deck') || catStr.includes('mazo') || catStr.includes('commander') || catStr.includes('starter');
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <AnnouncementBar />
      <HeaderV2 />

      <main>
        <div className="relative w-full h-[42vh] md:h-[52vh] flex flex-col items-center justify-center bg-gray-900 border-b border-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="z-10 text-center px-4"
          >
            <p className="text-blue-400/70 text-xs font-bold tracking-[0.4em] uppercase mb-3">
              THE GATHERING
            </p>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-lg">
              Magic
            </h1>
            <span className="inline-block px-5 py-1.5 border border-blue-500/30 bg-blue-500/10 rounded-full text-xs font-bold text-blue-400 tracking-[0.3em] uppercase">
              ✦ PLANESWALKERS ✦
            </span>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading title="Productos Destacados" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={p.id || idx} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "Magic The Gathering"} 
                    price={`${priceNum.toFixed(2)}€`} 
                    badge={p.badge} 
                    image={p.image_url || p.image} 
                  />
                </div>
              );
            })}
          </div>

          <TcgCategoryMenu
            active={activeCategory}
            setActive={setActiveCategory}
            accentColor="blue"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            {filteredCategoryProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={`cat-${p.id || idx}`} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "Magic The Gathering"} 
                    price={`${priceNum.toFixed(2)}€`} 
                    image={p.image_url || p.image} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Toast show={showToast} message="¡Producto Magic añadido al carrito!" onClose={() => setShowToast(false)} />
    </div>
  );
}
```

## src\pages\PaginaOnepieceProductos.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import SectionHeading from '../components/ui/SectionHeading';
import ProductCard from '../components/ui/ProductCard';
import TcgCategoryMenu from '../components/ui/TcgCategoryMenu';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../lib/cartStore';
import { getRealPrice } from '../lib/utils';
import { Toast } from '../components/ui/Toast';

const DEFAULT_ONEPIECE = [
  { id: 'op-1', name: 'Booster Box Romance Dawn OP01', info: '24 sobres · Expansión 1', price: 129.99, badge: 'NUEVO' as const, image: '/Imagenes/ME03_ES_104.png', category: 'BOOSTERS' },
  { id: 'op-2', name: 'Starter Deck Roronoa Zoro', info: '51 cartas + 1 Leader', price: 19.99, badge: 'STOCK' as const, image: '/Imagenes/ME03_ES_111.png', category: 'DECKS' },
  { id: 'op-3', name: 'Booster Box Paramount War OP02', info: '24 sobres · Expansión 2', price: 119.99, image: '/Imagenes/ME03_ES_85.png', category: 'BOOSTERS' },
  { id: 'op-4', name: 'Premium Card Collection Luffy Gear 5', info: 'Carta promo + 4 boosters', price: 49.99, image: '/Imagenes/ME03_ES_88.png', category: 'SELLADOS' },
];

export default function PaginaOnepieceProductos() {
  const [activeCategory, setActiveCategory] = useState('BOOSTERS');
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchOPData = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('status', 'active')
          .limit(16);

        if (data && data.length > 0) {
          const opOnly = data.filter((p: any) => {
            const str = `${p.name} ${p.description} ${p.categories?.name || ''}`.toLowerCase();
            return str.includes('one piece') || str.includes('onepiece') || str.includes('op-');
          });

          if (opOnly.length > 0) {
            setDbProducts(opOnly);
          }
        }
      } catch (err) {
        console.warn("Aviso cargando productos One Piece:", err);
      }
    };

    fetchOPData();
  }, []);

  const handleAddToCart = (product: any) => {
    const priceVal = Number(getRealPrice(product)) || Number(product.price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: priceVal,
      image_url: product.image_url || product.image || '/Imagenes/ME03_ES_104.png',
      rarity: product.categories?.name || 'Rare',
      set: product.categories?.name || 'One Piece TCG',
      stock: product.base_stock || 10
    }, 1);
    setShowToast(true);
  };

  const displayProducts = dbProducts.length > 0 ? dbProducts : DEFAULT_ONEPIECE;

  // Filtrado activo basado en la pestaña seleccionada
  const filteredCategoryProducts = displayProducts.filter(p => {
    const catStr = `${p.name} ${p.description} ${p.categories?.name || p.info || p.category || ''}`.toLowerCase();
    if (activeCategory === 'BOOSTERS') return catStr.includes('booster') || catStr.includes('sobre') || catStr.includes('pack');
    if (activeCategory === 'SELLADOS') return catStr.includes('collection') || catStr.includes('box') || catStr.includes('caja') || catStr.includes('tin');
    if (activeCategory === 'DECKS') return catStr.includes('deck') || catStr.includes('starter') || catStr.includes('leader');
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <AnnouncementBar />
      <HeaderV2 />

      <main>
        <div className="relative w-full h-[42vh] md:h-[52vh] flex flex-col items-center justify-center bg-gray-900 border-b border-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.12),_transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="z-10 text-center px-4"
          >
            <p className="text-red-400/70 text-xs font-bold tracking-[0.4em] uppercase mb-3">
              CARD GAME
            </p>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-lg">
              One Piece
            </h1>
            <span className="inline-block px-5 py-1.5 border border-red-500/30 bg-red-500/10 rounded-full text-xs font-bold text-red-400 tracking-[0.3em] uppercase">
              ✦ LEADER CARDS ✦
            </span>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <SectionHeading title="Productos Destacados" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={p.id || idx} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "One Piece TCG"} 
                    price={`${priceNum.toFixed(2)}€`} 
                    badge={p.badge} 
                    image={p.image_url || p.image} 
                  />
                </div>
              );
            })}
          </div>

          <TcgCategoryMenu
            active={activeCategory}
            setActive={setActiveCategory}
            accentColor="red"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            {filteredCategoryProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={`op-cat-${p.id || idx}`} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "One Piece TCG"} 
                    price={`${priceNum.toFixed(2)}€`} 
                    image={p.image_url || p.image} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Toast show={showToast} message="¡Producto One Piece añadido al carrito!" onClose={() => setShowToast(false)} />
    </div>
  );
}
```

## src\pages\PaginaPokemonProductos.tsx
```tsx
import React, { useState, useEffect } from 'react';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import SectionHeading from '../components/ui/SectionHeading';
import ProductCard from '../components/ui/ProductCard';
import FeatureIconsBanner from '../components/ui/FeatureIconsBanner';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../lib/cartStore';
import { getRealPrice } from '../lib/utils';
import { Toast } from '../components/ui/Toast';

const DEFAULT_FEATURED = [
  { id: 'pkm-1', name: 'Booster Box Escarlata y Púrpura', info: '36 sobres · Pokémon TCG', price: 129.99, badge: 'NUEVO' as const, image: '/Imagenes/me04-booster-display-box-es.png' },
  { id: 'pkm-2', name: 'Elite Trainer Box Paldea Evolved', info: '9 sobres + accesorios', price: 44.99, badge: 'STOCK' as const, image: '/Imagenes/me04-elite-trainer-box-169-es.png' },
  { id: 'pkm-3', name: 'Sobre de Expansión Temporal Forces', info: '10 cartas · Pokémon TCG', price: 5.99, image: '/Imagenes/me04-booster-bundle-169-es.png' },
  { id: 'pkm-4', name: 'Lata de Colección Paradox Pokémon', info: '4 sobres + carta promo', price: 23.99, image: '/Imagenes/me04-build-battle-box-es.png' },
];

export default function PaginaPokemonProductos() {
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchPokemonData = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('status', 'active')
          .limit(8);

        if (data && data.length > 0) {
          const pokemonOnly = data.filter((p: any) => {
            const str = `${p.name} ${p.description} ${p.categories?.name || ''}`.toLowerCase();
            return str.includes('poke') || str.includes('pokémon') || str.includes('pokemon');
          });

          if (pokemonOnly.length > 0) {
            setDbProducts(pokemonOnly);
          }
        }
      } catch (err) {
        console.warn("Aviso cargando productos Pokémon:", err);
      }
    };

    fetchPokemonData();
  }, []);

  const handleAddToCart = (product: any) => {
    const priceVal = Number(getRealPrice(product)) || Number(product.price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: priceVal,
      image_url: product.image_url || product.image || '/Imagenes/me04-booster-display-box-es.png',
      rarity: product.categories?.name || 'Rare',
      set: product.categories?.name || 'Pokémon TCG',
      stock: product.base_stock || 10
    }, 1);
    setShowToast(true);
  };

  const displayProducts = dbProducts.length > 0 ? dbProducts : DEFAULT_FEATURED;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <HeaderV2 />

      <main>
        {/* ─── HERO BANNER POKÉMON ─── */}
        <div className="relative w-full h-[45vh] md:h-[55vh] flex flex-col items-center justify-center bg-[#050914] overflow-hidden border-b border-gray-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#050914] to-[#050914] z-0"></div>
          
          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Elemento%20grafico%201.png"
            alt="Líneas Neón Fondo"
            className="absolute inset-0 w-full h-full object-cover opacity-80 z-0 pointer-events-none mix-blend-screen"
          />

          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Triangulo.png"
            alt="Triángulo Decorativo"
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-30 md:w-70 object-contain rotate-360 z-20 pointer-events-none drop-shadow-2xl"
          />

          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/mega-latias.png"
            alt="Mega Latias"
            className="absolute left-[-10%] sm:left-[-2%] md:left-[5%] lg:left-[8%] top-[60%] -translate-y-1/2 w-[192px] sm:w-[240px] md:w-[288px] lg:w-[320px] object-contain z-30 drop-shadow-[0_15px_25px_rgba(168,85,247,0.35)] pointer-events-none"
          />

          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/800px-Artwork_Dragapult_UNITE.png"
            alt="Dragapult"
            className="absolute right-[-10%] sm:right-[-2%] md:right-[5%] lg:right-[8%] top-[40%] -translate-y-1/2 w-[192px] sm:w-[240px] md:w-[288px] lg:w-[320px] object-contain z-30 drop-shadow-[0_15px_25px_rgba(6,182,212,0.35)] pointer-events-none"
          />

          <div className="z-20 text-center px-4 flex flex-col items-center mt-8">
            <img 
              src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/TCG%20LOGO%20FONDO%20AZUL.png"
              alt="Pokémon Trading Card Game Logo"
              className="w-[280px] sm:w-[350px] md:w-[450px] object-contain drop-shadow-[0_0_35px_rgba(250,204,21,0.25)]"
            />
          </div>
        </div>

        <AnnouncementBar />


        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <section className="mb-16">
            <SectionHeading title="PRODUCTOS DESTACADOS" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.slice(0, 4).map((p, idx) => {
                const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
                return (
                  <div key={p.id || idx} onClick={() => handleAddToCart(p)}>
                    <ProductCard 
                      name={p.name} 
                      info={p.categories?.name || p.info || "Pokémon TCG"} 
                      price={`${priceNum.toFixed(2)}€`} 
                      badge={p.badge} 
                      image={p.image_url || p.image}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <FeatureIconsBanner />

          <section className="mb-8 md:mb-12">
            <SectionHeading title="BOOSTERS Y SOBRES" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.slice(0, 4).map((p, idx) => {
                const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
                return (
                  <div key={`booster-${p.id || idx}`} onClick={() => handleAddToCart(p)}>
                    <ProductCard 
                      name={p.name} 
                      info={p.categories?.name || p.info || "Pokémon TCG"} 
                      price={`${priceNum.toFixed(2)}€`} 
                      image={p.image_url || p.image}
                    />
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      <Toast show={showToast} message="¡Producto Pokémon añadido al carrito!" onClose={() => setShowToast(false)} />
    </div>
  );
}
```

## src\pages\ProductPage.tsx
```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ShoppingCart, 
  ShieldCheck, 
  Star, 
  Plus, 
  Minus,
  Loader2,
  Info,
  Package,
  Layers,
  Truck,
  ShieldAlert,
  CheckCircle2,
  Eye,
  Link as LinkIcon,
  MessageCircle,
  Twitter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { useStore } from '../lib/StoreContext';
import { useCartStore } from '../lib/cartStore';
import { Toast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  base_stock: number;
  sku: string;
  categories: { name: string; id: string };
  top_hits_images?: string[];
  rarity?: string;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ES');
  
  const { homepageDesign } = useStore();
  const pdpConfig = homepageDesign['ui_pdp_config'] || {
    socialProof: { isVisible: true, watching: { min: 10, max: 25 }, inCart: { min: 3, max: 8 } },
    payments: { title: 'PAGO SEGURO', methods: [] },
    sharing: { whatsapp: true, twitter: true, link: true },
    topHits: [],
    trustSeals: [],
    languages: [{ id: 'es', label: 'ES', flag: '🇪🇸', isActive: true }]
  };
  
  const addItem = useCartStore(state => state.addItem);

  const liveStats = useMemo(() => {
    const wMin = pdpConfig.socialProof.watching?.min || 10;
    const wMax = pdpConfig.socialProof.watching?.max || 30;
    const cMin = pdpConfig.socialProof.inCart?.min || 3;
    const cMax = pdpConfig.socialProof.inCart?.max || 15;
    
    return {
      watching: Math.floor(Math.random() * (wMax - wMin + 1)) + wMin,
      inCart: Math.floor(Math.random() * (cMax - cMin + 1)) + cMin
    };
  }, [pdpConfig]);

  useEffect(() => {
    if (id) {
      fetchProductData();
    }
  }, [id]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories ( id, name )')
        .eq('id', id)
        .single();

      if (!error && data) {
        setProduct(data);
        setActiveImage(data.image_url);
        
        const { data: related } = await supabase
          .from('products')
          .select('*, categories ( name )')
          .limit(4);
        
        if (related) setRelatedProducts(related);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    const safePrice = Number(product.base_price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: safePrice,
      image_url: product.image_url,
      rarity: product.rarity || product.categories?.name || 'Ultra Rare',
      set: product.categories?.name || 'Expansion',
      stock: product.base_stock
    } as any, quantity);
    setShowToast(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-muted-foreground/20 mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">Bóveda Vacía</h1>
        <Link to="/catalogo" className="px-10 py-4 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-foreground transition-all">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const basePriceNum = Number(product.base_price) || 0;
  const installmentPrice = (basePriceNum / 6).toFixed(2);
  const galleryImages = Array.from(new Set([product.image_url, ...(product.top_hits_images || [])]));

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-x-hidden transition-colors duration-500">
      <StoreNavbar />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-24 pb-20">
        <nav className="mb-4 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
          <ChevronRight className="w-2.5 h-2.5 opacity-30" />
          <Link to="/catalogo" className="hover:text-foreground transition-colors">Productos</Link>
          <ChevronRight className="w-2.5 h-2.5 opacity-30" />
          <span className="opacity-50">{product.categories?.name}</span>
          <ChevronRight className="w-2.5 h-2.5 opacity-30" />
          <span className="text-foreground truncate max-w-[120px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          <div className="lg:col-span-7">
            <div className="flex gap-4">
              <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0">
                {galleryImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImage(img)}
                    className={cn(
                      "aspect-[4/5] rounded-lg border overflow-hidden bg-zinc-900/50 cursor-pointer transition-all", 
                      (activeImage || product.image_url) === img ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "border-white/5 hover:border-white/20"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover opacity-80" />
                  </div>
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 relative aspect-square max-h-[500px] rounded-[2.5rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex items-center justify-center p-10 group shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)]" />
                <img src={activeImage || product.image_url} alt={product.name} className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(239,68,68,0.15)] group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-8 left-8 flex flex-col gap-1">
                  <div className="px-3 py-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-red-500">PREMIUM VAULT EDITION</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 py-6 border-t border-white/5">
              {(pdpConfig.trustSeals || []).map((seal: any, i: number) => {
                const Icon = i === 0 ? Truck : i === 1 ? ShieldCheck : CheckCircle2;
                return (
                  <div key={i} className="flex items-center gap-3 group transition-all">
                    <div className="w-8 h-8 rounded-xl bg-red-600/5 flex items-center justify-center text-red-500/40 group-hover:text-red-500 group-hover:bg-red-600/10 transition-all border border-white/5 group-hover:border-red-600/20">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black uppercase text-foreground tracking-widest">{seal.title}</p>
                      <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter italic">{seal.desc || 'Garantía HoloCards'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-24 h-fit bg-card/40 backdrop-blur-sm p-6 rounded-3xl space-y-6 border border-border/50">
            <div className="flex justify-between items-start gap-6">
              <div className="flex flex-col flex-1 space-y-3">
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 bg-red-600/10 border border-red-600/20 rounded text-[8px] font-black text-red-500 uppercase tracking-[0.2em]">
                    {product.categories?.name || 'PRODUCTO EXCLUSIVO'}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight italic bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">4.9 <span className="opacity-40">(128 reseñas)</span></span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-4xl font-black text-foreground tracking-tighter italic">{basePriceNum.toFixed(2)}€</p>
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <p className="text-[8px] font-bold uppercase tracking-widest">Hasta 6 cuotas de {installmentPrice}€</p>
                    <Info className="w-2.5 h-2.5 opacity-50 cursor-help" />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 w-fit rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">En stock y listo para envío</span>
                </div>

                {pdpConfig.languages?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Idioma / Edición:</p>
                    <div className="flex gap-1.5">
                      {pdpConfig.languages.filter((l: any) => l.isActive).map((lang: any) => (
                        <button 
                          key={lang.id} onClick={() => setSelectedLang(lang.label)}
                          className={cn(
                            "px-3 h-8 rounded-lg border text-[9px] font-black transition-all flex items-center justify-center gap-2",
                            selectedLang === lang.label 
                              ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(243,185,28,0.2)]" 
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <span>{lang.flag}</span> {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-4 w-[180px] shrink-0 pt-2">
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Compartir:</span>
                  <div className="flex gap-2">
                    {pdpConfig.sharing.link && <button title="Copiar enlace" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center hover:bg-white/10 transition-colors shadow-xl"><LinkIcon className="w-3.5 h-3.5 text-zinc-500" /></button>}
                    {pdpConfig.sharing.whatsapp && <button title="Compartir en WhatsApp" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center hover:bg-white/10 transition-colors shadow-xl"><MessageCircle className="w-3.5 h-3.5 text-zinc-500" /></button>}
                    {pdpConfig.sharing.twitter && <button title="Compartir en Twitter" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center hover:bg-white/10 transition-colors shadow-xl"><Twitter className="w-3.5 h-3.5 text-zinc-500" /></button>}
                  </div>
                </div>

                {pdpConfig.socialProof.isVisible && (
                  <div className="w-full flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-foreground text-xs font-black leading-none">{liveStats.inCart}</span>
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">En carritos</span>
                      </div>
                    </div>
                    <div className="w-full h-[1px] bg-white/5" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-foreground text-xs font-black leading-none">{liveStats.watching}</span>
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Viendo ahora</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-muted border border-border rounded-xl h-14 px-3 shrink-0">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-background/10 rounded-lg"><Minus className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <span className="w-8 text-center text-sm font-black text-foreground">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-background/10 rounded-lg"><Plus className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <button onClick={handleAddToCart} className="flex-1 h-14 bg-primary hover:bg-foreground text-primary-foreground rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-primary/20 group">
                  <ShoppingCart className="w-4 h-4 group-hover:rotate-12 transition-transform" /> {pdpConfig.primaryButtonText || 'AGREGAR AL CARRITO'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col items-center gap-3 border-t border-white/5">
              <p className="text-[7px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> {pdpConfig.payments.title || 'Transacción Encriptada 256-bit'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 py-10 border-y border-white/5 mb-16">
          {pdpConfig.breakdownItems?.map((item: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-red-600/30 transition-all">
                <Layers className="w-5 h-5 text-yellow-500/60 group-hover:text-yellow-500" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-8 space-y-16">
            <div className="space-y-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                <div className="w-10 h-[2px] bg-red-600" /> DESCRIPCIÓN
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl italic">
                {product.description || "Esta exclusiva pieza de colección representa la esencia de la estrategia y el arte de las cartas coleccionables."}
              </p>
            </div>

            <div className="space-y-10 pt-10 border-t border-white/5">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">RELACIONADOS</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {relatedProducts.slice(0, 4).map((item, i) => {
                  const relPrice = Number(item.base_price) || 0;
                  return (
                    <div key={i} className="group space-y-4">
                      <Link to={`/producto/${item.id}`} className="block aspect-square rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center p-6 group-hover:border-red-600/30 overflow-hidden relative transition-all">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      </Link>
                      <div>
                        <h3 className="text-[10px] font-black uppercase text-foreground truncate">{item.name}</h3>
                        <p className="text-xs font-black text-foreground">{relPrice.toFixed(2)}€</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Toast show={showToast} message="Añadido a la bóveda" onClose={() => setShowToast(false)} />
    </div>
  );
}
```

## src\pages\ProfileSettings.tsx
```tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck, Smartphone, MapPin, Globe, Mail, Lock, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
    address_country: ''
  });

  useEffect(() => {
    checkAuthAndFetchProfile();
  }, []);

  const checkAuthAndFetchProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/login');
      return;
    }
    
    setSession(session);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('phone, address_street, address_city, address_zip, address_country')
      .eq('id', session.user.id)
      .single();

    if (!error && data) {
      setFormData({
        phone: data.phone || '',
        address_street: data.address_street || '',
        address_city: data.address_city || '',
        address_zip: data.address_zip || '',
        address_country: data.address_country || ''
      });
    }
    
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    setSaving(true);

    // 1. Check current profile state for rewards eligibility
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('phone, address_street, points, pokeballs')
      .eq('id', session.user.id)
      .single();

    const isFirstCompletion = !currentProfile?.phone && !currentProfile?.address_street && formData.phone && formData.address_street;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...formData,
        points: isFirstCompletion ? (currentProfile?.points || 0) + 250 : currentProfile?.points,
        pokeballs: isFirstCompletion ? (currentProfile?.pokeballs || 0) + 5 : currentProfile?.pokeballs,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (error) {
      alert('UPDATE FAILED: Protocol breach detected or network unstable.');
    } else {
      if (isFirstCompletion) {
        await supabase.from('user_notifications').insert({
          user_id: session.user.id,
          message: 'PROTOCOL SYNC: +250 EXP & 5 Pokéballs awarded for Identity Matrix completion.',
          type: 'gift',
          read: false
        });
        alert('MISSION COMPLETE: +250 EXP & 5 Pokéballs awarded for Identity Synchronization!');
      }
      setTimeout(() => navigate('/perfil'), 500);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 overflow-x-hidden pb-24 font-sans">
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-900/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full"></div>
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#030303]/60 backdrop-blur-2xl">
        <div className="max-w-[800px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            to="/perfil" 
            title="Volver al Nexus (Perfil)"
            className="flex items-center gap-3 text-zinc-400 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Return to Nexus</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Secure Link Established</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-[800px] mx-auto px-6 mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2">Identity Matrix</h1>
            <p className="text-sm text-zinc-500 font-mono">Manage your personal node parameters and logistics data.</p>
          </header>

          <form onSubmit={handleSave} className="space-y-10">
            
            {/* Account Sector */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Lock className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Security Credentials</h2>
              </div>
              
              <div className="space-y-4">
                <div className="group space-y-2">
                  <label htmlFor="profile-email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Electronic Mail
                  </label>
                  <div className="relative">
                    <input 
                      id="profile-email"
                      type="text" 
                      title="Correo electrónico (No editable)"
                      value={session?.user?.email} 
                      readOnly 
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono text-zinc-500 cursor-not-allowed outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-black text-red-500 uppercase tracking-widest">
                      Immutable
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Sector */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Communications Link</h2>
              </div>

              <div className="group space-y-2">
                <label htmlFor="profile-phone" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Smartphone className="w-3 h-3" /> Phone Number
                </label>
                <input 
                  id="profile-phone"
                  type="text" 
                  title="Número de teléfono"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-black border border-white/10 focus:border-cyan-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                />
              </div>
            </section>

            {/* Logistics Sector */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <MapPin className="w-5 h-5 text-yellow-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Logistics & Supply Node</h2>
              </div>

              <div className="space-y-6">
                <div className="group space-y-2">
                  <label htmlFor="profile-street" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Physical Address / Street</label>
                  <input 
                    id="profile-street"
                    type="text" 
                    title="Calle / Dirección"
                    value={formData.address_street}
                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                    placeholder="Enter full address details..."
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="group space-y-2">
                    <label htmlFor="profile-city" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">City / Sector</label>
                    <input 
                      id="profile-city"
                      type="text" 
                      title="Ciudad / Sector"
                      value={formData.address_city}
                      onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                      placeholder="Neo-Tokyo"
                      className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                    />
                  </div>
                  <div className="group space-y-2">
                    <label htmlFor="profile-zip" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Postal Code</label>
                    <input 
                      id="profile-zip"
                      type="text" 
                      title="Código Postal"
                      value={formData.address_zip}
                      onChange={e => setFormData({ ...formData, address_zip: e.target.value })}
                      placeholder="00000"
                      className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="group space-y-2">
                  <label htmlFor="profile-country" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Sovereign Territory (Country)
                  </label>
                  <input 
                    id="profile-country"
                    type="text" 
                    title="País"
                    value={formData.address_country}
                    onChange={e => setFormData({ ...formData, address_country: e.target.value })}
                    placeholder="United Earth"
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="pt-8 border-t border-white/5 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono uppercase tracking-widest italic">
                <ShieldCheck className="w-4 h-4 text-green-500/40" />
                Data encrypted with AES-256 standard.
              </div>
              
              <button
                type="submit"
                disabled={saving}
                title="Guardar cambios de identidad"
                aria-label="Guardar cambios"
                className={cn(
                  "flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all",
                  saving 
                    ? "bg-zinc-800 text-zinc-500 cursor-wait" 
                    : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]"
                )}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Commit Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
```

## src\pages\ProntaApertura.tsx
```tsx
/**
 * ProntaApertura — Landing "Próximamente"
 * Usa <picture> con media queries para servir la imagen correcta según dispositivo:
 *  - Móvil (< 768px)  → landing_teléfonos.png  (formato portrait optimizado)
 *  - Desktop (≥ 768px) → landing.png            (formato landscape panorámico)
 * El navegador solo descarga la imagen que corresponde → carga más rápida.
 * Para seguir desarrollando la tienda: /dev-store (ruta secreta)
 */
export default function ProntaApertura() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <picture style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Móvil portrait: < 768px → imagen vertical optimizada para teléfonos */}
        <source
          media="(max-width: 767px)"
          srcSet="/Imagenes/landing-movil.png"
        />
        {/* Tablet y Desktop: ≥ 768px → imagen panorámica completa */}
        <source
          media="(min-width: 768px)"
          srcSet="/Imagenes/landing.png"
        />
        {/* Fallback: usa la imagen de desktop por defecto */}
        <img
          src="/Imagenes/landing.png"
          alt="HoloCards — Próximamente abrimos nuestra tienda de TCG online"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center center',
            display: 'block',
          }}
        />
      </picture>
    </div>
  );
}
```

## src\pages\Storefront.tsx
```tsx
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  ChevronRight, 
  Star, 
  Zap, 
  ShieldCheck, 
  Truck,
  ArrowRight,
  Plus,
  LayoutDashboard,
  Shield,
  Package,
  Trophy,
  Layers
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ProductCarousel } from '../components/ui/product-carousel';
import { CtaCard } from '../components/ui/call-to-action-cta';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../types';
import { getInventory } from '../lib/inventory-db';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { useStore } from '../lib/StoreContext';
import { Heart } from 'lucide-react';

const staticFeaturedCards = [
  { id: '1', name: 'Charizard GX Premium', price: 299.99, image: '/Imagenes/ME03_ES_12.png', category: 'Secret Rare' },
  { id: '2', name: 'Elite Pikachu VMAX', price: 149.50, image: '/Imagenes/ME03_ES_123.png', category: 'Holo' },
  { id: '3', name: 'Shadow Lugia EX', price: 475.00, image: '/Imagenes/ME03_ES_14.png', category: 'Legendary' },
  { id: '4', name: 'Rayquaza Delta Species', price: 185.00, image: '/Imagenes/ME03_ES_19.png', category: 'Delta Species' },
  { id: '5', name: 'Mewtwo GX Hidden', price: 210.00, image: '/Imagenes/ME03_ES_22.png', category: 'Shiny' },
  { id: '6', name: 'Umbreon VMAX Alt', price: 850.00, image: '/Imagenes/ME03_ES_28.png', category: 'Alt Art' },
  { id: '7', name: 'Gengar VMAX Fusion', price: 320.00, image: '/Imagenes/ME03_ES_6.png', category: 'VMAX' },
  { id: '8', name: 'Giratina V Alt Art', price: 590.00, image: '/Imagenes/ME03_ES_85.png', category: 'Secret' },
  { id: '9', name: 'Lugia V Alt Art', price: 440.00, image: '/Imagenes/ME03_ES_88.png', category: 'Gold' },
  { id: '10', name: 'Aerodactyl V Alt', price: 280.00, image: '/Imagenes/img_47014_6bbd0ab7d5f676fd4f2a8aa92378e54a_20.jpg', category: 'Alt Art' },
  { id: '11', name: 'Blaziken VMAX Alt', price: 420.00, image: '/Imagenes/me03-slider-logo-es.png', category: 'VMAX Alt' },
  { id: '12', name: 'Charizard Base Set', price: 2500.00, image: '/Imagenes/me04-booster-bundle-169-es.png', category: 'Vintage' },
];

const productCategories = [
  {
    id: 1,
    icon: Shield,
    title: "Cajas Elites",
    description: "Equipamiento de primer nivel para coleccionistas exigentes. Elite Trainer Boxes con sellos de autenticidad.",
    image: "/Imagenes/me04-booster-display-box-es.png",
  },
  {
    id: 2,
    icon: Package,
    title: "Cajas de Sobres",
    description: "Booster Boxes directas de fábrica. Maximiza tus posibilidades de encontrar las cartas más raras.",
    image: "/Imagenes/me04-build-battle-box-es.png",
  },
  {
    id: 3,
    icon: Zap,
    title: "Sobres de Mejoras",
    description: "Packs individuales de las últimas expansiones. La emoción de abrir un nuevo tesoro.",
    image: "/Imagenes/me04-elite-trainer-box-169-es.png",
  },
  {
    id: 4,
    icon: Trophy,
    title: "Cajas de Colección",
    description: "Ediciones especiales con cartas promocionales exclusivas y accesorios de alta calidad.",
    image: "/Imagenes/me04-slider-logo-es.png",
  },
  {
    id: 5,
    icon: Star,
    title: "Cartas Gradeadas",
    description: "Certificaciones internacionales PSA, CGC y BGS. Inversión garantizada con las mejores notas.",
    image: "/Imagenes/me05-slider-logo-es.png",
  },
  {
    id: 6,
    icon: Layers,
    title: "Metacrilatos",
    description: "Protección premium para tus piezas más valiosas. Exhibición segura con filtro UV.",
    image: "/Imagenes/me2pt5-slider-logo-es.png",
  },
];

const vintageEraCards = [
  { id: 'v1', name: 'Alakazam Shadowless', price: 1800, image: '/Imagenes/mega-lucario-ex-league-battle-deck-169-es.png', category: 'Base Set' },
  { id: 'v2', name: 'Gengar EX Full Art', price: 950, image: '/Imagenes/mega-zygarde-ex-premium-collection-169-es.png', category: 'Phantom Forces' },
  { id: 'v3', name: 'Lugia Legend Top', price: 1200, image: '/Imagenes/sv01-slider-logo-es.png', category: 'HS Unleashed' },
];

import { TestimonialsCarousel, Testimonial } from '../components/ui/testimonials-carousel';

const testimonials: Testimonial[] = [
  {
    text: "Increíble selección de cartas y el envío a Tenerife fue súper rápido. Sasori Labs es mi tienda de confianza ahora.",
    highlight: "envío a Tenerife fue súper rápido",
    image: "/Imagenes/sv02-slider-logo-es.png",
    name: "María Rodríguez",
    role: "Coleccionista Elite",
  },
  {
    text: "La autenticidad es clave para mí. Recibir mis cartas PSA con tal nivel de protección fue una experiencia premium total.",
    highlight: "autenticidad es clave",
    image: "/Imagenes/sv03-slider-logo-es.png",
    name: "Carlos Gomez",
    role: "Inversionista TCG",
  },
  {
    text: "El equipo de Sasori Labs realmente entiende lo que buscamos los coleccionistas. Las aperturas en directo son brutales.",
    highlight: "realmente entiende lo que buscamos",
    image: "/Imagenes/sv035-slider-logo-es.png",
    name: "David Soto",
    role: "Entrenador Pokémon",
  },
  {
    text: "He comprado varias cajas de sobres y siempre vienen impecables. El servicio al cliente es de 10 puntos.",
    highlight: "servicio al cliente es de 10",
    image: "/Imagenes/sv04-slider-logo-es.png",
    name: "Elena Ruiz",
    role: "Fan de One Piece TCG",
  }
];

export default function Storefront() {
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite, storageImages, heroContent, activeSuppliers } = useStore();
  const [cards, setCards] = useState<Card[]>([]);
  
  useEffect(() => {
    // Merge static demo cards with dynamic ones for a rich storefront
    const dynamicCards = getInventory().filter(c => c.isFeatured).map((card, index) => ({
      ...card,
      image_url: storageImages.length > 0 ? storageImages[index % storageImages.length] : card.image_url
    }));
    
    // Map static ones to Card interface if needed, but they are already similar
    const demoCards: Card[] = staticFeaturedCards.map((c, index) => ({
      id: `static-${c.id}`,
      name: c.name,
      price: c.price,
      image_url: storageImages.length > 0 ? storageImages[(dynamicCards.length + index) % storageImages.length] : c.image,
      rarity: c.category,
      stock: 5,
      set: 'Classic',
      isFeatured: true
    }));

    setCards([...dynamicCards, ...demoCards]);
  }, [storageImages]);

  const featuredCards = cards.filter(p => !p.supplier_id || activeSuppliers.includes(p.supplier_id));

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-red-500/30">
      <StoreNavbar />
      <div className="pt-32 md:pt-40">


      {/* Premium Inventory Section */}
      <section id="explore" className="py-24 bg-zinc-900/40 border-y border-white/5 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-5xl font-black tracking-tighter mb-4 italic uppercase">Premium <span className="text-red-500">Inventory</span></h2>
              <p className="text-zinc-500 font-mono tracking-widest text-xs">CURATED_VAULT_2026 // AUTHENTICATED_ASSETS</p>
            </div>
            <div className="flex gap-4">
               <button title="Filtrar por Era" aria-label="Filtrar por Era" className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                Filter_By_Era
               </button>
               <button title="Ver todos los activos" aria-label="Ver todos los activos" className="px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors">
                View_All_Assets
               </button>
            </div>
          </div>

          {/* Featured Cards Carousel */}
          <div className="mb-20">
            <div className="mb-8 flex items-center gap-2">
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <span className="text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-zinc-600">Flash_Showcase</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            <ProductCarousel cards={featuredCards} />
          </div>
 
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {featuredCards.map((card, i) => (
              <motion.div 
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -10 }}
                className="group relative"
              >
                <div className="aspect-[3/4] rounded-[2rem] bg-zinc-900 border border-white/5 overflow-hidden relative shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10"></div>
                  <img src={card.image_url || card.image} alt={card.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  
                  {/* Category Badge */}
                  <div className="absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] italic text-white/90 font-retro pt-2">
                    {card.rarity || card.category}
                  </div>

                  {/* Favorite Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(card);
                    }}
                    title={isFavorite(card.id) ? "Eliminar de favoritos" : "Añadir a favoritos"}
                    aria-label={isFavorite(card.id) ? "Eliminar de favoritos" : "Añadir a favoritos"}
                    className={cn(
                      "absolute top-6 left-6 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10",
                      isFavorite(card.id) ? "bg-red-600 text-white" : "bg-black/60 text-white/60 hover:text-white"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", isFavorite(card.id) && "fill-current")} />
                  </button>

                  {/* Corner Accent */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-red-500/30 rounded-tl-[2rem] m-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Hover Overlay Funnel */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 flex flex-col gap-3 items-center justify-center p-6 backdrop-blur-[2px]">
                    <Button 
                      onClick={() => { addToCart(card); navigate('/checkout'); }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.2em] text-[10px] h-12 rounded-xl shadow-2xl shadow-red-600/40 border border-white/10 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      Protocolo Checkout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => addToCart(card)}
                      className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-[0.2em] text-[10px] h-12 rounded-xl shadow-2xl border border-white/10 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      Adicionar ao Carrinho
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-8 px-2 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] text-red-500 font-mono font-bold tracking-[0.3em] uppercase font-retro">Asset_{card.id.split('-').pop()?.padStart(3, '0')}</p>
                    <h3 className="text-xl font-black group-hover:text-red-500 transition-colors uppercase italic tracking-tighter leading-none">{card.name}</h3>
                  </div>
                  
                  <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-white/5 group-hover:border-red-500/20 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest font-retro">Market Value</span>
                      <span className="text-xl font-black text-white italic">{formatCurrency(card.price)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(card)}
                      title={`Añadir ${card.name} al carrito`}
                      aria-label={`Añadir ${card.name} al carrito`}
                      className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all transform group-hover:scale-110 shadow-xl"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* Newsletter CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <CtaCard 
            title="ÚNETE AL ÉLITE DEL COLECCIONISMO"
            description="SUSCRÍBETE PARA RECIBIR ALERTAS DE DROPS EXCLUSIVOS, PRE-VENTAS Y PROMOCIONES DE ACCESO PRIVADO DIRECTO A TU BÓVEDA ELECTRÓNICA."
            buttonText="ACTIVAR ACCESO"
            inputPlaceholder="TU_EMAIL@PROTOCOLO.COM"
            imageSrc="/Imagenes/sv045-slider-logo-es.png"
            onButtonClick={(email) => console.log('Subscriber:', email)}
          />
        </div>
      </section>



      <section className="py-24 border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl font-black tracking-tighter italic uppercase">Voces de la <span className="text-red-500">Comunidad</span></h2>
          <p className="text-zinc-500 mt-2 font-medium">Testimonios reales de entrenadores y coleccionistas</p>
        </div>
        <TestimonialsCarousel
          testimonials={testimonials}
          speed={30}
          direction="left"
          cardHeight={200}
        />
      </section>

      </div>
    </div>
  );
}
```

## src\pages\SuccessPage.tsx
```tsx
import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  CreditCard, 
  Phone, 
  ShoppingBag,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { StoreNavbar } from '../components/layout/StoreNavbar';

export default function SuccessPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const shortId = orderId?.slice(0, 8).toUpperCase();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Podríamos añadir un mini toast aquí
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden transition-colors duration-500">
      <StoreNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Animated Success Icon */}
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] relative"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
            <motion.div 
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-2 border-emerald-500"
            />
          </motion.div>

          <div className="space-y-3">
            <h1 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none text-foreground">
              ¡Pedido <span className="text-primary">Registrado!</span>
            </h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.2em]">
              Tu orden <span className="text-foreground">#{shortId}</span> ha sido guardada en nuestra bóveda.
            </p>
          </div>

          {/* Payment Instructions Container */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-card border border-border rounded-[3rem] p-8 lg:p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-primary">
                  <CreditCard className="w-6 h-6" />
                  <h2 className="text-xl font-black uppercase italic tracking-widest">Instrucciones de Pago</h2>
                </div>
                <p className="text-muted-foreground text-xs font-medium leading-relaxed max-w-md mx-auto">
                  Para que nuestro equipo empiece a preparar tu paquete de colección, por favor realiza el pago mediante una de las siguientes opciones:
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Option A: Bizum */}
                <div className="bg-muted/50 border border-border p-6 rounded-3xl space-y-4 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs text-foreground">Pago vía Bizum</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase text-left">Número de Teléfono</p>
                    <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-xl">
                      <span className="text-lg font-mono font-bold tracking-tighter text-foreground">600 000 000</span>
                      <button 
                        onClick={() => copyToClipboard('600000000')} 
                        title="Copiar número de Bizum"
                        className="p-2 hover:bg-background/20 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option B: Transferencia */}
                <div className="bg-muted/50 border border-border p-6 rounded-3xl space-y-4 hover:border-blue-500/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs text-foreground">Transferencia</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase text-left">Número de IBAN</p>
                    <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-xl">
                      <span className="text-sm font-mono font-bold tracking-tighter truncate mr-2 text-foreground">ES21 0000 0000 0000 0000 0000</span>
                      <button 
                        onClick={() => copyToClipboard('ES2100000000000000000000')} 
                        title="Copiar número de IBAN"
                        className="p-2 hover:bg-background/20 rounded-lg transition-colors shrink-0"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Crucial Note */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] text-foreground font-black uppercase tracking-widest">Importante: Concepto del Pago</p>
                  <p className="text-[9px] text-muted-foreground font-medium leading-relaxed uppercase tracking-wider">
                    Es vital que pongas <span className="text-foreground font-bold">#{shortId}</span> en el concepto para que podamos identificar tu pago al instante. Una vez recibido, procesaremos tu envío.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <button 
              onClick={() => navigate('/')}
              className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-foreground/90 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Volver a la Tienda
            </button>
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Compra Protegida
            </div>
          </div>
        </div>
      </main>
    </div>

  );
}
```

## src\pages\UserProfile.tsx
```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Package, 
  ArrowLeft, 
  CheckCircle, 
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Truck,
  Box,
  AlertCircle,
  Database,
  History,
  Activity,
  Terminal,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ProductDetails {
  id: string;
  name: string;
  image_url: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: ProductDetails;
}

interface TrackingEvent {
  id: string;
  order_id: string;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  description: string | null;
  location: string | null;
  created_at: string;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items: OrderItem[];
  order_tracking_events?: TrackingEvent[];
  customer_email?: string;
  shipping_address?: any;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTrackerOrder, setSelectedTrackerOrder] = useState<Order | null>(null);

  // 1. Cierre de sesión real
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // 2. Ejecutar la autenticación solo AL MONTAR EL COMPONENTE ([])
  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  // 3. Suscripción en tiempo real separada para evitar re-renderizados infinitos
  useEffect(() => {
    if (!user) return;

    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchUserOrders(user.id, user.email);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, [user?.id]);

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      navigate('/login');
      return;
    }
    
    setUser(user);
    await fetchUserOrders(user.id, user.email);
    setLoading(false);
  };

  const fetchUserOrders = async (userIdOverride?: string, emailOverride?: string) => {
    const uId = userIdOverride || user?.id;
    const uEmail = emailOverride || user?.email;
    if (!uId || !uEmail) return;

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total_amount,
        status,
        customer_email,
        shipping_address
      `)
      .or(`user_id.eq.${uId},customer_email.eq.${uEmail}`)
      .order('created_at', { ascending: false });

    if (ordersError || !ordersData) {
      console.error("Error al obtener pedidos:", ordersError);
      return;
    }

    const orderIds = ordersData.map(o => o.id);
    let orderItemsData: any[] = [];
    let trackingEventsData: any[] = [];

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          quantity,
          price_at_purchase,
          products (
            id,
            name,
            image_url
          )
        `)
        .in('order_id', orderIds);

      if (items) orderItemsData = items;

      const { data: events } = await supabase
        .from('order_tracking_events')
        .select(`
          id,
          order_id,
          status,
          carrier,
          tracking_number,
          description,
          location,
          created_at
        `)
        .in('order_id', orderIds);

      if (events) trackingEventsData = events;
    }

    const parsedOrders = ordersData.map((order: any) => {
      const itemsForOrder = orderItemsData.filter(i => i.order_id === order.id);
      const eventsForOrder = trackingEventsData.filter(e => e.order_id === order.id);

      eventsForOrder.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        ...order,
        total_amount: Number(order.total_amount) || 0,
        order_items: itemsForOrder.map(i => ({ ...i, price_at_purchase: Number(i.price_at_purchase) || 0 })),
        order_tracking_events: eventsForOrder
      };
    });

    setOrders(parsedOrders);
    
    if (parsedOrders.length > 0) {
      if (orderIdFromUrl) {
        const targetOrder = parsedOrders.find(o => o.id === orderIdFromUrl);
        if (targetOrder) {
          setSelectedTrackerOrder(targetOrder);
          setExpandedOrder(targetOrder.id);
        } else {
          setSelectedTrackerOrder(parsedOrders[0]);
        }
      } else {
        setSelectedTrackerOrder(prev => {
          if (!prev) return parsedOrders[0];
          const updated = parsedOrders.find(o => o.id === prev.id);
          return updated || parsedOrders[0];
        });
      }
    }
  };

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  
  const filteredHistory = useMemo(() => {
    return orders.filter(order => {
      const matchStatus = statusFilter === "ALL" || order.status.toLowerCase() === statusFilter.toLowerCase();
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        order.order_items.some(item => item.products?.name?.toLowerCase().includes(searchLower));
        
      return matchStatus && matchSearch;
    });
  }, [orders, searchQuery, statusFilter]);

  const lifetimeValue = useMemo(() => {
    return orders
      .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('paid')) return { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', label: 'PAID' };
    if (s.includes('ship')) return { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', label: 'SHIPPED' };
    if (s.includes('deliver')) return { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'DELIVERED' };
    if (s.includes('cancel')) return { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', label: 'CANCELLED' };
    return { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: status.toUpperCase() };
  };

  const getShortId = (id: string) => `#ORD-${id.substring(0, 6).toUpperCase()}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-mono text-red-500">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="w-8 h-8 animate-pulse" />
          <span className="tracking-[0.3em] text-xs">ACCEDIENDO A LA BÓVEDA...</span>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white font-mono flex flex-col">
        <nav className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md p-4">
          <button 
            onClick={handleSignOut} 
            className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest">CERRAR SESIÓN</span>
          </button>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 relative">
            <Database className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black tracking-widest uppercase mb-2">Bóveda Sin Transacciones Registradas</h1>
          <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto font-sans">
            No se han detectado adquisiciones en el historial de esta entidad. El acceso se habilitará con tu primer ingreso.
          </p>
          <Link 
            to="/catalogo"
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 uppercase tracking-[0.2em] text-sm"
          >
            Explorar Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-mono selection:bg-red-500/30 pb-16">
      <nav className="sticky top-0 z-50 border-b border-red-900/30 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-zinc-400 hover:text-red-400 transition-colors group">
            <div className="p-1.5 border border-zinc-800 rounded bg-zinc-900 group-hover:border-red-500/50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Retorno al Nexus</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Live Sync</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-8">
          <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-xl backdrop-blur-sm relative overflow-hidden">
            <h2 className="text-sm text-zinc-400 uppercase tracking-widest mb-1">Entidad Identificada</h2>
            <p className="text-lg font-black truncate">{user?.email}</p>
            
            <div className="mt-6 pt-6 border-t border-white/5 flex items-end justify-between">
              <div>
                <span className="text-[9px] text-red-400 font-bold uppercase tracking-[0.2em]">Total Gastado en Bóveda</span>
                <p className="text-3xl font-black text-white mt-1 font-sans">{lifetimeValue.toFixed(2)}€</p>
              </div>
              <Activity className="w-8 h-8 text-zinc-800" />
            </div>
          </div>

          {selectedTrackerOrder && (
            <div className="p-6 bg-black/40 border border-red-900/30 rounded-xl backdrop-blur-md relative">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Rastreador de Envío
              </h3>

              <div className="mb-6">
                <p className="text-xl font-black text-white">{getShortId(selectedTrackerOrder.id)}</p>
              </div>

              <div className="relative pl-6 space-y-8 py-2">
                <div className="absolute top-1 bottom-1 left-[11px] w-[2px] bg-zinc-800 rounded-full"></div>
                
                {(() => {
                  const events = selectedTrackerOrder.order_tracking_events || [];
                  const eventStatuses = events.map(e => e.status);
                  
                  const steps = [
                    { key: 'payment_confirmed', label: 'Pago Confirmado', icon: CreditCard },
                    { key: 'preparing', label: 'Preparando en Bóveda', icon: Box },
                    { key: 'admitted', label: 'Admitido por Correos', icon: Package },
                    { key: 'in_transit', label: 'En Tránsito', icon: Truck },
                    { key: 'delivered', label: 'Entregado', icon: CheckCircle }
                  ];

                  let currentStepIndex = 0;
                  if (selectedTrackerOrder.status === 'paid' && events.length === 0) {
                     currentStepIndex = 0;
                  }
                  
                  steps.forEach((step, idx) => {
                    if (eventStatuses.includes(step.key)) {
                      currentStepIndex = Math.max(currentStepIndex, idx);
                    }
                  });

                  if (selectedTrackerOrder.status === 'delivered') currentStepIndex = 4;

                  return (
                    <>
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="absolute top-1 left-[11px] w-[2px] bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                      />

                      {steps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const Icon = step.icon;
                        const relatedEvent = events.find(e => e.status === step.key);

                        return (
                          <div key={step.key} className="relative flex items-start gap-5 group">
                            <div className={cn(
                              "absolute -left-[30px] top-0 w-6 h-6 rounded border-2 flex items-center justify-center bg-[#09090b] transition-colors duration-500 z-10",
                              isCompleted ? "border-red-600" : "border-zinc-800"
                            )}>
                              {isCompleted && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-2 h-2 bg-red-600 rounded-sm"
                                />
                              )}
                            </div>
                            
                            <div className="flex-1 -mt-1">
                              <div className="flex items-center gap-2">
                                <Icon className={cn("w-4 h-4", isCompleted ? "text-red-500" : "text-zinc-700")} />
                                <h4 className={cn(
                                  "text-xs font-bold uppercase tracking-wider transition-colors",
                                  isCompleted ? "text-white" : "text-zinc-600"
                                )}>
                                  {step.label}
                                </h4>
                              </div>
                              
                              <AnimatePresence>
                                {(isCurrent || (isCompleted && relatedEvent)) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-2 text-[10px] text-zinc-400 bg-white/5 p-2 rounded border border-white/5"
                                  >
                                    {relatedEvent ? (
                                      <>
                                        <span className="block text-zinc-500 mb-1">{new Date(relatedEvent.created_at).toLocaleString()}</span>
                                        {relatedEvent.description && <span>{relatedEvent.description}</span>}
                                      </>
                                    ) : (
                                      <span className="block mt-1">Procesando fase...</span>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 flex items-center gap-2">
              <History className="w-4 h-4" /> Registros Recientes
            </h3>
            
            {recentOrders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const statusConf = getStatusConfig(order.status);
              
              return (
                <div key={order.id} className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all">
                  <button 
                    onClick={() => {
                      setExpandedOrder(isExpanded ? null : order.id);
                      setSelectedTrackerOrder(order);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-transparent focus:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border", statusConf.bg, statusConf.color)}>
                        {statusConf.label}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white font-sans">{getShortId(order.id)}</p>
                        <p className="text-[10px] text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black font-sans">{(Number(order.total_amount) || 0).toFixed(2)}€</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/20"
                      >
                        <div className="p-4 space-y-3">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-zinc-800 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
                                {item.products?.image_url ? (
                                  <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-contain" />
                                ) : (
                                  <Package className="w-4 h-4 text-zinc-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-300 truncate font-sans">{item.products?.name || 'Desconocido'}</p>
                                <p className="text-[10px] text-zinc-500">CANT: {item.quantity}</p>
                              </div>
                              <div className="text-xs font-bold text-zinc-400 font-sans">
                                {(Number(item.price_at_purchase) || 0).toFixed(2)}€
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="bg-zinc-900/40 border border-white/5 rounded-xl backdrop-blur-sm h-full p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-lg font-black uppercase tracking-[0.1em] text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-red-500" />
                Historial de Transacciones
              </h2>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="BUSCAR ID O PRODUCTO..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded focus:border-red-500 focus:outline-none pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead className="text-[10px] text-zinc-500 uppercase bg-black/40 tracking-widest border-y border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-normal whitespace-nowrap">ID Pedido</th>
                    <th className="px-4 py-3 font-normal whitespace-nowrap">Fecha (UTC)</th>
                    <th className="px-4 py-3 font-normal whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 font-normal">Items</th>
                    <th className="px-4 py-3 font-normal text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredHistory.map((order) => {
                    const statusConf = getStatusConfig(order.status);
                    
                    return (
                      <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4 font-bold text-white whitespace-nowrap">
                          {getShortId(order.id)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={cn("px-2 py-1 text-[9px] rounded uppercase font-bold border", statusConf.bg, statusConf.color)}>
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 max-w-[200px] truncate font-sans">
                          {order.order_items.map(i => i.products?.name).join(', ') || 'N/A'}
                        </td>
                        <td className="px-4 py-4 font-bold text-white text-right font-sans whitespace-nowrap">
                          {(Number(order.total_amount) || 0).toFixed(2)}€
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

## src\index.css
```css
@font-face {
  font-family: 'Pokemon GB';
  src: url('/fonts/Pokemon_GB.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@import "tailwindcss";

/* Enable class-based dark mode in Tailwind 4 */
@variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Raleway", "Inter", "Arial", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, monospace;
  --font-retro: "Pokemon GB", cursive;

  /* Color mappings for utility classes */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-sidebar: var(--sidebar);
  --color-header: var(--header);
}

@layer base {
  :root {
    --background: #f8f9fa;
    --foreground: #09090b;
    --primary: #F3B91C;
    --primary-foreground: #ffffff;
    --card: #ffffff;
    --card-foreground: #09090b;
    --border: #e9ecef;
    --input: #ffffff;
    --accent: #f1f3f5;
    --muted: #f1f3f5;
    --muted-foreground: #6c757d;
    --sidebar: #ffffff;
    --header: rgba(248, 249, 250, 0.8);
  }

  .dark {
    --background: #09090b;
    --foreground: #fafafa;
    --primary: #F3B91C;
    --primary-foreground: #ffffff;
    --card: #18181b;
    --card-foreground: #fafafa;
    --border: #27272a;
    --input: #18181b;
    --accent: #27272a;
    --muted: #27272a;
    --muted-foreground: #a1a1aa;
    --sidebar: #09090b;
    --header: rgba(9, 9, 11, 0.8);
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    transition: background-color 0.3s ease, color 0.3s ease;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  /* Prevent layout bleed on small viewports */
  * {
    box-sizing: border-box;
  }

  /* Glassmorphism utility */
  .glass {
    background: rgba(var(--background-rgb, 255, 255, 255), 0.6);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
  }

  .dark .glass {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  }

  .glass-red {
    background: rgba(243, 185, 28, 0.1);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(243, 185, 28, 0.2);
  }

  @keyframes marquee-right {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .animate-marquee-right {
    animation: marquee-right 20s linear infinite;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Custom thin scrollbar for admin panels */
  .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }

  /* Safe area padding for notched phones */
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
  .safe-top    { padding-top: env(safe-area-inset-top, 0px); }
}
```

## metadata.json
```json
{
  "name": "Sasori Pokémon - Premium Admin & E-commerce",
  "description": "High-end tech e-commerce platform for Pokémon cards with real-time inventory, POS, and advanced admin analytics. Built for Sasorilabs.io.",
  "requestFramePermissions": [],
  "majorCapabilities": []
}
```

## package-lock.json
```json
{
  "name": "react-example",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "react-example",
      "version": "0.0.0",
      "dependencies": {
        "@emailjs/browser": "^4.4.1",
        "@google/genai": "^1.29.0",
        "@hugeicons/core-free-icons": "^4.1.1",
        "@hugeicons/react": "^1.1.6",
        "@motionone/utils": "^10.18.0",
        "@radix-ui/react-dialog": "^1.1.15",
        "@radix-ui/react-label": "^2.1.8",
        "@radix-ui/react-separator": "^1.1.8",
        "@radix-ui/react-slot": "^1.2.4",
        "@stripe/react-stripe-js": "^6.7.0",
        "@stripe/stripe-js": "^9.9.0",
        "@supabase/supabase-js": "^2.105.1",
        "@tailwindcss/vite": "^4.1.14",
        "@types/papaparse": "^5.5.2",
        "@vitejs/plugin-react": "^5.0.4",
        "axios": "^1.16.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "date-fns": "^4.1.0",
        "dotenv": "^17.2.3",
        "express": "^4.21.2",
        "framer-motion": "^12.38.0",
        "lucide-react": "^0.546.0",
        "motion": "^12.23.24",
        "papaparse": "^5.5.3",
        "react": "^19.0.1",
        "react-dom": "^19.0.1",
        "react-dropzone": "^15.0.0",
        "react-qr-code": "^2.0.21",
        "react-router-dom": "^7.14.2",
        "recharts": "^3.8.1",
        "tailwind-merge": "^3.5.0",
        "vite": "^6.2.3",
        "zustand": "^5.0.13"
      },
      "devDependencies": {
        "@types/express": "^4.17.21",
        "@types/node": "^22.14.0",
        "autoprefixer": "^10.4.21",
        "concurrently": "^9.2.1",
        "tailwindcss": "^4.1.14",
        "tsx": "^4.21.0",
        "typescript": "~5.8.2",
        "vite": "^6.2.3"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.29.0",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.0.tgz",
      "integrity": "sha512-9NhCeYjq9+3uxgdtp20LSiJXJvN0FeCtNGpJxuMFZ1Kv3cWUNb6DOhJwUvcVCzKGR66cw4njwM6hrJLqgOwbcw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.28.5",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.29.3",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.29.3.tgz",
      "integrity": "sha512-LIVqM46zQWZhj17qA8wb4nW/ixr2y1Nw+r1etiAWgRM6U1IqP+LNhL1yg440jYZR72jCWcWbLWzIosH+uP1fqg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.29.0",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.29.0.tgz",
      "integrity": "sha512-CGOfOJqWjg2qW/Mb6zNsDm+u5vFQ8DxXfbM09z69p5Z6+mE1ikP2jUXw+j42Pf1XTYED2Rni5f95npYeuwMDQA==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "@babel/code-frame": "^7.29.0",
        "@babel/generator": "^7.29.0",
        "@babel/helper-compilation-targets": "^7.28.6",
        "@babel/helper-module-transforms": "^7.28.6",
        "@babel/helpers": "^7.28.6",
        "@babel/parser": "^7.29.0",
        "@babel/template": "^7.28.6",
        "@babel/traverse": "^7.29.0",
        "@babel/types": "^7.29.0",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.29.1",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.29.1.tgz",
      "integrity": "sha512-qsaF+9Qcm2Qv8SRIMMscAvG4O3lJ0F1GuMo5HR/Bp02LopNgnZBC/EkbevHFeGs4ls/oPz9v+Bsmzbkbe+0dUw==",
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.29.0",
        "@babel/types": "^7.29.0",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.28.6.tgz",
      "integrity": "sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==",
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.28.6",
        "@babel/helper-validator-option": "^7.27.1",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.28.0.tgz",
      "integrity": "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.28.6.tgz",
      "integrity": "sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.28.6.tgz",
      "integrity": "sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.28.6",
        "@babel/helper-validator-identifier": "^7.28.5",
        "@babel/traverse": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.28.6.tgz",
      "integrity": "sha512-S9gzZ/bz83GRysI7gAD4wPT/AI3uCnY+9xn+Mx/KPs2JwHJIz1W8PZkg2cqyt3RNOBM8ejcXhV6y8Og7ly/Dug==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.27.1.tgz",
      "integrity": "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.28.5.tgz",
      "integrity": "sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.27.1.tgz",
      "integrity": "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.29.2",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.29.2.tgz",
      "integrity": "sha512-HoGuUs4sCZNezVEKdVcwqmZN8GoHirLUcLaYVNBK2J0DadGtdcqgr3BCbvH8+XUo4NGjNl3VOtSjEKNzqfFgKw==",
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.28.6",
        "@babel/types": "^7.29.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.29.3",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.29.3.tgz",
      "integrity": "sha512-b3ctpQwp+PROvU/cttc4OYl4MzfJUWy6FZg+PMXfzmt/+39iHVF0sDfqay8TQM3JA2EUOyKcFZt75jWriQijsA==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.0"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.27.1.tgz",
      "integrity": "sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.27.1.tgz",
      "integrity": "sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.28.6.tgz",
      "integrity": "sha512-YA6Ma2KsCdGb+WC6UpBVFJGXL58MDA6oyONbjyF/+5sBgxY/dwkhLogbMT2GXXyU84/IhRw/2D1Os1B/giz+BQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.28.6",
        "@babel/parser": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.29.0",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.29.0.tgz",
      "integrity": "sha512-4HPiQr0X7+waHfyXPZpWPfWL/J7dcN1mx9gL6WdQVMbPnF3+ZhSMs8tCxN7oHddJE9fhNE7+lxdnlyemKfJRuA==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.0",
        "@babel/generator": "^7.29.0",
        "@babel/helper-globals": "^7.28.0",
        "@babel/parser": "^7.29.0",
        "@babel/template": "^7.28.6",
        "@babel/types": "^7.29.0",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.29.0",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.29.0.tgz",
      "integrity": "sha512-LwdZHpScM4Qz8Xw2iKSzS+cfglZzJGvofQICy7W7v4caru4EaAmyUuO6BGrbyQ2mYV11W0U8j5mBhd14dd3B0A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.27.1",
        "@babel/helper-validator-identifier": "^7.28.5"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@emailjs/browser": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/@emailjs/browser/-/browser-4.4.1.tgz",
      "integrity": "sha512-DGSlP9sPvyFba3to2A50kDtZ+pXVp/0rhmqs2LmbMS3I5J8FSOgLwzY2Xb4qfKlOVHh29EAutLYwe5yuEZmEFg==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.27.7.tgz",
      "integrity": "sha512-EKX3Qwmhz1eMdEJokhALr0YiD0lhQNwDqkPYyPhiSwKrh7/4KRjQc04sZ8db+5DVVnZ1LmbNDI1uAMPEUBnQPg==",
      "cpu": [
        "ppc64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.27.7.tgz",
      "integrity": "sha512-jbPXvB4Yj2yBV7HUfE2KHe4GJX51QplCN1pGbYjvsyCZbQmies29EoJbkEc+vYuU5o45AfQn37vZlyXy4YJ8RQ==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.27.7.tgz",
      "integrity": "sha512-62dPZHpIXzvChfvfLJow3q5dDtiNMkwiRzPylSCfriLvZeq0a1bWChrGx/BbUbPwOrsWKMn8idSllklzBy+dgQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.27.7.tgz",
      "integrity": "sha512-x5VpMODneVDb70PYV2VQOmIUUiBtY3D3mPBG8NxVk5CogneYhkR7MmM3yR/uMdITLrC1ml/NV1rj4bMJuy9MCg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.27.7.tgz",
      "integrity": "sha512-5lckdqeuBPlKUwvoCXIgI2D9/ABmPq3Rdp7IfL70393YgaASt7tbju3Ac+ePVi3KDH6N2RqePfHnXkaDtY9fkw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.27.7.tgz",
      "integrity": "sha512-rYnXrKcXuT7Z+WL5K980jVFdvVKhCHhUwid+dDYQpH+qu+TefcomiMAJpIiC2EM3Rjtq0sO3StMV/+3w3MyyqQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.27.7.tgz",
      "integrity": "sha512-B48PqeCsEgOtzME2GbNM2roU29AMTuOIN91dsMO30t+Ydis3z/3Ngoj5hhnsOSSwNzS+6JppqWsuhTp6E82l2w==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.27.7.tgz",
      "integrity": "sha512-jOBDK5XEjA4m5IJK3bpAQF9/Lelu/Z9ZcdhTRLf4cajlB+8VEhFFRjWgfy3M1O4rO2GQ/b2dLwCUGpiF/eATNQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.27.7.tgz",
      "integrity": "sha512-RkT/YXYBTSULo3+af8Ib0ykH8u2MBh57o7q/DAs3lTJlyVQkgQvlrPTnjIzzRPQyavxtPtfg0EopvDyIt0j1rA==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.27.7.tgz",
      "integrity": "sha512-RZPHBoxXuNnPQO9rvjh5jdkRmVizktkT7TCDkDmQ0W2SwHInKCAV95GRuvdSvA7w4VMwfCjUiPwDi0ZO6Nfe9A==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.27.7.tgz",
      "integrity": "sha512-GA48aKNkyQDbd3KtkplYWT102C5sn/EZTY4XROkxONgruHPU72l+gW+FfF8tf2cFjeHaRbWpOYa/uRBz/Xq1Pg==",
      "cpu": [
        "ia32"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.27.7.tgz",
      "integrity": "sha512-a4POruNM2oWsD4WKvBSEKGIiWQF8fZOAsycHOt6JBpZ+JN2n2JH9WAv56SOyu9X5IqAjqSIPTaJkqN8F7XOQ5Q==",
      "cpu": [
        "loong64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.27.7.tgz",
      "integrity": "sha512-KabT5I6StirGfIz0FMgl1I+R1H73Gp0ofL9A3nG3i/cYFJzKHhouBV5VWK1CSgKvVaG4q1RNpCTR2LuTVB3fIw==",
      "cpu": [
        "mips64el"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.27.7.tgz",
      "integrity": "sha512-gRsL4x6wsGHGRqhtI+ifpN/vpOFTQtnbsupUF5R5YTAg+y/lKelYR1hXbnBdzDjGbMYjVJLJTd2OFmMewAgwlQ==",
      "cpu": [
        "ppc64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.27.7.tgz",
      "integrity": "sha512-hL25LbxO1QOngGzu2U5xeXtxXcW+/GvMN3ejANqXkxZ/opySAZMrc+9LY/WyjAan41unrR3YrmtTsUpwT66InQ==",
      "cpu": [
        "riscv64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.27.7.tgz",
      "integrity": "sha512-2k8go8Ycu1Kb46vEelhu1vqEP+UeRVj2zY1pSuPdgvbd5ykAw82Lrro28vXUrRmzEsUV0NzCf54yARIK8r0fdw==",
      "cpu": [
        "s390x"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.27.7.tgz",
      "integrity": "sha512-hzznmADPt+OmsYzw1EE33ccA+HPdIqiCRq7cQeL1Jlq2gb1+OyWBkMCrYGBJ+sxVzve2ZJEVeePbLM2iEIZSxA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.27.7.tgz",
      "integrity": "sha512-b6pqtrQdigZBwZxAn1UpazEisvwaIDvdbMbmrly7cDTMFnw/+3lVxxCTGOrkPVnsYIosJJXAsILG9XcQS+Yu6w==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.27.7.tgz",
      "integrity": "sha512-OfatkLojr6U+WN5EDYuoQhtM+1xco+/6FSzJJnuWiUw5eVcicbyK3dq5EeV/QHT1uy6GoDhGbFpprUiHUYggrw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.27.7.tgz",
      "integrity": "sha512-AFuojMQTxAz75Fo8idVcqoQWEHIXFRbOc1TrVcFSgCZtQfSdc1RXgB3tjOn/krRHENUB4j00bfGjyl2mJrU37A==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.27.7.tgz",
      "integrity": "sha512-+A1NJmfM8WNDv5CLVQYJ5PshuRm/4cI6WMZRg1by1GwPIQPCTs1GLEUHwiiQGT5zDdyLiRM/l1G0Pv54gvtKIg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.27.7.tgz",
      "integrity": "sha512-+KrvYb/C8zA9CU/g0sR6w2RBw7IGc5J2BPnc3dYc5VJxHCSF1yNMxTV5LQ7GuKteQXZtspjFbiuW5/dOj7H4Yw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.27.7.tgz",
      "integrity": "sha512-ikktIhFBzQNt/QDyOL580ti9+5mL/YZeUPKU2ivGtGjdTYoqz6jObj6nOMfhASpS4GU4Q/Clh1QtxWAvcYKamA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.27.7.tgz",
      "integrity": "sha512-7yRhbHvPqSpRUV7Q20VuDwbjW5kIMwTHpptuUzV+AA46kiPze5Z7qgt6CLCK3pWFrHeNfDd1VKgyP4O+ng17CA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.27.7.tgz",
      "integrity": "sha512-SmwKXe6VHIyZYbBLJrhOoCJRB/Z1tckzmgTLfFYOfpMAx63BJEaL9ExI8x7v0oAO3Zh6D/Oi1gVxEYr5oUCFhw==",
      "cpu": [
        "ia32"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.27.7.tgz",
      "integrity": "sha512-56hiAJPhwQ1R4i+21FVF7V8kSD5zZTdHcVuRFMW0hn753vVfQN8xlx4uOPT4xoGH0Z/oVATuR82AiqSTDIpaHg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@google/genai": {
      "version": "1.51.0",
      "resolved": "https://registry.npmjs.org/@google/genai/-/genai-1.51.0.tgz",
      "integrity": "sha512-vTZZF3CSimN7cn2zsLpW2p5WF0eZa5Gz69ITMPCNHpPrDlAstOfGifSfi0p/s9Z9400f7xJRkgvkQNrcM7pJ6w==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "google-auth-library": "^10.3.0",
        "p-retry": "^4.6.2",
        "protobufjs": "^7.5.4",
        "ws": "^8.18.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@modelcontextprotocol/sdk": "^1.25.2"
      },
      "peerDependenciesMeta": {
        "@modelcontextprotocol/sdk": {
          "optional": true
        }
      }
    },
    "node_modules/@hugeicons/core-free-icons": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/@hugeicons/core-free-icons/-/core-free-icons-4.1.1.tgz",
      "integrity": "sha512-teqIBvPHl90ygIwKyJwTxOH8aNp1X1PjDTcMvLkEwdPxPD+8mssrZ5kXKIAJJFYPsz69a8LYQY0UPid4PAdavg==",
      "license": "MIT"
    },
    "node_modules/@hugeicons/react": {
      "version": "1.1.6",
      "resolved": "https://registry.npmjs.org/@hugeicons/react/-/react-1.1.6.tgz",
      "integrity": "sha512-c2LhXJMAW5wN1pC/smBXG0YPqUON6ceR/ZdXHCjEI9KvB+hjtqYjmzIxok5hAQOeXGz0WtORgCQMzqewFKAZwg==",
      "license": "MIT",
      "peerDependencies": {
        "react": ">=16.0.0"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
      "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@motionone/types": {
      "version": "10.17.1",
      "resolved": "https://registry.npmjs.org/@motionone/types/-/types-10.17.1.tgz",
      "integrity": "sha512-KaC4kgiODDz8hswCrS0btrVrzyU2CSQKO7Ps90ibBVSQmjkrt2teqta6/sOG59v7+dPnKMAg13jyqtMKV2yJ7A==",
      "license": "MIT"
    },
    "node_modules/@motionone/utils": {
      "version": "10.18.0",
      "resolved": "https://registry.npmjs.org/@motionone/utils/-/utils-10.18.0.tgz",
      "integrity": "sha512-3XVF7sgyTSI2KWvTf6uLlBJ5iAgRgmvp3bpuOiQJvInd4nZ19ET8lX5unn30SlmRH7hXbBbH+Gxd0m0klJ3Xtw==",
      "license": "MIT",
      "dependencies": {
        "@motionone/types": "^10.17.1",
        "hey-listen": "^1.0.8",
        "tslib": "^2.3.1"
      }
    },
    "node_modules/@protobufjs/aspromise": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/aspromise/-/aspromise-1.1.2.tgz",
      "integrity": "sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/base64": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/base64/-/base64-1.1.2.tgz",
      "integrity": "sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/codegen": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@protobufjs/codegen/-/codegen-2.0.5.tgz",
      "integrity": "sha512-zgXFLzW3Ap33e6d0Wlj4MGIm6Ce8O89n/apUaGNB/jx+hw+ruWEp7EwGUshdLKVRCxZW12fp9r40E1mQrf/34g==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/eventemitter": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/eventemitter/-/eventemitter-1.1.0.tgz",
      "integrity": "sha512-j9ednRT81vYJ9OfVuXG6ERSTdEL1xVsNgqpkxMsbIabzSo3goCjDIveeGv5d03om39ML71RdmrGNjG5SReBP/Q==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/fetch": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/fetch/-/fetch-1.1.0.tgz",
      "integrity": "sha512-lljVXpqXebpsijW71PZaCYeIcE5on1w5DlQy5WH6GLbFryLUrBD4932W/E2BSpfRJWseIL4v/KPgBFxDOIdKpQ==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.1",
        "@protobufjs/inquire": "^1.1.0"
      }
    },
    "node_modules/@protobufjs/float": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/float/-/float-1.0.2.tgz",
      "integrity": "sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/inquire": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@protobufjs/inquire/-/inquire-1.1.1.tgz",
      "integrity": "sha512-mnzgDV26ueAvk7rsbt9L7bE0SuAoqyuys/sMMrmVcN5x9VsxpcG3rqAUSgDyLp0UZlmNfIbQ4fHfCtreVBk8Ew==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/path": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/path/-/path-1.1.2.tgz",
      "integrity": "sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/pool": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/pool/-/pool-1.1.0.tgz",
      "integrity": "sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/utf8": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@protobufjs/utf8/-/utf8-1.1.1.tgz",
      "integrity": "sha512-oOAWABowe8EAbMyWKM0tYDKi8Yaox52D+HWZhAIJqQXbqe0xI/GV7FhLWqlEKreMkfDjshR5FKgi3mnle0h6Eg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@radix-ui/primitive": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/primitive/-/primitive-1.1.3.tgz",
      "integrity": "sha512-JTF99U/6XIjCBo0wqkU5sK10glYe27MRRsfwoiq5zzOEZLHU3A3KCMa5X/azekYRCJ0HlwI0crAXS/5dEHTzDg==",
      "license": "MIT"
    },
    "node_modules/@radix-ui/react-compose-refs": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-compose-refs/-/react-compose-refs-1.1.2.tgz",
      "integrity": "sha512-z4eqJvfiNnFMHIIvXP3CY57y2WJs5g2v3X0zm9mEJkrkNv4rDxu+sg9Jh8EkXyeqBkB7SOcboo9dMVqhyrACIg==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-context": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.2.tgz",
      "integrity": "sha512-jCi/QKUM2r1Ju5a3J64TH2A5SpKAgh0LpknyqdQ4m6DCV0xJ2HG1xARRwNGPQfi1SLdLWZ1OJz6F4OMBBNiGJA==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-dialog": {
      "version": "1.1.15",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dialog/-/react-dialog-1.1.15.tgz",
      "integrity": "sha512-TCglVRtzlffRNxRMEyR36DGBLJpeusFcgMVD9PZEzAKnUs1lKCgX5u9BmC2Yg+LL9MgZDugFFs1Vl+Jp4t/PGw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.3",
        "@radix-ui/react-compose-refs": "1.1.2",
        "@radix-ui/react-context": "1.1.2",
        "@radix-ui/react-dismissable-layer": "1.1.11",
        "@radix-ui/react-focus-guards": "1.1.3",
        "@radix-ui/react-focus-scope": "1.1.7",
        "@radix-ui/react-id": "1.1.1",
        "@radix-ui/react-portal": "1.1.9",
        "@radix-ui/react-presence": "1.1.5",
        "@radix-ui/react-primitive": "2.1.3",
        "@radix-ui/react-slot": "1.2.3",
        "@radix-ui/react-use-controllable-state": "1.2.2",
        "aria-hidden": "^1.2.4",
        "react-remove-scroll": "^2.6.3"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-dialog/node_modules/@radix-ui/react-slot": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slot/-/react-slot-1.2.3.tgz",
      "integrity": "sha512-aeNmHnBxbi2St0au6VBVC7JXFlhLlOnvIIlePNniyUNAClzmtAUEY8/pBiK3iHjufOlwA+c20/8jngo7xcrg8A==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.2"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-dismissable-layer": {
      "version": "1.1.11",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dismissable-layer/-/react-dismissable-layer-1.1.11.tgz",
      "integrity": "sha512-Nqcp+t5cTB8BinFkZgXiMJniQH0PsUt2k51FUhbdfeKvc4ACcG2uQniY/8+h1Yv6Kza4Q7lD7PQV0z0oicE0Mg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.3",
        "@radix-ui/react-compose-refs": "1.1.2",
        "@radix-ui/react-primitive": "2.1.3",
        "@radix-ui/react-use-callback-ref": "1.1.1",
        "@radix-ui/react-use-escape-keydown": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-focus-guards": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-focus-guards/-/react-focus-guards-1.1.3.tgz",
      "integrity": "sha512-0rFg/Rj2Q62NCm62jZw0QX7a3sz6QCQU0LpZdNrJX8byRGaGVTqbrW9jAoIAHyMQqsNpeZ81YgSizOt5WXq0Pw==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-focus-scope": {
      "version": "1.1.7",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-focus-scope/-/react-focus-scope-1.1.7.tgz",
      "integrity": "sha512-t2ODlkXBQyn7jkl6TNaw/MtVEVvIGelJDCG41Okq/KwUsJBwQ4XVZsHAVUkK4mBv3ewiAS3PGuUWuY2BoK4ZUw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.2",
        "@radix-ui/react-primitive": "2.1.3",
        "@radix-ui/react-use-callback-ref": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-id": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-id/-/react-id-1.1.1.tgz",
      "integrity": "sha512-kGkGegYIdQsOb4XjsfM97rXsiHaBwco+hFI66oO4s9LU+PLAC5oJ7khdOVFxkhsmlbpUqDAvXw11CluXP+jkHg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-layout-effect": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-label": {
      "version": "2.1.8",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-label/-/react-label-2.1.8.tgz",
      "integrity": "sha512-FmXs37I6hSBVDlO4y764TNz1rLgKwjJMQ0EGte6F3Cb3f4bIuHB/iLa/8I9VKkmOy+gNHq8rql3j686ACVV21A==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.1.4"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-label/node_modules/@radix-ui/react-primitive": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-primitive/-/react-primitive-2.1.4.tgz",
      "integrity": "sha512-9hQc4+GNVtJAIEPEqlYqW5RiYdrr8ea5XQ0ZOnD6fgru+83kqT15mq2OCcbe8KnjRZl5vF3ks69AKz3kh1jrhg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-slot": "1.2.4"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-portal": {
      "version": "1.1.9",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-portal/-/react-portal-1.1.9.tgz",
      "integrity": "sha512-bpIxvq03if6UNwXZ+HTK71JLh4APvnXntDc6XOX8UVq4XQOVl7lwok0AvIl+b8zgCw3fSaVTZMpAPPagXbKmHQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.1.3",
        "@radix-ui/react-use-layout-effect": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-presence": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-presence/-/react-presence-1.1.5.tgz",
      "integrity": "sha512-/jfEwNDdQVBCNvjkGit4h6pMOzq8bHkopq458dPt2lMjx+eBQUohZNG9A7DtO/O5ukSbxuaNGXMjHicgwy6rQQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.2",
        "@radix-ui/react-use-layout-effect": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-primitive": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-primitive/-/react-primitive-2.1.3.tgz",
      "integrity": "sha512-m9gTwRkhy2lvCPe6QJp4d3G1TYEUHn/FzJUtq9MjH46an1wJU+GdoGC5VLof8RX8Ft/DlpshApkhswDLZzHIcQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-slot": "1.2.3"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-primitive/node_modules/@radix-ui/react-slot": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slot/-/react-slot-1.2.3.tgz",
      "integrity": "sha512-aeNmHnBxbi2St0au6VBVC7JXFlhLlOnvIIlePNniyUNAClzmtAUEY8/pBiK3iHjufOlwA+c20/8jngo7xcrg8A==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.2"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-separator": {
      "version": "1.1.8",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-separator/-/react-separator-1.1.8.tgz",
      "integrity": "sha512-sDvqVY4itsKwwSMEe0jtKgfTh+72Sy3gPmQpjqcQneqQ4PFmr/1I0YA+2/puilhggCe2gJcx5EBAYFkWkdpa5g==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.1.4"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-separator/node_modules/@radix-ui/react-primitive": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-primitive/-/react-primitive-2.1.4.tgz",
      "integrity": "sha512-9hQc4+GNVtJAIEPEqlYqW5RiYdrr8ea5XQ0ZOnD6fgru+83kqT15mq2OCcbe8KnjRZl5vF3ks69AKz3kh1jrhg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-slot": "1.2.4"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-slot": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slot/-/react-slot-1.2.4.tgz",
      "integrity": "sha512-Jl+bCv8HxKnlTLVrcDE8zTMJ09R9/ukw4qBs/oZClOfoQk/cOTbDn+NceXfV7j09YPVQUryJPHurafcSg6EVKA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.2"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-callback-ref": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-callback-ref/-/react-use-callback-ref-1.1.1.tgz",
      "integrity": "sha512-FkBMwD+qbGQeMu1cOHnuGB6x4yzPjho8ap5WtbEJ26umhgqVXbhekKUQO+hZEL1vU92a3wHwdp0HAcqAUF5iDg==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-controllable-state": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-controllable-state/-/react-use-controllable-state-1.2.2.tgz",
      "integrity": "sha512-BjasUjixPFdS+NKkypcyyN5Pmg83Olst0+c6vGov0diwTEo6mgdqVR6hxcEgFuh4QrAs7Rc+9KuGJ9TVCj0Zzg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-effect-event": "0.0.2",
        "@radix-ui/react-use-layout-effect": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-effect-event": {
      "version": "0.0.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-effect-event/-/react-use-effect-event-0.0.2.tgz",
      "integrity": "sha512-Qp8WbZOBe+blgpuUT+lw2xheLP8q0oatc9UpmiemEICxGvFLYmHm9QowVZGHtJlGbS6A6yJ3iViad/2cVjnOiA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-layout-effect": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-escape-keydown": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-escape-keydown/-/react-use-escape-keydown-1.1.1.tgz",
      "integrity": "sha512-Il0+boE7w/XebUHyBjroE+DbByORGR9KKmITzbR7MyQ4akpORYP/ZmbhAr0DG7RmmBqoOnZdy2QlvajJ2QA59g==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-callback-ref": "1.1.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-layout-effect": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-layout-effect/-/react-use-layout-effect-1.1.1.tgz",
      "integrity": "sha512-RbJRS4UWQFkzHTTwVymMTUv8EqYhOp8dOOviLj2ugtTiXRaRQS7GLGxZTLL1jWhMeoSCf5zmcZkqTl9IiYfXcQ==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@reduxjs/toolkit": {
      "version": "2.11.2",
      "resolved": "https://registry.npmjs.org/@reduxjs/toolkit/-/toolkit-2.11.2.tgz",
      "integrity": "sha512-Kd6kAHTA6/nUpp8mySPqj3en3dm0tdMIgbttnQ1xFMVpufoj+ADi8pXLBsd4xzTRHQa7t/Jv8W5UnCuW4kuWMQ==",
      "license": "MIT",
      "dependencies": {
        "@standard-schema/spec": "^1.0.0",
        "@standard-schema/utils": "^0.3.0",
        "immer": "^11.0.0",
        "redux": "^5.0.1",
        "redux-thunk": "^3.1.0",
        "reselect": "^5.1.0"
      },
      "peerDependencies": {
        "react": "^16.9.0 || ^17.0.0 || ^18 || ^19",
        "react-redux": "^7.2.1 || ^8.1.3 || ^9.0.0"
      },
      "peerDependenciesMeta": {
        "react": {
          "optional": true
        },
        "react-redux": {
          "optional": true
        }
      }
    },
    "node_modules/@reduxjs/toolkit/node_modules/immer": {
      "version": "11.1.4",
      "resolved": "https://registry.npmjs.org/immer/-/immer-11.1.4.tgz",
      "integrity": "sha512-XREFCPo6ksxVzP4E0ekD5aMdf8WMwmdNaz6vuvxgI40UaEiu6q3p8X52aU6GdyvLY3XXX/8R7JOTXStz/nBbRw==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/immer"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.0-rc.3",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0-rc.3.tgz",
      "integrity": "sha512-eybk3TjzzzV97Dlj5c+XrBFW57eTNhzod66y9HrBlzJ6NsCrWCp/2kaPS3K9wJmurBC0Tdw4yPjXKZqlznim3Q==",
      "license": "MIT"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.60.2.tgz",
      "integrity": "sha512-dnlp69efPPg6Uaw2dVqzWRfAWRnYVb1XJ8CyyhIbZeaq4CA5/mLeZ1IEt9QqQxmbdvagjLIm2ZL8BxXv5lH4Yw==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.60.2.tgz",
      "integrity": "sha512-OqZTwDRDchGRHHm/hwLOL7uVPB9aUvI0am/eQuWMNyFHf5PSEQmyEeYYheA0EPPKUO/l0uigCp+iaTjoLjVoHg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.60.2.tgz",
      "integrity": "sha512-UwRE7CGpvSVEQS8gUMBe1uADWjNnVgP3Iusyda1nSRwNDCsRjnGc7w6El6WLQsXmZTbLZx9cecegumcitNfpmA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.60.2.tgz",
      "integrity": "sha512-gjEtURKLCC5VXm1I+2i1u9OhxFsKAQJKTVB8WvDAHF+oZlq0GTVFOlTlO1q3AlCTE/DF32c16ESvfgqR7343/g==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.60.2.tgz",
      "integrity": "sha512-Bcl6CYDeAgE70cqZaMojOi/eK63h5Me97ZqAQoh77VPjMysA/4ORQBRGo3rRy45x4MzVlU9uZxs8Uwy7ZaKnBw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.60.2.tgz",
      "integrity": "sha512-LU+TPda3mAE2QB0/Hp5VyeKJivpC6+tlOXd1VMoXV/YFMvk/MNk5iXeBfB4MQGRWyOYVJ01625vjkr0Az98OJQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.60.2.tgz",
      "integrity": "sha512-2QxQrM+KQ7DAW4o22j+XZ6RKdxjLD7BOWTP0Bv0tmjdyhXSsr2Ul1oJDQqh9Zf5qOwTuTc7Ek83mOFaKnodPjg==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.60.2.tgz",
      "integrity": "sha512-TbziEu2DVsTEOPif2mKWkMeDMLoYjx95oESa9fkQQK7r/Orta0gnkcDpzwufEcAO2BLBsD7mZkXGFqEdMRRwfw==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.60.2.tgz",
      "integrity": "sha512-bO/rVDiDUuM2YfuCUwZ1t1cP+/yqjqz+Xf2VtkdppefuOFS2OSeAfgafaHNkFn0t02hEyXngZkxtGqXcXwO8Rg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.60.2.tgz",
      "integrity": "sha512-hr26p7e93Rl0Za+JwW7EAnwAvKkehh12BU1Llm9Ykiibg4uIr2rbpxG9WCf56GuvidlTG9KiiQT/TXT1yAWxTA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-gnu/-/rollup-linux-loong64-gnu-4.60.2.tgz",
      "integrity": "sha512-pOjB/uSIyDt+ow3k/RcLvUAOGpysT2phDn7TTUB3n75SlIgZzM6NKAqlErPhoFU+npgY3/n+2HYIQVbF70P9/A==",
      "cpu": [
        "loong64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-musl": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-musl/-/rollup-linux-loong64-musl-4.60.2.tgz",
      "integrity": "sha512-2/w+q8jszv9Ww1c+6uJT3OwqhdmGP2/4T17cu8WuwyUuuaCDDJ2ojdyYwZzCxx0GcsZBhzi3HmH+J5pZNXnd+Q==",
      "cpu": [
        "loong64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.60.2.tgz",
      "integrity": "sha512-11+aL5vKheYgczxtPVVRhdptAM2H7fcDR5Gw4/bTcteuZBlH4oP9f5s9zYO9aGZvoGeBpqXI/9TZZihZ609wKw==",
      "cpu": [
        "ppc64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-musl": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-musl/-/rollup-linux-ppc64-musl-4.60.2.tgz",
      "integrity": "sha512-i16fokAGK46IVZuV8LIIwMdtqhin9hfYkCh8pf8iC3QU3LpwL+1FSFGej+O7l3E/AoknL6Dclh2oTdnRMpTzFQ==",
      "cpu": [
        "ppc64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.60.2.tgz",
      "integrity": "sha512-49FkKS6RGQoriDSK/6E2GkAsAuU5kETFCh7pG4yD/ylj9rKhTmO3elsnmBvRD4PgJPds5W2PkhC82aVwmUcJ7A==",
      "cpu": [
        "riscv64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.60.2.tgz",
      "integrity": "sha512-mjYNkHPfGpUR00DuM1ZZIgs64Hpf4bWcz9Z41+4Q+pgDx73UwWdAYyf6EG/lRFldmdHHzgrYyge5akFUW0D3mQ==",
      "cpu": [
        "riscv64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.60.2.tgz",
      "integrity": "sha512-ALyvJz965BQk8E9Al/JDKKDLH2kfKFLTGMlgkAbbYtZuJt9LU8DW3ZoDMCtQpXAltZxwBHevXz5u+gf0yA0YoA==",
      "cpu": [
        "s390x"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.60.2.tgz",
      "integrity": "sha512-UQjrkIdWrKI626Du8lCQ6MJp/6V1LAo2bOK9OTu4mSn8GGXIkPXk/Vsp4bLHCd9Z9Iz2OTEaokUE90VweJgIYQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.60.2.tgz",
      "integrity": "sha512-bTsRGj6VlSdn/XD4CGyzMnzaBs9bsRxy79eTqTCBsA8TMIEky7qg48aPkvJvFe1HyzQ5oMZdg7AnVlWQSKLTnw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-openbsd-x64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openbsd-x64/-/rollup-openbsd-x64-4.60.2.tgz",
      "integrity": "sha512-6d4Z3534xitaA1FcMWP7mQPq5zGwBmGbhphh2DwaA1aNIXUu3KTOfwrWpbwI4/Gr0uANo7NTtaykFyO2hPuFLg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ]
    },
    "node_modules/@rollup/rollup-openharmony-arm64": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openharmony-arm64/-/rollup-openharmony-arm64-4.60.2.tgz",
      "integrity": "sha512-NetAg5iO2uN7eB8zE5qrZ3CSil+7IJt4WDFLcC75Ymywq1VZVD6qJ6EvNLjZ3rEm6gB7XW5JdT60c6MN35Z85Q==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.60.2.tgz",
      "integrity": "sha512-NCYhOotpgWZ5kdxCZsv6Iudx0wX8980Q/oW4pNFNihpBKsDbEA1zpkfxJGC0yugsUuyDZ7gL37dbzwhR0VI7pQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.60.2.tgz",
      "integrity": "sha512-RXsaOqXxfoUBQoOgvmmijVxJnW2IGB0eoMO7F8FAjaj0UTywUO/luSqimWBJn04WNgUkeNhh7fs7pESXajWmkg==",
      "cpu": [
        "ia32"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-gnu": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-gnu/-/rollup-win32-x64-gnu-4.60.2.tgz",
      "integrity": "sha512-qdAzEULD+/hzObedtmV6iBpdL5TIbKVztGiK7O3/KYSf+HIzU257+MX1EXJcyIiDbMAqmbwaufcYPvyRryeZtA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.60.2.tgz",
      "integrity": "sha512-Nd/SgG27WoA9e+/TdK74KnHz852TLa94ovOYySo/yMPuTmpckK/jIF2jSwS3g7ELSKXK13/cVdmg1Z/DaCWKxA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@standard-schema/spec": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@standard-schema/spec/-/spec-1.1.0.tgz",
      "integrity": "sha512-l2aFy5jALhniG5HgqrD6jXLi/rUWrKvqN/qJx6yoJsgKhblVd+iqqU4RCXavm/jPityDo5TCvKMnpjKnOriy0w==",
      "license": "MIT"
    },
    "node_modules/@standard-schema/utils": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/@standard-schema/utils/-/utils-0.3.0.tgz",
      "integrity": "sha512-e7Mew686owMaPJVNNLs55PUvgz371nKgwsc4vxE49zsODpJEnxgxRo2y/OKrqueavXgZNMDVj3DdHFlaSAeU8g==",
      "license": "MIT"
    },
    "node_modules/@stripe/react-stripe-js": {
      "version": "6.7.0",
      "resolved": "https://registry.npmjs.org/@stripe/react-stripe-js/-/react-stripe-js-6.7.0.tgz",
      "integrity": "sha512-KSWTQHcDlAOlxcOz+uq0pTA/k9G4+IBF/X8mtSFkkBX+nb74buMTIFcCUCHWNhjuPqfD+yJm7NWDan1EaxSyzQ==",
      "license": "MIT",
      "dependencies": {
        "prop-types": "^15.7.2"
      },
      "peerDependencies": {
        "@stripe/stripe-js": ">=9.5.0 <10.0.0",
        "react": ">=16.8.0 <20.0.0",
        "react-dom": ">=16.8.0 <20.0.0"
      }
    },
    "node_modules/@stripe/stripe-js": {
      "version": "9.9.0",
      "resolved": "https://registry.npmjs.org/@stripe/stripe-js/-/stripe-js-9.9.0.tgz",
      "integrity": "sha512-Vwqe6Q5cU4i82tPyAv2BpaW/fQSNdOSO4/J8EeDLPp5/oIZiMmdB+Hgh863zFH+rtoxpuWGvD1L7QPh8k1Rdvw==",
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=12.16"
      }
    },
    "node_modules/@supabase/auth-js": {
      "version": "2.105.1",
      "resolved": "https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.105.1.tgz",
      "integrity": "sha512-zc4s8Xg4truwE1Q4Q8M8oUVDARMd05pKh73NyQsMbYU1HDdDN2iiKzena/yu+yJze3WrD4c092FdckPiK1rLQw==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/functions-js": {
      "version": "2.105.1",
      "resolved": "https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.105.1.tgz",
      "integrity": "sha512-dTk1e7oE51VGc1lS2S0J0NLo0Wp4JYChj74ArJKbIWgoWuFwO0wcJYjeyOV3AAEpKst8/LQWUZOUKO1tRXBrpA==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/phoenix": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@supabase/phoenix/-/phoenix-0.4.1.tgz",
      "integrity": "sha512-hWGJkDAfWUNY8k0C080u3sGNFd2ncl9erhKgP7hnGkgJWEfT5Pd/SXal4QmWXBECVlZrannMAc9sBaaRyWpiUA==",
      "license": "MIT"
    },
    "node_modules/@supabase/postgrest-js": {
      "version": "2.105.1",
      "resolved": "https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-2.105.1.tgz",
      "integrity": "sha512-6SbtsoWC55xfsm7gbfLqvF+yIwTQEbjt+jFGf4klDpwSnUy17Hv5x0Dq52oqwTQlw6Ta0h1D5gTP0/pApqNojA==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/realtime-js": {
      "version": "2.105.1",
      "resolved": "https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.105.1.tgz",
      "integrity": "sha512-3X3cUEl5cJ4lRQHr1hXHx0b98OaL97RRO2vrRZ98FD91JV/MquZHhrGJSv/+IkOnjF6E2e0RUOxE8P3Zi035ow==",
      "license": "MIT",
      "dependencies": {
        "@supabase/phoenix": "^0.4.1",
        "@types/ws": "^8.18.1",
        "tslib": "2.8.1",
        "ws": "^8.18.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/storage-js": {
      "version": "2.105.1",
      "resolved": "https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.105.1.tgz",
      "integrity": "sha512-owfdCNH5ikXXDusjzsgU6LavEBqGUoueOnL/9XIucld70/WJ/rbqp89K//c9QPICDNuegsmpoeasydDAiucLKQ==",
      "license": "MIT",
      "dependencies": {
        "iceberg-js": "^0.8.1",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/supabase-js": {
      "version": "2.105.1",
      "resolved": "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.105.1.tgz",
      "integrity": "sha512-4gn6HmsAkCCVU7p8JmgKGhHJ5Btod4ZzSp8qKZf4JHaTxbhaIK86/usHzeLxWv7EJJDhBmILDmJOSOf9iF4CLA==",
      "license": "MIT",
      "dependencies": {
        "@supabase/auth-js": "2.105.1",
        "@supabase/functions-js": "2.105.1",
        "@supabase/postgrest-js": "2.105.1",
        "@supabase/realtime-js": "2.105.1",
        "@supabase/storage-js": "2.105.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@tailwindcss/node": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.2.4.tgz",
      "integrity": "sha512-Ai7+yQPxz3ddrDQzFfBKdHEVBg0w3Zl83jnjuwxnZOsnH9pGn93QHQtpU0p/8rYWxvbFZHneni6p1BSLK4DkGA==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/remapping": "^2.3.5",
        "enhanced-resolve": "^5.19.0",
        "jiti": "^2.6.1",
        "lightningcss": "1.32.0",
        "magic-string": "^0.30.21",
        "source-map-js": "^1.2.1",
        "tailwindcss": "4.2.4"
      }
    },
    "node_modules/@tailwindcss/oxide": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.2.4.tgz",
      "integrity": "sha512-9El/iI069DKDSXwTvB9J4BwdO5JhRrOweGaK25taBAvBXyXqJAX+Jqdvs8r8gKpsI/1m0LeJLyQYTf/WLrBT1Q==",
      "license": "MIT",
      "engines": {
        "node": ">= 20"
      },
      "optionalDependencies": {
        "@tailwindcss/oxide-android-arm64": "4.2.4",
        "@tailwindcss/oxide-darwin-arm64": "4.2.4",
        "@tailwindcss/oxide-darwin-x64": "4.2.4",
        "@tailwindcss/oxide-freebsd-x64": "4.2.4",
        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.2.4",
        "@tailwindcss/oxide-linux-arm64-gnu": "4.2.4",
        "@tailwindcss/oxide-linux-arm64-musl": "4.2.4",
        "@tailwindcss/oxide-linux-x64-gnu": "4.2.4",
        "@tailwindcss/oxide-linux-x64-musl": "4.2.4",
        "@tailwindcss/oxide-wasm32-wasi": "4.2.4",
        "@tailwindcss/oxide-win32-arm64-msvc": "4.2.4",
        "@tailwindcss/oxide-win32-x64-msvc": "4.2.4"
      }
    },
    "node_modules/@tailwindcss/oxide-android-arm64": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-android-arm64/-/oxide-android-arm64-4.2.4.tgz",
      "integrity": "sha512-e7MOr1SAn9U8KlZzPi1ZXGZHeC5anY36qjNwmZv9pOJ8E4Q6jmD1vyEHkQFmNOIN7twGPEMXRHmitN4zCMN03g==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-arm64": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-arm64/-/oxide-darwin-arm64-4.2.4.tgz",
      "integrity": "sha512-tSC/Kbqpz/5/o/C2sG7QvOxAKqyd10bq+ypZNf+9Fi2TvbVbv1zNpcEptcsU7DPROaSbVgUXmrzKhurFvo5eDg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-x64": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-x64/-/oxide-darwin-x64-4.2.4.tgz",
      "integrity": "sha512-yPyUXn3yO/ufR6+Kzv0t4fCg2qNr90jxXc5QqBpjlPNd0NqyDXcmQb/6weunH/MEDXW5dhyEi+agTDiqa3WsGg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-freebsd-x64": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-freebsd-x64/-/oxide-freebsd-x64-4.2.4.tgz",
      "integrity": "sha512-BoMIB4vMQtZsXdGLVc2z+P9DbETkiopogfWZKbWwM8b/1Vinbs4YcUwo+kM/KeLkX3Ygrf4/PsRndKaYhS8Eiw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm-gnueabihf": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm-gnueabihf/-/oxide-linux-arm-gnueabihf-4.2.4.tgz",
      "integrity": "sha512-7pIHBLTHYRAlS7V22JNuTh33yLH4VElwKtB3bwchK/UaKUPpQ0lPQiOWcbm4V3WP2I6fNIJ23vABIvoy2izdwA==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-gnu": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-gnu/-/oxide-linux-arm64-gnu-4.2.4.tgz",
      "integrity": "sha512-+E4wxJ0ZGOzSH325reXTWB48l42i93kQqMvDyz5gqfRzRZ7faNhnmvlV4EPGJU3QJM/3Ab5jhJ5pCRUsKn6OQw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-musl": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-musl/-/oxide-linux-arm64-musl-4.2.4.tgz",
      "integrity": "sha512-bBADEGAbo4ASnppIziaQJelekCxdMaxisrk+fB7Thit72IBnALp9K6ffA2G4ruj90G9XRS2VQ6q2bCKbfFV82g==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-gnu": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-gnu/-/oxide-linux-x64-gnu-4.2.4.tgz",
      "integrity": "sha512-7Mx25E4WTfnht0TVRTyC00j3i0M+EeFe7wguMDTlX4mRxafznw0CA8WJkFjWYH5BlgELd1kSjuU2JiPnNZbJDA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-musl": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-musl/-/oxide-linux-x64-musl-4.2.4.tgz",
      "integrity": "sha512-2wwJRF7nyhOR0hhHoChc04xngV3iS+akccHTGtz965FwF0up4b2lOdo6kI1EbDaEXKgvcrFBYcYQQ/rrnWFVfA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-wasm32-wasi": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.2.4.tgz",
      "integrity": "sha512-FQsqApeor8Fo6gUEklzmaa9994orJZZDBAlQpK2Mq+DslRKFJeD6AjHpBQ0kZFQohVr8o85PPh8eOy86VlSCmw==",
      "bundleDependencies": [
        "@napi-rs/wasm-runtime",
        "@emnapi/core",
        "@emnapi/runtime",
        "@tybys/wasm-util",
        "@emnapi/wasi-threads",
        "tslib"
      ],
      "cpu": [
        "wasm32"
      ],
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/core": "^1.8.1",
        "@emnapi/runtime": "^1.8.1",
        "@emnapi/wasi-threads": "^1.1.0",
        "@napi-rs/wasm-runtime": "^1.1.1",
        "@tybys/wasm-util": "^0.10.1",
        "tslib": "^2.8.1"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-arm64-msvc": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-arm64-msvc/-/oxide-win32-arm64-msvc-4.2.4.tgz",
      "integrity": "sha512-L9BXqxC4ToVgwMFqj3pmZRqyHEztulpUJzCxUtLjobMCzTPsGt1Fa9enKbOpY2iIyVtaHNeNvAK8ERP/64sqGQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-x64-msvc": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-x64-msvc/-/oxide-win32-x64-msvc-4.2.4.tgz",
      "integrity": "sha512-ESlKG0EpVJQwRjXDDa9rLvhEAh0mhP1sF7sap9dNZT0yyl9SAG6T7gdP09EH0vIv0UNTlo6jPWyujD6559fZvw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/vite": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/@tailwindcss/vite/-/vite-4.2.4.tgz",
      "integrity": "sha512-pCvohwOCspk3ZFn6eJzrrX3g4n2JY73H6MmYC87XfGPyTty4YsCjYTMArRZm/zOI8dIt3+EcrLHAFPe5A4bgtw==",
      "license": "MIT",
      "dependencies": {
        "@tailwindcss/node": "4.2.4",
        "@tailwindcss/oxide": "4.2.4",
        "tailwindcss": "4.2.4"
      },
      "peerDependencies": {
        "vite": "^5.2.0 || ^6 || ^7 || ^8"
      }
    },
    "node_modules/@types/babel__core": {
      "version": "7.20.5",
      "resolved": "https://registry.npmjs.org/@types/babel__core/-/babel__core-7.20.5.tgz",
      "integrity": "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==",
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.20.7",
        "@babel/types": "^7.20.7",
        "@types/babel__generator": "*",
        "@types/babel__template": "*",
        "@types/babel__traverse": "*"
      }
    },
    "node_modules/@types/babel__generator": {
      "version": "7.27.0",
      "resolved": "https://registry.npmjs.org/@types/babel__generator/-/babel__generator-7.27.0.tgz",
      "integrity": "sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__template": {
      "version": "7.4.4",
      "resolved": "https://registry.npmjs.org/@types/babel__template/-/babel__template-7.4.4.tgz",
      "integrity": "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==",
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.1.0",
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__traverse": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@types/babel__traverse/-/babel__traverse-7.28.0.tgz",
      "integrity": "sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.2"
      }
    },
    "node_modules/@types/body-parser": {
      "version": "1.19.6",
      "resolved": "https://registry.npmjs.org/@types/body-parser/-/body-parser-1.19.6.tgz",
      "integrity": "sha512-HLFeCYgz89uk22N5Qg3dvGvsv46B8GLvKKo1zKG4NybA8U2DiEO3w9lqGg29t/tfLRJpJ6iQxnVw4OnB7MoM9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/connect": "*",
        "@types/node": "*"
      }
    },
    "node_modules/@types/connect": {
      "version": "3.4.38",
      "resolved": "https://registry.npmjs.org/@types/connect/-/connect-3.4.38.tgz",
      "integrity": "sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/d3-array": {
      "version": "3.2.2",
      "resolved": "https://registry.npmjs.org/@types/d3-array/-/d3-array-3.2.2.tgz",
      "integrity": "sha512-hOLWVbm7uRza0BYXpIIW5pxfrKe0W+D5lrFiAEYR+pb6w3N2SwSMaJbXdUfSEv+dT4MfHBLtn5js0LAWaO6otw==",
      "license": "MIT"
    },
    "node_modules/@types/d3-color": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/@types/d3-color/-/d3-color-3.1.3.tgz",
      "integrity": "sha512-iO90scth9WAbmgv7ogoq57O9YpKmFBbmoEoCHDB2xMBY0+/KVrqAaCDyCE16dUspeOvIxFFRI+0sEtqDqy2b4A==",
      "license": "MIT"
    },
    "node_modules/@types/d3-ease": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@types/d3-ease/-/d3-ease-3.0.2.tgz",
      "integrity": "sha512-NcV1JjO5oDzoK26oMzbILE6HW7uVXOHLQvHshBUW4UMdZGfiY6v5BeQwh9a9tCzv+CeefZQHJt5SRgK154RtiA==",
      "license": "MIT"
    },
    "node_modules/@types/d3-interpolate": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@types/d3-interpolate/-/d3-interpolate-3.0.4.tgz",
      "integrity": "sha512-mgLPETlrpVV1YRJIglr4Ez47g7Yxjl1lj7YKsiMCb27VJH9W8NVM6Bb9d8kkpG/uAQS5AmbA48q2IAolKKo1MA==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-color": "*"
      }
    },
    "node_modules/@types/d3-path": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/@types/d3-path/-/d3-path-3.1.1.tgz",
      "integrity": "sha512-VMZBYyQvbGmWyWVea0EHs/BwLgxc+MKi1zLDCONksozI4YJMcTt8ZEuIR4Sb1MMTE8MMW49v0IwI5+b7RmfWlg==",
      "license": "MIT"
    },
    "node_modules/@types/d3-scale": {
      "version": "4.0.9",
      "resolved": "https://registry.npmjs.org/@types/d3-scale/-/d3-scale-4.0.9.tgz",
      "integrity": "sha512-dLmtwB8zkAeO/juAMfnV+sItKjlsw2lKdZVVy6LRr0cBmegxSABiLEpGVmSJJ8O08i4+sGR6qQtb6WtuwJdvVw==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-time": "*"
      }
    },
    "node_modules/@types/d3-shape": {
      "version": "3.1.8",
      "resolved": "https://registry.npmjs.org/@types/d3-shape/-/d3-shape-3.1.8.tgz",
      "integrity": "sha512-lae0iWfcDeR7qt7rA88BNiqdvPS5pFVPpo5OfjElwNaT2yyekbM0C9vK+yqBqEmHr6lDkRnYNoTBYlAgJa7a4w==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-path": "*"
      }
    },
    "node_modules/@types/d3-time": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@types/d3-time/-/d3-time-3.0.4.tgz",
      "integrity": "sha512-yuzZug1nkAAaBlBBikKZTgzCeA+k1uy4ZFwWANOfKw5z5LRhV0gNA7gNkKm7HoK+HRN0wX3EkxGk0fpbWhmB7g==",
      "license": "MIT"
    },
    "node_modules/@types/d3-timer": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@types/d3-timer/-/d3-timer-3.0.2.tgz",
      "integrity": "sha512-Ps3T8E8dZDam6fUyNiMkekK3XUsaUEik+idO9/YjPtfj2qruF8tFBXS7XhtE4iIXBLxhmLjP3SXpLhVf21I9Lw==",
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
      "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
      "license": "MIT"
    },
    "node_modules/@types/express": {
      "version": "4.17.25",
      "resolved": "https://registry.npmjs.org/@types/express/-/express-4.17.25.tgz",
      "integrity": "sha512-dVd04UKsfpINUnK0yBoYHDF3xu7xVH4BuDotC/xGuycx4CgbP48X/KF/586bcObxT0HENHXEU8Nqtu6NR+eKhw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/body-parser": "*",
        "@types/express-serve-static-core": "^4.17.33",
        "@types/qs": "*",
        "@types/serve-static": "^1"
      }
    },
    "node_modules/@types/express-serve-static-core": {
      "version": "4.19.8",
      "resolved": "https://registry.npmjs.org/@types/express-serve-static-core/-/express-serve-static-core-4.19.8.tgz",
      "integrity": "sha512-02S5fmqeoKzVZCHPZid4b8JH2eM5HzQLZWN2FohQEy/0eXTq8VXZfSN6Pcr3F6N9R/vNrj7cpgbhjie6m/1tCA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*",
        "@types/qs": "*",
        "@types/range-parser": "*",
        "@types/send": "*"
      }
    },
    "node_modules/@types/http-errors": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@types/http-errors/-/http-errors-2.0.5.tgz",
      "integrity": "sha512-r8Tayk8HJnX0FztbZN7oVqGccWgw98T/0neJphO91KkmOzug1KkofZURD4UaD5uH8AqcFLfdPErnBod0u71/qg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/mime": {
      "version": "1.3.5",
      "resolved": "https://registry.npmjs.org/@types/mime/-/mime-1.3.5.tgz",
      "integrity": "sha512-/pyBZWSLD2n0dcHE3hq8s8ZvcETHtEuF+3E7XVt0Ig2nvsVQXdghHVcEkIWjy9A0wKfTn97a/PSDYohKIlnP/w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "22.19.17",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.19.17.tgz",
      "integrity": "sha512-wGdMcf+vPYM6jikpS/qhg6WiqSV/OhG+jeeHT/KlVqxYfD40iYJf9/AE1uQxVWFvU7MipKRkRv8NSHiCGgPr8Q==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@types/papaparse": {
      "version": "5.5.2",
      "resolved": "https://registry.npmjs.org/@types/papaparse/-/papaparse-5.5.2.tgz",
      "integrity": "sha512-gFnFp/JMzLHCwRf7tQHrNnfhN4eYBVYYI897CGX4MY1tzY9l2aLkVyx2IlKZ/SAqDbB3I1AOZW5gTMGGsqWliA==",
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/qs": {
      "version": "6.15.0",
      "resolved": "https://registry.npmjs.org/@types/qs/-/qs-6.15.0.tgz",
      "integrity": "sha512-JawvT8iBVWpzTrz3EGw9BTQFg3BQNmwERdKE22vlTxawwtbyUSlMppvZYKLZzB5zgACXdXxbD3m1bXaMqP/9ow==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/range-parser": {
      "version": "1.2.7",
      "resolved": "https://registry.npmjs.org/@types/range-parser/-/range-parser-1.2.7.tgz",
      "integrity": "sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/retry": {
      "version": "0.12.0",
      "resolved": "https://registry.npmjs.org/@types/retry/-/retry-0.12.0.tgz",
      "integrity": "sha512-wWKOClTTiizcZhXnPY4wikVAwmdYHp8q6DmC+EJUzAMsycb7HB32Kh9RN4+0gExjmPmZSAQjgURXIGATPegAvA==",
      "license": "MIT"
    },
    "node_modules/@types/send": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@types/send/-/send-1.2.1.tgz",
      "integrity": "sha512-arsCikDvlU99zl1g69TcAB3mzZPpxgw0UQnaHeC1Nwb015xp8bknZv5rIfri9xTOcMuaVgvabfIRA7PSZVuZIQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/serve-static": {
      "version": "1.15.10",
      "resolved": "https://registry.npmjs.org/@types/serve-static/-/serve-static-1.15.10.tgz",
      "integrity": "sha512-tRs1dB+g8Itk72rlSI2ZrW6vZg0YrLI81iQSTkMmOqnqCaNr/8Ek4VwWcN5vZgCYWbg/JJSGBlUaYGAOP73qBw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/http-errors": "*",
        "@types/node": "*",
        "@types/send": "<1"
      }
    },
    "node_modules/@types/serve-static/node_modules/@types/send": {
      "version": "0.17.6",
      "resolved": "https://registry.npmjs.org/@types/send/-/send-0.17.6.tgz",
      "integrity": "sha512-Uqt8rPBE8SY0RK8JB1EzVOIZ32uqy8HwdxCnoCOsYrvnswqmFZ/k+9Ikidlk/ImhsdvBsloHbAlewb2IEBV/Og==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/mime": "^1",
        "@types/node": "*"
      }
    },
    "node_modules/@types/use-sync-external-store": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/@types/use-sync-external-store/-/use-sync-external-store-0.0.6.tgz",
      "integrity": "sha512-zFDAD+tlpf2r4asuHEj0XH6pY6i0g5NeAHPn+15wk3BV6JA69eERFXC1gyGThDkVa1zCyKr5jox1+2LbV/AMLg==",
      "license": "MIT"
    },
    "node_modules/@types/ws": {
      "version": "8.18.1",
      "resolved": "https://registry.npmjs.org/@types/ws/-/ws-8.18.1.tgz",
      "integrity": "sha512-ThVF6DCVhA8kUGy+aazFQ4kXQ7E1Ty7A3ypFOe0IcJV8O/M511G99AW24irKrW56Wt44yG9+ij8FaqoBGkuBXg==",
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-5.2.0.tgz",
      "integrity": "sha512-YmKkfhOAi3wsB1PhJq5Scj3GXMn3WvtQ/JC0xoopuHoXSdmtdStOpFrYaT1kie2YgFBcIe64ROzMYRjCrYOdYw==",
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.29.0",
        "@babel/plugin-transform-react-jsx-self": "^7.27.1",
        "@babel/plugin-transform-react-jsx-source": "^7.27.1",
        "@rolldown/pluginutils": "1.0.0-rc.3",
        "@types/babel__core": "^7.20.5",
        "react-refresh": "^0.18.0"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "peerDependencies": {
        "vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/accepts": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-1.3.8.tgz",
      "integrity": "sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "~2.1.34",
        "negotiator": "0.6.3"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/agent-base": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/aria-hidden": {
      "version": "1.2.6",
      "resolved": "https://registry.npmjs.org/aria-hidden/-/aria-hidden-1.2.6.tgz",
      "integrity": "sha512-ik3ZgC9dY/lYVVM++OISsaYDeg1tb0VtP5uL3ouh1koGOaUMDPpbFIei4JkFimWUFPn90sbMNMXQAIVOlnYKJA==",
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/array-flatten": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/array-flatten/-/array-flatten-1.1.1.tgz",
      "integrity": "sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg==",
      "license": "MIT"
    },
    "node_modules/asynckit": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/asynckit/-/asynckit-0.4.0.tgz",
      "integrity": "sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==",
      "license": "MIT"
    },
    "node_modules/attr-accept": {
      "version": "2.2.5",
      "resolved": "https://registry.npmjs.org/attr-accept/-/attr-accept-2.2.5.tgz",
      "integrity": "sha512-0bDNnY/u6pPwHDMoF0FieU354oBi0a8rD9FcsLwzcGWbc8KS8KPIi7y+s13OlVY+gMWc/9xEMUgNE6Qm8ZllYQ==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/autoprefixer": {
      "version": "10.5.0",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.5.0.tgz",
      "integrity": "sha512-FMhOoZV4+qR6aTUALKX2rEqGG+oyATvwBt9IIzVR5rMa2HRWPkxf+P+PAJLD1I/H5/II+HuZcBJYEFBpq39ong==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.28.2",
        "caniuse-lite": "^1.0.30001787",
        "fraction.js": "^5.3.4",
        "picocolors": "^1.1.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/axios": {
      "version": "1.16.0",
      "resolved": "https://registry.npmjs.org/axios/-/axios-1.16.0.tgz",
      "integrity": "sha512-6hp5CwvTPlN2A31g5dxnwAX0orzM7pmCRDLnZSX772mv8WDqICwFjowHuPs04Mc8deIld1+ejhtaMn5vp6b+1w==",
      "license": "MIT",
      "dependencies": {
        "follow-redirects": "^1.16.0",
        "form-data": "^4.0.5",
        "proxy-from-env": "^2.1.0"
      }
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.10.25",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.10.25.tgz",
      "integrity": "sha512-QO/VHsXCQdnzADMfmkeOPvHdIAkoB7i0/rGjINPJEetLx75hNttVWGQ/jycHUDP9zZ9rupbm60WRxcwViB0MiA==",
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/bignumber.js": {
      "version": "9.3.1",
      "resolved": "https://registry.npmjs.org/bignumber.js/-/bignumber.js-9.3.1.tgz",
      "integrity": "sha512-Ko0uX15oIUS7wJ3Rb30Fs6SkVbLmPBAKdlm7q9+ak9bbIeFf0MwuBsQV6z7+X768/cHsfg+WlysDWJcmthjsjQ==",
      "license": "MIT",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/body-parser": {
      "version": "1.20.5",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-1.20.5.tgz",
      "integrity": "sha512-3grm+/2tUOvu2cjJkvsIxrv/wVpfXQW4PsQHYm7yk4vfpu7Ekl6nEsYBoJUL6qDwZUx8wUhQ8tR2qz+ad9c9OA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "content-type": "~1.0.5",
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "~1.2.0",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.4.24",
        "on-finished": "~2.4.1",
        "qs": "~6.15.1",
        "raw-body": "~2.5.3",
        "type-is": "~1.6.18",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/body-parser/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/body-parser/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/body-parser/node_modules/qs": {
      "version": "6.15.1",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.15.1.tgz",
      "integrity": "sha512-6YHEFRL9mfgcAvql/XhwTvf5jKcOiiupt2FiJxHkiX1z4j7WL8J/jRHYLluORvc1XxB5rV20KoeK00gVJamspg==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/browserslist": {
      "version": "4.28.2",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.28.2.tgz",
      "integrity": "sha512-48xSriZYYg+8qXna9kwqjIVzuQxi+KYWp2+5nCYnYKPTr0LvD89Jqk2Or5ogxz0NUMfIjhh2lIUX/LyX9B4oIg==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "baseline-browser-mapping": "^2.10.12",
        "caniuse-lite": "^1.0.30001782",
        "electron-to-chromium": "^1.5.328",
        "node-releases": "^2.0.36",
        "update-browserslist-db": "^1.2.3"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/buffer-equal-constant-time": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz",
      "integrity": "sha512-zRpUiDwd/xk6ADqPMATG8vc9VPrkck7T07OIx0gnjmJAnHnTVXNQG3vfvWNuiZIkwu9KrKdA1iJKfsfTVxE6NA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001791",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001791.tgz",
      "integrity": "sha512-yk0l/YSrOnFZk3UROpDLQD9+kC1l4meK/wed583AXrzoarMGJcbRi2Q4RaUYbKxYAsZ8sWmaSa/DsLmdBeI1vQ==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/chalk/node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/class-variance-authority": {
      "version": "0.7.1",
      "resolved": "https://registry.npmjs.org/class-variance-authority/-/class-variance-authority-0.7.1.tgz",
      "integrity": "sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==",
      "license": "Apache-2.0",
      "dependencies": {
        "clsx": "^2.1.1"
      },
      "funding": {
        "url": "https://polar.sh/cva"
      }
    },
    "node_modules/cliui": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
      "integrity": "sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.1",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/clsx": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/clsx/-/clsx-2.1.1.tgz",
      "integrity": "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/combined-stream": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/combined-stream/-/combined-stream-1.0.8.tgz",
      "integrity": "sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==",
      "license": "MIT",
      "dependencies": {
        "delayed-stream": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/concurrently": {
      "version": "9.2.1",
      "resolved": "https://registry.npmjs.org/concurrently/-/concurrently-9.2.1.tgz",
      "integrity": "sha512-fsfrO0MxV64Znoy8/l1vVIjjHa29SZyyqPgQBwhiDcaW8wJc2W3XWVOGx4M3oJBnv/zdUZIIp1gDeS98GzP8Ng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "chalk": "4.1.2",
        "rxjs": "7.8.2",
        "shell-quote": "1.8.3",
        "supports-color": "8.1.1",
        "tree-kill": "1.2.2",
        "yargs": "17.7.2"
      },
      "bin": {
        "conc": "dist/bin/concurrently.js",
        "concurrently": "dist/bin/concurrently.js"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/open-cli-tools/concurrently?sponsor=1"
      }
    },
    "node_modules/content-disposition": {
      "version": "0.5.4",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-0.5.4.tgz",
      "integrity": "sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "5.2.1"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "license": "MIT"
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-signature": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.0.7.tgz",
      "integrity": "sha512-NXdYc3dLr47pBkpUCHtKSwIOQXLVn8dZEuywboCOJY/osA0wFSLlSawr3KN8qXJEyX66FcONTH8EIlVuK0yyFA==",
      "license": "MIT"
    },
    "node_modules/d3-array": {
      "version": "3.2.4",
      "resolved": "https://registry.npmjs.org/d3-array/-/d3-array-3.2.4.tgz",
      "integrity": "sha512-tdQAmyA18i4J7wprpYq8ClcxZy3SC31QMeByyCFyRt7BVHdREQZ5lpzoe5mFEYZUWe+oq8HBvk9JjpibyEV4Jg==",
      "license": "ISC",
      "dependencies": {
        "internmap": "1 - 2"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-color": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-color/-/d3-color-3.1.0.tgz",
      "integrity": "sha512-zg/chbXyeBtMQ1LbD/WSoW2DpC3I0mpmPdW+ynRTj/x2DAWYrIY7qeZIHidozwV24m4iavr15lNwIwLxRmOxhA==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-ease": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/d3-ease/-/d3-ease-3.0.1.tgz",
      "integrity": "sha512-wR/XK3D3XcLIZwpbvQwQ5fK+8Ykds1ip7A2Txe0yxncXSdq1L9skcG7blcedkOX+ZcgxGAmLX1FrRGbADwzi0w==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-format": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/d3-format/-/d3-format-3.1.2.tgz",
      "integrity": "sha512-AJDdYOdnyRDV5b6ArilzCPPwc1ejkHcoyFarqlPqT7zRYjhavcT3uSrqcMvsgh2CgoPbK3RCwyHaVyxYcP2Arg==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-interpolate": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/d3-interpolate/-/d3-interpolate-3.0.1.tgz",
      "integrity": "sha512-3bYs1rOD33uo8aqJfKP3JWPAibgw8Zm2+L9vBKEHJ2Rg+viTR7o5Mmv5mZcieN+FRYaAOWX5SJATX6k1PWz72g==",
      "license": "ISC",
      "dependencies": {
        "d3-color": "1 - 3"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-path": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-path/-/d3-path-3.1.0.tgz",
      "integrity": "sha512-p3KP5HCf/bvjBSSKuXid6Zqijx7wIfNW+J/maPs+iwR35at5JCbLUT0LzF1cnjbCHWhqzQTIN2Jpe8pRebIEFQ==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-scale": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/d3-scale/-/d3-scale-4.0.2.tgz",
      "integrity": "sha512-GZW464g1SH7ag3Y7hXjf8RoUuAFIqklOAq3MRl4OaWabTFJY9PN/E1YklhXLh+OQ3fM9yS2nOkCoS+WLZ6kvxQ==",
      "license": "ISC",
      "dependencies": {
        "d3-array": "2.10.0 - 3",
        "d3-format": "1 - 3",
        "d3-interpolate": "1.2.0 - 3",
        "d3-time": "2.1.1 - 3",
        "d3-time-format": "2 - 4"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-shape": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/d3-shape/-/d3-shape-3.2.0.tgz",
      "integrity": "sha512-SaLBuwGm3MOViRq2ABk3eLoxwZELpH6zhl3FbAoJ7Vm1gofKx6El1Ib5z23NUEhF9AsGl7y+dzLe5Cw2AArGTA==",
      "license": "ISC",
      "dependencies": {
        "d3-path": "^3.1.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-time": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-time/-/d3-time-3.1.0.tgz",
      "integrity": "sha512-VqKjzBLejbSMT4IgbmVgDjpkYrNWUYJnbCGo874u7MMKIWsILRX+OpX/gTk8MqjpT1A/c6HY2dCA77ZN0lkQ2Q==",
      "license": "ISC",
      "dependencies": {
        "d3-array": "2 - 3"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-time-format": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/d3-time-format/-/d3-time-format-4.1.0.tgz",
      "integrity": "sha512-dJxPBlzC7NugB2PDLwo9Q8JiTR3M3e4/XANkreKSUxF8vvXKqm1Yfq4Q5dl8budlunRVlUUaDUgFt7eA8D6NLg==",
      "license": "ISC",
      "dependencies": {
        "d3-time": "1 - 3"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-timer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/d3-timer/-/d3-timer-3.0.1.tgz",
      "integrity": "sha512-ndfJ/JxxMd3nw31uyKoY2naivF+r29V+Lc0svZxe1JvvIRmi8hUsrMvdOwgS1o6uBHmiz91geQ0ylPP0aj1VUA==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/data-uri-to-buffer": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/data-uri-to-buffer/-/data-uri-to-buffer-4.0.1.tgz",
      "integrity": "sha512-0R9ikRb668HB7QDxT1vkpuUBtqc53YyAwMwGeUFKRojY/NWKvdZ+9UYtRfGmhqNbRkTSVpMbmyhXipFFv2cb/A==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/date-fns": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/date-fns/-/date-fns-4.1.0.tgz",
      "integrity": "sha512-Ukq0owbQXxa/U3EGtsdVBkR1w7KOQ5gIBqdH2hkvknzZPYvBxb/aa6E8L7tmjFtkwZBu3UXBbjIgPo/Ez4xaNg==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/kossnocorp"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/decimal.js-light": {
      "version": "2.5.1",
      "resolved": "https://registry.npmjs.org/decimal.js-light/-/decimal.js-light-2.5.1.tgz",
      "integrity": "sha512-qIMFpTMZmny+MMIitAB6D7iVPEorVw6YQRWkvarTkT4tBeSLLiHzcwj6q0MmYSFCiVpiqPJTJEYIrpcPzVEIvg==",
      "license": "MIT"
    },
    "node_modules/delayed-stream": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/delayed-stream/-/delayed-stream-1.0.0.tgz",
      "integrity": "sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/destroy": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/destroy/-/destroy-1.2.0.tgz",
      "integrity": "sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/detect-node-es": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/detect-node-es/-/detect-node-es-1.1.0.tgz",
      "integrity": "sha512-ypdmJU/TbBby2Dxibuv7ZLW3Bs1QEmM7nHjEANfohJLvE0XVujisn1qPJcZxg+qDucsr+bP6fLD1rPS3AhJ7EQ==",
      "license": "MIT"
    },
    "node_modules/dotenv": {
      "version": "17.4.2",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.4.2.tgz",
      "integrity": "sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ecdsa-sig-formatter": {
      "version": "1.0.11",
      "resolved": "https://registry.npmjs.org/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz",
      "integrity": "sha512-nagl3RYrbNv6kQkeJIpt6NJZy8twLB/2vtz6yN9Z4vRKHN4/QZJIEbqohALSgwKdnksuY3k5Addp5lg8sVoVcQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==",
      "license": "MIT"
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.349",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.349.tgz",
      "integrity": "sha512-QsWVGyRuY07Aqb234QytTfwd5d9AJlfNIQ5wIOl1L+PZDzI9d9+Fn0FRale/QYlFxt/bUnB0/nLd1jFPGxGK1A==",
      "license": "ISC"
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/enhanced-resolve": {
      "version": "5.21.0",
      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.21.0.tgz",
      "integrity": "sha512-otxSQPw4lkOZWkHpB3zaEQs6gWYEsmX4xQF68ElXC/TWvGxGMSGOvoNbaLXm6/cS/fSfHtsEdw90y20PCd+sCA==",
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.4",
        "tapable": "^2.3.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz",
      "integrity": "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-set-tostringtag": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/es-set-tostringtag/-/es-set-tostringtag-2.1.0.tgz",
      "integrity": "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-toolkit": {
      "version": "1.46.1",
      "resolved": "https://registry.npmjs.org/es-toolkit/-/es-toolkit-1.46.1.tgz",
      "integrity": "sha512-5eNtXOs3tbfxXOj04tjjseeWkRWaoCjdEI+96DgwzZoe6c9juL49pXlzAFTI72aWC9Y8p7168g6XIKjh7k6pyQ==",
      "license": "MIT",
      "workspaces": [
        "docs",
        "benchmarks"
      ]
    },
    "node_modules/esbuild": {
      "version": "0.27.7",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.27.7.tgz",
      "integrity": "sha512-IxpibTjyVnmrIQo5aqNpCgoACA/dTKLTlhMHihVHhdkxKyPO1uBBthumT0rdHmcsk9uMonIWS0m4FljWzILh3w==",
      "devOptional": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.27.7",
        "@esbuild/android-arm": "0.27.7",
        "@esbuild/android-arm64": "0.27.7",
        "@esbuild/android-x64": "0.27.7",
        "@esbuild/darwin-arm64": "0.27.7",
        "@esbuild/darwin-x64": "0.27.7",
        "@esbuild/freebsd-arm64": "0.27.7",
        "@esbuild/freebsd-x64": "0.27.7",
        "@esbuild/linux-arm": "0.27.7",
        "@esbuild/linux-arm64": "0.27.7",
        "@esbuild/linux-ia32": "0.27.7",
        "@esbuild/linux-loong64": "0.27.7",
        "@esbuild/linux-mips64el": "0.27.7",
        "@esbuild/linux-ppc64": "0.27.7",
        "@esbuild/linux-riscv64": "0.27.7",
        "@esbuild/linux-s390x": "0.27.7",
        "@esbuild/linux-x64": "0.27.7",
        "@esbuild/netbsd-arm64": "0.27.7",
        "@esbuild/netbsd-x64": "0.27.7",
        "@esbuild/openbsd-arm64": "0.27.7",
        "@esbuild/openbsd-x64": "0.27.7",
        "@esbuild/openharmony-arm64": "0.27.7",
        "@esbuild/sunos-x64": "0.27.7",
        "@esbuild/win32-arm64": "0.27.7",
        "@esbuild/win32-ia32": "0.27.7",
        "@esbuild/win32-x64": "0.27.7"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==",
      "license": "MIT"
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/eventemitter3": {
      "version": "5.0.4",
      "resolved": "https://registry.npmjs.org/eventemitter3/-/eventemitter3-5.0.4.tgz",
      "integrity": "sha512-mlsTRyGaPBjPedk6Bvw+aqbsXDtoAyAzm5MO7JgU+yVRyMQ5O8bD4Kcci7BS85f93veegeCPkL8R4GLClnjLFw==",
      "license": "MIT"
    },
    "node_modules/express": {
      "version": "4.22.1",
      "resolved": "https://registry.npmjs.org/express/-/express-4.22.1.tgz",
      "integrity": "sha512-F2X8g9P1X7uCPZMA3MVf9wcTqlyNp7IhH5qPCI0izhaOIYXaW9L535tGA3qmjRzpH+bZczqq7hVKxTR4NWnu+g==",
      "license": "MIT",
      "dependencies": {
        "accepts": "~1.3.8",
        "array-flatten": "1.1.1",
        "body-parser": "~1.20.3",
        "content-disposition": "~0.5.4",
        "content-type": "~1.0.4",
        "cookie": "~0.7.1",
        "cookie-signature": "~1.0.6",
        "debug": "2.6.9",
        "depd": "2.0.0",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "finalhandler": "~1.3.1",
        "fresh": "~0.5.2",
        "http-errors": "~2.0.0",
        "merge-descriptors": "1.0.3",
        "methods": "~1.1.2",
        "on-finished": "~2.4.1",
        "parseurl": "~1.3.3",
        "path-to-regexp": "~0.1.12",
        "proxy-addr": "~2.0.7",
        "qs": "~6.14.0",
        "range-parser": "~1.2.1",
        "safe-buffer": "5.2.1",
        "send": "~0.19.0",
        "serve-static": "~1.16.2",
        "setprototypeof": "1.2.0",
        "statuses": "~2.0.1",
        "type-is": "~1.6.18",
        "utils-merge": "1.0.1",
        "vary": "~1.1.2"
      },
      "engines": {
        "node": ">= 0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/express/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/extend": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/extend/-/extend-3.0.2.tgz",
      "integrity": "sha512-fjquC59cD7CyW6urNXK0FBufkZcoiGG80wTuPujX590cB5Ttln20E2UB4S/WARVqhXffZl2LNgS+gQdPIIim/g==",
      "license": "MIT"
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/fetch-blob": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/fetch-blob/-/fetch-blob-3.2.0.tgz",
      "integrity": "sha512-7yAQpD2UMJzLi1Dqv7qFYnPbaPx7ZfFK6PiIxQ4PfkGPyNyl2Ugx+a/umUonmKqjhM4DnfbMvdX6otXq83soQQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/jimmywarting"
        },
        {
          "type": "paypal",
          "url": "https://paypal.me/jimmywarting"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "node-domexception": "^1.0.0",
        "web-streams-polyfill": "^3.0.3"
      },
      "engines": {
        "node": "^12.20 || >= 14.13"
      }
    },
    "node_modules/file-selector": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/file-selector/-/file-selector-2.1.2.tgz",
      "integrity": "sha512-QgXo+mXTe8ljeqUFaX3QVHc5osSItJ/Km+xpocx0aSqWGMSCf6qYs/VnzZgS864Pjn5iceMRFigeAV7AfTlaig==",
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.7.0"
      },
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/finalhandler": {
      "version": "1.3.2",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-1.3.2.tgz",
      "integrity": "sha512-aA4RyPcd3badbdABGDuTXCMTtOneUCAYH/gxoYRTZlIJdF0YPWuGqiAsIrhNnnqdXGswYk6dGujem4w80UJFhg==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "on-finished": "~2.4.1",
        "parseurl": "~1.3.3",
        "statuses": "~2.0.2",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/finalhandler/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/finalhandler/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/follow-redirects": {
      "version": "1.16.0",
      "resolved": "https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.16.0.tgz",
      "integrity": "sha512-y5rN/uOsadFT/JfYwhxRS5R7Qce+g3zG97+JrtFZlC9klX/W5hD7iiLzScI4nZqUS7DNUdhPgw4xI8W2LuXlUw==",
      "funding": [
        {
          "type": "individual",
          "url": "https://github.com/sponsors/RubenVerborgh"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=4.0"
      },
      "peerDependenciesMeta": {
        "debug": {
          "optional": true
        }
      }
    },
    "node_modules/form-data": {
      "version": "4.0.5",
      "resolved": "https://registry.npmjs.org/form-data/-/form-data-4.0.5.tgz",
      "integrity": "sha512-8RipRLol37bNs2bhoV67fiTEvdTrbMUYcFTiy3+wuuOnUog2QBHCZWXDRijWQfAkhBj2Uf5UnVaiWwA5vdd82w==",
      "license": "MIT",
      "dependencies": {
        "asynckit": "^0.4.0",
        "combined-stream": "^1.0.8",
        "es-set-tostringtag": "^2.1.0",
        "hasown": "^2.0.2",
        "mime-types": "^2.1.12"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/formdata-polyfill": {
      "version": "4.0.10",
      "resolved": "https://registry.npmjs.org/formdata-polyfill/-/formdata-polyfill-4.0.10.tgz",
      "integrity": "sha512-buewHzMvYL29jdeQTVILecSaZKnt/RJWjoZCF5OW60Z67/GmSLBkOFM7qh1PI3zFNtJbaZL5eQu1vLfazOwj4g==",
      "license": "MIT",
      "dependencies": {
        "fetch-blob": "^3.1.2"
      },
      "engines": {
        "node": ">=12.20.0"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fraction.js": {
      "version": "5.3.4",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-5.3.4.tgz",
      "integrity": "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/framer-motion": {
      "version": "12.38.0",
      "resolved": "https://registry.npmjs.org/framer-motion/-/framer-motion-12.38.0.tgz",
      "integrity": "sha512-rFYkY/pigbcswl1XQSb7q424kSTQ8q6eAC+YUsSKooHQYuLdzdHjrt6uxUC+PRAO++q5IS7+TamgIw1AphxR+g==",
      "license": "MIT",
      "dependencies": {
        "motion-dom": "^12.38.0",
        "motion-utils": "^12.36.0",
        "tslib": "^2.4.0"
      },
      "peerDependencies": {
        "@emotion/is-prop-valid": "*",
        "react": "^18.0.0 || ^19.0.0",
        "react-dom": "^18.0.0 || ^19.0.0"
      },
      "peerDependenciesMeta": {
        "@emotion/is-prop-valid": {
          "optional": true
        },
        "react": {
          "optional": true
        },
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/fresh": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-0.5.2.tgz",
      "integrity": "sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gaxios": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/gaxios/-/gaxios-7.1.4.tgz",
      "integrity": "sha512-bTIgTsM2bWn3XklZISBTQX7ZSddGW+IO3bMdGaemHZ3tbqExMENHLx6kKZ/KlejgrMtj8q7wBItt51yegqalrA==",
      "license": "Apache-2.0",
      "dependencies": {
        "extend": "^3.0.2",
        "https-proxy-agent": "^7.0.1",
        "node-fetch": "^3.3.2"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/gcp-metadata": {
      "version": "8.1.2",
      "resolved": "https://registry.npmjs.org/gcp-metadata/-/gcp-metadata-8.1.2.tgz",
      "integrity": "sha512-zV/5HKTfCeKWnxG0Dmrw51hEWFGfcF2xiXqcA3+J90WDuP0SvoiSO5ORvcBsifmx/FoIjgQN3oNOGaQ5PhLFkg==",
      "license": "Apache-2.0",
      "dependencies": {
        "gaxios": "^7.0.0",
        "google-logging-utils": "^1.0.0",
        "json-bigint": "^1.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-nonce": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-nonce/-/get-nonce-1.0.1.tgz",
      "integrity": "sha512-FJhYRoDaiatfEkUK8HKlicmu/3SGFD51q3itKDGoSTysQJBnfOcxU5GxnhE1E6soB76MbT0MBtnKJuXyAx+96Q==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/get-tsconfig": {
      "version": "4.14.0",
      "resolved": "https://registry.npmjs.org/get-tsconfig/-/get-tsconfig-4.14.0.tgz",
      "integrity": "sha512-yTb+8DXzDREzgvYmh6s9vHsSVCHeC0G3PI5bEXNBHtmshPnO+S5O7qgLEOn0I5QvMy6kpZN8K1NKGyilLb93wA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "resolve-pkg-maps": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/privatenumber/get-tsconfig?sponsor=1"
      }
    },
    "node_modules/google-auth-library": {
      "version": "10.6.2",
      "resolved": "https://registry.npmjs.org/google-auth-library/-/google-auth-library-10.6.2.tgz",
      "integrity": "sha512-e27Z6EThmVNNvtYASwQxose/G57rkRuaRbQyxM2bvYLLX/GqWZ5chWq2EBoUchJbCc57eC9ArzO5wMsEmWftCw==",
      "license": "Apache-2.0",
      "dependencies": {
        "base64-js": "^1.3.0",
        "ecdsa-sig-formatter": "^1.0.11",
        "gaxios": "^7.1.4",
        "gcp-metadata": "8.1.2",
        "google-logging-utils": "1.1.3",
        "jws": "^4.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/google-logging-utils": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/google-logging-utils/-/google-logging-utils-1.1.3.tgz",
      "integrity": "sha512-eAmLkjDjAFCVXg7A1unxHsLf961m6y17QFqXqAXGj/gVkKFrEICfStRfwUlGNfeCEjNRa32JEWOUTlYXPyyKvA==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "license": "ISC"
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-tostringtag": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-tostringtag/-/has-tostringtag-1.0.2.tgz",
      "integrity": "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==",
      "license": "MIT",
      "dependencies": {
        "has-symbols": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.3.tgz",
      "integrity": "sha512-ej4AhfhfL2Q2zpMmLo7U1Uv9+PyhIZpgQLGT1F9miIGmiCJIoCgSmczFdrc97mWT4kVY72KA+WnnhJ5pghSvSg==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/hey-listen": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/hey-listen/-/hey-listen-1.0.8.tgz",
      "integrity": "sha512-COpmrF2NOg4TBWUJ5UVyaCU2A88wEMkUPK4hNqyCkqHbxT92BbvfjoSozkAIIm6XhicGlJHhFdullInrdhwU8Q==",
      "license": "MIT"
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz",
      "integrity": "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==",
      "license": "MIT",
      "dependencies": {
        "agent-base": "^7.1.2",
        "debug": "4"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/iceberg-js": {
      "version": "0.8.1",
      "resolved": "https://registry.npmjs.org/iceberg-js/-/iceberg-js-0.8.1.tgz",
      "integrity": "sha512-1dhVQZXhcHje7798IVM+xoo/1ZdVfzOMIc8/rgVSijRK38EDqOJoGula9N/8ZI5RD8QTxNQtK/Gozpr+qUqRRA==",
      "license": "MIT",
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.4.24",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.4.24.tgz",
      "integrity": "sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==",
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/immer": {
      "version": "10.2.0",
      "resolved": "https://registry.npmjs.org/immer/-/immer-10.2.0.tgz",
      "integrity": "sha512-d/+XTN3zfODyjr89gM3mPq1WNX2B8pYsu7eORitdwyA2sBubnTl3laYlBk4sXY5FUa5qTZGBDPJICVbvqzjlbw==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/immer"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/internmap": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/internmap/-/internmap-2.0.3.tgz",
      "integrity": "sha512-5Hh7Y1wQbvY5ooGgPbDaL5iYLAPzMTUrjMulskHLH6wnv/A+1q5rgEaiuqEjB+oxGXIVZs1FF+R/KPN3ZSQYYg==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/jiti": {
      "version": "2.6.1",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.6.1.tgz",
      "integrity": "sha512-ekilCSN1jwRvIbgeg/57YFh8qQDNbwDb9xT/qu2DAHbFFZUicIl4ygVaAvzveMhMVr3LnpSKTNnwt8PoOfmKhQ==",
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "license": "MIT"
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-bigint": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/json-bigint/-/json-bigint-1.0.0.tgz",
      "integrity": "sha512-SiPv/8VpZuWbvLSMtTDU8hEfrZWg/mH/nV/b4o0CYbSxu1UIQPLdwKOCIyLQX+VIPO5vrLX3i8qtqFyhdPSUSQ==",
      "license": "MIT",
      "dependencies": {
        "bignumber.js": "^9.0.0"
      }
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/jwa": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/jwa/-/jwa-2.0.1.tgz",
      "integrity": "sha512-hRF04fqJIP8Abbkq5NKGN0Bbr3JxlQ+qhZufXVr0DvujKy93ZCbXZMHDL4EOtodSbCWxOqR8MS1tXA5hwqCXDg==",
      "license": "MIT",
      "dependencies": {
        "buffer-equal-constant-time": "^1.0.1",
        "ecdsa-sig-formatter": "1.0.11",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/jws": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/jws/-/jws-4.0.1.tgz",
      "integrity": "sha512-EKI/M/yqPncGUUh44xz0PxSidXFr/+r0pA70+gIYhjv+et7yxM+s29Y+VGDkovRofQem0fs7Uvf4+YmAdyRduA==",
      "license": "MIT",
      "dependencies": {
        "jwa": "^2.0.1",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.32.0.tgz",
      "integrity": "sha512-NXYBzinNrblfraPGyrbPoD19C1h9lfI/1mzgWYvXUTe414Gz/X1FD2XBZSZM7rRTrMA8JL3OtAaGifrIKhQ5yQ==",
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.32.0",
        "lightningcss-darwin-arm64": "1.32.0",
        "lightningcss-darwin-x64": "1.32.0",
        "lightningcss-freebsd-x64": "1.32.0",
        "lightningcss-linux-arm-gnueabihf": "1.32.0",
        "lightningcss-linux-arm64-gnu": "1.32.0",
        "lightningcss-linux-arm64-musl": "1.32.0",
        "lightningcss-linux-x64-gnu": "1.32.0",
        "lightningcss-linux-x64-musl": "1.32.0",
        "lightningcss-win32-arm64-msvc": "1.32.0",
        "lightningcss-win32-x64-msvc": "1.32.0"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.32.0.tgz",
      "integrity": "sha512-YK7/ClTt4kAK0vo6w3X+Pnm0D2cf2vPHbhOXdoNti1Ga0al1P4TBZhwjATvjNwLEBCnKvjJc2jQgHXH0NEwlAg==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.32.0.tgz",
      "integrity": "sha512-RzeG9Ju5bag2Bv1/lwlVJvBE3q6TtXskdZLLCyfg5pt+HLz9BqlICO7LZM7VHNTTn/5PRhHFBSjk5lc4cmscPQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.32.0.tgz",
      "integrity": "sha512-U+QsBp2m/s2wqpUYT/6wnlagdZbtZdndSmut/NJqlCcMLTWp5muCrID+K5UJ6jqD2BFshejCYXniPDbNh73V8w==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.32.0.tgz",
      "integrity": "sha512-JCTigedEksZk3tHTTthnMdVfGf61Fky8Ji2E4YjUTEQX14xiy/lTzXnu1vwiZe3bYe0q+SpsSH/CTeDXK6WHig==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.32.0.tgz",
      "integrity": "sha512-x6rnnpRa2GL0zQOkt6rts3YDPzduLpWvwAF6EMhXFVZXD4tPrBkEFqzGowzCsIWsPjqSK+tyNEODUBXeeVHSkw==",
      "cpu": [
        "arm"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.32.0.tgz",
      "integrity": "sha512-0nnMyoyOLRJXfbMOilaSRcLH3Jw5z9HDNGfT/gwCPgaDjnx0i8w7vBzFLFR1f6CMLKF8gVbebmkUN3fa/kQJpQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.32.0.tgz",
      "integrity": "sha512-UpQkoenr4UJEzgVIYpI80lDFvRmPVg6oqboNHfoH4CQIfNA+HOrZ7Mo7KZP02dC6LjghPQJeBsvXhJod/wnIBg==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.32.0.tgz",
      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.32.0.tgz",
      "integrity": "sha512-bYcLp+Vb0awsiXg/80uCRezCYHNg1/l3mt0gzHnWV9XP1W5sKa5/TCdGWaR/zBM2PeF/HbsQv/j2URNOiVuxWg==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.32.0.tgz",
      "integrity": "sha512-8SbC8BR40pS6baCM8sbtYDSwEVQd4JlFTOlaD3gWGHfThTcABnNDBda6eTZeqbofalIJhFx0qKzgHJmcPTnGdw==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.32.0.tgz",
      "integrity": "sha512-Amq9B/SoZYdDi1kFrojnoqPLxYhQ4Wo5XiL8EVJrVsB8ARoC1PWW6VGtT0WKCemjy8aC+louJnjS7U18x3b06Q==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/long": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/long/-/long-5.3.2.tgz",
      "integrity": "sha512-mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA==",
      "license": "Apache-2.0"
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/lucide-react": {
      "version": "0.546.0",
      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-0.546.0.tgz",
      "integrity": "sha512-Z94u6fKT43lKeYHiVyvyR8fT7pwCzDu7RyMPpTvh054+xahSgj4HFQ+NmflvzdXsoAjYGdCguGaFKYuvq0ThCQ==",
      "license": "ISC",
      "peerDependencies": {
        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-0.3.0.tgz",
      "integrity": "sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/merge-descriptors": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-1.0.3.tgz",
      "integrity": "sha512-gaNvAS7TZ897/rVaZ0nMtAyxNyi/pdbjbAwUpFQpN70GqnVfOiXpeUUMKRBmzXaSQ8DdTX4/0ms62r2K+hE6mQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/methods": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/methods/-/methods-1.1.2.tgz",
      "integrity": "sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/mime/-/mime-1.6.0.tgz",
      "integrity": "sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==",
      "license": "MIT",
      "bin": {
        "mime": "cli.js"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/motion": {
      "version": "12.38.0",
      "resolved": "https://registry.npmjs.org/motion/-/motion-12.38.0.tgz",
      "integrity": "sha512-uYfXzeHlgThchzwz5Te47dlv5JOUC7OB4rjJ/7XTUgtBZD8CchMN8qEJ4ZVsUmTyYA44zjV0fBwsiktRuFnn+w==",
      "license": "MIT",
      "dependencies": {
        "framer-motion": "^12.38.0",
        "tslib": "^2.4.0"
      },
      "peerDependencies": {
        "@emotion/is-prop-valid": "*",
        "react": "^18.0.0 || ^19.0.0",
        "react-dom": "^18.0.0 || ^19.0.0"
      },
      "peerDependenciesMeta": {
        "@emotion/is-prop-valid": {
          "optional": true
        },
        "react": {
          "optional": true
        },
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/motion-dom": {
      "version": "12.38.0",
      "resolved": "https://registry.npmjs.org/motion-dom/-/motion-dom-12.38.0.tgz",
      "integrity": "sha512-pdkHLD8QYRp8VfiNLb8xIBJis1byQ9gPT3Jnh2jqfFtAsWUA3dEepDlsWe/xMpO8McV+VdpKVcp+E+TGJEtOoA==",
      "license": "MIT",
      "dependencies": {
        "motion-utils": "^12.36.0"
      }
    },
    "node_modules/motion-utils": {
      "version": "12.36.0",
      "resolved": "https://registry.npmjs.org/motion-utils/-/motion-utils-12.36.0.tgz",
      "integrity": "sha512-eHWisygbiwVvf6PZ1vhaHCLamvkSbPIeAYxWUuL3a2PD/TROgE7FvfHWTIH4vMl798QLfMw15nRqIaRDXTlYRg==",
      "license": "MIT"
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "3.3.12",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.12.tgz",
      "integrity": "sha512-ZB9RH/39qpq5Vu6Y+NmUaFhQR6pp+M2Xt76XBnEwDaGcVAqhlvxrl3B2bKS5D3NH3QR76v3aSrKaF/Kiy7lEtQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/negotiator": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.3.tgz",
      "integrity": "sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/node-domexception": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/node-domexception/-/node-domexception-1.0.0.tgz",
      "integrity": "sha512-/jKZoMpw0F8GRwl4/eLROPA3cfcXtLApP0QzLmUT/HuPCZWyB7IY9ZrMeKw2O/nFIqPQB3PVM9aYm0F312AXDQ==",
      "deprecated": "Use your platform's native DOMException instead",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/jimmywarting"
        },
        {
          "type": "github",
          "url": "https://paypal.me/jimmywarting"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=10.5.0"
      }
    },
    "node_modules/node-fetch": {
      "version": "3.3.2",
      "resolved": "https://registry.npmjs.org/node-fetch/-/node-fetch-3.3.2.tgz",
      "integrity": "sha512-dRB78srN/l6gqWulah9SrxeYnxeddIG30+GOqK/9OlLVyLg3HPnr6SqOWTWOXKRwC2eGYCkZ59NNuSgvSrpgOA==",
      "license": "MIT",
      "dependencies": {
        "data-uri-to-buffer": "^4.0.0",
        "fetch-blob": "^3.1.4",
        "formdata-polyfill": "^4.0.10"
      },
      "engines": {
        "node": "^12.20.0 || ^14.13.1 || >=16.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/node-fetch"
      }
    },
    "node_modules/node-releases": {
      "version": "2.0.38",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.38.tgz",
      "integrity": "sha512-3qT/88Y3FbH/Kx4szpQQ4HzUbVrHPKTLVpVocKiLfoYvw9XSGOX2FmD2d6DrXbVYyAQTF2HeF6My8jmzx7/CRw==",
      "license": "MIT"
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.1.tgz",
      "integrity": "sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/p-retry": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/p-retry/-/p-retry-4.6.2.tgz",
      "integrity": "sha512-312Id396EbJdvRONlngUx0NydfrIQ5lsYu0znKVUzVvArzEIt08V1qhtyESbGVd1FGX7UKtiFp5uwKZdM8wIuQ==",
      "license": "MIT",
      "dependencies": {
        "@types/retry": "0.12.0",
        "retry": "^0.13.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/papaparse": {
      "version": "5.5.3",
      "resolved": "https://registry.npmjs.org/papaparse/-/papaparse-5.5.3.tgz",
      "integrity": "sha512-5QvjGxYVjxO59MGU2lHVYpRWBBtKHnlIAcSe1uNFCkkptUh63NFRj0FJQm7nR67puEruUci/ZkjmEFrjCAyP4A==",
      "license": "MIT"
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-to-regexp": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-0.1.13.tgz",
      "integrity": "sha512-A/AGNMFN3c8bOlvV9RreMdrv7jsmF9XIfDeCd87+I8RNg6s78BhJxMu69NEMHBSJFxKidViTEdruRwEk/WIKqA==",
      "license": "MIT"
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.4.tgz",
      "integrity": "sha512-QP88BAKvMam/3NxH6vj2o21R6MjxZUAd6nlwAS/pnGvN9IVLocLHxGYIzFhg6fUQ+5th6P4dv4eW9jX3DSIj7A==",
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.13",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.13.tgz",
      "integrity": "sha512-qif0+jGGZoLWdHey3UFHHWP0H7Gbmsk8T5VEqyYFbWqPr1XqvLGBbk/sl8V5exGmcYJklJOhOQq1pV9IcsiFag==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "nanoid": "^3.3.11",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/prop-types": {
      "version": "15.8.1",
      "resolved": "https://registry.npmjs.org/prop-types/-/prop-types-15.8.1.tgz",
      "integrity": "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.4.0",
        "object-assign": "^4.1.1",
        "react-is": "^16.13.1"
      }
    },
    "node_modules/prop-types/node_modules/react-is": {
      "version": "16.13.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-16.13.1.tgz",
      "integrity": "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==",
      "license": "MIT"
    },
    "node_modules/protobufjs": {
      "version": "7.5.6",
      "resolved": "https://registry.npmjs.org/protobufjs/-/protobufjs-7.5.6.tgz",
      "integrity": "sha512-M71sTMB146U3u0di3yup8iM+zv8yPRNQVr1KK4tyBitl3qFvEGucq/rGDRShD2rsJhtN02RJaJ7j5X5hmy8SJg==",
      "hasInstallScript": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.2",
        "@protobufjs/base64": "^1.1.2",
        "@protobufjs/codegen": "^2.0.5",
        "@protobufjs/eventemitter": "^1.1.0",
        "@protobufjs/fetch": "^1.1.0",
        "@protobufjs/float": "^1.0.2",
        "@protobufjs/inquire": "^1.1.1",
        "@protobufjs/path": "^1.1.2",
        "@protobufjs/pool": "^1.1.0",
        "@protobufjs/utf8": "^1.1.1",
        "@types/node": ">=13.7.0",
        "long": "^5.0.0"
      },
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/proxy-addr": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.7.tgz",
      "integrity": "sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==",
      "license": "MIT",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/proxy-from-env": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/proxy-from-env/-/proxy-from-env-2.1.0.tgz",
      "integrity": "sha512-cJ+oHTW1VAEa8cJslgmUZrc+sjRKgAKl3Zyse6+PV38hZe/V6Z14TbCuXcan9F9ghlz4QrFr2c92TNF82UkYHA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/qr.js": {
      "version": "0.0.0",
      "resolved": "https://registry.npmjs.org/qr.js/-/qr.js-0.0.0.tgz",
      "integrity": "sha512-c4iYnWb+k2E+vYpRimHqSu575b1/wKl4XFeJGpFmrJQz5I88v9aY2czh7s0w36srfCM1sXgC/xpoJz5dJfq+OQ==",
      "license": "MIT"
    },
    "node_modules/qs": {
      "version": "6.14.2",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.14.2.tgz",
      "integrity": "sha512-V/yCWTTF7VJ9hIh18Ugr2zhJMP01MY7c5kh4J870L7imm6/DIzBsNLTXzMwUA3yZ5b/KBqLx8Kp3uRvd7xSe3Q==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "2.5.3",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-2.5.3.tgz",
      "integrity": "sha512-s4VSOf6yN0rvbRZGxs8Om5CWj6seneMwK3oDb4lWDH0UPhWcxwOWw5+qk24bxq87szX1ydrwylIOp2uG1ojUpA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.4.24",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/react": {
      "version": "19.2.5",
      "resolved": "https://registry.npmjs.org/react/-/react-19.2.5.tgz",
      "integrity": "sha512-llUJLzz1zTUBrskt2pwZgLq59AemifIftw4aB7JxOqf1HY2FDaGDxgwpAPVzHU1kdWabH7FauP4i1oEeer2WCA==",
      "license": "MIT",
      "peer": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.2.5",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.2.5.tgz",
      "integrity": "sha512-J5bAZz+DXMMwW/wV3xzKke59Af6CHY7G4uYLN1OvBcKEsWOs4pQExj86BBKamxl/Ik5bx9whOrvBlSDfWzgSag==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "scheduler": "^0.27.0"
      },
      "peerDependencies": {
        "react": "^19.2.5"
      }
    },
    "node_modules/react-dropzone": {
      "version": "15.0.0",
      "resolved": "https://registry.npmjs.org/react-dropzone/-/react-dropzone-15.0.0.tgz",
      "integrity": "sha512-lGjYV/EoqEjEWPnmiSvH4v5IoIAwQM2W4Z1C0Q/Pw2xD0eVzKPS359BQTUMum+1fa0kH2nrKjuavmTPOGhpLPg==",
      "license": "MIT",
      "dependencies": {
        "attr-accept": "^2.2.4",
        "file-selector": "^2.1.0",
        "prop-types": "^15.8.1"
      },
      "engines": {
        "node": ">= 10.13"
      },
      "peerDependencies": {
        "react": ">= 16.8 || 18.0.0"
      }
    },
    "node_modules/react-is": {
      "version": "19.2.5",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-19.2.5.tgz",
      "integrity": "sha512-Dn0t8IQhCmeIT3wu+Apm1/YVsJXsGWi6k4sPdnBIdqMVtHtv0IGi6dcpNpNkNac0zB2uUAqNX3MHzN8c+z2rwQ==",
      "license": "MIT",
      "peer": true
    },
    "node_modules/react-qr-code": {
      "version": "2.0.21",
      "resolved": "https://registry.npmjs.org/react-qr-code/-/react-qr-code-2.0.21.tgz",
      "integrity": "sha512-xaywjo0eaF4S3LOz6ns5eoPbM2E+q9HYl4VATYpxK4bBniOhQ9noY2RJ9G4SnZFhUwzx63FUT6KdHzfKgUwyuQ==",
      "license": "MIT",
      "dependencies": {
        "prop-types": "^15.8.1",
        "qr.js": "0.0.0"
      },
      "peerDependencies": {
        "react": "*"
      }
    },
    "node_modules/react-redux": {
      "version": "9.2.0",
      "resolved": "https://registry.npmjs.org/react-redux/-/react-redux-9.2.0.tgz",
      "integrity": "sha512-ROY9fvHhwOD9ySfrF0wmvu//bKCQ6AeZZq1nJNtbDC+kk5DuSuNX/n6YWYF/SYy7bSba4D4FSz8DJeKY/S/r+g==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "@types/use-sync-external-store": "^0.0.6",
        "use-sync-external-store": "^1.4.0"
      },
      "peerDependencies": {
        "@types/react": "^18.2.25 || ^19",
        "react": "^18.0 || ^19",
        "redux": "^5.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "redux": {
          "optional": true
        }
      }
    },
    "node_modules/react-refresh": {
      "version": "0.18.0",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.18.0.tgz",
      "integrity": "sha512-QgT5//D3jfjJb6Gsjxv0Slpj23ip+HtOpnNgnb2S5zU3CB26G/IDPGoy4RJB42wzFE46DRsstbW6tKHoKbhAxw==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-remove-scroll": {
      "version": "2.7.2",
      "resolved": "https://registry.npmjs.org/react-remove-scroll/-/react-remove-scroll-2.7.2.tgz",
      "integrity": "sha512-Iqb9NjCCTt6Hf+vOdNIZGdTiH1QSqr27H/Ek9sv/a97gfueI/5h1s3yRi1nngzMUaOOToin5dI1dXKdXiF+u0Q==",
      "license": "MIT",
      "dependencies": {
        "react-remove-scroll-bar": "^2.3.7",
        "react-style-singleton": "^2.2.3",
        "tslib": "^2.1.0",
        "use-callback-ref": "^1.3.3",
        "use-sidecar": "^1.1.3"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-remove-scroll-bar": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/react-remove-scroll-bar/-/react-remove-scroll-bar-2.3.8.tgz",
      "integrity": "sha512-9r+yi9+mgU33AKcj6IbT9oRCO78WriSj6t/cF8DWBZJ9aOGPOTEDvdUDz1FwKim7QXWwmHqtdHnRJfhAxEG46Q==",
      "license": "MIT",
      "dependencies": {
        "react-style-singleton": "^2.2.2",
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-router": {
      "version": "7.14.2",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-7.14.2.tgz",
      "integrity": "sha512-yCqNne6I8IB6rVCH7XUvlBK7/QKyqypBFGv+8dj4QBFJiiRX+FG7/nkdAvGElyvVZ/HQP5N19wzteuTARXi5Gw==",
      "license": "MIT",
      "dependencies": {
        "cookie": "^1.0.1",
        "set-cookie-parser": "^2.6.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      },
      "peerDependenciesMeta": {
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/react-router-dom": {
      "version": "7.14.2",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-7.14.2.tgz",
      "integrity": "sha512-YZcM5ES8jJSM+KrJ9BdvHHqlnGTg5tH3sC5ChFRj4inosKctdyzBDhOyyHdGk597q2OT6NTrCA1OvB/YDwfekQ==",
      "license": "MIT",
      "dependencies": {
        "react-router": "7.14.2"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      }
    },
    "node_modules/react-router/node_modules/cookie": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-1.1.1.tgz",
      "integrity": "sha512-ei8Aos7ja0weRpFzJnEA9UHJ/7XQmqglbRwnf2ATjcB9Wq874VKH9kfjjirM6UhU2/E5fFYadylyhFldcqSidQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/react-style-singleton": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/react-style-singleton/-/react-style-singleton-2.2.3.tgz",
      "integrity": "sha512-b6jSvxvVnyptAiLjbkWLE/lOnR4lfTtDAl+eUC7RZy+QQWc6wRzIV2CE6xBuMmDxc2qIihtDCZD5NPOFl7fRBQ==",
      "license": "MIT",
      "dependencies": {
        "get-nonce": "^1.0.0",
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/recharts": {
      "version": "3.8.1",
      "resolved": "https://registry.npmjs.org/recharts/-/recharts-3.8.1.tgz",
      "integrity": "sha512-mwzmO1s9sFL0TduUpwndxCUNoXsBw3u3E/0+A+cLcrSfQitSG62L32N69GhqUrrT5qKcAE3pCGVINC6pqkBBQg==",
      "license": "MIT",
      "workspaces": [
        "www"
      ],
      "dependencies": {
        "@reduxjs/toolkit": "^1.9.0 || 2.x.x",
        "clsx": "^2.1.1",
        "decimal.js-light": "^2.5.1",
        "es-toolkit": "^1.39.3",
        "eventemitter3": "^5.0.1",
        "immer": "^10.1.1",
        "react-redux": "8.x.x || 9.x.x",
        "reselect": "5.1.1",
        "tiny-invariant": "^1.3.3",
        "use-sync-external-store": "^1.2.2",
        "victory-vendor": "^37.0.2"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
        "react-dom": "^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
        "react-is": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/redux": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/redux/-/redux-5.0.1.tgz",
      "integrity": "sha512-M9/ELqF6fy8FwmkpnF0S3YKOqMyoWJ4+CS5Efg2ct3oY9daQvd/Pc71FpGZsVsbl3Cpb+IIcjBDUnnyBdQbq4w==",
      "license": "MIT",
      "peer": true
    },
    "node_modules/redux-thunk": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/redux-thunk/-/redux-thunk-3.1.0.tgz",
      "integrity": "sha512-NW2r5T6ksUKXCabzhL9z+h206HQw/NJkcLm1GPImRQ8IzfXwRGqjVhKJGauHirT0DAuyy6hjdnMZaRoAcy0Klw==",
      "license": "MIT",
      "peerDependencies": {
        "redux": "^5.0.0"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/reselect": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/reselect/-/reselect-5.1.1.tgz",
      "integrity": "sha512-K/BG6eIky/SBpzfHZv/dd+9JBFiS4SWV7FIujVyJRux6e45+73RaUHXLmIR1f7WOMaQ0U1km6qwklRQxpJJY0w==",
      "license": "MIT"
    },
    "node_modules/resolve-pkg-maps": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/resolve-pkg-maps/-/resolve-pkg-maps-1.0.0.tgz",
      "integrity": "sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==",
      "devOptional": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/privatenumber/resolve-pkg-maps?sponsor=1"
      }
    },
    "node_modules/retry": {
      "version": "0.13.1",
      "resolved": "https://registry.npmjs.org/retry/-/retry-0.13.1.tgz",
      "integrity": "sha512-XQBQ3I8W1Cge0Seh+6gjj03LbmRFWuoszgK9ooCpwYIrhhoO80pfq4cUkU5DkknwfOfFteRwlZ56PYOGYyFWdg==",
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/rollup": {
      "version": "4.60.2",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.60.2.tgz",
      "integrity": "sha512-J9qZyW++QK/09NyN/zeO0dG/1GdGfyp9lV8ajHnRVLfo/uFsbji5mHnDgn/qYdUHyCkM2N+8VyspgZclfAh0eQ==",
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.8"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.60.2",
        "@rollup/rollup-android-arm64": "4.60.2",
        "@rollup/rollup-darwin-arm64": "4.60.2",
        "@rollup/rollup-darwin-x64": "4.60.2",
        "@rollup/rollup-freebsd-arm64": "4.60.2",
        "@rollup/rollup-freebsd-x64": "4.60.2",
        "@rollup/rollup-linux-arm-gnueabihf": "4.60.2",
        "@rollup/rollup-linux-arm-musleabihf": "4.60.2",
        "@rollup/rollup-linux-arm64-gnu": "4.60.2",
        "@rollup/rollup-linux-arm64-musl": "4.60.2",
        "@rollup/rollup-linux-loong64-gnu": "4.60.2",
        "@rollup/rollup-linux-loong64-musl": "4.60.2",
        "@rollup/rollup-linux-ppc64-gnu": "4.60.2",
        "@rollup/rollup-linux-ppc64-musl": "4.60.2",
        "@rollup/rollup-linux-riscv64-gnu": "4.60.2",
        "@rollup/rollup-linux-riscv64-musl": "4.60.2",
        "@rollup/rollup-linux-s390x-gnu": "4.60.2",
        "@rollup/rollup-linux-x64-gnu": "4.60.2",
        "@rollup/rollup-linux-x64-musl": "4.60.2",
        "@rollup/rollup-openbsd-x64": "4.60.2",
        "@rollup/rollup-openharmony-arm64": "4.60.2",
        "@rollup/rollup-win32-arm64-msvc": "4.60.2",
        "@rollup/rollup-win32-ia32-msvc": "4.60.2",
        "@rollup/rollup-win32-x64-gnu": "4.60.2",
        "@rollup/rollup-win32-x64-msvc": "4.60.2",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/rxjs": {
      "version": "7.8.2",
      "resolved": "https://registry.npmjs.org/rxjs/-/rxjs-7.8.2.tgz",
      "integrity": "sha512-dhKf903U/PQZY6boNNtAGdWbG85WAbjT/1xYoZIC7FAY0yWapOBQVsVrDl58W86//e1VpMNBtRV4MaXfdMySFA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.1.0"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "license": "MIT"
    },
    "node_modules/scheduler": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz",
      "integrity": "sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/send": {
      "version": "0.19.2",
      "resolved": "https://registry.npmjs.org/send/-/send-0.19.2.tgz",
      "integrity": "sha512-VMbMxbDeehAxpOtWJXlcUS5E8iXh6QmN+BkRX1GARS3wRaXEEgzCcB10gTQazO42tpNIya8xIyNx8fll1OFPrg==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "1.2.0",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "fresh": "~0.5.2",
        "http-errors": "~2.0.1",
        "mime": "1.6.0",
        "ms": "2.1.3",
        "on-finished": "~2.4.1",
        "range-parser": "~1.2.1",
        "statuses": "~2.0.2"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/send/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/send/node_modules/debug/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/serve-static": {
      "version": "1.16.3",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-1.16.3.tgz",
      "integrity": "sha512-x0RTqQel6g5SY7Lg6ZreMmsOzncHFU7nhnRWkKgWuMTu5NN0DR5oruckMqRvacAN9d5w6ARnRBXl9xhDCgfMeA==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "parseurl": "~1.3.3",
        "send": "~0.19.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/set-cookie-parser": {
      "version": "2.7.2",
      "resolved": "https://registry.npmjs.org/set-cookie-parser/-/set-cookie-parser-2.7.2.tgz",
      "integrity": "sha512-oeM1lpU/UvhTxw+g3cIfxXHyJRc/uidd3yK1P242gzHds0udQBYzs3y8j4gCCW+ZJ7ad0yctld8RYO+bdurlvw==",
      "license": "MIT"
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==",
      "license": "ISC"
    },
    "node_modules/shell-quote": {
      "version": "1.8.3",
      "resolved": "https://registry.npmjs.org/shell-quote/-/shell-quote-1.8.3.tgz",
      "integrity": "sha512-ObmnIF4hXNg1BqhnHmgbDETF8dLPCggZWBjkQfhZpbszZnYur5DUljTcCHii5LC3J5E0yeO/1LIMyH+UvHQgyw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.0.tgz",
      "integrity": "sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3",
        "side-channel-list": "^1.0.0",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.1.tgz",
      "integrity": "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-color": {
      "version": "8.1.1",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-8.1.1.tgz",
      "integrity": "sha512-MpUEN2OodtUzxvKQl72cUF7RQ5EiHsGvSsVG0ia9c5RbWGL2CI4C7EpPS8UTBIplnlzZiNuV56w+FuNxy3ty2Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/supports-color?sponsor=1"
      }
    },
    "node_modules/tailwind-merge": {
      "version": "3.5.0",
      "resolved": "https://registry.npmjs.org/tailwind-merge/-/tailwind-merge-3.5.0.tgz",
      "integrity": "sha512-I8K9wewnVDkL1NTGoqWmVEIlUcB9gFriAEkXkfCjX5ib8ezGxtR3xD7iZIxrfArjEsH7F1CHD4RFUtxefdqV/A==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/dcastil"
      }
    },
    "node_modules/tailwindcss": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.2.4.tgz",
      "integrity": "sha512-HhKppgO81FQof5m6TEnuBWCZGgfRAWbaeOaGT00KOy/Pf/j6oUihdvBpA7ltCeAvZpFhW3j0PTclkxsd4IXYDA==",
      "license": "MIT"
    },
    "node_modules/tapable": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.3.3.tgz",
      "integrity": "sha512-uxc/zpqFg6x7C8vOE7lh6Lbda8eEL9zmVm/PLeTPBRhh1xCgdWaQ+J1CUieGpIfm2HdtsUpRv+HshiasBMcc6A==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/webpack"
      }
    },
    "node_modules/tiny-invariant": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/tiny-invariant/-/tiny-invariant-1.3.3.tgz",
      "integrity": "sha512-+FbBPE1o9QAYvviau/qC5SE3caw21q3xkvWKBtja5vgqOWIHHJ3ioaq1VPfn/Szqctz2bU/oYeKd9/z5BL+PVg==",
      "license": "MIT"
    },
    "node_modules/tinyglobby": {
      "version": "0.2.16",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.16.tgz",
      "integrity": "sha512-pn99VhoACYR8nFHhxqix+uvsbXineAasWm5ojXoN8xEwK5Kd3/TrhNn1wByuD52UxWRLy8pu+kRMniEi6Eq9Zg==",
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/tree-kill": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/tree-kill/-/tree-kill-1.2.2.tgz",
      "integrity": "sha512-L0Orpi8qGpRG//Nd+H90vFB+3iHnue1zSSGmNOOCh1GLJ7rUKVwV2HvijphGQS2UmhUZewS9VgvxYIdgr+fG1A==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "tree-kill": "cli.js"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/tsx": {
      "version": "4.21.0",
      "resolved": "https://registry.npmjs.org/tsx/-/tsx-4.21.0.tgz",
      "integrity": "sha512-5C1sg4USs1lfG0GFb2RLXsdpXqBSEhAaA/0kPL01wxzpMqLILNxIxIOKiILz+cdg/pLnOUxFYOR5yhHU666wbw==",
      "devOptional": true,
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "esbuild": "~0.27.0",
        "get-tsconfig": "^4.7.5"
      },
      "bin": {
        "tsx": "dist/cli.mjs"
      },
      "engines": {
        "node": ">=18.0.0"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      }
    },
    "node_modules/type-is": {
      "version": "1.6.18",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-1.6.18.tgz",
      "integrity": "sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==",
      "license": "MIT",
      "dependencies": {
        "media-typer": "0.3.0",
        "mime-types": "~2.1.24"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/typescript": {
      "version": "5.8.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.8.3.tgz",
      "integrity": "sha512-p1diW6TqL9L07nNxvRMM7hMMw4c5XOo/1ibL4aAIGmSAt9slTE1Xgw5KWuof2uTOvCg9BY7ZRi+GaF+7sfgPeQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.21.0.tgz",
      "integrity": "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
      "license": "MIT"
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.2.3.tgz",
      "integrity": "sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/use-callback-ref": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/use-callback-ref/-/use-callback-ref-1.3.3.tgz",
      "integrity": "sha512-jQL3lRnocaFtu3V00JToYz/4QkNWswxijDaCVNZRiRTO3HQDLsdu1ZtmIUvV4yPp+rvWm5j0y0TG/S61cuijTg==",
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/use-sidecar": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/use-sidecar/-/use-sidecar-1.1.3.tgz",
      "integrity": "sha512-Fedw0aZvkhynoPYlA5WXrMCAMm+nSWdZt6lzJQ7Ok8S6Q+VsHmHpRWndVRJ8Be0ZbkfPc5LRYH+5XrzXcEeLRQ==",
      "license": "MIT",
      "dependencies": {
        "detect-node-es": "^1.1.0",
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/use-sync-external-store": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/use-sync-external-store/-/use-sync-external-store-1.6.0.tgz",
      "integrity": "sha512-Pp6GSwGP/NrPIrxVFAIkOQeyw8lFenOHijQWkUTrDvrF4ALqylP2C/KCkeS9dpUM3KvYRQhna5vt7IL95+ZQ9w==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/utils-merge": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/utils-merge/-/utils-merge-1.0.1.tgz",
      "integrity": "sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4.0"
      }
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/victory-vendor": {
      "version": "37.3.6",
      "resolved": "https://registry.npmjs.org/victory-vendor/-/victory-vendor-37.3.6.tgz",
      "integrity": "sha512-SbPDPdDBYp+5MJHhBCAyI7wKM3d5ivekigc2Dk2s7pgbZ9wIgIBYGVw4zGHBml/qTFbexrofXW6Gu4noGxrOwQ==",
      "license": "MIT AND ISC",
      "dependencies": {
        "@types/d3-array": "^3.0.3",
        "@types/d3-ease": "^3.0.0",
        "@types/d3-interpolate": "^3.0.1",
        "@types/d3-scale": "^4.0.2",
        "@types/d3-shape": "^3.1.0",
        "@types/d3-time": "^3.0.0",
        "@types/d3-timer": "^3.0.0",
        "d3-array": "^3.1.6",
        "d3-ease": "^3.0.1",
        "d3-interpolate": "^3.0.1",
        "d3-scale": "^4.0.2",
        "d3-shape": "^3.1.0",
        "d3-time": "^3.0.0",
        "d3-timer": "^3.0.1"
      }
    },
    "node_modules/vite": {
      "version": "6.4.2",
      "resolved": "https://registry.npmjs.org/vite/-/vite-6.4.2.tgz",
      "integrity": "sha512-2N/55r4JDJ4gdrCvGgINMy+HH3iRpNIz8K6SFwVsA+JbQScLiC+clmAxBgwiSPgcG9U15QmvqCGWzMbqda5zGQ==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "esbuild": "^0.25.0",
        "fdir": "^6.4.4",
        "picomatch": "^4.0.2",
        "postcss": "^8.5.3",
        "rollup": "^4.34.9",
        "tinyglobby": "^0.2.13"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^18.0.0 || ^20.0.0 || >=22.0.0",
        "jiti": ">=1.21.0",
        "less": "*",
        "lightningcss": "^1.21.0",
        "sass": "*",
        "sass-embedded": "*",
        "stylus": "*",
        "sugarss": "*",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/vite/node_modules/@esbuild/aix-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.12.tgz",
      "integrity": "sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==",
      "cpu": [
        "ppc64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/android-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.12.tgz",
      "integrity": "sha512-VJ+sKvNA/GE7Ccacc9Cha7bpS8nyzVv0jdVgwNDaR4gDMC/2TTRc33Ip8qrNYUcpkOHUT5OZ0bUcNNVZQ9RLlg==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/android-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.12.tgz",
      "integrity": "sha512-6AAmLG7zwD1Z159jCKPvAxZd4y/VTO0VkprYy+3N2FtJ8+BQWFXU+OxARIwA46c5tdD9SsKGZ/1ocqBS/gAKHg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/android-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.12.tgz",
      "integrity": "sha512-5jbb+2hhDHx5phYR2By8GTWEzn6I9UqR11Kwf22iKbNpYrsmRB18aX/9ivc5cabcUiAT/wM+YIZ6SG9QO6a8kg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/darwin-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz",
      "integrity": "sha512-N3zl+lxHCifgIlcMUP5016ESkeQjLj/959RxxNYIthIg+CQHInujFuXeWbWMgnTo4cp5XVHqFPmpyu9J65C1Yg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/darwin-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.12.tgz",
      "integrity": "sha512-HQ9ka4Kx21qHXwtlTUVbKJOAnmG1ipXhdWTmNXiPzPfWKpXqASVcWdnf2bnL73wgjNrFXAa3yYvBSd9pzfEIpA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/freebsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.12.tgz",
      "integrity": "sha512-gA0Bx759+7Jve03K1S0vkOu5Lg/85dou3EseOGUes8flVOGxbhDDh/iZaoek11Y8mtyKPGF3vP8XhnkDEAmzeg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/freebsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.12.tgz",
      "integrity": "sha512-TGbO26Yw2xsHzxtbVFGEXBFH0FRAP7gtcPE7P5yP7wGy7cXK2oO7RyOhL5NLiqTlBh47XhmIUXuGciXEqYFfBQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.12.tgz",
      "integrity": "sha512-lPDGyC1JPDou8kGcywY0YILzWlhhnRjdof3UlcoqYmS9El818LLfJJc3PXXgZHrHCAKs/Z2SeZtDJr5MrkxtOw==",
      "cpu": [
        "arm"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.12.tgz",
      "integrity": "sha512-8bwX7a8FghIgrupcxb4aUmYDLp8pX06rGh5HqDT7bB+8Rdells6mHvrFHHW2JAOPZUbnjUpKTLg6ECyzvas2AQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.12.tgz",
      "integrity": "sha512-0y9KrdVnbMM2/vG8KfU0byhUN+EFCny9+8g202gYqSSVMonbsCfLjUO+rCci7pM0WBEtz+oK/PIwHkzxkyharA==",
      "cpu": [
        "ia32"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-loong64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.12.tgz",
      "integrity": "sha512-h///Lr5a9rib/v1GGqXVGzjL4TMvVTv+s1DPoxQdz7l/AYv6LDSxdIwzxkrPW438oUXiDtwM10o9PmwS/6Z0Ng==",
      "cpu": [
        "loong64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-mips64el": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.12.tgz",
      "integrity": "sha512-iyRrM1Pzy9GFMDLsXn1iHUm18nhKnNMWscjmp4+hpafcZjrr2WbT//d20xaGljXDBYHqRcl8HnxbX6uaA/eGVw==",
      "cpu": [
        "mips64el"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.12.tgz",
      "integrity": "sha512-9meM/lRXxMi5PSUqEXRCtVjEZBGwB7P/D4yT8UG/mwIdze2aV4Vo6U5gD3+RsoHXKkHCfSxZKzmDssVlRj1QQA==",
      "cpu": [
        "ppc64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-riscv64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.12.tgz",
      "integrity": "sha512-Zr7KR4hgKUpWAwb1f3o5ygT04MzqVrGEGXGLnj15YQDJErYu/BGg+wmFlIDOdJp0PmB0lLvxFIOXZgFRrdjR0w==",
      "cpu": [
        "riscv64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-s390x": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.12.tgz",
      "integrity": "sha512-MsKncOcgTNvdtiISc/jZs/Zf8d0cl/t3gYWX8J9ubBnVOwlk65UIEEvgBORTiljloIWnBzLs4qhzPkJcitIzIg==",
      "cpu": [
        "s390x"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/linux-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.12.tgz",
      "integrity": "sha512-uqZMTLr/zR/ed4jIGnwSLkaHmPjOjJvnm6TVVitAa08SLS9Z0VM8wIRx7gWbJB5/J54YuIMInDquWyYvQLZkgw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/netbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-xXwcTq4GhRM7J9A8Gv5boanHhRa/Q9KLVmcyXHCTaM4wKfIpWkdXiMog/KsnxzJ0A1+nD+zoecuzqPmCRyBGjg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/netbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.12.tgz",
      "integrity": "sha512-Ld5pTlzPy3YwGec4OuHh1aCVCRvOXdH8DgRjfDy/oumVovmuSzWfnSJg+VtakB9Cm0gxNO9BzWkj6mtO1FMXkQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/openbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-fF96T6KsBo/pkQI950FARU9apGNTSlZGsv1jZBAlcLL1MLjLNIWPBkj5NlSz8aAzYKg+eNqknrUJ24QBybeR5A==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/openbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.12.tgz",
      "integrity": "sha512-MZyXUkZHjQxUvzK7rN8DJ3SRmrVrke8ZyRusHlP+kuwqTcfWLyqMOE3sScPPyeIXN/mDJIfGXvcMqCgYKekoQw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/openharmony-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.12.tgz",
      "integrity": "sha512-rm0YWsqUSRrjncSXGA7Zv78Nbnw4XL6/dzr20cyrQf7ZmRcsovpcRBdhD43Nuk3y7XIoW2OxMVvwuRvk9XdASg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/sunos-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.12.tgz",
      "integrity": "sha512-3wGSCDyuTHQUzt0nV7bocDy72r2lI33QL3gkDNGkod22EsYl04sMf0qLb8luNKTOmgF/eDEDP5BFNwoBKH441w==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/win32-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.12.tgz",
      "integrity": "sha512-rMmLrur64A7+DKlnSuwqUdRKyd3UE7oPJZmnljqEptesKM8wx9J8gx5u0+9Pq0fQQW8vqeKebwNXdfOyP+8Bsg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/win32-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.12.tgz",
      "integrity": "sha512-HkqnmmBoCbCwxUKKNPBixiWDGCpQGVsrQfJoVGYLPT41XWF8lHuE5N6WhVia2n4o5QK5M4tYr21827fNhi4byQ==",
      "cpu": [
        "ia32"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/@esbuild/win32-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.12.tgz",
      "integrity": "sha512-alJC0uCZpTFrSL0CCDjcgleBXPnCrEAhTBILpeAp7M/OFgoqtAetfBzX0xM00MUsVVPpVjlPuMbREqnZCXaTnA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/vite/node_modules/esbuild": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz",
      "integrity": "sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==",
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.25.12",
        "@esbuild/android-arm": "0.25.12",
        "@esbuild/android-arm64": "0.25.12",
        "@esbuild/android-x64": "0.25.12",
        "@esbuild/darwin-arm64": "0.25.12",
        "@esbuild/darwin-x64": "0.25.12",
        "@esbuild/freebsd-arm64": "0.25.12",
        "@esbuild/freebsd-x64": "0.25.12",
        "@esbuild/linux-arm": "0.25.12",
        "@esbuild/linux-arm64": "0.25.12",
        "@esbuild/linux-ia32": "0.25.12",
        "@esbuild/linux-loong64": "0.25.12",
        "@esbuild/linux-mips64el": "0.25.12",
        "@esbuild/linux-ppc64": "0.25.12",
        "@esbuild/linux-riscv64": "0.25.12",
        "@esbuild/linux-s390x": "0.25.12",
        "@esbuild/linux-x64": "0.25.12",
        "@esbuild/netbsd-arm64": "0.25.12",
        "@esbuild/netbsd-x64": "0.25.12",
        "@esbuild/openbsd-arm64": "0.25.12",
        "@esbuild/openbsd-x64": "0.25.12",
        "@esbuild/openharmony-arm64": "0.25.12",
        "@esbuild/sunos-x64": "0.25.12",
        "@esbuild/win32-arm64": "0.25.12",
        "@esbuild/win32-ia32": "0.25.12",
        "@esbuild/win32-x64": "0.25.12"
      }
    },
    "node_modules/web-streams-polyfill": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/web-streams-polyfill/-/web-streams-polyfill-3.3.3.tgz",
      "integrity": "sha512-d2JWLCivmZYTSIoge9MsgFCZrt571BikcWGYkjC1khllbTeDlGqZ2D8vD8E/lJa8WGWbb7Plm8/XJYV7IJHZZw==",
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/ws": {
      "version": "8.20.0",
      "resolved": "https://registry.npmjs.org/ws/-/ws-8.20.0.tgz",
      "integrity": "sha512-sAt8BhgNbzCtgGbt2OxmpuryO63ZoDk/sqaB/znQm94T4fCEsy/yV+7CdC1kJhOU9lboAEU7R3kquuycDoibVA==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": ">=5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "license": "ISC"
    },
    "node_modules/yargs": {
      "version": "17.7.2",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-17.7.2.tgz",
      "integrity": "sha512-7dSzzRQ++CKnNI/krKnYRV7JKKPUXMEh61soaHKg9mrWEhzFWhFnxPxGl+69cD1Ou63C13NUPCnmIcrvqCuM6w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cliui": "^8.0.1",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "require-directory": "^2.1.1",
        "string-width": "^4.2.3",
        "y18n": "^5.0.5",
        "yargs-parser": "^21.1.1"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yargs-parser": {
      "version": "21.1.1",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-21.1.1.tgz",
      "integrity": "sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/zustand": {
      "version": "5.0.13",
      "resolved": "https://registry.npmjs.org/zustand/-/zustand-5.0.13.tgz",
      "integrity": "sha512-efI2tVaVQPqtOh114loML/Z80Y4NP3yc+Ff0fYiZJPauNeWZeIp/bRFD7I9bfmCOYBh/PHxlglQ9+wvlwnPikQ==",
      "license": "MIT",
      "engines": {
        "node": ">=12.20.0"
      },
      "peerDependencies": {
        "@types/react": ">=18.0.0",
        "immer": ">=9.0.6",
        "react": ">=18.0.0",
        "use-sync-external-store": ">=1.2.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "immer": {
          "optional": true
        },
        "react": {
          "optional": true
        },
        "use-sync-external-store": {
          "optional": true
        }
      }
    }
  }
}
```

## package.json
```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "start": "node dist/server.js",
    "server": "tsx server.ts",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@emailjs/browser": "^4.4.1",
    "@google/genai": "^1.29.0",
    "@hugeicons/core-free-icons": "^4.1.1",
    "@hugeicons/react": "^1.1.6",
    "@motionone/utils": "^10.18.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@stripe/react-stripe-js": "^6.7.0",
    "@stripe/stripe-js": "^9.9.0",
    "@supabase/supabase-js": "^2.105.1",
    "@tailwindcss/vite": "^4.1.14",
    "@types/papaparse": "^5.5.2",
    "@vitejs/plugin-react": "^5.0.4",
    "axios": "^1.16.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "framer-motion": "^12.38.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "papaparse": "^5.5.3",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-dropzone": "^15.0.0",
    "react-qr-code": "^2.0.21",
    "react-router-dom": "^7.14.2",
    "recharts": "^3.8.1",
    "tailwind-merge": "^3.5.0",
    "vite": "^6.2.3",
    "zustand": "^5.0.13"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.1",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

## tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["vite/client"]
  }
}
```

## vercel.json
```json
{
  "version": 2,
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "cleanUrls": true,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

