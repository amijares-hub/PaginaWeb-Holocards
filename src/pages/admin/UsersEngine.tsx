import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Crosshair, Search, ShieldAlert, Zap, Gift, Activity, 
  ChevronRight, X, Shield, Lock, Star, AlertTriangle, Terminal,
  Database, RefreshCw, User, Hexagon, Package
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserProfileWithStats {
  id: string;
  email: string;
  level: number;
  exp: number;
  battle_pass_points: number;
  pokeballs: number;
  tier: string;
  total_spent: number;
  last_activity: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'level_up' | 'capture' | 'purchase' | 'system';
}

export default function UsersEngine() {
  const [users, setUsers] = useState<UserProfileWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfileWithStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileWithStats | null>(null);
  const [selectedUserVault, setSelectedUserVault] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [liveLogs, setLiveLogs] = useState<ActivityLog[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'whales' | 'dormant' | 'active_sub'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing State
  const [editLevel, setEditLevel] = useState(1);
  const [editExp, setEditExp] = useState(0);
  const [editTier, setEditTier] = useState('entrenador');
  const [editPokeballs, setEditPokeballs] = useState(0);
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);

  // Massive Gift State
  const [isConfirmingGift, setIsConfirmingGift] = useState(false);
  const [giftTier, setGiftTier] = useState('Entrenador');
  const [giftAmount, setGiftAmount] = useState(10);

  useEffect(() => {
    fetchUsers();
    setupLogsMock(); // Or real subscription
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filterType, searchQuery]);

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching profiles:', error);
      // Fallback to mock data if table doesn't exist or error occurs
      const mockData: UserProfileWithStats[] = [
        { id: 'usr-1', email: 'neo@matrix.com', level: 42, exp: 5000, battle_pass_points: 12000, pokeballs: 15, tier: 'Apex', total_spent: 1200, last_activity: new Date().toISOString() },
        { id: 'usr-2', email: 'trinity@matrix.com', level: 15, exp: 200, battle_pass_points: 500, pokeballs: 5, tier: 'Entrenador', total_spent: 45, last_activity: new Date(Date.now() - 8*24*60*60*1000).toISOString() },
        { id: 'usr-3', email: 'morpheus@matrix.com', level: 99, exp: 99999, battle_pass_points: 50000, pokeballs: 100, tier: 'Oracle', total_spent: 5500, last_activity: new Date().toISOString() },
      ];
      setUsers(mockData);
      return;
    }

    // Map profiles to our local interface
    const mappedUsers: UserProfileWithStats[] = (profiles || []).map(p => ({
      id: p.id,
      email: p.email || `user_${p.id.substring(0,5)}@holocard.io`, // Assuming email might be in auth but we use a fallback
      level: p.level || 1,
      exp: p.points || 0,
      battle_pass_points: p.points || 0,
      pokeballs: p.pokeballs || 0,
      tier: p.tier || 'Entrenador',
      total_spent: p.total_spent || 0,
      last_activity: p.updated_at || new Date().toISOString()
    }));

    setUsers(mappedUsers);
  };

  const fetchVault = async (userId: string) => {
    setVaultLoading(true);
    const { data, error } = await supabase
      .from('user_collection')
      .select('*')
      .eq('user_id', userId)
      .limit(10); // Limit for preview

    if (!error && data) {
      setSelectedUserVault(data);
    }
    setVaultLoading(false);
  };

  const setupLogsMock = () => {
    setLiveLogs([
      { id: '1', timestamp: new Date().toISOString(), message: 'System Initialized. Engine Online.', type: 'system' },
      { id: '2', timestamp: new Date(Date.now() - 60000).toISOString(), message: 'User trinity@matrix.com purchased 500 GD.', type: 'purchase' },
      { id: '3', timestamp: new Date(Date.now() - 120000).toISOString(), message: 'User neo@matrix.com reached Level 42.', type: 'level_up' },
    ]);
    
    // Simulate incoming logs
    setInterval(() => {
      setLiveLogs(prev => [
        { id: Math.random().toString(), timestamp: new Date().toISOString(), message: `Encrypted payload received from sector ${Math.floor(Math.random()*999)}`, type: 'system' },
        ...prev
      ].slice(0, 10));
    }, 15000);
  };

  const applyFilters = () => {
    let filtered = [...users];
    
    if (searchQuery) {
      filtered = filtered.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filterType === 'whales') {
      filtered = filtered.filter(u => u.total_spent >= 500);
    } else if (filterType === 'dormant') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(u => new Date(u.last_activity) < sevenDaysAgo);
    } else if (filterType === 'active_sub') {
      filtered = filtered.filter(u => u.tier.toLowerCase() !== 'entrenador');
    }

    setFilteredUsers(filtered);
  };

  const openGodConsole = (user: UserProfileWithStats) => {
    setSelectedUser(user);
    setEditLevel(user.level);
    setEditExp(user.exp);
    setEditTier(user.tier);
    setEditPokeballs(user.pokeballs);
    setIsConfirmingEdit(false);
    fetchVault(user.id);
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        level: editLevel, 
        points: editExp, 
        tier: editTier, 
        pokeballs: editPokeballs 
      })
      .eq('id', selectedUser.id);
    
    if (error) {
      console.error('Error saving edits:', error);
      alert('REWRITE FAILED: Access denied or network error.');
      return;
    }

    setUsers(users.map(u => u.id === selectedUser.id ? {
      ...u, 
      level: editLevel, 
      exp: editExp, 
      tier: editTier, 
      pokeballs: editPokeballs
    } : u));
    
    setIsConfirmingEdit(false);
    setSelectedUser(null);
    
    // Add log
    setLiveLogs(prev => [{
      id: Math.random().toString(), 
      timestamp: new Date().toISOString(), 
      message: `ADMIN OVERRIDE: Profile ${selectedUser.email} rewritten in the mainframe.`, 
      type: 'system'
    }, ...prev]);
  };

  const executeMassiveGift = async () => {
    setIsConfirmingGift(false);
    
    // Attempting a bulk update via RPC (requires setting up this function in Supabase)
    const { error } = await supabase.rpc('gift_pokeballs_to_tier', { 
      target_tier: giftTier, 
      amount: giftAmount 
    });

    if (error) {
      console.error('Massive gift error:', error);
      // Fallback: notify that RPC is needed or manual update required
      setLiveLogs(prev => [{
        id: Math.random().toString(), 
        timestamp: new Date().toISOString(), 
        message: `ERROR: Massive Airdrop requires RPC 'gift_pokeballs_to_tier' to be defined.`, 
        type: 'system'
      }, ...prev]);
      return;
    }

    setLiveLogs(prev => [{
      id: Math.random().toString(), 
      timestamp: new Date().toISOString(), 
      message: `MASSIVE AIRDROP: ${giftAmount} HoloBalls successfully injected into all ${giftTier} accounts.`, 
      type: 'system'
    }, ...prev]);
    
    fetchUsers(); // Refresh data
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase flex items-center gap-3">
            <Database className="w-8 h-8 text-cyan-400" />
            Users Engine
          </h1>
          <p className="text-zinc-500 font-mono text-sm mt-1 uppercase tracking-widest">Global Mainframe Access // God Mode</p>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total LTV Revenue</p>
            <p className="text-3xl font-black text-white">$6,745.00</p>
            <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 w-[70%]"></div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Active Whales</p>
            <p className="text-3xl font-black text-white">12</p>
            <p className="text-[10px] text-red-400 font-mono mt-2">Users {'>'} $500 Spent</p>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-screen"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Battle Pass Global</p>
              <p className="text-xl font-black text-white">Season 4: Cyber Dawn</p>
            </div>
            <button className="px-4 py-2 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset Season
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* DATA GRID & FILTERS (Col Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2">
              {(['all', 'whales', 'dormant', 'active_sub'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    filterType === type 
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                      : "bg-black/50 text-zinc-500 border border-white/5 hover:text-white"
                  )}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search Email / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none w-full sm:w-64"
              />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-black/50 border-b border-white/5 text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="p-4 font-bold">Operative</th>
                  <th className="p-4 font-bold text-center">Level / Tier</th>
                  <th className="p-4 font-bold text-center">LTV</th>
                  <th className="p-4 font-bold text-center">HoloBalls</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-900 to-black border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                          <User className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{user.email}</p>
                          <p className="text-[10px] font-mono text-zinc-500">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-sm font-bold text-white">Lvl {user.level}</p>
                      <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">{user.tier}</p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-sm font-bold text-green-400">${user.total_spent}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                        <Hexagon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-black text-cyan-400">{user.pokeballs}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openGodConsole(user)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 text-zinc-400 transition-colors inline-flex items-center justify-center"
                        title="Edit User"
                      >
                        <Crosshair className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGS & MASSIVE ACTIONS */}
        <div className="space-y-6">
          
          {/* MATRIX LOGS FEED */}
          <div className="bg-[#050505] border border-green-500/20 rounded-2xl p-6 relative overflow-hidden h-[400px] flex flex-col">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-4 border-b border-green-500/20 pb-4">
              <Terminal className="w-5 h-5 text-green-500" />
              <h3 className="text-xs font-bold text-green-500 uppercase tracking-[0.2em] animate-pulse">System Matrix Feed</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] custom-scrollbar pr-2">
              {liveLogs.map(log => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-green-700 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={cn(
                    "flex-1 break-words",
                    log.type === 'system' ? "text-green-400" :
                    log.type === 'purchase' ? "text-yellow-400" :
                    log.type === 'level_up' ? "text-cyan-400" : "text-zinc-400"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* GIFT SPAWNER */}
          <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Gift className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Massive Gift Spawner</h3>
                <p className="text-[10px] text-zinc-500 font-mono">Airdrop resources globally</p>
              </div>
            </div>

            {isConfirmingGift ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> WARNING
                  </p>
                  <p className="text-[10px] text-zinc-400">Sending {giftAmount} HoloBalls to ALL "{giftTier}" users. This database operation cannot be undone.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsConfirmingGift(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white uppercase">Cancel</button>
                  <button onClick={executeMassiveGift} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(220,38,38,0.4)]">Execute</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Target Tier</label>
                    <select value={giftTier} onChange={e => setGiftTier(e.target.value)} className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white outline-none" title="Target Tier">
                      <option value="Entrenador">Entrenador</option>
                      <option value="Elite">Elite</option>
                      <option value="Apex">Apex</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Amount</label>
                    <input type="number" value={giftAmount} onChange={e => setGiftAmount(parseInt(e.target.value) || 0)} className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white outline-none" title="Amount" placeholder="Amount" />
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfirmingGift(true)}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all"
                >
                  Prepare Airdrop
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* GOD CONSOLE SLIDE-OVER */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#09090b] border-l border-white/10 z-[110] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <Crosshair className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">God Console</h2>
                    <p className="text-[10px] font-mono text-zinc-500">Target: {selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Hot Editor */}
                <section>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Parameter Override
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Level</label>
                      <input type="number" value={editLevel} onChange={e => setEditLevel(parseInt(e.target.value) || 1)} className="w-full mt-1 bg-black border border-white/10 rounded-lg p-3 text-lg font-black text-cyan-400 text-center outline-none focus:border-cyan-500" title="Level" placeholder="Level" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Experience</label>
                      <input type="number" value={editExp} onChange={e => setEditExp(parseInt(e.target.value) || 0)} className="w-full mt-1 bg-black border border-white/10 rounded-lg p-3 text-lg font-black text-white text-center outline-none" title="Experience" placeholder="Experience" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase">Subscription Tier</label>
                    <select value={editTier} onChange={e => setEditTier(e.target.value)} className="w-full mt-1 bg-black border border-white/10 rounded-lg p-3 text-sm font-bold text-white uppercase outline-none focus:border-cyan-500" title="Subscription Tier">
                      <option value="Entrenador">Entrenador</option>
                      <option value="Elite">Elite</option>
                      <option value="Apex">Apex</option>
                    </select>
                  </div>
                </section>

                {/* Inventory Manager */}
                <section>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Inventory Injection
                  </h3>
                  
                  <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Hexagon className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">HoloBalls</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Current Balance</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-white/5">
                      <button onClick={() => setEditPokeballs(Math.max(0, editPokeballs - 1))} className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="Decrease">-</button>
                      <span className="w-8 text-center font-black text-lg text-white">{editPokeballs}</span>
                      <button onClick={() => setEditPokeballs(editPokeballs + 1)} className="w-8 h-8 flex items-center justify-center bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors" title="Increase">+</button>
                    </div>
                  </div>
                </section>
                
                {/* Vault Preview */}
                <section>
                   <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Collection Vault
                  </h3>
                  
                  {vaultLoading ? (
                    <div className="p-8 border border-white/5 rounded-xl text-center bg-black/20 animate-pulse">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">Accessing Datastream...</p>
                    </div>
                  ) : selectedUserVault.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                      {selectedUserVault.map((card, i) => (
                        <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-md border border-white/5 overflow-hidden group relative cursor-help" title={card.card_name}>
                          <img 
                            src={card.image_url || '/Imagenes/card-back.png'} 
                            alt={card.card_name}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1">
                            <p className="text-[8px] font-bold text-white truncate">{card.card_name}</p>
                          </div>
                        </div>
                      ))}
                      {selectedUserVault.length >= 10 && (
                        <div className="aspect-[2/3] bg-zinc-950 rounded-md border border-white/5 flex items-center justify-center">
                          <p className="text-[8px] text-zinc-600 font-bold">+{selectedUserVault.length - 10} MORE</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-white/10 rounded-xl text-center bg-black/20">
                      <Package className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Vault Empty</p>
                      <p className="text-[10px] text-zinc-700">No entities detected in this sector.</p>
                    </div>
                  )}
                </section>

              </div>

              {/* Console Footer */}
              <div className="p-6 border-t border-white/10 bg-black/60 backdrop-blur-md">
                {isConfirmingEdit ? (
                  <div className="space-y-3 animate-in fade-in zoom-in duration-200">
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-xs font-bold text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> CONFIRM OVERRIDE
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsConfirmingEdit(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white uppercase tracking-widest transition-colors">Cancel</button>
                      <button onClick={saveUserEdits} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors">Execute</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsConfirmingEdit(true)}
                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Initialize Rewrite
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
