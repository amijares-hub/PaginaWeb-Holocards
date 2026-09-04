import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Package, 
  User, 
  MapPin, 
  LogOut, 
  Truck, 
  ShoppingBag, 
  Save, 
  RefreshCw, 
  Search,
  Clock,
  Shield,
  Pencil,
  Check,
  X
} from 'lucide-react';
import HeaderV2 from '../components/layout/HeaderV2';
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
  created_at: string;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items: OrderItem[];
  order_tracking_events?: TrackingEvent[];
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'address' | 'account'>('orders');
  
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
    address_country: 'España'
  });

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        localStorage.removeItem('sb-dopieoflkqfalnuvpwch-auth-token');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const initialName = profile?.full_name || user.user_metadata?.full_name || '';
      setFullName(initialName);
      setTempName(initialName);

      if (profile) {
        setFormData({
          phone: profile.phone || '',
          address_street: profile.address_street || profile.address || '',
          address_city: profile.address_city || profile.city || '',
          address_zip: profile.address_zip || profile.postal_code || profile.zip_code || '',
          address_country: profile.address_country || profile.country || 'España'
        });
      }

      await fetchOrders(user.id, user.email || '');
    } catch (err) {
      console.error("Error al inicializar sesión de usuario:", err);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (userId: string, email: string) => {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status')
        .or(`user_id.eq.${userId},customer_email.eq.${email}`)
        .order('created_at', { ascending: false });

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = ordersData.map(o => o.id);

      const [{ data: items }, { data: events }] = await Promise.all([
        supabase.from('order_items').select('id, order_id, quantity, price_at_purchase, products(id, name, image_url)').in('order_id', orderIds),
        supabase.from('order_tracking_events').select('*').in('order_id', orderIds)
      ]);

      const parsedOrders: Order[] = ordersData.map((order: any) => ({
        ...order,
        total_amount: Number(order.total_amount) || 0,
        order_items: (items || []).filter(i => i.order_id === order.id).map((i: any) => ({
          ...i,
          products: Array.isArray(i.products) ? i.products[0] : i.products,
          price_at_purchase: Number(i.price_at_purchase) || 0
        }) as OrderItem),
        order_tracking_events: (events || []).filter(e => e.order_id === order.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }));

      setOrders(parsedOrders);

      if (orderIdFromUrl) {
        const match = parsedOrders.find(o => o.id === orderIdFromUrl);
        if (match) setSelectedOrder(match);
        else setSelectedOrder(parsedOrders[0]);
      } else if (parsedOrders.length > 0) {
        setSelectedOrder(parsedOrders[0]);
      }
    } catch (err) {
      console.error("Error al cargar pedidos del usuario:", err);
      setOrders([]);
    }
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSavingName(true);

    const cleanName = tempName.trim();

    try {
      await supabase.auth.updateUser({
        data: { full_name: cleanName }
      });

      const { data, error: updateErr } = await supabase
        .from('user_profiles')
        .update({ full_name: cleanName })
        .eq('id', user.id)
        .select();

      if (updateErr || !data || data.length === 0) {
        await supabase
          .from('user_profiles')
          .upsert({ id: user.id, full_name: cleanName }, { onConflict: 'id' });
      }

      setFullName(cleanName);
      setIsEditingName(false);
    } catch (err: any) {
      console.error("Error al guardar nombre:", err);
      alert('Error al guardar nombre: ' + (err.message || 'Error de conexión'));
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    const payload = {
      phone: formData.phone,
      address_street: formData.address_street,
      address_city: formData.address_city,
      address_zip: formData.address_zip,
      address_country: formData.address_country || 'España'
    };

    try {
      const { data, error: updateErr } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', user.id)
        .select();

      let error = updateErr;

      if (!error && (!data || data.length === 0)) {
        const { error: upsertErr } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            full_name: fullName,
            ...payload
          }, { onConflict: 'id' });
        
        error = upsertErr;
      }

      if (error) {
        console.error("Error Supabase user_profiles:", error);
        alert('Error al guardar datos de envío: ' + error.message);
      } else {
        alert('¡Datos de envío guardados correctamente!');
      }
    } catch (err: any) {
      console.error("Excepción al guardar perfil:", err);
      alert('Excepción al guardar datos: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('sb-dopieoflkqfalnuvpwch-auth-token');
    navigate('/login');
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.order_items.some(i => i.products?.name?.toLowerCase().includes(q))
    );
  }, [orders, searchQuery]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('paid') || s.includes('pagado')) return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Pagado' };
    if (s.includes('ship') || s.includes('enviado')) return { bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', label: 'Enviado' };
    if (s.includes('deliver') || s.includes('entregado')) return { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'Entregado' };
    if (s.includes('cancel')) return { bg: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'Cancelado' };
    return { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'Procesando' };
  };

  const displayName = fullName || user?.user_metadata?.full_name || user?.email || 'Usuario HoloCards';
  const avatarLetter = (displayName || 'U').charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#F3B91C] animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Cargando perfil...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050914] text-white selection:bg-[#F3B91C]/30 flex flex-col font-sans">
      <HeaderV2 />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="bg-[#0a1628] border border-cyan-900/40 rounded-3xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F3B91C] to-yellow-200 text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20 shrink-0">
              {avatarLetter}
            </div>

            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2 my-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Tu nombre completo..."
                    className="bg-[#050914] border border-[#F3B91C] rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="p-2 bg-[#F3B91C] hover:bg-yellow-300 text-black rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    title="Guardar nombre"
                  >
                    {savingName ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setTempName(fullName); }}
                    className="p-2 bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-white truncate max-w-md">{displayName}</h1>
                  <button
                    onClick={() => { setTempName(fullName); setIsEditingName(true); }}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#F3B91C] rounded-lg transition-colors border border-white/5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                    title="Editar nombre de usuario"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs text-gray-400 font-medium">Cliente HoloCards</span>
                {fullName && user?.email && (
                  <span className="text-xs text-gray-500 font-mono italic">({user.email})</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        <div className="flex border-b border-white/10 mb-8 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-2 py-4 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
              activeTab === 'orders' ? "border-[#F3B91C] text-[#F3B91C]" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Package className="w-4 h-4" />
            Mis Pedidos ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('address')}
            className={cn(
              "flex items-center gap-2 py-4 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
              activeTab === 'address' ? "border-[#F3B91C] text-[#F3B91C]" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <MapPin className="w-4 h-4" />
            Dirección de Envío
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={cn(
              "flex items-center gap-2 py-4 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
              activeTab === 'account' ? "border-[#F3B91C] text-[#F3B91C]" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <User className="w-4 h-4" />
            Seguridad
          </button>
        </div>

        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div className="bg-[#0a1628]/50 border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center max-w-lg mx-auto my-8">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Aún no has realizado pedidos</h2>
                <p className="text-sm text-gray-400 mb-6">Explora nuestro catálogo con colecciones de Pokémon, Magic y fundas para tus cartas.</p>
                <Link
                  to="/catalogo"
                  className="px-6 py-3.5 bg-[#F3B91C] hover:bg-[#F3B91C]/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                >
                  Explorar Catálogo →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-4">
                  <div className="relative mb-4">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por código de pedido o producto..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0a1628] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F3B91C]"
                    />
                  </div>

                  {filteredOrders.map(order => {
                    const badge = getStatusBadge(order.status);
                    const isSelected = selectedOrder?.id === order.id;

                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={cn(
                          "bg-[#0a1628] border rounded-2xl p-5 cursor-pointer transition-all",
                          isSelected ? "border-[#F3B91C] shadow-lg shadow-yellow-500/10" : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <p className="text-sm font-bold text-white font-mono">#ORD-{order.id.substring(0, 8).toUpperCase()}</p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border", badge.bg)}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-3">
                          <span className="text-xs text-gray-400">{order.order_items.length} producto(s)</span>
                          <span className="text-base font-black text-white">{order.total_amount.toFixed(2)}€</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:col-span-5">
                  {selectedOrder ? (
                    <div className="bg-[#0a1628] border border-cyan-900/40 rounded-3xl p-6 sticky top-28 space-y-6">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Detalles del Pedido</span>
                        <h3 className="text-lg font-black text-white font-mono">#ORD-{selectedOrder.id.substring(0, 8).toUpperCase()}</h3>
                      </div>

                      <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                        {selectedOrder.order_items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/5">
                            <div className="w-10 h-10 bg-black/40 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
                              {item.products?.image_url ? (
                                <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{item.products?.name || 'Producto'}</p>
                              <p className="text-[10px] text-gray-400">Cantidad: {item.quantity}</p>
                            </div>
                            <span className="text-xs font-black text-white">{item.price_at_purchase.toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-[#F3B91C]" />
                          Estado del Envío
                        </h4>

                        <div className="space-y-4 relative pl-5 border-l-2 border-white/10">
                          {selectedOrder.order_tracking_events && selectedOrder.order_tracking_events.length > 0 ? (
                            selectedOrder.order_tracking_events.map(e => (
                              <div key={e.id} className="relative">
                                <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#F3B91C] ring-4 ring-[#0a1628]" />
                                <p className="text-xs font-bold text-white">{e.description || e.status}</p>
                                <p className="text-[10px] text-gray-400">{new Date(e.created_at).toLocaleString('es-ES')}</p>
                              </div>
                            ))
                          ) : (
                            <div className="relative">
                              <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-[#0a1628]" />
                              <p className="text-xs font-bold text-white">Pedido confirmado</p>
                              <p className="text-[10px] text-gray-400">Preparando paquete para entrega a Correos.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0a1628]/30 border border-white/5 rounded-3xl p-8 text-center text-gray-500 text-xs">
                      Selecciona un pedido para consultar sus detalles.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'address' && (
          <div className="max-w-2xl bg-[#0a1628] border border-white/10 rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-black text-white mb-1">Datos de Envío habituales</h2>
            <p className="text-xs text-gray-400 mb-6">Guarda tu dirección para agilizar las compras en el proceso de pago.</p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Teléfono de contacto</label>
                <input
                  type="text"
                  placeholder="+34 600 000 000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#050914] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F3B91C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Calle / Dirección</label>
                <input
                  type="text"
                  placeholder="Calle, número, piso, puerta..."
                  value={formData.address_street}
                  onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                  className="w-full bg-[#050914] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F3B91C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ciudad</label>
                  <input
                    type="text"
                    placeholder="Santa Cruz de Tenerife"
                    value={formData.address_city}
                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                    className="w-full bg-[#050914] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F3B91C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Código Postal</label>
                  <input
                    type="text"
                    placeholder="38001"
                    value={formData.address_zip}
                    onChange={e => setFormData({ ...formData, address_zip: e.target.value })}
                    className="w-full bg-[#050914] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F3B91C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">País</label>
                <input
                  type="text"
                  value={formData.address_country}
                  onChange={e => setFormData({ ...formData, address_country: e.target.value })}
                  className="w-full bg-[#050914] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F3B91C]"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full mt-4 py-3.5 bg-[#F3B91C] hover:bg-[#F3B91C]/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </form>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="max-w-2xl bg-[#0a1628] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-white mb-1">Ajustes de Cuenta</h2>
              <p className="text-xs text-gray-400">Información sobre tu acceso y credenciales.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Correo Registrado</label>
                <input
                  type="text"
                  value={user?.email}
                  disabled
                  className="w-full bg-[#050914]/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-gray-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">Cambiar Contraseña</p>
                  <p className="text-[11px] text-gray-400">Te enviaremos un correo para restablecer la clave.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (user?.email) {
                      await supabase.auth.resetPasswordForEmail(user.email);
                      alert('Se ha enviado un enlace de restablecimiento a tu correo electrónico.');
                    }
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Enviar Correo
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}