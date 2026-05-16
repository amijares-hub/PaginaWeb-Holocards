import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, Package, Tag, Hash, Euro, 
  Database, Activity, Loader2, AlertCircle, Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUploader } from './ImageUploader';
import { BulkImageUploader } from './BulkImageUploader';
import { cn } from '../../lib/utils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: any; // If provided, it's edit mode
}

export const ProductFormModal = ({ isOpen, onClose, onSuccess, product }: ProductFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    base_price: 0,
    base_stock: 0,
    status: 'draft' as 'active' | 'draft' | 'archived',
    image_url: '',
    category_id: '',
    tags: [] as string[],
    top_hits_images: [] as string[]
  });

  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchAvailableTags();
      if (product) {
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          base_price: product.base_price || 0,
          base_stock: product.base_stock || 0,
          status: product.status || 'draft',
          image_url: product.image_url || '',
          category_id: product.category_id || '',
          tags: [], // Will be loaded below
          top_hits_images: product.top_hits_images || []
        });
        fetchProductTags(product.id);
      } else {
        setFormData({
          name: '',
          sku: '',
          base_price: 0,
          base_stock: 0,
          status: 'draft',
          image_url: '',
          category_id: '',
          tags: [],
          top_hits_images: []
        });
      }
    }
    setError(null);
  }, [isOpen, product]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('id, name');
    if (!error && data) setCategories(data);
  };

  const fetchAvailableTags = async () => {
    const { data, error } = await supabase.from('tags').select('id, name');
    if (!error && data) setAvailableTags(data);
  };

  const fetchProductTags = async (productId: string) => {
    const { data, error } = await supabase
      .from('product_tags')
      .select('tags(name)')
      .eq('product_id', productId);
    
    if (!error && data) {
      const tagNames = data.map((item: any) => item.tags.name);
      setFormData(prev => ({ ...prev, tags: tagNames }));
    }
  };

  const handleAddTag = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        base_price: formData.base_price,
        base_stock: formData.base_stock,
        status: formData.status,
        image_url: formData.image_url,
        category_id: formData.category_id || null,
        top_hits_images: formData.top_hits_images,
        slug: formData.name.toLowerCase().replace(/ /g, '-')
      };

      let result;
      if (product?.id) {
        result = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
          .select();
      } else {
        result = await supabase
          .from('products')
          .insert([payload])
          .select();
      }

      if (result.error) throw result.error;
      const finalProductId = product?.id || result.data?.[0]?.id;

      if (finalProductId) {
        // Sync Tags
        // 1. Remove old relations
        await supabase.from('product_tags').delete().eq('product_id', finalProductId);
        
        // 2. Ensure tags exist and get IDs
        for (const tagName of formData.tags) {
          let { data: tagData } = await supabase.from('tags').select('id').eq('name', tagName).single();
          
          if (!tagData) {
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert([{ name: tagName, slug: tagName.toLowerCase().replace(/ /g, '-') }])
              .select()
              .single();
            if (!tagError) tagData = newTag;
          }
          
          if (tagData) {
            await supabase.from('product_tags').insert([{ product_id: finalProductId, tag_id: tagData.id }]);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Slide-over Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    {product ? 'Editar Producto' : 'Nuevo Producto'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gestión de Inventario Enterprise</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Main Info Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Activity className="w-3 h-3" /> Información General
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nombre del Producto</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ej: Charizard VMAX Gold"
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">SKU / Referencia</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input 
                          type="text" 
                          value={formData.sku}
                          onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          placeholder="SKU-001"
                          className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white font-mono focus:outline-none focus:border-red-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Estado</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                      >
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Categoría Principal</label>
                    <div className="relative">
                      <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <select 
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                      >
                        <option value="">Sin categoría asignada</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Database className="w-3 h-3" /> Valores y Stock
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Precio Base (€)</label>
                    <div className="relative">
                      <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.base_price}
                        onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white font-mono focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Stock Inicial</label>
                    <div className="relative">
                      <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="number" 
                        value={formData.base_stock}
                        onChange={(e) => setFormData({...formData, base_stock: parseInt(e.target.value) || 0})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white font-mono focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Activity className="w-3 h-3" /> Media Assets
                </div>
                
                <div className="bg-black/20 border border-white/5 p-6 rounded-[2rem] space-y-8">
                  <ImageUploader 
                    label="Imagen Principal (Thumbnail)"
                    currentUrl={formData.image_url}
                    onUploadSuccess={(url) => setFormData({...formData, image_url: url})}
                  />
                  
                  <div className="h-[1px] bg-white/5 w-full" />
                  
                  <BulkImageUploader 
                    label="Top Hits — Galería de Cartas"
                    productId={product?.id}
                    currentUrls={formData.top_hits_images}
                    onUploadSuccess={(urls) => setFormData({...formData, top_hits_images: urls})}
                  />
                  
                  <p className="text-[10px] text-zinc-500 mt-4 text-center italic">Sincronizado con Supabase Storage Platform (product_assets)</p>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  <Tag className="w-3 h-3" /> Categorización y Etiquetas
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Etiquetas del Producto</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Escribe y pulsa Enter para añadir..."
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => handleAddTag()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 uppercase hover:text-white transition-colors"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-wider group hover:bg-red-600 hover:text-white transition-all cursor-default"
                      >
                        {tag}
                        <button 
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:scale-125 transition-transform"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formData.tags.length === 0 && (
                      <p className="text-[10px] text-zinc-600 italic ml-1">Sin etiquetas asignadas</p>
                    )}
                  </div>

                  {availableTags.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 ml-1">Sugerencias:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter(t => !formData.tags.includes(t.name))
                          .slice(0, 6)
                          .map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, tags: [...formData.tags, tag.name] })}
                              className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] text-zinc-400 hover:border-white/10 hover:text-white transition-all"
                            >
                              + {tag.name}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-8 border-t border-white/5 bg-black/40 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-zinc-900 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {product ? 'Actualizar Producto' : 'Crear Producto'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
