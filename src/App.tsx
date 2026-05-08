/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'motion/react';
import { StoreProvider } from './lib/StoreContext';

// Pages (to be created)
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Orders from './pages/admin/Orders';
import POS from './pages/admin/POS';
import Catalog from './pages/Catalog';
import Storefront from './pages/Storefront';
import Login from './pages/Login';
import CheckoutFunnel from './pages/CheckoutFunnel';
import AdminLayout from './components/layout/AdminLayout';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider>
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Storefront */}
            <Route path="/" element={<Storefront />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/checkout/:productId" element={<CheckoutFunnel />} />
            
            {/* Auth */}
            <Route path="/login" element={session ? <Navigate to="/admin" /> : <Login />} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="pos" element={<POS />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </Router>
    </StoreProvider>
  );
}
