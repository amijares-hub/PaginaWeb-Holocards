import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { User, Lock, ArrowRight, UserPlus, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

function getMinBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d.toISOString().split('T')[0];
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (authError) throw authError;

        if (data?.user) {
          const rawRedirect = searchParams.get('redirect') || '/';
          const safeRedirect = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//'))
            ? rawRedirect
            : '/';
          navigate(safeRedirect, { replace: true });
          return;
        }
      } else {
        // Validación 1: Coincidencia de contraseñas
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden. Por favor, verifícalas.');
          setLoading(false);
          return;
        }

        // Validación 2: Longitud mínima
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false);
          return;
        }

        // Validación 3: Fecha de nacimiento
        if (!birthDate) {
          setError('Debes indicar tu fecha de nacimiento para registrarte.');
          setLoading(false);
          return;
        }
        const maxDate = new Date(getMinBirthDate());
        const inputDate = new Date(birthDate);
        if (inputDate > maxDate) {
          setError('Debes tener al menos 16 años para crear una cuenta.');
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              birth_date: birthDate,
            }
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          await supabase.from('user_profiles').upsert({
            id: signUpData.user.id,
            full_name: fullName.trim(),
            birth_date: birthDate,
          }, { onConflict: 'id' });
        }

        setSuccess('Cuenta creada exitosamente. Ya puedes acceder.');
        setIsLogin(true);
        setFullName('');
        setBirthDate('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#09090b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#F3B91C]/50 focus:ring-1 focus:ring-[#F3B91C]/50 font-mono transition-all text-white placeholder:text-zinc-600";

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[500px] bg-red-900/5 blur-[150px] rounded-full pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-[#18181b] backdrop-blur-3xl border border-[#27272a] rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-10 flex flex-col items-center">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group transition-transform hover:scale-105">
              <img
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                alt="Holocards"
                className="h-14 object-contain"
              />
            </Link>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2 italic">
              Acceso a Perfil
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              Autenticación Requerida
            </p>
          </div>

          <div className="flex bg-[#09090b]/50 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isLogin ? "bg-[#F3B91C] text-black shadow-lg shadow-yellow-500/20" : "text-zinc-500 hover:text-white"
              )}
            >
              LOGIN
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !isLogin ? "bg-[#F3B91C] text-black shadow-lg shadow-yellow-500/20" : "text-zinc-500 hover:text-white"
              )}
            >
              REGISTRO
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
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

            {/* Nombre completo — solo en registro */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                    Nombre y Apellidos
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      required={!isLogin}
                      placeholder="Tu nombre completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <div className="flex justify-between ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Contraseña
                </label>
                {isLogin && (
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    ¿Olvidaste tu contraseña?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Tu contraseña..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Confirmar contraseña — solo en registro */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-zinc-500" />
                    </div>
                    <input
                      type="password"
                      required={!isLogin}
                      placeholder="Repite tu contraseña..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fecha de nacimiento — solo en registro */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
                    Fecha de Nacimiento
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <input
                      type="date"
                      required={!isLogin}
                      max={getMinBirthDate()}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className={cn(inputClass, "pl-10 text-white [color-scheme:dark]")}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 ml-1">Requerido por ley. Debes tener al menos 16 años.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[#F3B91C] text-black rounded-xl font-black flex items-center justify-center gap-2 hover:bg-[#F3B91C]/90 transition-all shadow-[0_0_20px_rgba(243,185,28,0.2)] disabled:opacity-50 group"
            >
              {loading ? (isLogin ? 'Accediendo...' : 'Registrando...') : (isLogin ? 'Accede' : 'Registrarse')}
              {isLogin ? <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}