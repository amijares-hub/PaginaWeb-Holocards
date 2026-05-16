import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  X,
  User,
  MapPin,
  ShoppingBag,
  CreditCard,
  ChevronRight,
  Calendar,
  Loader2,
  Printer
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_time_of_purchase: number;
  products?: {
    name: string;
    image_url: string;
  };
}

interface Order {
  id: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: any;
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  created_at: string;
  order_items?: OrderItem[];
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  paid: { label: 'Pagado', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CreditCard },
  shipped: { label: 'Enviado', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Truck },
  cancelled: { label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingOrders: 0,
    last7DaysSales: 0
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (data: Order[]) => {
    const totalSales = data
      .filter(o => o.status === 'paid' || o.status === 'shipped')
      .reduce((acc, curr) => acc + Number(curr.total_amount), 0);
    
    const pendingOrders = data.filter(o => o.status === 'pending').length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysSales = data
      .filter(o => new Date(o.created_at) >= sevenDaysAgo && (o.status === 'paid' || o.status === 'shipped'))
      .reduce((acc, curr) => acc + Number(curr.total_amount), 0);

    setStats({ totalSales, pendingOrders, last7DaysSales });
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      calculateStats(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    setIsUpdating(false);
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 print:p-0">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 40px !important;
          }
          .no-print {
            display: none !important;
          }
          .glass, .bg-background, .bg-card {
            background: white !important;
            border: none !important;
          }
          .text-foreground, .text-muted-foreground {
            color: black !important;
          }
          .text-red-600, .text-red-500 {
            color: #b91c1c !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-foreground">Gestión de Pedidos</h1>
          <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-widest">Control centralizado de transacciones y logística.</p>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border relative overflow-hidden group transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag className="w-12 h-12 text-foreground" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Ventas Totales</p>
          <h3 className="text-3xl font-black italic text-emerald-500">{formatCurrency(stats.totalSales)}</h3>
        </div>
        
        <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-12 h-12 text-foreground" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Pedidos Pendientes</p>
          <h3 className="text-3xl font-black italic text-yellow-500">{stats.pendingOrders}</h3>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-12 h-12 text-foreground" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Ventas (7 Días)</p>
          <h3 className="text-3xl font-black italic text-blue-500">{formatCurrency(stats.last7DaysSales)}</h3>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden transition-colors">
        <div className="p-6 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por ID o Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-input border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-xl border border-border" title="Filtrar pedidos">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-3 text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-xl border border-border" title="Descargar reporte">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border transition-colors">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono italic">ID Pedido</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono italic">Cliente</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono italic text-center">Fecha</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono italic text-center">Estado</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono italic text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500 opacity-50" />
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-zinc-500 uppercase text-xs font-black tracking-widest">No se encontraron pedidos</td>
                </tr>
              ) : filteredOrders.map((order, i) => {
                const status = statusConfig[order.status];
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="p-6">
                      <p className="font-mono font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tighter">
                        #{order.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-foreground leading-none mb-1">{order.customer_email}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{order.customer_phone}</p>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <p className="text-xs font-medium text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-6 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                        status.bg,
                        status.color
                      )}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <p className="font-mono font-black text-foreground italic text-lg transition-colors">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Side Panel */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 bottom-0 z-[160] w-full max-w-2xl bg-background border-l border-border flex flex-col shadow-2xl transition-colors"
            >
              <div className="p-8 border-b border-border flex items-center justify-between no-print">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Detalle Pedido <span className="text-primary">#{selectedOrder.id.slice(0, 8)}</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recibido el {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Albarán
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    title="Cerrar panel de detalles"
                    className="p-3 hover:bg-muted rounded-2xl transition-colors border border-border text-foreground"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Printable Header (Only visible on print) */}
              <div className="hidden print:block printable-area">
                <div className="flex justify-between items-start mb-10 border-b-2 border-black pb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">HOLO<span className="text-red-600">CARDS</span></h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Bóveda Premium de Coleccionables</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1">Islas Canarias, España</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black uppercase mb-1">ALBARÁN DE ENTREGA</h2>
                    <p className="text-sm font-mono font-bold">ORDEN: #{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Fecha: {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10 mb-10">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 border-b border-black pb-1">DATOS DEL CLIENTE</h3>
                    <p className="text-sm font-bold">{selectedOrder.customer_email}</p>
                    <p className="text-sm">{selectedOrder.customer_phone}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 border-b border-black pb-1">DIRECCIÓN DE ENVÍO</h3>
                    <p className="text-sm font-bold">{selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}</p>
                    <p className="text-sm">{selectedOrder.shipping_address.address}</p>
                    <p className="text-sm font-bold uppercase tracking-widest">{selectedOrder.shipping_address.zipCode} {selectedOrder.shipping_address.city}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{selectedOrder.shipping_address.province}</p>
                  </div>
                </div>

                <table className="w-full text-left mb-10">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="py-2 text-[10px] font-black uppercase tracking-widest">PRODUCTO</th>
                      <th className="py-2 text-[10px] font-black uppercase tracking-widest text-center">CANT.</th>
                      <th className="py-2 text-[10px] font-black uppercase tracking-widest text-right">PRECIO</th>
                      <th className="py-2 text-[10px] font-black uppercase tracking-widest text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {selectedOrder.order_items?.map((item) => (
                      <tr key={item.id} className="py-4">
                        <td className="py-4">
                          <p className="text-sm font-bold uppercase">{item.products?.name}</p>
                        </td>
                        <td className="py-4 text-center font-bold">{item.quantity}</td>
                        <td className="py-4 text-right">€{item.price_at_time_of_purchase.toFixed(2)}</td>
                        <td className="py-4 text-right font-black">€{(item.price_at_time_of_purchase * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black">
                      <td colSpan={3} className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Total del Pedido</td>
                      <td className="py-4 text-right text-2xl font-black italic">€{Number(selectedOrder.total_amount).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-20 pt-10 border-t border-zinc-200 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">Gracias por su compra en HoloCards</p>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Documento generado automáticamente por el sistema de gestión HoloCard Vault.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide no-print">
                {/* Customer & Shipping Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                      <User className="w-4 h-4" /> Cliente
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-2">
                      <p className="text-lg font-bold text-white">{selectedOrder.customer_email}</p>
                      <p className="text-sm text-zinc-400">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                      <MapPin className="w-4 h-4" /> Dirección de Envío
                    </div>
                      <div className="bg-muted/50 p-6 rounded-[2rem] border border-border space-y-1 transition-colors">
                        <p className="text-sm font-bold text-foreground">
                          {selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.shipping_address.address}</p>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                          {selectedOrder.shipping_address.zipCode} {selectedOrder.shipping_address.city}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                          {selectedOrder.shipping_address.province}
                        </p>
                      </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                    <ShoppingBag className="w-4 h-4" /> Productos en el Pedido
                  </div>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 group">
                        <div className="w-16 h-20 bg-black rounded-xl overflow-hidden border border-white/5 shrink-0">
                          <img src={item.products?.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black uppercase leading-tight">{item.products?.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Cantidad: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black italic">{formatCurrency(item.price_at_time_of_purchase * item.quantity)}</p>
                          <p className="text-[10px] text-zinc-500 font-bold">€{item.price_at_time_of_purchase} / unidad</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Management Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                    <Clock className="w-4 h-4" /> Gestión de Estado
                  </div>
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => {
                        const config = statusConfig[status];
                        const isActive = selectedOrder.status === status;
                        return (
                          <button
                            key={status}
                            disabled={isUpdating}
                            onClick={() => updateOrderStatus(selectedOrder.id, status)}
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 group/status",
                              isActive 
                                ? "bg-white text-black border-white" 
                                : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <config.icon className={cn("w-5 h-5", !isActive && "group-hover/status:scale-110 transition-transform")} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="p-8 border-t border-border bg-card/80 backdrop-blur-xl transition-colors">
                <div className="flex justify-between items-center mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Método de Pago</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest">Transferencia Bancaria</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Recaudado</p>
                    <p className="text-4xl font-black italic text-primary">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
