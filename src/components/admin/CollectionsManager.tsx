import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Tag, Package, Search, ChevronRight, 
  Layers, Filter, ImageIcon, ArrowLeft, Plus, Trash2, Edit2, 
  CheckSquare, Square, X, Check, GripVertical
} from 'lucide-react';
import { AnimatePresence, Reorder } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export const CollectionsManager = () => {
  const [tags, setTags] = useState<{id: string, name: string, count: number, order_index: number}[]>([]);
  const [selectedTag, setSelectedTag] = useState<{id: string, name: string} | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editingTag, setEditingTag] = useState<{id: string, name: string} | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      // Intentar fetch con ordenación
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, name, order_index')
        .order('order_index', { ascending: true });
      
      if (tagsError) {
        // Si falla (ej: no existe order_index), intentar fetch simple
        console.warn('Fallo al ordenar por order_index, reintentando fetch simple:', tagsError.message);
        const { data: simpleData, error: simpleError } = await supabase
          .from('tags')
          .select('id, name');
        
        if (simpleError) throw simpleError;
        
        if (simpleData) {
          const tagsWithCount = await Promise.all(simpleData.map(async (tag) => {
            const { count } = await supabase
              .from('product_tags')
              .select('*', { count: 'exact', head: true })
              .eq('tag_id', tag.id);
            return { ...tag, count: count || 0, order_index: 0 };
          }));
          setTags(tagsWithCount);
        }
      } else if (tagsData) {
        const tagsWithCount = await Promise.all(tagsData.map(async (tag) => {
          const { count } = await supabase
            .from('product_tags')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id);
          return { ...tag, count: count || 0 };
        }));
        setTags(tagsWithCount);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (newOrder: any[]) => {
    setTags(newOrder);
    setIsUpdatingOrder(true);
    try {
      const updates = newOrder.map((tag, index) => ({
        id: tag.id,
        name: tag.name,
        order_index: index
      }));
      const { error } = await supabase.from('tags').upsert(updates);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const fetchProductsByTag = async (tag: {id: string, name: string}) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_tags')
      .select('products(*)')
      .eq('tag_id', tag.id);
    if (data) {
      setProducts(data.map((item: any) => item.products));
    }
    setLoading(false);
  };

  const handleTagClick = (tag: {id: string, name: string}) => {
    if (editingTag) return;
    setSelectedTag(tag);
    fetchProductsByTag(tag);
  };

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    try {
      const slug = trimmedName.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, ''); 
        
      // 1. Crear o recuperar el Tag (usando upsert para ser resilientes)
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .upsert([{ 
          name: trimmedName,
          slug: slug,
          order_index: tags.length
        }], { onConflict: 'name' })
        .select()
        .single();
      
      if (tagError) throw tagError;

      // 2. Lógica de Sincronización Automática:
      // Si existe una Categoría con el mismo nombre, vinculamos sus productos automáticamente.
      if (tagData) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', trimmedName)
          .maybeSingle();

        if (category) {
          const { data: productsInCategory } = await supabase
            .from('products')
            .select('id')
            .eq('category_id', category.id);

          if (productsInCategory && productsInCategory.length > 0) {
            const relations = productsInCategory.map(p => ({
              product_id: p.id,
              tag_id: tagData.id
            }));

            // Insertar relaciones ignorando duplicados
            await supabase.from('product_tags').upsert(relations, { onConflict: 'product_id,tag_id' });
          }
        }
      }
      
      setNewTagName('');
      setIsCreating(false);
      fetchTags();
    } catch (error: any) {
      console.error('Error creating tag:', error);
      alert(`Error al crear colección: ${error.message || 'Verifica la consola'}`);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return;
    try {
      const trimmedName = editingTag.name.trim();
      const slug = trimmedName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

      const { error } = await supabase
        .from('tags')
        .update({ 
          name: trimmedName,
          slug: slug 
        })
        .eq('id', editingTag.id);
        
      if (error) throw error;
      setEditingTag(null);
      fetchTags();
    } catch (error: any) {
      console.error('Error updating tag:', error);
      alert(`Error al actualizar: ${error.message}`);
    }
  };

  const handleDeleteTags = async (ids: string[]) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${ids.length === 1 ? 'esta colección' : `estas ${ids.length} colecciones`}? Se eliminarán las referencias de los productos.`)) return;
    try {
      const { error } = await supabase.from('tags').delete().in('id', ids);
      if (error) throw error;
      setSelectedTagIds(prev => prev.filter(id => !ids.includes(id)));
      fetchTags();
    } catch (error) {
      console.error('Error deleting tags:', error);
    }
  };

  const toggleSelectTag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-red-500" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Merchandising Engine</span>
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tight uppercase italic transition-colors">Gestor de Colecciones</h2>
          <p className="text-sm text-muted-foreground mt-1 transition-colors">Organiza tus productos por etiquetas estratégicas.</p>
        </div>

        {!selectedTag && (
          <button 
            onClick={() => setIsCreating(true)}
            title="Crear nueva colección"
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Colección
          </button>
        )}
      </div>

      <AnimatePresence>
        {selectedTagIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-600/10 border border-red-500/20 p-4 rounded-3xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3 px-2">
              <CheckSquare className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold text-red-100 tracking-tight">{selectedTagIds.length} colecciones seleccionadas</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedTagIds([])} className="px-4 py-2 text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors" title="Cancelar selección">Cancelar</button>
              <button onClick={() => handleDeleteTags(selectedTagIds)} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-primary/40" title="Eliminar colecciones seleccionadas"><Trash2 className="w-4 h-4" />Eliminar Selección</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedTag && (
      <div className="space-y-4">
        <AnimatePresence>
          {isCreating && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border-2 border-dashed border-primary/30 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-end gap-6 mb-8 overflow-hidden transition-colors"
            >
              <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre de la Nueva Colección</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    autoFocus 
                    type="text" 
                    title="Nombre de la nueva colección"
                    value={newTagName} 
                    onChange={(e) => setNewTagName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    placeholder="Ej: Ofertas Black Friday" 
                    className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all font-bold uppercase" 
                  />
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={handleCreateTag} 
                  title="Guardar nueva colección"
                  className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/40 active:scale-95"
                >
                  Crear Ahora
                </button>
                <button 
                  onClick={() => setIsCreating(false)} 
                  title="Cancelar creación"
                  className="px-5 py-4 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isUpdatingOrder && (
          <div className="flex justify-end">
            <span className="text-[10px] font-black text-emerald-500 animate-pulse uppercase tracking-widest">Guardando orden...</span>
          </div>
        )}
        
        <Reorder.Group values={tags} onReorder={handleReorder} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center text-zinc-500">Cargando colecciones...</div>
          ) : tags.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-card/50 rounded-3xl border border-border transition-colors">
              <Tag className="w-12 h-12 text-muted mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground uppercase tracking-widest text-xs font-bold">No hay etiquetas creadas aún</p>
            </div>
          ) : (
            tags.map((tag) => (
                <Reorder.Item value={tag} key={tag.id} layout className={cn("bg-zinc-900/50 border p-6 rounded-3xl text-left transition-all group relative overflow-hidden", selectedTagIds.includes(tag.id) ? "border-red-500/50 bg-red-500/5" : "border-white/5 hover:border-red-500/30", !editingTag && "cursor-pointer")} onClick={() => handleTagClick(tag)}>
                  <div className="absolute top-4 left-4 z-20 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical className="w-4 h-4" /></div>
                  <button onClick={(e) => toggleSelectTag(e, tag.id)} title="Seleccionar colección" className={cn("absolute top-4 right-4 z-20 p-2 rounded-lg transition-all", selectedTagIds.includes(tag.id) ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100")}>{selectedTagIds.includes(tag.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}</button>
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Tag className="w-20 h-20 text-foreground" /></div>
                  <div className="flex justify-between items-start mb-4 pl-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-colors"><Tag className="w-6 h-6 text-primary" /></div>
                    {!editingTag && <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md transition-colors">{tag.count} ITEMS</span>}
                  </div>
                  {editingTag?.id === tag.id ? (
                    <div className="space-y-4" onClick={e => e.stopPropagation()}>
                      <input autoFocus type="text" title="Editar nombre de colección" value={editingTag.name} onChange={(e) => setEditingTag({...editingTag, name: e.target.value})} className="w-full bg-input border border-primary/50 rounded-xl px-3 py-2 text-foreground text-sm font-bold uppercase transition-colors" />
                      <div className="flex gap-2">
                        <button onClick={handleUpdateTag} title="Confirmar cambios" className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"><Check className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setEditingTag(null)} title="Cancelar edición" className="flex-1 bg-muted text-muted-foreground py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"><X className="w-4 h-4 mx-auto" /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{tag.name}</h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest transition-colors">Ver Colección <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="Editar nombre" onClick={(e) => { e.stopPropagation(); setEditingTag({id: tag.id, name: tag.name}); }} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></button>
                          <button title="Eliminar colección" onClick={(e) => { e.stopPropagation(); handleDeleteTags([tag.id]); }} className="p-2 hover:bg-primary/20 rounded-lg text-muted-foreground hover:text-primary"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </>
                  )}
                </Reorder.Item>
              ))
            )}
          </Reorder.Group>
        </div>
      )}

      {selectedTag && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedTag(null)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all"><ArrowLeft className="w-6 h-6" /></button>
            <div>
              <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-red-500" /><span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Colección Seleccionada</span></div>
              <h3 className="text-2xl font-black text-white uppercase italic">{selectedTag.name}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-black/40">
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Producto</th>
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">SKU</th>
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Precio Base</th>
                    <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center text-zinc-500">Sincronizando assets...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={4} className="p-20 text-center text-zinc-500">No hay productos en esta colección.</td></tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">{p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-zinc-600" />}</div><span className="text-sm font-bold text-white">{p.name}</span></div></td>
                        <td className="p-6 text-sm text-zinc-400 font-mono">{p.sku || '---'}</td>
                        <td className="p-6 text-sm font-mono text-white text-right">€{(p.base_price || 0).toFixed(2)}</td>
                        <td className="p-6 text-right"><span className={cn("text-sm font-mono font-bold", (p.base_stock || 0) === 0 ? "text-red-500" : "text-emerald-500")}>{p.base_stock || 0}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
