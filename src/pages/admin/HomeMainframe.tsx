import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  RefreshCw, 
  Image as ImageIcon, 
  Palette, 
  Megaphone,
  History,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Zap,
  MousePointer2,
  Monitor,
  Smartphone,
  Layers,
  Clock,
  Gift,
  Target,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Type,
  Upload,
  Tag,
  Trash2,
  Plus,
  Layout,
  MessageSquare,
  Package,
  Medal,
  Star,
  Info,
  Eye,
  Share2,
  CreditCard,
  Languages,
  Globe,
  Settings2,
  ShoppingCart,
  Twitter,
  Link as LinkIcon,
  Search,
  ChevronDown,
  Maximize2,
  Move,
  RotateCw,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useThemeStore } from '../../lib/useThemeStore';
import { Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ImportCenter } from '../../components/admin/ImportCenter';

interface NavItem {
  label: string;
  path: string;
}

interface ImageConfig {
  scale: number;
  x: number;
  y: number;
  opacity: number;
  rotate: number;
}

interface HeroSector {
  bgImage: string;
  bgColor: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  buttonBgColor: string;
  buttonTextColor: string;
  expansionLogos: string[];
  collection_tag_id?: string;
  imageConfig?: ImageConfig;
}

interface HomepageConfig {
  header: {
    logo_url: string;
    menu_items: NavItem[];
    announcement_bar: {
      text: string;
      bgColor: string;
      isActive: boolean;
      scroll_speed: number;
    };
    logoConfig?: ImageConfig;
  };
  hero: {
    pokemon: HeroSector;
    magic: HeroSector;
  };
  shelves: {
    title: string;
    filterTags: { label: string, filterCategory: string }[];
  };
  marketing: {
    countdown: {
      isActive: boolean;
      endDate: string;
      message: string;
      color: string;
    };
    gamification: {
      popupEnabled: boolean;
      captureChance: number;
      currentEntity: string;
      popupMessage: string;
    };
  };
  pdp: {
    primaryButtonText: string;
    secondaryButtonText: string;
    trustSeals: { icon: string, title: string, desc: string }[];
    breakdownItems: { icon: string, label: string }[];
    languages: { id: string, label: string, flag: string, isActive: boolean }[];
    socialProof: {
      isVisible: boolean;
      watching: { template: string, min: number, max: number };
      inCart: { template: string, min: number, max: number };
    };
    payments: {
      title: string;
      methods: { id: string, label: string, isActive: boolean }[];
    };
    sharing: {
      whatsapp: boolean;
      twitter: boolean;
      link: boolean;
    };
    topHits: string[];
  };
}

const DEFAULT_IMG_CONFIG: ImageConfig = { scale: 1, x: 0, y: 0, opacity: 1, rotate: 0 };

