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
