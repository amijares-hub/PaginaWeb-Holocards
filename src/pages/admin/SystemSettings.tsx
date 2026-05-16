import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { 
  Settings, Zap, Shield, Database, Save, RefreshCw, 
  AlertTriangle, Check, Clock, ShieldAlert, TrendingUp,
  Percent, ShoppingBag, EyeOff, Power, Layout,
  Truck, Gift, Sparkles, BarChart3, Globe,
  Box, UserCheck, MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SystemSetting {
  id: string;
  category: string;
  setting_key: string;
  value: { value: any };
  updated_at: string;
}

interface Supplier {
  id: string;
  name: string;
  active: boolean;
}

type TabType = 'economy' | 'financial' | 'content' | 'logistics' | 'system';

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('economy');

  // Draft state for text inputs (only committed on "Guardar y Publicar")
  const [draftAnnouncement, setDraftAnnouncement] = useState('');
  const [draftHeroTitle, setDraftHeroTitle] = useState('');
  const [draftHeroSubtitle, setDraftHeroSubtitle] = useState('');
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAuditLogs();
    fetchSuppliers();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('system_settings').select('*');
    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  // Seed drafts from DB once settings are loaded
  useEffect(() => {
    if (settings.length > 0 && !draftsLoaded) {
      const ann = settings.find(s => s.id === 'content_announcement');
      const hero = settings.find(s => s.id === 'content_hero');
      if (ann) setDraftAnnouncement(ann.value.value?.message || '');
      if (hero) {
        setDraftHeroTitle(hero.value.value?.title || '');
        setDraftHeroSubtitle(hero.value.value?.subtitle || '');
      }
      setDraftsLoaded(true);
    }
  }, [settings, draftsLoaded]);

  const fetchSuppliers = async () => {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (!error && data) {
      setSuppliers(data);
    } else {
      // Fallback for demo
      setSuppliers([
        { id: '1', name: 'Global Cards Inc.', active: true },
        { id: '2', name: 'Vault Importers', active: true },
        { id: '3', name: 'Classic Collectibles', active: false }
      ]);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('system_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    if (!error && data) setAuditLogs(data);
  };

  const updateSetting = async (id: string, newValue: any) => {
    const originalSetting = settings.find(s => s.id === id);
    // If setting doesn't exist, we might need to insert it
    
    setSaving(id);
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({ 
        id,
        category: id.split('_')[0], // heuristic
        setting_key: id,
        value: { value: newValue },
        updated_at: new Date().toISOString()
      });

    if (!error) {
      // Create Audit Log
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('system_audit_logs').insert({
          action: 'UPDATE_SETTING',
          setting_id: id,
          old_value: originalSetting?.value || {},
          new_value: { value: newValue },
          user_id: user?.id
        });
      } catch (e) {
        console.warn('Audit failed', e);
      }

      setSettings(prev => {
        const exists = prev.find(s => s.id === id);
        if (exists) {
          return prev.map(s => s.id === id ? { ...s, value: { value: newValue } } : s);
        }
        return [...prev, { id, category: '', setting_key: id, value: { value: newValue }, updated_at: '' }];
      });
      fetchAuditLogs();
    } else {
      console.error('Save error:', error);
      alert('SYSTEM ERROR: Failed to commit change to core rules.');
    }
    setSaving(null);
  };

  const getSetting = (id: string, defaultValue: any = null) => {
    const s = settings.find(s => s.id === id);
    return s ? s.value.value : defaultValue;
  };

  const handleSupplierToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('suppliers').update({ active }).eq('id', id);
    if (!error) {
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, active } : s));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  const tabs: { id: TabType, label: string, icon: any }[] = [
    { id: 'economy', label: 'Economía', icon: Zap },
    { id: 'financial', label: 'Finanzas', icon: BarChart3 },
    { id: 'content', label: 'Contenido', icon: Layout },
    { id: 'logistics', label: 'Logística', icon: Truck },
    { id: 'system', label: 'Protocolos', icon: ShieldAlert },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-foreground mb-2 italic">Global Rules Engine</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest flex items-center gap-2">
             <Globe className="w-3 h-3 text-primary" /> Sovereignty Update // Node Status: 200 OK
          </p>
        </div>
        
        <div className="flex gap-2 bg-card/60 p-1.5 rounded-2xl border border-border backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-colors">
           <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10",
                 activeTab === tab.id 
                  ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
               )}
             >
               <tab.icon className="w-3.5 h-3.5" />
               <span className="hidden lg:inline">{tab.label}</span>
             </button>
           ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAIN CONFIG AREA */}
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'economy' && (
              <motion.div
                key="economy"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* LOOT TABLES SECTION */}
                <section className="bg-card border border-border rounded-[2.5rem] overflow-hidden transition-colors">
                  <div className="p-8 border-b border-white/5 bg-gradient-to-r from-yellow-500/10 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/20 rounded-2xl text-yellow-500 border border-yellow-500/20">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-foreground transition-colors">Gamification Loot Tables</h2>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Rarity-based capture probabilities</p>
                      </div>
                    </div>
                    <button title="Refresh Loot Tables" aria-label="Refresh Loot Tables" className="p-3 bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare'].map(rarity => {
                      const key = `economy_loot_tables`;
                      const table = getSetting(key, { 'Common': 70, 'Uncommon': 40, 'Rare': 20, 'Ultra Rare': 10, 'Secret Rare': 5 });
                      const val = table[rarity];
                      
                      return (
                        <div key={rarity} className="space-y-4 p-6 bg-zinc-900/30 rounded-[2rem] border border-white/5">
                          <div className="flex justify-between items-center">
                            <label htmlFor={`loot-range-${rarity}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{rarity}</label>
                            <span className="text-sm font-black text-foreground font-mono transition-colors">{val}%</span>
                          </div>
                          <input 
                            id={`loot-range-${rarity}`}
                            type="range"
                            title={`Ajustar probabilidad de ${rarity}`}
                            min="0"
                            max="100"
                            value={val}
                            onChange={(e) => {
                              const newTable = { ...table, [rarity]: parseInt(e.target.value) };
                              updateSetting(key, newTable);
                            }}
                            className="w-full accent-yellow-500 bg-zinc-900 h-1.5 rounded-full appearance-none cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-red-500 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Global Multipliers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label htmlFor="exp-multiplier" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Base EXP Multiplier</label>
                      <input 
                        id="exp-multiplier"
                        type="number" 
                        title="Multiplicador de Experiencia Base"
                        placeholder="1.0"
                        step="0.1"
                        value={getSetting('economy_exp_multiplier', 1.0)}
                        onChange={(e) => updateSetting('economy_exp_multiplier', parseFloat(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono text-white focus:border-red-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label htmlFor="ball-cost" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">HoloBall Price Points</label>
                      <input 
                        id="ball-cost"
                        type="number" 
                        title="Precio de HoloBall"
                        placeholder="50"
                        value={getSetting('economy_ball_cost', 50)}
                        onChange={(e) => updateSetting('economy_ball_cost', parseInt(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono text-white focus:border-red-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* CMS ENGINE */}
                <section className="bg-card border border-border rounded-[2.5rem] overflow-hidden transition-colors">
                  <div className="p-8 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-500 border border-cyan-500/20">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-foreground transition-colors">Content Control Engine</h2>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Live website text & announcements</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-10">
                    {/* Announcement Bar */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">Announcement Bar</h3>
                         <button 
                           onClick={() => {
                             const current = getSetting('content_announcement', { active: true, message: '', color: 'bg-red-600' });
                             updateSetting('content_announcement', { ...current, active: !current.active });
                           }}
                           className={cn(
                             "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                             getSetting('content_announcement')?.active ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-500"
                           )}
                         >
                           {getSetting('content_announcement')?.active ? 'LIVE ON SITE' : 'DISABLED'}
                         </button>
                      </div>
                      <input 
                        type="text" 
                        title="Mensaje de la barra de anuncios"
                        placeholder="Escribe aquí el anuncio global..."
                        value={draftAnnouncement}
                        onChange={(e) => setDraftAnnouncement(e.target.value)}
                        className="w-full bg-input border border-border rounded-2xl py-4 px-6 text-sm text-foreground focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    {/* Hero Section */}
                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">Hero Section (Home)</h3>
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Main Title</label>
                        <input 
                          type="text" 
                          title="Título Principal del Hero"
                          placeholder="EL FUTURO DEL TCG"
                          value={draftHeroTitle}
                          onChange={(e) => setDraftHeroTitle(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl py-4 px-6 text-sm font-black italic uppercase text-white outline-none"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Subtitle / Description</label>
                        <textarea 
                          rows={3}
                          title="Subtítulo / Descripción del Hero"
                          placeholder="Tu pasarela al mundo de las cartas coleccionables..."
                          value={draftHeroSubtitle}
                          onChange={(e) => setDraftHeroSubtitle(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl py-4 px-6 text-sm text-zinc-300 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'logistics' && (
              <motion.div
                key="logistics"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* SHIPPING CONTROLS */}
                <section className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/20">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter text-white">Logistics & Shipping</h2>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase">Manage delivery rules and suppliers</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 p-6 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-3xl">
                       <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">Free Shipping Threshold</label>
                       <div className="flex items-center gap-4">
                          <span className="text-2xl font-black italic text-white">{getSetting('logistics_shipping', { free_shipping_threshold: 50 }).free_shipping_threshold}€</span>
                          <input 
                            type="range"
                            title="Ajustar umbral de envío gratuito"
                            min="0"
                            max="200"
                            step="5"
                            value={getSetting('logistics_shipping', { free_shipping_threshold: 50 }).free_shipping_threshold}
                            onChange={(e) => {
                              updateSetting('logistics_shipping', { free_shipping_threshold: parseInt(e.target.value) });
                            }}
                            className="flex-1 accent-emerald-500 bg-zinc-900 h-1.5 rounded-full appearance-none cursor-pointer"
                          />
                       </div>
                       <p className="text-[9px] text-zinc-600 uppercase tracking-tighter">Orders above this value bypass shipping fees.</p>
                    </div>
                  </div>

                  {/* SUPPLIER MANAGEMENT */}
                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Active Suppliers Synchronization</h3>
                    <div className="grid gap-4">
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border border-border group hover:border-primary/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", supplier.active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-800 border-white/5 text-zinc-600")}>
                               <Box className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-sm font-black uppercase italic text-foreground tracking-tight transition-colors">{supplier.name}</p>
                               <p className="text-[8px] font-mono text-muted-foreground uppercase">Provider ID: {supplier.id}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleSupplierToggle(supplier.id, !supplier.active)}
                            className={cn(
                              "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                              supplier.active ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-zinc-800 text-zinc-500"
                            )}
                          >
                            {supplier.active ? 'ACTIVE' : 'DISABLED'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'financial' && (
              <motion.div
                key="financial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <section className="bg-card border border-border rounded-[2.5rem] p-8 space-y-10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/20 rounded-2xl text-red-500 border border-red-500/20">
                      <Percent className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter text-foreground transition-colors">Financial Engine</h2>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Margin control and taxation</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label htmlFor="financial-margin" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Global Profit Margin (Multiplier)</label>
                      <input 
                        id="financial-margin"
                        type="number"
                        title="Margen de beneficio global"
                        placeholder="1.15"
                        step="0.01"
                        value={getSetting('financial_margin', 1.15)}
                        onChange={(e) => updateSetting('financial_margin', parseFloat(e.target.value.replace(',', '.')))}
                        className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                    <div className="space-y-4">
                      <label htmlFor="tax-rate" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">IVA / VAT Rate (%)</label>
                      <input 
                        id="tax-rate"
                        type="number"
                        title="Tasa de IVA / VAT (%)"
                        placeholder="21"
                        value={getSetting('financial_tax', 21)}
                        onChange={(e) => updateSetting('financial_tax', parseInt(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <section className="bg-red-950/10 border border-red-500/20 rounded-[2.5rem] p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-30 transition-opacity">
                    <ShieldAlert className="w-32 h-32 text-red-500" />
                  </div>
                  
                  <div className="relative space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-600 rounded-2xl text-white shadow-xl shadow-red-600/40">
                         <Power className="w-6 h-6" />
                      </div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Protocol Omega</h2>
                    </div>

                    <div className="p-8 bg-black/40 rounded-3xl border border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-lg font-black uppercase text-white italic">Maintenance Mode</p>
                          <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest">Immediate shutdown of all public sectors</p>
                        </div>
                        <button 
                          onClick={() => updateSetting('system_maintenance', !getSetting('system_maintenance'))}
                          title={getSetting('system_maintenance') ? "Desactivar modo mantenimiento" : "Activar modo mantenimiento"}
                          className={cn(
                            "w-20 h-10 rounded-full relative transition-all shadow-2xl",
                            getSetting('system_maintenance') ? "bg-red-600" : "bg-zinc-800"
                          )}
                        >
                          <div className={cn("absolute top-1.5 w-7 h-7 bg-white rounded-full transition-all shadow-md", getSetting('system_maintenance') ? "right-1.5" : "left-1.5")} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SIDEBAR: AUDIT & PUBLISH */}
        <div className="lg:col-span-4 space-y-8">
           <section className="bg-card border border-border rounded-[2rem] p-8 space-y-8 transition-colors">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Deployment Center</h3>
                <RefreshCw className={cn("w-3.5 h-3.5 text-red-600", saving && "animate-spin")} />
             </div>

             <button 
               onClick={async () => {
                 setSaving('global_publish');
                 try {
                   // Commit announcement draft
                   const currentAnn = getSetting('content_announcement', { active: true, message: '', color: 'bg-red-600' });
                   await updateSetting('content_announcement', { ...currentAnn, message: draftAnnouncement });

                   // Commit hero drafts
                   const currentHero = getSetting('content_hero', { title: '', subtitle: '', disclaimer: '' });
                   await updateSetting('content_hero', { ...currentHero, title: draftHeroTitle, subtitle: draftHeroSubtitle });

                   // Refresh all settings from DB
                   await fetchSettings();
                   await fetchAuditLogs();
                 } catch (e) {
                   console.error('Publish failed:', e);
                 }
                 setSaving(null);
               }}
               className="w-full py-5 bg-white text-black font-black uppercase italic tracking-[0.3em] rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4"
             >
               <Save className="w-5 h-5" />
               Guardar y Publicar_
             </button>

             <div className="p-5 bg-red-600/5 rounded-2xl border border-red-600/10">
               <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-relaxed">
                 Al pulsar 'Guardar y Publicar', las reglas se propagan por WebSockets a todos los terminales activos instantáneamente.
               </p>
             </div>
           </section>

           <section className="bg-black/40 border border-white/5 rounded-[2rem] p-8 space-y-8 flex-1">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> System Audit Trail
                </h3>
             </div>
             <div className="space-y-6">
                {auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-6 border-l border-zinc-800">
                    <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-zinc-700" />
                    <p className="text-[10px] font-mono text-zinc-300 leading-tight">
                       <span className="text-zinc-500">[{log.setting_id}]</span> updated: <span className="text-red-500 font-black">{JSON.stringify(log.new_value.value).substring(0, 20)}...</span>
                    </p>
                    <p className="text-[8px] font-mono text-zinc-600 uppercase mt-1">
                       {new Date(log.created_at).toLocaleTimeString()} // ID: {log.id.substring(0, 5)}
                    </p>
                  </div>
                ))}
             </div>
           </section>
        </div>
      </div>

      {/* SYNC TOAST */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-foreground text-background font-black uppercase tracking-widest text-[11px] rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[200] flex items-center gap-4 border-2 border-primary/20"
          >
            <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
            Sincronizando Bóveda Digital...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
