import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck, Smartphone, MapPin, Globe, Mail, Lock, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
    address_country: ''
  });

  useEffect(() => {
    checkAuthAndFetchProfile();
  }, []);

  const checkAuthAndFetchProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/login');
      return;
    }
    
    setSession(session);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('phone, address_street, address_city, address_zip, address_country')
      .eq('id', session.user.id)
      .single();

    if (!error && data) {
      setFormData({
        phone: data.phone || '',
        address_street: data.address_street || '',
        address_city: data.address_city || '',
        address_zip: data.address_zip || '',
        address_country: data.address_country || ''
      });
    }
    
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    setSaving(true);

    // 1. Check current profile state for rewards eligibility
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('phone, address_street, points, pokeballs')
      .eq('id', session.user.id)
      .single();

    const isFirstCompletion = !currentProfile?.phone && !currentProfile?.address_street && formData.phone && formData.address_street;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...formData,
        points: isFirstCompletion ? (currentProfile?.points || 0) + 250 : currentProfile?.points,
        pokeballs: isFirstCompletion ? (currentProfile?.pokeballs || 0) + 5 : currentProfile?.pokeballs,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (error) {
      alert('UPDATE FAILED: Protocol breach detected or network unstable.');
    } else {
      if (isFirstCompletion) {
        await supabase.from('user_notifications').insert({
          user_id: session.user.id,
          message: 'PROTOCOL SYNC: +250 EXP & 5 Pokéballs awarded for Identity Matrix completion.',
          type: 'gift',
          read: false
        });
        alert('MISSION COMPLETE: +250 EXP & 5 Pokéballs awarded for Identity Synchronization!');
      }
      setTimeout(() => navigate('/perfil'), 500);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 overflow-x-hidden pb-24 font-sans">
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-900/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full"></div>
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#030303]/60 backdrop-blur-2xl">
        <div className="max-w-[800px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            to="/perfil" 
            title="Volver al Nexus (Perfil)"
            className="flex items-center gap-3 text-zinc-400 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Return to Nexus</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Secure Link Established</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-[800px] mx-auto px-6 mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2">Identity Matrix</h1>
            <p className="text-sm text-zinc-500 font-mono">Manage your personal node parameters and logistics data.</p>
          </header>

          <form onSubmit={handleSave} className="space-y-10">
            
            {/* Account Sector */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Lock className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Security Credentials</h2>
              </div>
              
              <div className="space-y-4">
                <div className="group space-y-2">
                  <label htmlFor="profile-email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Electronic Mail
                  </label>
                  <div className="relative">
                    <input 
                      id="profile-email"
                      type="text" 
                      title="Correo electrónico (No editable)"
                      value={session?.user?.email} 
                      readOnly 
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono text-zinc-500 cursor-not-allowed outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-black text-red-500 uppercase tracking-widest">
                      Immutable
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Sector */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Communications Link</h2>
              </div>

              <div className="group space-y-2">
                <label htmlFor="profile-phone" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Smartphone className="w-3 h-3" /> Phone Number
                </label>
                <input 
                  id="profile-phone"
                  type="text" 
                  title="Número de teléfono"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-black border border-white/10 focus:border-cyan-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                />
              </div>
            </section>

            {/* Logistics Sector */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <MapPin className="w-5 h-5 text-yellow-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Logistics & Supply Node</h2>
              </div>

              <div className="space-y-6">
                <div className="group space-y-2">
                  <label htmlFor="profile-street" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Physical Address / Street</label>
                  <input 
                    id="profile-street"
                    type="text" 
                    title="Calle / Dirección"
                    value={formData.address_street}
                    onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                    placeholder="Enter full address details..."
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="group space-y-2">
                    <label htmlFor="profile-city" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">City / Sector</label>
                    <input 
                      id="profile-city"
                      type="text" 
                      title="Ciudad / Sector"
                      value={formData.address_city}
                      onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                      placeholder="Neo-Tokyo"
                      className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                    />
                  </div>
                  <div className="group space-y-2">
                    <label htmlFor="profile-zip" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Postal Code</label>
                    <input 
                      id="profile-zip"
                      type="text" 
                      title="Código Postal"
                      value={formData.address_zip}
                      onChange={e => setFormData({ ...formData, address_zip: e.target.value })}
                      placeholder="00000"
                      className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="group space-y-2">
                  <label htmlFor="profile-country" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Sovereign Territory (Country)
                  </label>
                  <input 
                    id="profile-country"
                    type="text" 
                    title="País"
                    value={formData.address_country}
                    onChange={e => setFormData({ ...formData, address_country: e.target.value })}
                    placeholder="United Earth"
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 rounded-2xl px-5 py-4 text-sm font-mono text-white transition-all outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="pt-8 border-t border-white/5 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono uppercase tracking-widest italic">
                <ShieldCheck className="w-4 h-4 text-green-500/40" />
                Data encrypted with AES-256 standard.
              </div>
              
              <button
                type="submit"
                disabled={saving}
                title="Guardar cambios de identidad"
                aria-label="Guardar cambios"
                className={cn(
                  "flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all",
                  saving 
                    ? "bg-zinc-800 text-zinc-500 cursor-wait" 
                    : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]"
                )}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Commit Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
