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
  CreditCard,
  Menu,
  X,
  Crosshair,
  Palette,
  Layers,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useThemeStore } from '../../lib/useThemeStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Palette, label: 'Home Editor', path: '/admin/home' },
  { icon: Package, label: 'Inventory', path: '/admin/inventory' },
  { icon: Layers, label: 'Collections', path: '/admin/collections' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: CreditCard, label: 'POS Terminal', path: '/admin/pos' },
  { icon: Crosshair, label: 'Users Engine', path: '/admin/users' },
  { icon: Settings, label: 'System Settings', path: '/admin/system' },
];

export default function AdminLayout() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar hidden lg:flex flex-col flex-shrink-0 transition-colors">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/logo%20Holocard.jpg" alt="HoloCards" className="h-8 w-auto object-contain" />
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
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  location.pathname === item.path ? "text-red-500" : "text-muted-foreground group-hover:text-foreground"
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

        <div className="mt-auto p-6 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Top Header */}
        <header className="sticky top-0 h-16 border-b border-border bg-header backdrop-blur-2xl flex items-center justify-between px-4 sm:px-8 z-50 transition-colors">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 lg:hidden text-muted-foreground hover:text-foreground"
              title="Open Mobile Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link 
              to="/" 
              className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-accent/50 hover:bg-accent border border-border rounded-lg text-xs font-bold uppercase tracking-widest transition-all group"
            >
              <LogOut className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Sair para Home</span>
            </Link>
            
            <div className="relative w-40 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..."
                className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg relative transition-all" title="Notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
            </button>
            <div className="h-8 w-[1px] bg-border mx-2"></div>
            
            <button 
              onClick={() => useThemeStore.getState().toggleTheme()}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
              title="Toggle Theme"
            >
              {useThemeStore((state) => state.theme) === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-400" />
              )}
            </button>

            <div className="h-8 w-[1px] bg-border mx-2"></div>
            
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-accent p-1 rounded-xl transition-colors group"
                title="Toggle Profile Menu"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold group-hover:text-red-500 transition-colors">Admin User</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Owner</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-accent border border-border p-1 group-hover:border-red-500/50 transition-colors">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Notification Preferences</p>
                    <div className="space-y-4">
                      <div 
                        onClick={() => setEmailAlerts(!emailAlerts)}
                        className="flex items-center justify-between group cursor-pointer"
                        title="Toggle Email Alerts"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">Email Alerts</span>
                          <span className="text-[10px] text-muted-foreground uppercase">Critical stock updates</span>
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-colors duration-200",
                          emailAlerts ? "bg-red-600" : "bg-muted"
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
                        title="Toggle Push Notifications"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">Push Notifications</span>
                          <span className="text-[10px] text-muted-foreground uppercase">New order alerts</span>
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-colors duration-200",
                          pushNotifications ? "bg-red-600" : "bg-muted"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                            pushNotifications ? "right-0.5" : "left-0.5"
                          )}></div>
                        </div>
                      </div>
                      <div className="group cursor-pointer pt-2">
                        <Link to="/admin/system" className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Manage All Alerts</Link>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-red-600/10 transition-all text-xs font-black uppercase tracking-widest"
                      title="Sign Out Protocol"
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
          <div className="p-4 sm:p-8">
            <Outlet />
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-72 bg-sidebar border-r border-border z-[70] lg:hidden flex flex-col"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                      <img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/logo%20Holocard.jpg" alt="HoloCards" className="h-8 w-auto object-contain" />
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-muted-foreground hover:text-foreground" title="Close Menu">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <Link 
                        key={item.path} 
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                          location.pathname === item.path 
                            ? "bg-red-600/10 text-red-500" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <item.icon className={cn(
                          "w-5 h-5",
                          location.pathname === item.path ? "text-red-500" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>

                <div className="mt-auto p-6 border-t border-border">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
