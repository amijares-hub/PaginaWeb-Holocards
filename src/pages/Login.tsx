import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User, Lock, ArrowRight, Github, Zap, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Redirigir al perfil o admin dependiendo del rol. Por defecto al perfil/admin
        navigate('/perfil');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created successfully. You can now establish connection.');
        setIsLogin(true);
      }
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-primary/10 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[500px] bg-red-900/5 blur-[150px] rounded-full"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-card backdrop-blur-3xl border border-border rounded-[2.5rem] p-10 shadow-2xl">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="relative">
                <Layers className="w-10 h-10 text-foreground transform -rotate-12 group-hover:rotate-0 transition-transform" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-sm shadow-lg shadow-primary/20" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase italic text-foreground">TCG <span className="text-muted-foreground">STORE</span></span>
            </Link>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2 italic">
              Acceso a la Bóveda
            </h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
              Autenticación Biométrica Requerida
            </p>
          </div>

          {/* Toggle Login / Register */}
          <div className="flex bg-black/50 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isLogin ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
            >
              LOGIN
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !isLogin ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
            >
              REGISTRO
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-red-500 text-xs font-bold text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-green-500/10 border border-green-500/50 p-3 rounded-lg text-green-500 text-xs font-bold text-center shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Identity</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="EMAIL ENTITY..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono transition-all text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Secret Key</label>
                {isLogin && (
                  <a href="#" className="text-[10px] text-red-500 uppercase tracking-widest font-bold hover:underline">Forgot Key?</a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="ACCESS CODE..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono transition-all text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 group"
            >
              {loading ? (isLogin ? 'Verifying...' : 'Initializing...') : (isLogin ? 'Establish Connection' : 'Initialize Entity')}
              {isLogin ? <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />}
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

          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest">
                <span className="bg-card px-4 text-muted-foreground">O accede con</span>
              </div>
            </div>

            <button className="flex items-center gap-3 px-6 py-3 bg-muted border border-border rounded-xl text-sm font-medium hover:bg-accent transition-all w-full justify-center text-foreground">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              <span>Identity Protocol: Google</span>
            </button>
          </div>

          <p className="mt-8 text-center text-[10px] text-zinc-600 font-mono tracking-widest">
            ENCRYPTED VIA AES-256-GCM. UNAUTHORIZED ACCESS ATTEMPTS ARE LOGGED.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
