import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Zap,
  Package,
  Plus,
  Minus
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useStore } from '../../lib/StoreContext';
import { getInventory } from '../../lib/inventory-db';

const RARITIES = ['All', 'Common', 'Uncommon', 'Rare', 'Holo', 'Ultra Rare', 'Secret Rare', 'Full Art', 'Alt Art'];
const SETS = ['All', 'Ninja Spinner', 'Ascended Heroes', 'Phantasmal Flames', 'Inferno X', 'Munikis Zero', 'Mega Dream', 'Evolving Skies'];

export default function POS() {
  const { storageImages } = useStore();
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [setFilter, setSetFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState(10000);

  const inventoryWithImages = (getInventory() || []).map((card, index) => ({
    ...card,
    image_url: card.image_url || (storageImages.length > 0 ? storageImages[index % storageImages.length] : '')
  }));

  const addToCart = (item: any) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }).filter(i => i.qty > 0));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const filteredInventory = inventoryWithImages.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRarity = rarityFilter === 'All' || i.rarity === rarityFilter;
    const matchesSet = setFilter === 'All' || i.set === setFilter;
    const matchesPrice = i.price <= priceFilter;
    return matchesSearch && matchesRarity && matchesSet && matchesPrice;
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Product Selection */}
      <div className="flex-1 space-y-6 flex flex-col">
        <div className="glass p-4 rounded-xl border border-white/5 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none"
              />
            </div>
            <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
               <Zap className="w-4 h-4 text-red-500" />
            </button>
          </div>
          
          <div className="flex gap-4">
            <select 
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none appearance-none cursor-pointer"
            >
              {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select 
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none appearance-none cursor-pointer"
            >
              {SETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-3">
               <span className="text-[10px] font-mono text-zinc-500 uppercase">Max $</span>
               <input 
                 type="number"
                 placeholder="Price"
                 className="bg-transparent border-none p-0 w-20 text-xs focus:ring-0 font-mono text-white"
                 onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPriceFilter(isNaN(val) ? 10000 : val);
                 }}
               />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {filteredInventory.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => addToCart(item)}
              className="glass p-4 rounded-xl border border-white/5 text-left hover:border-red-500/30 transition-all group relative"
            >
              <div className="w-10 h-10 bg-zinc-900 rounded-lg mb-3 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <Package className="w-5 h-5 text-zinc-500 group-hover:text-red-500" />
              </div>
              <p className="font-bold text-sm truncate">{item.name}</p>
              <p className="text-[10px] text-red-500 font-mono mb-1">{item.rarity}</p>
              <p className="text-xs text-zinc-500 mb-2 font-mono">{formatCurrency(item.price)}</p>
              <p className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded inline-block">
                STOCK: {item.stock}
              </p>
              {cart.find(c => c.id === item.id) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {cart.find(c => c.id === item.id).qty}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className="w-[400px] glass rounded-2xl border border-white/5 flex flex-col overflow-hidden bg-black/40">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold italic flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-red-500" />
            Current Session
          </h2>
          <button onClick={() => setCart([])} className="text-xs text-zinc-500 hover:text-white uppercase font-bold">Clear</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
              <ShoppingCart className="w-12 h-12" />
              <p className="font-mono text-sm tracking-widest uppercase">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-zinc-900/40 p-3 rounded-xl border border-white/5">
                <div className="flex-1">
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{formatCurrency(item.price)} / unit</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 px-2 border border-white/5">
                    <button onClick={() => updateQty(item.id, -1)}><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-mono w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}><Plus className="w-3 h-3" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-zinc-950/50 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Tax (8%)</span>
              <span className="font-mono">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/5">
              <span className="italic">Total</span>
              <span className="text-red-500">{formatCurrency(total)}</span>
            </div>
          </div>
          
          <button 
            disabled={cart.length === 0}
            className="w-full py-4 bg-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 disabled:grayscale"
          >
            <CreditCard className="w-5 h-5" />
            Complete Transaction
          </button>
          
          <p className="text-[10px] text-center text-zinc-600 font-mono uppercase tracking-widest">
            TX_GATEWAY: SASORI_PAY_V2 • SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
