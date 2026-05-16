/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AnimatePresence, motion } from 'motion/react';
import { StoreProvider, useStore } from './lib/StoreContext';
import { ShieldAlert } from 'lucide-react';
import { GlobalFloatingButton } from './components/ui/GlobalFloatingButton';
import { useThemeStore, updateDocumentTheme } from './lib/useThemeStore';

// Pages
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/InventoryV2';
import Orders from './pages/admin/Orders';
import POS from './pages/admin/POS';
import Catalog from './pages/Catalog';
import Storefront from './pages/Storefront';
import HomeV2 from './pages/HomeV2';
import Login from './pages/Login';
import AdminLayout from './components/layout/AdminLayout';
import UserProfile from './pages/UserProfile';
import ProfileSettings from './pages/ProfileSettings';
import UsersEngine from './pages/admin/UsersEngine';
import SystemSettings from './pages/admin/SystemSettings';
import HomeMainframe from './pages/admin/HomeMainframe';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import Collections from './pages/admin/Collections';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import ProductPage from './pages/ProductPage';
import LegalPage from './pages/LegalPage';

function AppInner({ session }: { session: any }) {
  const { systemSettings } = useStore();
  const isAdminPath = window.location.pathname.startsWith('/admin') || window.location.pathname === '/login';

  if (systemSettings['system_maintenance'] && !isAdminPath) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full animate-pulse"></div>
          <ShieldAlert className="w-24 h-24 text-red-600 mb-8 mx-auto relative z-10" />
          <h1 className="text-6xl font-black text-foreground tracking-tighter uppercase italic mb-4 relative z-10">System Offline</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-[0.3em] mb-12 relative z-10">Protocol Omega Active // Maintenance in Progress</p>
          <div className="max-w-md mx-auto space-y-4 relative z-10">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-600"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="text-[10px] text-red-500/50 font-black uppercase tracking-widest">Re-authorization required by sector 01</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Storefront */}
          <Route path="/" element={<HomeV2 />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/producto/:id" element={<ProductPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/gracias/:orderId" element={<SuccessPage />} />

          {/* Legacy / alternate paths */}
          <Route path="/storefront" element={<Storefront />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductPage />} />

          {/* Auth */}
          <Route path="/login" element={session ? <Navigate to="/perfil" /> : <Login />} />

          {/* User Profile */}
          <Route path="/perfil" element={session ? <UserProfile /> : <Navigate to="/login" />} />
          <Route path="/profile/settings" element={session ? <ProfileSettings /> : <Navigate to="/login" />} />

          {/* Admin Auth */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="home" element={<HomeMainframe />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="collections" element={<Collections />} />
            <Route path="orders" element={<Orders />} />
            <Route path="pos" element={<POS />} />
            <Route path="users" element={<UsersEngine />} />
            <Route path="system" element={<SystemSettings />} />
          </Route>

          {/* Legal pages — must be last specific route */}
          <Route path="/:slug" element={<LegalPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
      <GlobalFloatingButton />
    </Router>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Sync initial theme
    updateDocumentTheme(theme);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((err) => {
        console.error('Supabase Session Error:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background transition-colors">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider>
      <AppInner session={session} />
    </StoreProvider>
  );
}
