import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Bell,
  Search,
  User,
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Inventory', path: '/admin/inventory' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: CreditCard, label: 'POS Terminal', path: '/admin/pos' },
];

export default function AdminLayout() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#27272a] bg-[#09090b] hidden lg:flex flex-col flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold">S</div>
            <span className="text-xl font-bold tracking-tight">SASORI<span className="text-red-500">LABS</span></span>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  location.pathname === item.path 
                    ? "bg-red-600/10 text-red-500" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  location.pathname === item.path ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                <span className="font-medium">{item.label}</span>
                {location.pathname === item.path && (
                  <motion.div 
                    layoutId="activeNav"
                    className="ml-auto w-1 h-5 bg-red-500 rounded-full"
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-[#27272a]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 h-16 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-xl flex items-center justify-between px-8 z-50">
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all group"
            >
              <LogOut className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Sair para Home</span>
            </Link>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search assets..."
                className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#09090b]"></span>
            </button>
            <div className="h-8 w-[1px] bg-zinc-800 mx-2"></div>
            
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-zinc-800/50 p-1 rounded-xl transition-colors group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold group-hover:text-red-500 transition-colors">Admin User</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Owner</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 p-1 group-hover:border-red-500/50 transition-colors">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 glass border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-white/5 bg-zinc-900/50">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Notification Preferences</p>
                    <div className="space-y-4">
                      <div 
                        onClick={() => setEmailAlerts(!emailAlerts)}
                        className="flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-200">Email Alerts</span>
                          <span className="text-[10px] text-zinc-500 uppercase">Critical stock updates</span>
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-colors duration-200",
                          emailAlerts ? "bg-red-600" : "bg-zinc-700"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                            emailAlerts ? "right-0.5" : "left-0.5"
                          )}></div>
                        </div>
                      </div>
                      <div 
                        onClick={() => setPushNotifications(!pushNotifications)}
                        className="flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-200">Push Notifications</span>
                          <span className="text-[10px] text-zinc-500 uppercase">New order alerts</span>
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-colors duration-200",
                          pushNotifications ? "bg-red-600" : "bg-zinc-700"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                            pushNotifications ? "right-0.5" : "left-0.5"
                          )}></div>
                        </div>
                      </div>
                      <div className="group cursor-pointer pt-2">
                        <Link to="/admin/settings" className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Manage All Alerts</Link>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-red-600/10 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out Protocol
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