export default function HomeMainframe() {
  const [activeTab, setActiveTab] = useState<'header' | 'hero' | 'shelves' | 'marketing' | 'pdp' | 'import'>('header');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [history, setHistory] = useState<HomepageConfig[]>([]);
  const [initialConfig, setInitialConfig] = useState<HomepageConfig | null>(null);
  const [changeLog, setChangeLog] = useState<{ field: string, value: any, time: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('homepage_clon_design').select('*');
    if (!error && data) {
      const designMap = data.reduce((acc: any, item: any) => {
        acc[item.category] = item.ui_data;
        return acc;
      }, {});
      
      const finalConfig = {
        header: {
          ...(designMap.header || {
            logo_url: '',
            menu_items: [
              { label: 'INICIO', path: '/' },
              { label: 'CATÁLOGO', path: '/catalogo' },
              { label: 'NOVEDADES', path: '/catalogo?filter=new' }
            ],
            announcement_bar: { text: 'ENVÍO GRATUITO EN PEDIDOS SUPERIORES A 50€', bgColor: '#DC2626', isActive: true, scroll_speed: 5000 }
          }),
          logoConfig: designMap.header?.logoConfig || DEFAULT_IMG_CONFIG
        },
        hero: {
          pokemon: {
            ...(designMap.hero?.pokemon || { 
              bgImage: '', bgColor: '#FBBF24', title: 'POKÉMON', subtitle: 'TRADING CARD GAME', 
              description: 'Descubre las últimas expansiones de Pokémon TCG.', buttonText: 'VER PRODUCTOS', buttonLink: '/catalog?game=pokemon',
              buttonBgColor: '#000000', buttonTextColor: '#FFFFFF', expansionLogos: [] 
            }),
            imageConfig: designMap.hero?.pokemon?.imageConfig || DEFAULT_IMG_CONFIG
          },
          magic: {
            ...(designMap.hero?.magic || { 
              bgImage: '', bgColor: '#1E1B4B', title: 'MAGIC', subtitle: 'THE GATHERING', 
              description: 'Explora el multiverso de Magic: The Gathering.', buttonText: 'VER PRODUCTOS', buttonLink: '/catalog?game=mtg',
              buttonBgColor: '#6D28D9', buttonTextColor: '#FFFFFF', expansionLogos: [] 
            }),
            imageConfig: designMap.hero?.magic?.imageConfig || DEFAULT_IMG_CONFIG
          }
        },
        shelves: designMap.shelves || {
          title: 'PRODUCTOS DESTACADOS',
          filterTags: [
            { label: 'LO MÁS NUEVO', filterCategory: 'new' },
            { label: 'OFERTAS', filterCategory: 'sale' }
          ]
        },
        marketing: designMap.marketing || {
          countdown: { isActive: false, endDate: '', message: '¡OFERTA TERMINA EN:', color: '#EF4444' },
          gamification: { popupEnabled: true, captureChance: 0.05, currentEntity: 'Charizard', popupMessage: '¡UN ENTIDAD SALVAJE HA APARECIDO!' }
        },
        pdp: designMap.pdp || {
          primaryButtonText: 'AGREGAR AL CARRITO',
          secondaryButtonText: 'COMPRAR AHORA',
          trustSeals: [
            { icon: 'Truck', title: 'Envíos a toda España', desc: 'Rápidos y seguros.' },
            { icon: 'ShieldCheck', title: 'Compra 100% segura', desc: 'Tus datos y pagos están protegidos.' },
            { icon: 'CheckCircle2', title: 'Productos originales', desc: 'Garantía oficial de marca.' }
          ],
          breakdownItems: [],
          languages: [
            { id: 'es', label: 'Español', flag: '🇪🇸', isActive: true },
            { id: 'en', label: 'Inglés', flag: '🇬🇧', isActive: true }
          ],
          socialProof: {
            isVisible: true,
            watching: { template: '{n} personas viendo ahora', min: 10, max: 30 },
            inCart: { template: '{n} en el carrito', min: 5, max: 15 }
          },
          payments: {
            title: 'PAGO 100% SEGURO',
            methods: [
              { id: 'bizum', label: 'Bizum', isActive: true },
              { id: 'visa', label: 'Visa', isActive: true },
              { id: 'mastercard', label: 'Mastercard', isActive: true },
              { id: 'applepay', label: 'Apple Pay', isActive: true },
              { id: 'googlepay', label: 'Google Pay', isActive: true },
              { id: 'paypal', label: 'PayPal', isActive: true }
            ]
          },
          sharing: { whatsapp: true, twitter: true, link: true }
        }
      };
      setConfig(finalConfig);
      setInitialConfig(JSON.parse(JSON.stringify(finalConfig)));
    }
    setLoading(false);
  };

  const addToHistory = (prevConfig: HomepageConfig, field: string, value: any) => {
    setHistory(prev => [JSON.parse(JSON.stringify(prevConfig)), ...prev].slice(0, 10));
    setChangeLog(prev => [{ field, value, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const last = history[0];
      setConfig(last);
      setHistory(history.slice(1));
      showToast('success', 'Cambio revertido correctamente');
    }
  };

  const restoreDefaults = (type: 'logo' | 'hero-pokemon' | 'hero-magic') => {
    if (!config || !initialConfig) return;
    addToHistory(config, `Reset ${type}`, 'Default');
    
    if (type === 'logo') {
      setConfig({...config, header: {...config.header, logoConfig: DEFAULT_IMG_CONFIG}});
    } else if (type === 'hero-pokemon') {
      setConfig({...config, hero: {...config.hero, pokemon: {...config.hero.pokemon, imageConfig: DEFAULT_IMG_CONFIG}}});
    } else if (type === 'hero-magic') {
      setConfig({...config, hero: {...config.hero, magic: {...config.hero.magic, imageConfig: DEFAULT_IMG_CONFIG}}});
    }
    showToast('success', 'Valores por defecto restaurados');
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updates = [
        { component_id: 'ui_header', category: 'header', ui_data: config.header },
        { component_id: 'ui_hero_split', category: 'hero', ui_data: config.hero },
        { component_id: 'ui_featured_shelves', category: 'shelves', ui_data: config.shelves },
        { component_id: 'ui_marketing', category: 'marketing', ui_data: config.marketing },
        { component_id: 'ui_pdp_config', category: 'pdp', ui_data: config.pdp }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('homepage_clon_design')
          .upsert(update, { onConflict: 'component_id' });
        if (error) throw error;
      }

      showToast('success', '¡Configuración de Mainframe Actualizada!');
    } catch (err: any) {
      showToast('error', `Fallo en la Red: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const updatePDPField = (field: keyof HomepageConfig['pdp'], value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      pdp: { ...config.pdp, [field]: value }
    });
  };

  const handleApplyToAll = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('homepage_clon_design')
        .upsert({ component_id: 'ui_pdp_config', category: 'pdp', ui_data: config.pdp }, { onConflict: 'component_id' });
      if (error) throw error;
      showToast('success', '¡Configuración aplicada globalmente a todos los productos!');
    } catch (err: any) {
      showToast('error', `Fallo: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const ControlGroup = ({ label, icon: Icon, value, min, max, step = 1, onChange }: any) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <Icon className="w-3 h-3" /> {label}
        </label>
        <input 
          type="number" step={step} value={value} 
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="bg-input border border-border rounded px-2 py-0.5 text-[8px] font-mono text-foreground w-16 text-right outline-none focus:border-red-500/50 transition-colors"
        />
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-red-600 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  const AdvancedImageControls = ({ config: imgConfig, onUpdate, type }: { config: ImageConfig, onUpdate: (nc: ImageConfig) => void, type: 'logo' | 'hero-pokemon' | 'hero-magic' }) => (
    <div className="p-6 bg-input/40 border border-border rounded-2xl space-y-4 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Settings2 className="w-3 h-3 text-red-500" /> Enterprise Placement Engine
        </p>
        <button 
          onClick={() => restoreDefaults(type)}
          className="text-[7px] font-black text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-2.5 h-2.5" /> Restaurar Default
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <ControlGroup label="Escala" icon={Maximize2} value={imgConfig.scale} min={0.1} max={3} step={0.05} onChange={(v: number) => { addToHistory(config!, `${type}.scale`, v); onUpdate({...imgConfig, scale: v}); }} />
        <ControlGroup label="Rotación" icon={RotateCw} value={imgConfig.rotate} min={-180} max={180} onChange={(v: number) => { addToHistory(config!, `${type}.rotate`, v); onUpdate({...imgConfig, rotate: v}); }} />
        <ControlGroup label="Eje X (Offset)" icon={Move} value={imgConfig.x} min={-500} max={500} onChange={(v: number) => { addToHistory(config!, `${type}.x`, v); onUpdate({...imgConfig, x: v}); }} />
        <ControlGroup label="Eje Y (Offset)" icon={Move} value={imgConfig.y} min={-500} max={500} onChange={(v: number) => { addToHistory(config!, `${type}.y`, v); onUpdate({...imgConfig, y: v}); }} />
        <ControlGroup label="Opacidad" icon={Sun} value={imgConfig.opacity} min={0} max={1} step={0.05} onChange={(v: number) => { addToHistory(config!, `${type}.opacity`, v); onUpdate({...imgConfig, opacity: v}); }} />
      </div>
    </div>
  );

  if (loading || !config) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <RefreshCw className="w-12 h-12 text-red-600 animate-spin" />
      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Mainframe...</p>
    </div>
  );

  return (
    <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* --- HEADER CONTROLS --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-6">
        <div>
          <h1 className="text-5xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-4">
            <div className="relative">
              <Palette className="w-10 h-10 text-red-600 relative z-10" />
              <div className="absolute inset-0 bg-red-600/30 blur-xl rounded-full" />
            </div>
            Store Editor
          </h1>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Admin Command Center // Headless Architecture
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {changeLog.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="hidden lg:flex flex-col items-end gap-1 px-4 border-r border-border mr-2"
              >
                <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <History className="w-3 h-3" /> Registro de Cambios
                </p>
                {changeLog.slice(0, 2).map((log, i) => (
                  <p key={i} className="text-[8px] text-zinc-400 font-mono">
                    <span className="text-red-500">{log.field}</span> → {log.value} <span className="opacity-30 text-[6px]">[{log.time}]</span>
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-3.5 bg-accent/50 hover:bg-accent disabled:opacity-20 text-muted-foreground rounded-xl transition-all"
            title="Deshacer último cambio"
          >
            <RefreshCw className={cn("w-4 h-4", history.length > 0 && "text-yellow-500")} />
          </button>

          <button 
            onClick={toggleTheme}
            className="p-3.5 bg-accent/50 hover:bg-accent text-muted-foreground rounded-xl transition-all group"
            title="Cambiar Tema (Light/Dark)"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-yellow-500 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400 group-hover:-rotate-12 transition-transform" />
            )}
          </button>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 px-8 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Publicando...' : 'Publicar Cambios'}
          </button>
        </div>
      </div>

      {/* --- NAVIGATION TABS --- */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-card border border-border rounded-2xl backdrop-blur-3xl w-fit mx-6 transition-colors">
        {[
          { id: 'header', label: 'Identity', icon: Megaphone, tooltip: 'Identidad Global' },
          { id: 'hero', label: 'Split Hero', icon: Palette, tooltip: 'Héroes de Portada' },
          { id: 'shelves', label: 'Shelves', icon: Layers, tooltip: 'Estanterías de Productos' },
          { id: 'pdp', label: 'PDP Builder', icon: Layout, tooltip: 'Página de Detalle de Producto' },
          { id: 'marketing', label: 'Marketing', icon: Zap, tooltip: 'Campañas y Urgencia' },
          { id: 'import', label: 'Import Center', icon: RefreshCw, tooltip: 'Gestión Masiva de Datos' }
        ].map(tab => (
          <div key={tab.id} className="relative group/tab">
            <button
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                activeTab === tab.id ? "bg-red-600 text-white shadow-xl shadow-red-600/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground text-background border border-border rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/tab:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
              {tab.tooltip}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground border-r border-b border-border rotate-45" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start px-6 pb-20">
        {/* --- EDITOR PANEL --- */}
        <div className="xl:col-span-7 space-y-8">
          <AnimatePresence mode="wait">
            {/* --- IDENTITY EDITOR --- */}
            {activeTab === 'header' && (
              <motion.div key="header" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="bg-card p-10 rounded-[2.5rem] border border-border space-y-8 border-l-8 border-l-red-600 transition-colors">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-3">
                    <Megaphone className="w-4 h-4" /> Brand Identity
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ImageUploader 
                      label="Logo Principal" 
                      currentUrl={config.header.logo_url} 
                      onUploadSuccess={(url) => setConfig({...config, header: {...config.header, logo_url: url}})} 
                    />
                    <div className="bg-muted/30 p-6 rounded-3xl border border-border space-y-6">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Monitor className="w-4 h-4" /> Placement Engine
                      </p>
                      <AdvancedImageControls 
                        type="logo"
                        config={config.header.logoConfig || DEFAULT_IMG_CONFIG} 
                        onUpdate={(nc) => setConfig({...config, header: {...config.header, logoConfig: nc}})} 
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-border">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" /> Barra de Anuncios
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-zinc-500 uppercase">Texto del Anuncio</label>
                        <input type="text" value={config.header.announcement_bar.text} onChange={e => setConfig({...config, header: {...config.header, announcement_bar: {...config.header.announcement_bar, text: e.target.value}}})} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-[10px] font-bold text-foreground" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-zinc-500 uppercase">Color de Fondo</label>
                        <input type="color" value={config.header.announcement_bar.bgColor} onChange={e => setConfig({...config, header: {...config.header, announcement_bar: {...config.header.announcement_bar, bgColor: e.target.value}}})} className="w-full h-12 bg-input border border-border rounded-xl p-1" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-input rounded-xl border border-border">
                      <span className="text-[10px] font-black text-zinc-400 uppercase">Estado de la Barra</span>
                      <button 
                        onClick={() => setConfig({...config, header: {...config.header, announcement_bar: {...config.header.announcement_bar, isActive: !config.header.announcement_bar.isActive}}})}
                        className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all", config.header.announcement_bar.isActive ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}
                      >
                        {config.header.announcement_bar.isActive ? 'ACTIVA' : 'INACTIVA'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Navegación del Sitio</p>
                      <button onClick={() => setConfig({...config, header: {...config.header, menu_items: [...config.header.menu_items, { label: 'NUEVO', path: '/' }]}})} className="text-[8px] font-black text-red-500 uppercase flex items-center gap-2"><Plus className="w-3 h-3" /> Añadir Link</button>
                    </div>
                    <div className="space-y-3">
                      {config.header.menu_items.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center bg-input/30 p-2 rounded-xl border border-border">
                          <input type="text" value={item.label} onChange={e => {
                            const newItems = [...config.header.menu_items]; newItems[idx].label = e.target.value; setConfig({...config, header: {...config.header, menu_items: newItems}});
                          }} className="flex-1 bg-input border border-border rounded-lg px-4 py-2 text-[10px] font-bold text-foreground" placeholder="Etiqueta" />
                          <input type="text" value={item.path} onChange={e => {
                            const newItems = [...config.header.menu_items]; newItems[idx].path = e.target.value; setConfig({...config, header: {...config.header, menu_items: newItems}});
                          }} className="flex-1 bg-input border border-border rounded-lg px-4 py-2 text-[10px] font-bold text-foreground" placeholder="Ruta (/...)" />
                          <button onClick={() => setConfig({...config, header: {...config.header, menu_items: config.header.menu_items.filter((_, i) => i !== idx)}})} className="p-2 text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- SPLIT HERO EDITOR --- */}
            {activeTab === 'hero' && (
              <motion.div key="hero" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                {['pokemon', 'magic'].map((game) => (
                  <div key={game} className={cn(
                    "glass p-10 rounded-[2.5rem] border border-border space-y-8 border-l-8 shadow-2xl transition-colors",
                    game === 'pokemon' ? "border-l-yellow-500" : "border-l-purple-600"
                  )}>
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        "text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3",
                        game === 'pokemon' ? "text-yellow-500" : "text-purple-500"
                      )}>
                        <Layout className="w-4 h-4" /> {game === 'pokemon' ? 'Configuración Pokémon' : 'Configuración Magic'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Título Principal</label>
                          <input type="text" value={config.hero[game as 'pokemon'|'magic'].title} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], title: e.target.value.toUpperCase()}}})} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-xs font-black italic tracking-tighter text-foreground" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Subtítulo</label>
                          <input type="text" value={config.hero[game as 'pokemon'|'magic'].subtitle} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], subtitle: e.target.value.toUpperCase()}}})} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-[10px] font-bold text-foreground" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Descripción</label>
                          <textarea value={config.hero[game as 'pokemon'|'magic'].description} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], description: e.target.value}}})} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-[10px] font-medium h-24 resize-none text-foreground" />
                        </div>
                        <AdvancedImageControls 
                          type={game === 'pokemon' ? 'hero-pokemon' : 'hero-magic'}
                          config={config.hero[game as 'pokemon'|'magic'].imageConfig || DEFAULT_IMG_CONFIG} 
                          onUpdate={(nc) => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], imageConfig: nc}}})} 
                        />
                      </div>

                      <div className="space-y-6">
                         <ImageUploader 
                           label="Imagen del Personaje" 
                           currentUrl={config.hero[game as 'pokemon'|'magic'].bgImage} 
                           onUploadSuccess={(url) => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], bgImage: url}}})} 
                         />
                         <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Color de Fondo Seccional</label>
                            <input type="color" value={config.hero[game as 'pokemon'|'magic'].bgColor} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], bgColor: e.target.value}}})} className="w-full h-12 bg-input border border-border rounded-xl p-1" />
                         </div>
                         <div className="space-y-4">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Logos de Expansiones</p>
                            <div className="flex flex-wrap gap-2">
                               {config.hero[game as 'pokemon'|'magic'].expansionLogos.map((logo, lIdx) => (
                                 <div key={lIdx} className="relative group/logo w-12 h-12 bg-muted rounded-lg border border-border overflow-hidden shadow-sm">
                                    <img src={logo} className="w-full h-full object-contain p-1" alt="" />
                                    <button onClick={() => {
                                      const nl = [...config.hero[game as 'pokemon'|'magic'].expansionLogos]; nl.splice(lIdx, 1);
                                      setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], expansionLogos: nl}}});
                                    }} className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity" title="Eliminar logo"><Trash2 className="w-3 h-3 text-white" /></button>
                                 </div>
                               ))}
                               <button onClick={() => {
                                 const url = prompt('URL del Logo de Expansión:');
                                 if (url) {
                                   const nl = [...config.hero[game as 'pokemon'|'magic'].expansionLogos, url];
                                   setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], expansionLogos: nl}}});
                                 }
                               }} className="w-12 h-12 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-red-600/50 hover:text-red-500 transition-all bg-accent/30"><Plus className="w-4 h-4" /></button>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border space-y-4">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Configuración del Botón</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div className="space-y-1">
                              <span className="text-[7px] text-zinc-600 uppercase font-black">Texto</span>
                              <input type="text" value={config.hero[game as 'pokemon'|'magic'].buttonText} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], buttonText: e.target.value}}})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[9px] font-bold text-foreground" />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[7px] text-zinc-600 uppercase font-black">Link</span>
                              <input type="text" value={config.hero[game as 'pokemon'|'magic'].buttonLink} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], buttonLink: e.target.value}}})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[9px] font-bold text-foreground" />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[7px] text-zinc-600 uppercase font-black">Color Fondo</span>
                              <input type="color" value={config.hero[game as 'pokemon'|'magic'].buttonBgColor} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], buttonBgColor: e.target.value}}})} className="w-full h-8 bg-input border border-border rounded-lg" />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[7px] text-zinc-600 uppercase font-black">Color Texto</span>
                              <input type="color" value={config.hero[game as 'pokemon'|'magic'].buttonTextColor} onChange={e => setConfig({...config, hero: {...config.hero, [game]: {...config.hero[game as 'pokemon'|'magic'], buttonTextColor: e.target.value}}})} className="w-full h-8 bg-input border border-border rounded-lg" />
                           </div>
                        </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* --- SHELVES EDITOR --- */}
            {activeTab === 'shelves' && (
              <motion.div key="shelves" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="glass p-10 rounded-[2.5rem] border border-border space-y-8 border-l-8 border-l-emerald-600">
                  <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-3">
                    <Layers className="w-4 h-4" /> Featured Shelves Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Título Global de la Sección</label>
                      <input type="text" value={config.shelves.title} onChange={e => setConfig({...config, shelves: {...config.shelves, title: e.target.value.toUpperCase()}})} className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-sm font-black italic tracking-tighter text-foreground" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Fondo Pokémon Shelf</label>
                        <input type="color" value={config.shelves.pokemonBg || '#FFFFFF'} onChange={e => setConfig({...config, shelves: {...config.shelves, pokemonBg: e.target.value}})} className="w-full h-12 bg-input border border-border rounded-xl p-1" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Fondo Magic Shelf</label>
                        <input type="color" value={config.shelves.magicBg || '#0A0A1F'} onChange={e => setConfig({...config, shelves: {...config.shelves, magicBg: e.target.value}})} className="w-full h-12 bg-input border border-border rounded-xl p-1" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-border">

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estanterías Activas</p>
                      <button onClick={() => setConfig({...config, shelves: {...config.shelves, filterTags: [...config.shelves.filterTags, { label: 'NUEVA CATEGORÍA', filterCategory: 'all' }]}})} className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-2"><Plus className="w-3 h-3" /> Añadir Estantería</button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {config.shelves.filterTags.map((tag, idx) => (
                        <div key={idx} className="bg-muted/30 border border-border p-6 rounded-3xl flex items-center gap-6 group">
                          <div className="space-y-1 flex-1">
                            <label className="text-[7px] text-zinc-600 uppercase font-black">Etiqueta del Filtro</label>
                            <input type="text" value={tag.label} onChange={e => {
                              const nt = [...config.shelves.filterTags]; nt[idx].label = e.target.value.toUpperCase(); setConfig({...config, shelves: {...config.shelves, filterTags: nt}});
                            }} className="w-full bg-transparent border-b border-zinc-800 text-[11px] font-black uppercase py-1 outline-none focus:border-emerald-500" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <label className="text-[7px] text-zinc-600 uppercase font-black">Categoría / Slug</label>
                            <input type="text" value={tag.filterCategory} onChange={e => {
                              const nt = [...config.shelves.filterTags]; nt[idx].filterCategory = e.target.value; setConfig({...config, shelves: {...config.shelves, filterTags: nt}});
                            }} className="w-full bg-transparent border-b border-zinc-800 text-[11px] font-bold py-1 outline-none focus:border-emerald-500" />
                          </div>
                          <button onClick={() => setConfig({...config, shelves: {...config.shelves, filterTags: config.shelves.filterTags.filter((_, i) => i !== idx)}})} className="p-3 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- MARKETING EDITOR --- */}
            {activeTab === 'marketing' && (
              <motion.div key="marketing" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                {/* Countdown Config */}
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-8 border-l-8 border-l-indigo-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-3">
                      <Clock className="w-4 h-4" /> Global Countdown Bar
                    </h3>
                    <button 
                      onClick={() => setConfig({...config, marketing: {...config.marketing, countdown: {...config.marketing.countdown, isActive: !config.marketing.countdown.isActive}}})}
                      className={cn("px-6 py-2 rounded-xl font-black text-[10px] transition-all", config.marketing.countdown.isActive ? "bg-indigo-600 text-white shadow-xl" : "bg-white/5 text-zinc-500")}
                    >
                      {config.marketing.countdown.isActive ? 'ACTIVADO' : 'DESACTIVADO'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Mensaje del Contador</label>
                      <input type="text" value={config.marketing.countdown.message} onChange={e => setConfig({...config, marketing: {...config.marketing, countdown: {...config.marketing.countdown, message: e.target.value.toUpperCase()}}})} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-[10px] font-black italic text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Fecha de Finalización</label>
                      <input type="datetime-local" value={config.marketing.countdown.endDate} onChange={e => setConfig({...config, marketing: {...config.marketing, countdown: {...config.marketing.countdown, endDate: e.target.value}}})} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-[10px] font-bold text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Color de Fondo</label>
                      <input type="color" value={config.marketing.countdown.color} onChange={e => setConfig({...config, marketing: {...config.marketing, countdown: {...config.marketing.countdown, color: e.target.value}}})} className="w-full h-12 bg-input border border-border rounded-xl p-1" />
                    </div>
                  </div>
                </div>

                {/* Gamification Config */}
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-8 border-l-8 border-l-yellow-500">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em] flex items-center gap-3">
                      <Target className="w-4 h-4" /> Gamificación Protocol
                    </h3>
                    <button 
                      onClick={() => setConfig({...config, marketing: {...config.marketing, gamification: {...config.marketing.gamification, popupEnabled: !config.marketing.gamification.popupEnabled}}})}
                      className={cn("px-6 py-2 rounded-xl font-black text-[10px] transition-all", config.marketing.gamification.popupEnabled ? "bg-yellow-500 text-black shadow-xl" : "bg-white/5 text-zinc-500")}
                    >
                      {config.marketing.gamification.popupEnabled ? 'ACTIVADO' : 'DESACTIVADO'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Entidad a Capturar</label>
                      <input type="text" value={config.marketing.gamification.currentEntity} onChange={e => setConfig({...config, marketing: {...config.marketing, gamification: {...config.marketing.gamification, currentEntity: e.target.value}}})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Probabilidad de Aparición (0-1)</label>
                      <input type="number" step="0.01" min="0" max="1" value={config.marketing.gamification.captureChance} onChange={e => setConfig({...config, marketing: {...config.marketing, gamification: {...config.marketing.gamification, captureChance: parseFloat(e.target.value)}}})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-bold" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Mensaje del Pop-up</label>
                      <input type="text" value={config.marketing.gamification.popupMessage} onChange={e => setConfig({...config, marketing: {...config.marketing, gamification: {...config.marketing.gamification, popupMessage: e.target.value.toUpperCase()}}})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-black italic" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- PDP BUILDER EDITOR --- */}
            {activeTab === 'pdp' && (
              <motion.div key="pdp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-10 border-l-8 border-l-red-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-3">
                      <Settings2 className="w-4 h-4" /> Buy Box Protocol
                    </h3>
                  </div>
                  
                  {/* Controles de Botones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-zinc-500 uppercase">Botón Primario</label>
                      <input type="text" value={config.pdp.primaryButtonText} onChange={e => updatePDPField('primaryButtonText', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-muted-foreground uppercase">Botón Secundario</label>
                      <input type="text" value={config.pdp.secondaryButtonText} onChange={e => updatePDPField('secondaryButtonText', e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors" />
                    </div>
                  </div>

                  <section className="space-y-6 pt-6 border-t border-border transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Languages className="w-4 h-4 text-primary" /> Gestión de Idiomas / Ediciones
                      </p>
                      <button onClick={() => updatePDPField('languages', [...config.pdp.languages, { id: Date.now().toString(), label: 'Nuevo', flag: '🏳️', isActive: true }])} className="text-[9px] font-black text-primary uppercase flex items-center gap-2 hover:underline transition-all" title="Añadir nuevo idioma"><Plus className="w-3 h-3" /> Añadir</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {config.pdp.languages.map((lang, idx) => (
                        <div key={lang.id} className="bg-card/40 border border-border p-4 rounded-xl flex items-center gap-4 group transition-colors">
                          <input type="text" value={lang.flag} title="Bandera/Icono" onChange={e => {
                            const nl = [...config.pdp.languages]; nl[idx].flag = e.target.value; updatePDPField('languages', nl);
                          }} className="w-10 bg-input border border-border rounded text-center text-sm text-foreground transition-colors" />
                          <input type="text" value={lang.label} title="Nombre del idioma" onChange={e => {
                            const nl = [...config.pdp.languages]; nl[idx].label = e.target.value; updatePDPField('languages', nl);
                          }} className="flex-1 bg-transparent border-b border-border text-[10px] font-bold uppercase text-foreground transition-colors" />
                          <button 
                            title={lang.isActive ? "Desactivar idioma" : "Activar idioma"}
                            onClick={() => {
                            const nl = [...config.pdp.languages]; nl[idx].isActive = !nl[idx].isActive; updatePDPField('languages', nl);
                          }} className={cn("p-1.5 rounded-lg transition-colors", lang.isActive ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground bg-muted")}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button title="Eliminar idioma" onClick={() => updatePDPField('languages', config.pdp.languages.filter((_, i) => i !== idx))} className="p-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Prueba Social */}
                  <section className="space-y-6 pt-6 border-t border-border transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <Eye className="w-4 h-4 text-primary" /> Social Proof (Live Stats)
                      </p>
                      <button 
                        title="Cambiar visibilidad de prueba social"
                        onClick={() => updatePDPField('socialProof', {...config.pdp.socialProof, isVisible: !config.pdp.socialProof.isVisible})} className={cn("text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-all", config.pdp.socialProof.isVisible ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                        {config.pdp.socialProof.isVisible ? 'ACTIVADO' : 'DESACTIVADO'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-[8px] font-black text-muted-foreground uppercase">Plantilla "Viendo Ahora"</label>
                          <input type="text" value={config.pdp.socialProof.watching.template} title="Plantilla de texto" onChange={e => updatePDPField('socialProof', {...config.pdp.socialProof, watching: {...config.pdp.socialProof.watching, template: e.target.value}})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[10px] text-foreground transition-colors" />
                          <div className="flex gap-4">
                             <div className="flex-1 space-y-1">
                                <span className="text-[7px] text-muted-foreground uppercase font-black">Min</span>
                                <input type="number" value={config.pdp.socialProof.watching.min} title="Mínimo de espectadores" onChange={e => updatePDPField('socialProof', {...config.pdp.socialProof, watching: {...config.pdp.socialProof.watching, min: parseInt(e.target.value)}})} className="w-full bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground transition-colors" />
                             </div>
                             <div className="flex-1 space-y-1">
                                <span className="text-[7px] text-muted-foreground uppercase font-black">Max</span>
                                <input type="number" value={config.pdp.socialProof.watching.max} title="Máximo de espectadores" onChange={e => updatePDPField('socialProof', {...config.pdp.socialProof, watching: {...config.pdp.socialProof.watching, max: parseInt(e.target.value)}})} className="w-full bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground transition-colors" />
                             </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[8px] font-black text-muted-foreground uppercase">Plantilla "En Carrito"</label>
                          <input type="text" value={config.pdp.socialProof.inCart.template} title="Plantilla de texto en carrito" onChange={e => updatePDPField('socialProof', {...config.pdp.socialProof, inCart: {...config.pdp.socialProof.inCart, template: e.target.value}})} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[10px] text-foreground transition-colors" />
                          <div className="flex gap-4">
                             <div className="flex-1 space-y-1">
                                <span className="text-[7px] text-muted-foreground uppercase font-black">Min</span>
                                <input type="number" value={config.pdp.socialProof.inCart.min} title="Mínimo en carrito" onChange={e => updatePDPField('socialProof', {...config.pdp.socialProof, inCart: {...config.pdp.socialProof.inCart, min: parseInt(e.target.value)}})} className="w-full bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground transition-colors" />
                             </div>
                             <div className="flex-1 space-y-1">
                                <span className="text-[7px] text-muted-foreground uppercase font-black">Max</span>
                                <input type="number" value={config.pdp.socialProof.inCart.max} title="Máximo en carrito" onChange={e => updatePDPField('socialProof', {...config.pdp.socialProof, inCart: {...config.pdp.socialProof.inCart, max: parseInt(e.target.value)}})} className="w-full bg-input border border-border rounded px-2 py-1 text-[10px] text-foreground transition-colors" />
                             </div>
                          </div>
                       </div>
                    </div>
                  </section>

                  {/* Pagos */}
                  <section className="space-y-6 pt-6 border-t border-border transition-colors">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 transition-colors">
                      <CreditCard className="w-4 h-4 text-emerald-500" /> Métodos de Pago Seguros
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-muted-foreground uppercase">Título de la Tira</label>
                        <input type="text" value={config.pdp.payments.title} title="Título de métodos de pago" onChange={e => updatePDPField('payments', {...config.pdp.payments, title: e.target.value})} className="w-full bg-input border border-border rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.pdp.payments.methods.filter(m => !!m).map((method, idx) => (
                          <button key={method.id} 
                            title={method.isActive ? "Desactivar método" : "Activar método"}
                            onClick={() => {
                            const nm = [...config.pdp.payments.methods]; nm[idx].isActive = !nm[idx].isActive; updatePDPField('payments', {...config.pdp.payments, methods: nm});
                          }} className={cn("px-4 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", method.isActive ? "border-emerald-500 bg-emerald-500/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground")}>
                            {method.isActive && <CheckCircle2 className="w-3 h-3" />}
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Redes Sociales - Sharing Toggles */}
                  <section className="space-y-6 pt-6 border-t border-border transition-colors">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 transition-colors">
                      <Share2 className="w-4 h-4 text-primary" /> Botones de Compartir
                    </p>
                    <div className="flex gap-3">
                      {[
                        { key: 'link' as const, label: 'Copiar Link', icon: LinkIcon },
                        { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare },
                        { key: 'twitter' as const, label: 'X / Twitter', icon: Twitter }
                      ].map(({ key, label, icon: Icon }) => (
                        <button key={key} 
                          title={`Alternar botón de ${label}`}
                          onClick={() => updatePDPField('sharing', {...config.pdp.sharing, [key]: !config.pdp.sharing[key]})} className={cn("flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all", config.pdp.sharing[key] ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground")}>
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Acción Global */}
                  <div className="pt-6 border-t border-border flex gap-4 transition-colors">
                    <button onClick={handleSave} disabled={saving} title="Guardar todos los cambios" className="flex-1 flex items-center justify-center gap-3 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/20">
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar Cambios
                    </button>
                    <button onClick={handleApplyToAll} disabled={saving} title="Aplicar esta configuración a todos los productos" className="flex-1 flex items-center justify-center gap-3 py-4 bg-muted hover:bg-muted/80 border border-border hover:border-primary/30 disabled:opacity-50 text-foreground rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Aplicar a Todos
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

            {/* --- IMPORT CENTER --- */}
            {activeTab === 'import' && (
              <motion.div key="import" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <ImportCenter onSuccess={() => fetchConfig()} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- PREVIEW PANEL (LIVE ENGINE) --- */}
        <div className="xl:col-span-5 space-y-8">
          <div className="sticky top-24 space-y-8">
            <div className="bg-card/50 p-1.5 rounded-2xl border border-border flex items-center justify-between shadow-2xl backdrop-blur-3xl transition-colors">
               <div className="flex gap-1">
                 <button onClick={() => setPreviewMode('desktop')} title="Vista de escritorio" className={cn("p-2.5 rounded-xl transition-all", previewMode === 'desktop' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}><Monitor className="w-5 h-5" /></button>
                 <button onClick={() => setPreviewMode('mobile')} title="Vista móvil" className={cn("p-2.5 rounded-xl transition-all", previewMode === 'mobile' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}><Smartphone className="w-5 h-5" /></button>
               </div>
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pr-4 flex items-center gap-2 transition-colors">
                 <div className="w-2 h-2 rounded-full bg-primary animate-ping" /> LIVE PREVIEW v5.0
               </span>
            </div>

            <div className={cn(
              "relative bg-[#050505] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-700 mx-auto border border-white/10",
              previewMode === 'desktop' ? "w-full aspect-video rounded-[2.5rem]" : "w-[280px] aspect-[9/16] rounded-[3rem]"
            )}>
               {/* --- LIVE RENDER AREA --- */}
               <div className="absolute inset-0 origin-top-left overflow-auto hide-scrollbar" style={{ transform: previewMode === 'desktop' ? 'scale(0.65)' : 'scale(0.85)', width: previewMode === 'desktop' ? '153%' : '117%', height: previewMode === 'desktop' ? '153%' : '117%' }}>
                  
                  {/* --- PREVIEW: IDENTITY/HEADER --- */}
                  {activeTab === 'header' && (
                    <div className="space-y-4">
                      <div className="h-8 flex items-center justify-center text-[8px] font-black tracking-[0.2em]" style={{ backgroundColor: config.header.announcement_bar.bgColor }}>
                        {config.header.announcement_bar.text}
                      </div>
                      <div className="bg-white p-4 flex items-center justify-between border-b border-zinc-100">
                        {config.header.logo_url ? (
                          <img 
                            src={config.header.logo_url} 
                            style={{ 
                              transform: `translate(${config.header.logoConfig?.x || 0}px, ${config.header.logoConfig?.y || 0}px) scale(${config.header.logoConfig?.scale || 1}) rotate(${config.header.logoConfig?.rotate || 0}deg)`,
                              opacity: config.header.logoConfig?.opacity ?? 1
                            }} 
                            className="h-6" 
                            alt="" 
                          />
                        ) : (
                          <div className="w-20 h-4 bg-zinc-200 rounded" />
                        )}
                        <div className="flex gap-4">
                          {config.header.menu_items.map((item, i) => <span key={i} className="text-[8px] font-black text-black">{item.label}</span>)}
                        </div>
                      </div>
                      <div className="h-[300px] bg-zinc-100 rounded-2xl flex items-center justify-center text-[10px] font-black text-zinc-300 uppercase tracking-widest border-2 border-dashed border-zinc-200">
                        Sitio Web Contenido
                      </div>
                    </div>
                  )}

                  {/* --- PREVIEW: SPLIT HERO --- */}
                  {activeTab === 'hero' && (
                    <div className="flex h-full overflow-hidden">
                      {['pokemon', 'magic'].map((game) => (
                        <div key={game} className="flex-1 relative overflow-hidden flex flex-col p-4 lg:p-6 pt-16 lg:pt-20" style={{ backgroundColor: config.hero[game as 'pokemon'|'magic'].bgColor }}>
                          {/* Character image — behind */}
                          {config.hero[game as 'pokemon'|'magic'].bgImage && (
                            <img 
                              src={config.hero[game as 'pokemon'|'magic'].bgImage} 
                              style={{ 
                                transform: `translate(${config.hero[game as 'pokemon'|'magic'].imageConfig?.x || 0}px, calc(-50% + ${config.hero[game as 'pokemon'|'magic'].imageConfig?.y || 0}px)) scale(${config.hero[game as 'pokemon'|'magic'].imageConfig?.scale || 1}) rotate(${config.hero[game as 'pokemon'|'magic'].imageConfig?.rotate || 0}deg)`,
                                opacity: config.hero[game as 'pokemon'|'magic'].imageConfig?.opacity ?? 1
                              }}
                              className="absolute top-1/2 right-0 h-[110%] w-auto object-contain pointer-events-none z-0" 
                              alt="" 
                            />
                          )}

                          {/* Gradient — middle */}
                          <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: `linear-gradient(to right, ${config.hero[game as 'pokemon'|'magic'].bgColor} 30%, transparent 70%)` }} />
                          
                          {/* Expansion Logos — top right */}
                          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                             {config.hero[game as 'pokemon'|'magic'].expansionLogos.map((logo, i) => <img key={i} src={logo} className="h-10 w-auto object-contain" alt="" />)}
                          </div>

                          {/* Content — front */}
                          <div className="relative z-10 flex flex-col space-y-4">
                             <h4 className="text-5xl font-black italic tracking-tighter text-white uppercase">{config.hero[game as 'pokemon'|'magic'].title}</h4>
                             <p className="text-[12px] font-black text-white/60 tracking-widest uppercase">{config.hero[game as 'pokemon'|'magic'].subtitle}</p>
                             <p className="text-[11px] text-white/40 leading-relaxed max-w-[250px] font-medium">{config.hero[game as 'pokemon'|'magic'].description}</p>
                             <div className="pt-6">
                               <div className="px-8 py-3 rounded-xl text-[10px] font-black w-fit uppercase shadow-2xl" style={{ backgroundColor: config.hero[game as 'pokemon'|'magic'].buttonBgColor, color: config.hero[game as 'pokemon'|'magic'].buttonTextColor }}>
                                 {config.hero[game as 'pokemon'|'magic'].buttonText}
                               </div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- PREVIEW: SHELVES --- */}
                  {activeTab === 'shelves' && (
                    <div className="space-y-8 bg-zinc-950 p-8 rounded-3xl min-h-[500px]">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h4 className="text-xl font-black italic text-white tracking-tighter uppercase">{config.shelves.title}</h4>
                        <div className="flex gap-2">
                          {config.shelves.filterTags.map((tag, i) => (
                            <span key={i} className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest", i === 0 ? "bg-red-600 text-white" : "bg-white/5 text-zinc-500")}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="aspect-square bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center p-4">
                            <ImageIcon className="w-10 h-10 text-white/10 mb-2" />
                            <div className="w-full h-2 bg-white/5 rounded-full mb-1" />
                            <div className="w-2/3 h-2 bg-white/5 rounded-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* --- PREVIEW: MARKETING --- */}
                  {activeTab === 'marketing' && (
                    <div className="relative h-[600px] bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 p-8">
                       {config.marketing.countdown.isActive && (
                         <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center gap-4 text-[8px] font-black text-white uppercase tracking-[0.3em] shadow-xl" style={{ backgroundColor: config.marketing.countdown.color }}>
                            <Clock className="w-4 h-4" /> {config.marketing.countdown.message} 23:59:59
                         </div>
                       )}
                       
                       <div className="pt-12 flex flex-col items-center justify-center h-full text-center space-y-6">
                         <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                           <Zap className="w-8 h-8" />
                         </div>
                         <h4 className="text-2xl font-black italic text-white uppercase tracking-tighter">Marketing Engine Active</h4>
                         <p className="text-[10px] text-zinc-500 max-w-[200px] uppercase font-bold tracking-widest">Previsualización de elementos dinámicos y campañas de urgencia.</p>
                       </div>

                       {config.marketing.gamification.popupEnabled && (
                         <div className="absolute bottom-8 right-8 w-[250px] glass p-6 rounded-2xl border border-yellow-500/30 shadow-2xl animate-bounce">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 border border-yellow-500/30"><Target className="w-5 h-5" /></div>
                             <p className="text-[9px] font-black text-white uppercase italic">{config.marketing.gamification.currentEntity} Apareció!</p>
                           </div>
                           <p className="text-[8px] text-zinc-400 italic mb-4 leading-relaxed">{config.marketing.gamification.popupMessage}</p>
                           <div className="w-full py-2.5 bg-yellow-500 text-black rounded-lg text-[8px] font-black text-center uppercase tracking-widest">Capturar</div>
                         </div>
                       )}
                    </div>
                  )}

                  {/* --- PREVIEW: PDP BUILDER --- */}
                  {activeTab === 'pdp' && (
                    <div className="space-y-8 pointer-events-none">
                       {/* Identity Preview */}
                       <div className="space-y-4">
                         <div className="flex items-center gap-3">
                           <div className="w-16 h-4 bg-red-600/20 rounded" />
                           <div className="w-24 h-4 bg-white/5 rounded" />
                         </div>
                         <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">Product Name Preview</h1>
                         <div className="flex items-center gap-2">
                           <div className="flex gap-0.5 text-yellow-500">
                             {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                           </div>
                           <span className="text-xs text-zinc-500 font-bold">4.9 (128 reviews)</span>
                         </div>
                       </div>

                       {/* Price & Languages Preview */}
                       <div className="flex items-start justify-between border-t border-white/5 pt-6">
                         <div className="space-y-1">
                           <p className="text-5xl font-black text-white">99.95€</p>
                           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Hasta 6 cuotas de 16.65€</p>
                         </div>
                         <div className="flex gap-1.5">
                           {config.pdp.languages.filter(l => l.isActive).map(lang => (
                             <div key={lang.id} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center gap-1 min-w-[60px]">
                                <span className="text-lg">{lang.flag}</span>
                                <span className="text-[10px] font-black uppercase text-zinc-500">{lang.label.slice(0,3)}</span>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* Payments Strip Preview */}
                       <div className="flex flex-col items-center gap-3 py-4">
                          <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em]">{config.pdp.payments.title}</span>
                          <div className="flex gap-2">
                             {config.pdp.payments.methods.filter(m => m.isActive).map(m => (
                               <div key={m.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-bold text-zinc-400 uppercase">
                                 {m.label}
                               </div>
                             ))}
                          </div>
                       </div>

                       {/* Social Proof Preview */}
                       {config.pdp.socialProof.isVisible && (
                         <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 space-y-4">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><ShoppingCart className="w-5 h-5" /></div>
                               <p className="text-xs font-bold text-zinc-400">{config.pdp.socialProof.inCart.template.replace('{n}', '5')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Eye className="w-5 h-5" /></div>
                               <p className="text-xs font-bold text-zinc-400">{config.pdp.socialProof.watching.template.replace('{n}', '12')}</p>
                            </div>
                         </div>
                       )}

                       {/* Trust Seals Preview */}
                       <div className="space-y-3 pt-4 border-t border-white/5">
                          {config.pdp.trustSeals.map((seal, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl">
                               <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500"><ShieldCheck className="w-5 h-5" /></div>
                               <div>
                                 <p className="text-[11px] font-black uppercase text-white">{seal.title}</p>
                                 <p className="text-[10px] text-zinc-600 font-bold uppercase">{seal.desc}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Editor Stats Footer */}
            <div className="bg-gradient-to-br from-red-600/20 to-black p-8 rounded-[2.5rem] border border-red-500/20 relative overflow-hidden shadow-2xl">
               <div className="flex items-center gap-4 text-red-500 mb-4">
                  <Zap className="w-5 h-5 fill-current animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Real-time Sync Active</span>
               </div>
               <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                 "El Command Center permite gestionar toda la experiencia visual de HoloCard. Los cambios se guardan encriptados en Supabase."
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- TOAST --- */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]">
            <div className={cn("px-10 py-5 rounded-[2rem] border shadow-2xl flex items-center gap-5 backdrop-blur-3xl", toast.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">{toast.type === 'success' ? 'Protocolo Exitoso' : 'Fallo Crítico'}</p>
                <p className="text-[10px] opacity-70">{toast.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
