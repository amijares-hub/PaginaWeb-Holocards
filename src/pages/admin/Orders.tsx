import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

const orders = [
  { id: 'ORD-9901', customer: 'Ash Ketchum', date: '2026-05-01', total: 1250.00, status: 'Shipped', items: 3 },
  { id: 'ORD-9902', customer: 'Gary Oak', date: '2026-05-02', total: 450.50, status: 'Processing', items: 1 },
  { id: 'ORD-9903', customer: 'Misty Waterflower', date: '2026-04-28', total: 85.00, status: 'Delivered', items: 1 },
  { id: 'ORD-9904', customer: 'Brock Stone', date: '2026-04-30', total: 600.00, status: 'Canceled', items: 2 },
  { id: 'ORD-9905', customer: 'Cynthia Champion', date: '2026-05-02', total: 2400.00, status: 'Processing', items: 5 },
];

const statusConfig = {
  Processing: { color: 'text-red-500', bg: 'bg-red-500/10', icon: Clock },
  Shipped: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Truck },
  Delivered: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  Canceled: { color: 'text-zinc-500', bg: 'bg-zinc-500/10', icon: AlertCircle },
};

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
          <p className="text-zinc-500 mt-1">Monitor and manage customer transactions worldwide.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 font-mono">Pending Shipments</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold italic">14</h3>
            <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold">+2 today</span>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 font-mono">Total Sales (MTD)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold italic">$24,942.00</h3>
            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">+12% vs LY</span>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 font-mono">Avg Order Value</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold italic">$342.15</h3>
            <span className="text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded text-[10px] font-bold">Stable</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
           <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none"
            />
          </div>
          <button className="p-2 text-zinc-400 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-[#27272a]">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono italic">Order ID</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono italic">Customer</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono italic">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono italic text-center">Items</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono italic">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono italic text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {orders.map((order, i) => {
                const status = statusConfig[order.status as keyof typeof statusConfig];
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={order.id} 
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <p className="font-mono font-bold text-white group-hover:text-red-500 transition-colors uppercase">{order.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{order.customer}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-zinc-500">{order.date}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-zinc-400">{order.items}</span>
                    </td>
                    <td className="p-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                        status.bg,
                        status.color
                      )}>
                        <status.icon className="w-3 h-3" />
                        {order.status}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <p className="font-mono font-bold text-white tracking-tighter">
                          {formatCurrency(order.total)}
                        </p>
                        <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
