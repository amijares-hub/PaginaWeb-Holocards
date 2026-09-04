/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StoreProvider, useStore } from './lib/StoreContext';
import { ShieldAlert } from 'lucide-react';
import FloatingChatBot from './components/ui/FloatingChatBot';
import { useThemeStore, updateDocumentTheme } from './lib/useThemeStore';
import { useAuth } from './hooks/useAuth';

import { lazy, Suspense } from 'react';

// Pages
const Catalog = lazy(() => import('./pages/Catalog'));
const LandingPageV2 = lazy(() => import('./pages/LandingPageV2'));
const Login = lazy(() => import('./pages/Login'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));

const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
import AboutUs from './components/AboutUs';

function ProtectedProfile() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <UserProfile />;
}

function ProfileSettingsRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!loading && !user) return <Navigate to="/login" replace />;
  return <ProfileSettings />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/perfil" replace />;
  return <Login />;
}

function AppInner() {
  const { systemSettings } = useStore();

  return (
    <Router>
      <RouterContent systemSettings={systemSettings} />
    </Router>
  );
}

function RouterContent({ systemSettings }: { systemSettings: any }) {
  const { pathname } = useLocation();
  const isBypassPath = pathname === '/login';

  if (systemSettings['system_maintenance'] && !isBypassPath) {
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
    <>
      <AnimatePresence mode="wait">
        <Suspense fallback={<div className="min-h-screen bg-[#050914] flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>

            {/* ══════════════════════════════════════════════
                 🏠 LANDING PRINCIPAL — ÚNICA PÁGINA DE ENTRADA
            ══════════════════════════════════════════════ */}
            <Route path="/" element={<LandingPageV2 />} />

            {/* Redirecciones de rutas antiguas → nueva raíz */}
            <Route path="/v2-landing" element={<Navigate to="/" replace />} />
            <Route path="/dev-store" element={<Navigate to="/" replace />} />

            {/* ══════════════════════════════════════════════
                 🛍️ CATÁLOGO Y TIENDA
            ══════════════════════════════════════════════ */}
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/producto/:id" element={<ProductPage />} />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/gracias/:orderId" element={<SuccessPage />} />
            <Route path="/perfil" element={<ProtectedProfile />} />
            <Route path="/perfil/ajustes" element={<ProfileSettingsRoute />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/sobre-nosotros" element={<AboutUs />} />

            {/* Rutas legacy del dev-store → redirigen a nuevas */}
            <Route path="/dev-store/catalog" element={<Navigate to="/catalogo" replace />} />
            <Route path="/dev-store/catalogo" element={<Navigate to="/catalogo" replace />} />
            <Route path="/dev-store/producto/:id" element={<Navigate to="/producto/:id" replace />} />
            <Route path="/dev-store/product/:id" element={<Navigate to="/producto/:id" replace />} />

            {/* Catch-all → Landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      {!isBypassPath && <FloatingChatBot />}
    </>
  );
}

export default function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Sync theme
    updateDocumentTheme(theme);
  }, [theme]);

  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
