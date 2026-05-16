import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Shield, Zap, Package, ArrowLeft, Trophy, Star, Lock, Activity, Hexagon, Database, ChevronRight, CheckCircle, Clock, Store, ShoppingCart, History, MapPin, Box, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import { cn } from '../lib/utils';

interface ProductDetails {
  id: string;
  name: string;
  image_url: string;
  sku: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: ProductDetails;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items: OrderItem[];
}

interface UserProfileData {
  points: number;
  level: number;
  pokeballs: number;
  email: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    points: 0,
    level: 1,
    pokeballs: 0,
    email: ''
  });
  const [userCollection, setUserCollection] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const MAX_POINTS_PER_LEVEL = 1000;
  const progressPercentage = Math.min((profileData.points % MAX_POINTS_PER_LEVEL) / MAX_POINTS_PER_LEVEL * 100, 100);

  useEffect(() => {
    checkAuthAndFetchData();

    const collectionSubscription = supabase
      .channel('public:user_collection')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_collection' }, () => {
        fetchUserCollection(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(collectionSubscription);
    };
  }, []);

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      navigate('/login');
      return;
    }
    
    setSession(session);
    setProfileData(prev => ({ ...prev, email: session.user.email || 'Unknown Entity' }));

    await Promise.all([
      fetchUserProfile(session.user.id),
      fetchUserCollection(session.user.id),
      fetchUserOrders(session.user.id)
    ]);
    
    setLoading(false);
  };

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('points, level, pokeballs')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfileData(prev => ({
        ...prev,
        points: data.points || 0,
        level: data.level || 1,
        pokeballs: data.pokeballs || 0
      }));
    }
  };

  const fetchUserCollection = async (userIdOverride?: string) => {
    const userId = userIdOverride || session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_collection')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUserCollection(data);
    }
  };

  const fetchUserOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total_amount,
        status,
        order_items (
          id,
          quantity,
          price_at_purchase,
          products (
            id,
            name,
            image_url,
            sku
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as any[]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-[1px] border-primary/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
          <div className="absolute inset-2 border-[1px] border-red-500/30 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
          <Hexagon className="w-8 h-8 text-foreground animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background text-foreground overflow-x-hidden pb-24 selection:bg-primary/30 font-sans transition-colors duration-500"
    >
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-[1000px] h-[500px] bg-red-900/20 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/60 backdrop-blur-2xl">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-all group">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-muted group-hover:bg-accent group-hover:border-foreground/20 transition-all">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="font-bold text-xs uppercase tracking-[0.2em]">Nexus Hub</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">Network Stable</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 hover:border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all group"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 mt-12 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: IDENTITY & BATTLE PASS */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Trainer ID Card (Holographic) */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative h-[220px] perspective-1000 mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/20 to-red-500/30 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            
            <div className="relative h-full bg-card border border-border rounded-[2rem] p-6 overflow-hidden shadow-2xl transition-all duration-500 group-hover:shadow-primary/10">
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.2)_0%,transparent_50%)] animate-pulse"></div>
              
              <div className="relative z-10 flex h-full gap-6">
                {/* QR Section - Coming Soon Overlay */}
                <div className="w-1/3 relative group/qr">
                  <div className="p-2 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 blur-[4px] grayscale opacity-40">
                    <QRCode value="coming_soon" size={80} level="L" fgColor="#333" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                    <Lock className="w-6 h-6 text-cyan-400/60 mb-1" />
                    <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">Physical ID<br/>Coming Soon</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">Trainer Registry</h3>
                    <p className="text-xl font-black text-foreground uppercase tracking-tighter italic">
                      {profileData.email.split('@')[0]}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[7px] font-mono text-muted-foreground uppercase">Tier</span>
                      <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">Apex Legend</p>
                    </div>
                    <div>
                      <span className="text-[7px] font-mono text-zinc-500 uppercase">Vault Size</span>
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">{userCollection.length} ENTITIES</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></div>
                      <span className="text-[7px] font-mono text-cyan-400/70 uppercase">Online Profile Active</span>
                    </div>
                    <div className="text-[8px] font-black text-zinc-600 tracking-tighter">SASORI_GEN_IV</div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          </motion.section>

          {/* Identity & Progress Section */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative p-[1px] rounded-[2rem] overflow-hidden bg-gradient-to-b from-border to-transparent"
          >
            <div className="relative bg-card backdrop-blur-xl rounded-[calc(2rem-1px)] p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center relative shadow-2xl">
                  <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                  <Shield className="w-7 h-7 text-red-500 relative z-10" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Clearance</div>
                  <div className="flex items-center justify-end gap-1.5 text-cyan-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span className="text-xl">Lvl {profileData.level}</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <Link 
                  to="/profile/settings"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-cyan-400 transition-all group/settings shadow-lg"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Edit Identity Matrix
                </Link>
                <p className="text-[8px] text-center text-zinc-600 mt-2 font-mono uppercase tracking-[0.2em] italic">
                  Complete mission for +250 EXP reward
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Experience Points</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    <span className="text-foreground font-bold">{profileData.points % MAX_POINTS_PER_LEVEL}</span> / {MAX_POINTS_PER_LEVEL}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 via-red-400 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Next-Gen Battle Pass */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative p-[1px] rounded-[2rem] overflow-hidden bg-gradient-to-b from-border to-transparent"
          >
            <div className="relative bg-card backdrop-blur-xl rounded-[calc(2rem-1px)] p-8">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                  <Trophy className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold tracking-widest uppercase">Path of Glory</h2>
              </div>
              
              <div className="relative pl-6 space-y-12">
                {/* Vertical Timeline Line */}
                <div className="absolute top-2 bottom-2 left-[11px] w-[2px] bg-zinc-800 rounded-full"></div>
                
                {/* Active Timeline Fill */}
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.min((profileData.points / 5000) * 100, 100)}%` }}
                  transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                  className="absolute top-2 left-[11px] w-[2px] bg-gradient-to-b from-yellow-400 via-red-500 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                ></motion.div>

                {[
                  { tier: 0, label: 'Initiate' },
                  { tier: 1000, label: 'Vanguard' },
                  { tier: 2500, label: 'Elite' },
                  { tier: 5000, label: 'Apex' }
                ].map((milestone, index) => {
                  const isActive = profileData.points >= milestone.tier;
                  return (
                    <div key={index} className="relative flex items-center gap-6 group">
                      <div className={cn(
                        "absolute -left-6 w-6 h-6 rounded-full border-4 border-[#080808] flex items-center justify-center transition-all duration-700 z-10",
                        isActive ? "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]" : "bg-zinc-800"
                      )}>
                        {isActive && <div className="w-1.5 h-1.5 bg-[#080808] rounded-full"></div>}
                      </div>
                      <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group-hover:bg-white/10 transition-colors">
                        <div>
                          <p className={cn(
                            "text-sm font-bold tracking-widest uppercase mb-1 transition-colors",
                            isActive ? "text-foreground" : "text-muted-foreground"
                          )}>{milestone.label}</p>
                          <p className="text-[10px] font-mono text-zinc-500">{milestone.tier} PTS</p>
                        </div>
                        {isActive ? (
                          <Star className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                        ) : (
                          <Lock className="w-4 h-4 text-zinc-700" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>

        </div>

        {/* RIGHT COLUMN: INVENTORY & COLLECTION */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black tracking-tight uppercase flex items-center gap-3">
              <Activity className="w-6 h-6 text-cyan-400" />
              Arsenal & Assets
            </h2>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span>Syncing with mainframe</span>
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Capture Devices (Pokéballs) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-1 relative p-[1px] rounded-[2rem] overflow-hidden bg-gradient-to-b from-cyan-500/20 to-transparent group"
            >
              <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-[#080808]/90 backdrop-blur-xl rounded-[calc(2rem-1px)] p-8 h-full flex flex-col items-center justify-center text-center">
                
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                  {/* Holographic rings */}
                  <div className="absolute inset-0 border border-cyan-500/30 rounded-full animate-[spin_6s_linear_infinite] group-hover:border-cyan-400/60 transition-colors"></div>
                  <div className="absolute inset-2 border border-blue-500/20 rounded-full animate-[spin_4s_linear_infinite_reverse]"></div>
                  
                  {/* The core */}
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full shadow-[0_0_40px_rgba(34,211,238,0.5)] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1/2 bg-white/20"></div>
                    <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white] z-10"></div>
                    <div className="absolute inset-0 bg-cyan-400/20 animate-pulse"></div>
                  </div>
                </div>

                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 mb-2">
                  {profileData.pokeballs}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">HoloBalls</p>
              </div>
            </motion.div>

            {/* Collected Entities */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 relative p-[1px] rounded-[2rem] overflow-hidden bg-gradient-to-b from-white/10 to-transparent"
            >
              <div className="relative bg-[#080808]/90 backdrop-blur-xl rounded-[calc(2rem-1px)] p-8 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-zinc-400">Captured Entities</h3>
                  <span className="text-xs font-mono text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    Count: {userCollection.length}
                  </span>
                </div>
                
                <div className="flex-1">
                  {userCollection.length === 0 ? (
                    <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                      <Package className="w-10 h-10 text-zinc-600 mb-4" />
                      <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-1">No Data Found</p>
                      <p className="text-[10px] font-mono text-zinc-600">Awaiting field captures or data decryption.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {userCollection.map((card, idx) => (
                        <motion.div 
                          key={card.id || idx}
                          onHoverStart={() => setHoveredCard(card.id)}
                          onHoverEnd={() => setHoveredCard(null)}
                          className="aspect-[3/4] relative rounded-xl overflow-hidden cursor-pointer group bg-zinc-900 border border-white/5 shadow-lg"
                        >
                          {/* Inner glow border on hover */}
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-red-500/50 rounded-xl z-20 transition-colors pointer-events-none"></div>
                          
                          {card.image_url ? (
                            <img src={card.image_url} alt={card.card_name} className="w-full h-full object-cover relative z-0 transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-zinc-800 to-zinc-950">
                              <Hexagon className="w-8 h-8 text-zinc-700 group-hover:text-cyan-400 transition-colors mb-3" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                                {card.card_name || 'Classified'}
                              </span>
                            </div>
                          )}
                          
                          {/* Holographic Overlay on Hover */}
                          <AnimatePresence>
                            {hoveredCard === card.id && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 backdrop-blur-[2px]"
                              >
                                <motion.div initial={{ y: 10 }} animate={{ y: 0 }} className="flex items-center justify-between w-full">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Inspect</span>
                                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>

          {/* ORDER HISTORY & TRACKING */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative p-[1px] rounded-[2rem] overflow-hidden bg-gradient-to-b from-border to-transparent"
          >
            <div className="relative bg-card backdrop-blur-xl rounded-[calc(2rem-1px)] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <History className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold tracking-widest uppercase text-foreground">Logistics & Requisitions</h2>
              </div>

              {orders.length === 0 ? (
                <div className="min-h-[150px] flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <ShoppingCart className="w-8 h-8 text-zinc-600 mb-3" />
                  <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest">No requisitions found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => {
                    // Flexible Tracking Logic
                    let StatusIcon = Clock;
                    let statusColor = "text-yellow-500";
                    let statusBg = "bg-yellow-500/10 border-yellow-500/20";
                    let statusTitle = "Awaiting Payment";
                    let statusSub = "Processing request...";

                    if (order.status === 'paid') {
                      StatusIcon = CheckCircle;
                      statusColor = "text-green-500";
                      statusBg = "bg-green-500/10 border-green-500/20";
                      statusTitle = "Payment Confirmed";
                      statusSub = "Odoo Sync Active";
                    } else if (order.status === 'in_store_pickup') {
                      StatusIcon = Store;
                      statusColor = "text-cyan-400";
                      statusBg = "bg-cyan-400/10 border-cyan-400/20";
                      statusTitle = "Ready for Pickup";
                      statusSub = "Visit Physical Store";
                    } else if (order.status === 'delivered') {
                      StatusIcon = MapPin;
                      statusColor = "text-purple-400";
                      statusBg = "bg-purple-400/10 border-purple-400/20";
                      statusTitle = "Delivered";
                      statusSub = "Requisition Complete";
                    }

                    return (
                      <div key={order.id} className="group relative bg-zinc-900/50 border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
                        {/* Header: Tracking info */}
                        <div className="flex flex-wrap items-center justify-between p-5 border-b border-white/5 bg-black/20 gap-4">
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2.5 rounded-xl border", statusBg, statusColor)}>
                              <StatusIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={cn("text-sm font-bold uppercase tracking-wider", statusColor)}>{statusTitle}</p>
                              <p className="text-[10px] font-mono text-zinc-500 uppercase">{statusSub} • {new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-black text-foreground">${order.total_amount.toFixed(2)}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">ORDER: {order.id.split('-')[0]}</p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-5">
                          <div className="space-y-3">
                            {order.order_items.map((item) => (
                              <div key={item.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 hover:bg-black/60 transition-colors">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden relative border border-white/10 flex-shrink-0">
                                  {item.products?.image_url ? (
                                    <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Box className="w-5 h-5 text-zinc-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                  )}
                                  <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{item.products?.name || 'Unknown Item'}</p>
                                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase mt-1">
                                    <span>QTY: {item.quantity}</span>
                                    <span>•</span>
                                    <span>SKU: <span className="text-cyan-400/70">{item.products?.sku || 'N/A'}</span></span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-zinc-300">${item.price_at_purchase.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Rewards Footer (Only show if paid or completed) */}
                        {['paid', 'in_store_pickup', 'delivered'].includes(order.status) && (
                          <div className="px-5 py-3 bg-gradient-to-r from-cyan-900/10 via-transparent to-red-900/10 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Star className="w-3.5 h-3.5 text-yellow-500" />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mission Rewards</span>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] font-bold font-mono">
                              <span className="text-cyan-400">+100 EXP</span>
                              <span className="text-yellow-500">+{Math.floor(order.total_amount * 10)} BP</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>

        </div>
      </main>

      {/* Required CSS for custom animations/scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
