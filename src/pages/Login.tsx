import React, { useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User, Lock, ArrowRight, Github, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  const handleDevBypass = () => {
    // Para propósitos de testing en Sasori Labs, permitimos el bypass
    // Esto disparará la navegación, y App.tsx detectará si hay sesión o si estamos en "mock mode"
    // Pero por ahora, simplemente forzaremos la navegación
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-20">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all group"
        >
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar ao Inicio</span>
        </Link>
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 blur-3xl rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-8 rounded-3xl border border-white/5 relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-lg shadow-red-600/30">S</div>
            <span className="text-2xl font-black italic tracking-tighter uppercase">Sasori<span className="text-red-500">Labs</span></span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Admin Authentication</h2>
          <p className="text-zinc-500 mt-2 text-sm font-mono tracking-widest">SECURE_ACCESS_PORTAL_V4.0</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Identity</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="email" 
                placeholder="email@sasorilabs.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between ml-1">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Secret Key</label>
              <a href="#" className="text-[10px] text-red-500 uppercase tracking-widest font-bold hover:underline">Forgot Key?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Establish Connection'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <button 
            type="button"
            onClick={handleDevBypass}
            className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all mt-4 text-zinc-400 group"
          >
            <Zap className="w-4 h-4 text-red-500 group-hover:scale-125 transition-transform" />
            Dev Mode: Skip Authorization
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="h-[1px] flex-1 bg-white/5"></div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Alternatively</span>
            <div className="h-[1px] flex-1 bg-white/5"></div>
          </div>

          <button className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-white/5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all w-full justify-center">
            <Github className="w-5 h-5" />
            Connect via Github Organization
          </button>
        </div>

        <p className="mt-8 text-center text-[10px] text-zinc-600 font-mono tracking-widest">
          ENCRYPTED VIA AES-256-GCM. UNAUTHORIZED ACCESS ATTEMPS ARE LOGGED.
        </p>
      </motion.div>
    </div>
  );
}
