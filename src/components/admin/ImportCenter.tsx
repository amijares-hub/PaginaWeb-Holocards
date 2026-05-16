import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Database, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Globe, 
  Key,
  ChevronRight,
  Table as TableIcon,
  Trash2,
  Search,
  Zap
} from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface ImportCenterProps {
  onSuccess?: () => void;
}

export const ImportCenter: React.FC<ImportCenterProps> = ({ onSuccess }) => {
  const [activeModule, setActiveModule] = useState<'csv' | 'sheets' | 'api'>('csv');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{success: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preparation States
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiConfig, setApiConfig] = useState({
    source: 'pokemon',
    apiKey: '',
    clientSecret: '',
    query: ''
  });

  const downloadTemplate = () => {
    const headers = ['name', 'sku', 'base_price', 'base_stock', 'description', 'category_id', 'top_hits_images'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'holocard_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    setImportStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data);
        setIsParsing(false);
      },
      error: (err) => {
        setError('Error al procesar el archivo CSV: ' + err.message);
        setIsParsing(false);
      }
    });
  };

  const fetchScryfallCards = async () => {
    if (!apiConfig.query) return;
    setIsParsing(true);
    setError(null);
    setPreviewData([]);

    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(apiConfig.query)}`);
      const data = await response.json();

      if (data.status === 404) {
        throw new Error('No se encontraron cartas con ese término.');
      }

      if (!data.data) throw new Error(data.details || 'Error al conectar con Scryfall');

      const mapped = data.data.map((card: any) => ({
        name: card.name,
        sku: `MTG-${card.id.substr(0, 8).toUpperCase()}`,
        base_price: parseFloat(card.prices?.eur || card.prices?.usd || '0.00'),
        base_stock: 1, // Default for individual cards
        description: `${card.oracle_text || ''}\n\n${card.flavor_text || ''}`,
        image_url: card.image_uris?.large || card.image_uris?.normal,
        category_id: 'magic', // Placeholder/Logic to match DB
        source: 'scryfall'
      }));

      setPreviewData(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const executeImport = async () => {
    if (previewData.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      // 1. Resolve Category UUID (Smart Discovery)
      // Determine the category name based on the source
      const source = previewData[0].source || 'unknown';
      let categoryName = 'General';
      if (source === 'scryfall') categoryName = 'Magic The Gathering';
      if (source === 'pokemon') categoryName = 'Pokémon TCG';

      // Check if category exists
      let { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      let categoryId: string;

      if (catError && catError.code === 'PGRST116') {
        // Category doesn't exist, create it
        const { data: newCat, error: createError } = await supabase
          .from('categories')
          .insert({ name: categoryName, slug: categoryName.toLowerCase().replace(/ /g, '-') })
          .select()
          .single();

        if (createError) throw createError;
        categoryId = newCat.id;
      } else if (catError) {
        throw catError;
      } else {
        categoryId = catData.id;
      }

      // 2. Map and Sanitize Data
      const mappedData = previewData.map(item => ({
        name: String(item.name || ''),
        sku: String(item.sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`),
        base_price: Number(parseFloat(item.base_price) || 0),
        base_stock: Number(parseInt(item.base_stock) || 0),
        description: String(item.description || ''),
        image_url: item.image_url ? String(item.image_url) : null,
        top_hits_images: Array.isArray(item.top_hits_images) ? item.top_hits_images : [],
        slug: (item.name || '').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 5),
        status: 'active',
        category_id: categoryId // Use the real UUID
      }));

      const { data, error: importError } = await supabase
        .from('products')
        .insert(mappedData)
        .select();

      if (importError) throw importError;

      setImportStatus({ success: data.length, total: mappedData.length });
      setPreviewData([]);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Error al importar los productos');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-red-600" /> Import Center
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Hub central de escalabilidad masiva</p>
        </div>
        
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
        >
          <Download className="w-4 h-4 text-emerald-500" /> Descargar Plantilla CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module 1: CSV */}
        <div className={cn(
          "glass p-8 rounded-[2.5rem] border transition-all duration-500 space-y-6 cursor-pointer",
          activeModule === 'csv' ? "border-red-500/30 bg-red-500/5 ring-1 ring-red-500/20" : "border-white/5 bg-black/40 hover:bg-white/5"
        )} onClick={() => setActiveModule('csv')}>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-600/20 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6 text-red-500" />
            </div>
            {activeModule === 'csv' && <div className="px-3 py-1 bg-red-600 text-white text-[8px] font-black uppercase rounded-full tracking-widest animate-pulse">ACTIVO</div>}
          </div>
          
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Importador CSV Inteligente</h3>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">Carga de inventario masiva via archivo plano</p>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-40 border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-black/40 overflow-hidden"
          >
            {isParsing && activeModule === 'csv' ? (
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-zinc-600 group-hover:text-red-500 transition-colors" />
                <p className="text-[9px] font-black uppercase text-zinc-500 group-hover:text-white transition-colors">Arrastra tu CSV aquí</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Module 2: Google Sheets */}
        <div className={cn(
          "glass p-8 rounded-[2.5rem] border transition-all duration-500 space-y-6 cursor-pointer",
          activeModule === 'sheets' ? "border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-white/5 bg-black/40 hover:bg-white/5"
        )} onClick={() => setActiveModule('sheets')}>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-600/20 rounded-2xl">
              <Globe className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="px-3 py-1 bg-zinc-800 text-zinc-500 text-[8px] font-black uppercase rounded-full tracking-widest">PRÓXIMAMENTE</div>
          </div>
          
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Google Sheets Sync</h3>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">Sincronización en tiempo real via Webhook</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-1">URL Webhook (Make / Zapier)</label>
              <input 
                type="text" 
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://hook.make.com/..."
                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-emerald-500"
              />
            </div>
            <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20">
              Guardar Conexión
            </button>
            <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <AlertCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <p className="text-[8px] text-emerald-500/70 font-bold uppercase tracking-tighter leading-tight">Requiere configuración externa en plataforma middleware</p>
            </div>
          </div>
        </div>

        {/* Module 3: TCG API */}
        <div className={cn(
          "glass p-8 rounded-[2.5rem] border transition-all duration-500 space-y-6 cursor-pointer",
          activeModule === 'api' ? "border-indigo-500/30 bg-indigo-500/5 ring-1 ring-indigo-500/20" : "border-white/5 bg-black/40 hover:bg-white/5"
        )} onClick={() => setActiveModule('api')}>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-600/20 rounded-2xl">
              <Zap className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-full tracking-widest">LIVE SYNC</div>
          </div>
          
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">TCG API Intelligence</h3>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">Conexión directa con bases de datos externas</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Fuente de Datos</label>
              <select 
                value={apiConfig.source}
                onChange={e => setApiConfig({...apiConfig, source: e.target.value})}
                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white appearance-none"
              >
                <option value="scryfall">Scryfall (Magic: The Gathering)</option>
                <option value="pokemon">Pokémon TCG API (v2)</option>
                <option value="tcgplayer">TCGPlayer Marketplace</option>
              </select>
            </div>

            {apiConfig.source === 'scryfall' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Set o Búsqueda de Cartas</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      placeholder="ej. set:neo o 'Black Lotus'"
                      value={apiConfig.query}
                      onChange={e => setApiConfig({...apiConfig, query: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-[10px] font-bold text-white"
                    />
                  </div>
                </div>
                <button 
                  onClick={fetchScryfallCards}
                  disabled={isParsing}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                >
                  {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Buscar Cartas en Scryfall
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                  <input 
                    type="password" 
                    placeholder="API KEY"
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-[10px] font-bold"
                  />
                </div>
                <button className="w-full py-3 bg-zinc-800 text-zinc-500 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-not-allowed">
                  Configuración Requerida
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview & Action */}
      {previewData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-10 rounded-[3rem] border border-red-500/20 bg-black/60 space-y-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-2xl">
                <TableIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Previsualización de Datos</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {apiConfig.source === 'scryfall' ? `Encontradas ${previewData.length} cartas en la API` : `Detectados ${previewData.length} productos en el archivo`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPreviewData([])}
                className="px-6 py-3 text-zinc-500 hover:text-red-500 text-[10px] font-black uppercase transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeImport}
                disabled={isImporting}
                className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/40"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isImporting ? 'Procesando...' : `Importar ${previewData.length} Cartas al Inventario`}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5">Visual</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5">Nombre</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5">SKU</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5">Precio</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5">Stock</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 border-b border-white/5">
                      {row.image_url ? (
                        <img src={row.image_url} alt={row.name} className="h-12 w-8 object-cover rounded shadow-lg" />
                      ) : (
                        <div className="h-12 w-8 bg-zinc-800 rounded border border-white/5" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-white font-black uppercase italic border-b border-white/5">{row.name}</td>
                    <td className="px-6 py-4 text-[9px] text-zinc-500 font-mono border-b border-white/5">{row.sku}</td>
                    <td className="px-6 py-4 text-[10px] text-emerald-500 font-black border-b border-white/5">€{row.base_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-[10px] text-zinc-300 font-medium border-b border-white/5">{row.base_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <div className="p-4 text-center bg-black/40">
                <p className="text-[8px] text-zinc-600 font-black uppercase italic tracking-widest">... y {previewData.length - 10} resultados más en cola</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Success/Error Toasts */}
      {importStatus && (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-emerald-500 font-black uppercase tracking-widest text-xs italic">¡Importación Exitosa!</p>
              <p className="text-[10px] text-emerald-500/70 font-bold uppercase">Se han sincronizado {importStatus.success} de {importStatus.total} cartas en la base de datos de Sasori Labs.</p>
            </div>
          </div>
          <button onClick={() => setImportStatus(null)} className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="text-red-500 font-black uppercase tracking-widest text-xs italic">Fallo en la Sincronización</p>
            <p className="text-[10px] text-red-500/70 font-bold uppercase">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
