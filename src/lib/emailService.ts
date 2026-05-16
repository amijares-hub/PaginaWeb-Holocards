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
