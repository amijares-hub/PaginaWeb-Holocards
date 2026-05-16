import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { formatCurrency } from '../../lib/utils';

const data = [
  { name: 'Mon', sales: 4000, orders: 24 },
  { name: 'Tue', sales: 3000, orders: 18 },
  { name: 'Wed', sales: 5000, orders: 32 },
  { name: 'Thu', sales: 2780, orders: 21 },
  { name: 'Fri', sales: 6890, orders: 48 },
  { name: 'Sat', sales: 8390, orders: 56 },
  { name: 'Sun', sales: 7490, orders: 42 },
];

const cards = [
  { label: 'Total Revenue', value: '$45,231.89', change: '+20.1%', icon: TrendingUp, positive: true },
  { label: 'Total Orders', value: '+2,350', change: '+18.4%', icon: ShoppingCart, positive: true },
  { label: 'New Customers', value: '+12,234', change: '-2.1%', icon: Users, positive: false },
  { label: 'Inventory Value', value: '$284,500', change: '+7.2%', icon: Package, positive: true },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-zinc-500 mt-1">Real-time performance analytics for Sasori Labs.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-accent hover:bg-muted border border-border rounded-lg text-sm font-medium text-foreground transition-colors">
            Download Report
          </button>
          <button className="px-4 py-2 bg-red-600 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
            Real-time Feed
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.label}
            className="p-6 glass rounded-2xl border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <card.icon className="w-12 h-12 text-foreground" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-accent rounded-lg">
                <card.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold">{card.value}</h3>
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  card.positive ? "text-emerald-500" : "text-red-500"
                )}>
                  {card.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{card.change} from last month</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl border border-white/5 p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold italic serif">Revenue Analytics</h2>
              <p className="text-xs text-zinc-500 font-mono">FINANCIAL_MODULE_V2.1</p>
            </div>
            <div className="flex gap-2 bg-accent/50 p-1 rounded-lg">
              <button className="px-3 py-1 text-xs bg-card border border-border rounded shadow-sm text-foreground">Area</button>
              <button className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">Bar</button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/5 p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" />
            Recent Activity
          </h2>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 relative">
                {i < 5 && <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-border"></div>}
                <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center border border-border shadow-sm">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-foreground">New order received</span>
                    <span className="text-muted-foreground ml-2">#ORD-492{i}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg hover:bg-accent/50">
            View all logs
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
