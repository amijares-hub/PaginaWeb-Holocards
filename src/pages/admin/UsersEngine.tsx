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
  captured_count: number;
  shadow_notes?: string;
  is_at_risk?: boolean;
  archetype?: 'Whale' | 'Hunter' | 'Collector' | 'Newbie' | 'Sniper';
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
  const [editShadowNotes, setEditShadowNotes] = useState('');
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);

  // God Console State
  const [activeConsoleTab, setActiveConsoleTab] = useState<'mainframe' | 'identity' | 'transactions'>('mainframe');
  const [editPhone, setEditPhone] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Ultimate Gift Spawner (Airdrop Pro) State
  const [isConfirmingGift, setIsConfirmingGift] = useState(false);
  const [giftTier, setGiftTier] = useState('All');
  const [giftResourceType, setGiftResourceType] = useState<'exp' | 'pokeballs' | 'bp' | 'sku'>('pokeballs');
  const [giftAmount, setGiftAmount] = useState(10);
  const [giftSKU, setGiftSKU] = useState('');
  const [giftMinLevel, setGiftMinLevel] = useState(0);
  const [giftMaxLevel, setGiftMaxLevel] = useState(100);
  const [giftMinLTV, setGiftMinLTV] = useState(0);
  const [giftInactivity, setGiftInactivity] = useState(0);
  const [giftMessage, setGiftMessage] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);

  useEffect(() => {
    fetchUsers();
    setupLogsMock();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filterType, searchQuery]);

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*');

    // Enhanced Mock Data for testing if DB is empty or errors
    if (error || !profiles || profiles.length === 0) {
      if (error) console.error('Error fetching profiles:', error);
      
      const mockData: UserProfileWithStats[] = [
        { id: 'usr-1', email: 'neo@sasorilabs.io', level: 42, exp: 5000, battle_pass_points: 12000, pokeballs: 15, tier: 'Apex', total_spent: 1200, last_activity: new Date().toISOString(), captured_count: 85, archetype: 'Whale' },
        { id: 'usr-2', email: 'trinity@matrix.net', level: 15, exp: 200, battle_pass_points: 500, pokeballs: 5, tier: 'Entrenador', total_spent: 45, last_activity: new Date(Date.now() - 12*24*60*60*1000).toISOString(), captured_count: 12, archetype: 'Newbie', is_at_risk: true },
        { id: 'usr-3', email: 'morpheus@zion.com', level: 99, exp: 99999, battle_pass_points: 50000, pokeballs: 100, tier: 'Oracle', total_spent: 5500, last_activity: new Date().toISOString(), captured_count: 150, archetype: 'Whale' },
        { id: 'usr-4', email: 'smith@agents.io', level: 30, exp: 4500, battle_pass_points: 8000, pokeballs: 0, tier: 'Legend', total_spent: 850, last_activity: new Date(Date.now() - 2*24*60*60*1000).toISOString(), captured_count: 5, archetype: 'Sniper' },
        { id: 'usr-5', email: 'ash.k@pallet.town', level: 5, exp: 400, battle_pass_points: 100, pokeballs: 50, tier: 'Entrenador', total_spent: 20, last_activity: new Date().toISOString(), captured_count: 65, archetype: 'Collector' },
        { id: 'usr-6', email: 'misty@cerulean.gym', level: 22, exp: 2200, battle_pass_points: 3000, pokeballs: 12, tier: 'Elite', total_spent: 150, last_activity: new Date(Date.now() - 5*24*60*60*1000).toISOString(), captured_count: 35, archetype: 'Hunter' },
        { id: 'usr-7', email: 'brock@pewter.city', level: 18, exp: 1800, battle_pass_points: 2500, pokeballs: 8, tier: 'Entrenador', total_spent: 0, last_activity: new Date(Date.now() - 15*24*60*60*1000).toISOString(), captured_count: 42, archetype: 'Hunter', is_at_risk: true },
        { id: 'usr-8', email: 'cypher@traitor.net', level: 12, exp: 1000, battle_pass_points: 800, pokeballs: 3, tier: 'Entrenador', total_spent: 600, last_activity: new Date().toISOString(), captured_count: 2, archetype: 'Whale' },
        { id: 'usr-9', email: 'niobe@logos.com', level: 35, exp: 3500, battle_pass_points: 4000, pokeballs: 25, tier: 'Apex', total_spent: 450, last_activity: new Date().toISOString(), captured_count: 55, archetype: 'Collector' },
        { id: 'usr-10', email: 'seraph@guardian.org', level: 80, exp: 8000, battle_pass_points: 12000, pokeballs: 40, tier: 'Oracle', total_spent: 0, last_activity: new Date(Date.now() - 1*24*60*60*1000).toISOString(), captured_count: 90, archetype: 'Collector' },
        { id: 'usr-11', email: 'v.valet@cyber.com', level: 2, exp: 50, battle_pass_points: 0, pokeballs: 10, tier: 'Entrenador', total_spent: 5, last_activity: new Date(Date.now() - 20*24*60*60*1000).toISOString(), captured_count: 1, archetype: 'Newbie', is_at_risk: true },
        { id: 'usr-12', email: 'ghost@nautilus.io', level: 28, exp: 2800, battle_pass_points: 3500, pokeballs: 14, tier: 'Legend', total_spent: 220, last_activity: new Date().toISOString(), captured_count: 28, archetype: 'Hunter' },
        { id: 'usr-13', email: 'switch@white.room', level: 14, exp: 1400, battle_pass_points: 1200, pokeballs: 6, tier: 'Entrenador', total_spent: 95, last_activity: new Date(Date.now() - 8*24*60*60*1000).toISOString(), captured_count: 15, archetype: 'Sniper', is_at_risk: true },
        { id: 'usr-14', email: 'dozer@zion.net', level: 25, exp: 2500, battle_pass_points: 3200, pokeballs: 20, tier: 'Elite', total_spent: 180, last_activity: new Date().toISOString(), captured_count: 31, archetype: 'Hunter' },
        { id: 'usr-15', email: 'apoc@matrix.run', level: 19, exp: 1900, battle_pass_points: 2100, pokeballs: 9, tier: 'Entrenador', total_spent: 40, last_activity: new Date(Date.now() - 6*24*60*60*1000).toISOString(), captured_count: 18, archetype: 'Sniper' },
        { id: 'usr-16', email: 'mouse@red-dress.com', level: 4, exp: 350, battle_pass_points: 200, pokeballs: 5, tier: 'Entrenador', total_spent: 0, last_activity: new Date().toISOString(), captured_count: 3, archetype: 'Newbie' },
        { id: 'usr-17', email: 'tank@ Zion.net', level: 33, exp: 3300, battle_pass_points: 4200, pokeballs: 30, tier: 'Apex', total_spent: 310, last_activity: new Date(Date.now() - 3*24*60*60*1000).toISOString(), captured_count: 48, archetype: 'Hunter' },
        { id: 'usr-18', email: 'persephone@chateau.net', level: 50, exp: 5000, battle_pass_points: 7000, pokeballs: 15, tier: 'Legend', total_spent: 2500, last_activity: new Date().toISOString(), captured_count: 12, archetype: 'Whale' },
        { id: 'usr-19', email: 'merovingian@chateau.net', level: 88, exp: 8800, battle_pass_points: 15000, pokeballs: 60, tier: 'Oracle', total_spent: 4200, last_activity: new Date().toISOString(), captured_count: 22, archetype: 'Whale' },
        { id: 'usr-20', email: 'keymaker@hallway.io', level: 10, exp: 1000, battle_pass_points: 500, pokeballs: 100, tier: 'Entrenador', total_spent: 15, last_activity: new Date(Date.now() - 11*24*60*60*1000).toISOString(), captured_count: 5, archetype: 'Newbie', is_at_risk: true },
      ];
      setUsers(mockData);
      return;
    }

    // Map profiles to our local interface
    const mappedUsers: UserProfileWithStats[] = (profiles || []).map(p => {
      const lastActivityDate = new Date(p.updated_at || Date.now());
      const daysSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // CRM Logic: Predictive Churn (At Risk)
      // High frequency users (Whales/Tiered) are at risk if inactive > 7 days
      const isAtRisk = daysSinceActivity > 10 || (p.tier !== 'Entrenador' && daysSinceActivity > 7);

      // Archetype Logic
      let archetype: any = 'Newbie';
      if (p.total_spent > 500) archetype = 'Whale';
      else if (p.captured_count > 50) archetype = 'Collector';
      else if (p.captured_count > 20) archetype = 'Hunter';
      else if (p.total_spent > 0 && p.level > 10) archetype = 'Sniper';

      return {
        id: p.id,
        email: p.email || `user_${p.id.substring(0,5)}@holocard.io`,
        level: p.level || 1,
        exp: p.points || 0,
        battle_pass_points: p.points || 0,
        pokeballs: p.pokeballs || 0,
        tier: p.tier || 'Entrenador',
        total_spent: p.total_spent || 0,
        last_activity: lastActivityDate.toISOString(),
        captured_count: p.captured_count || 0,
        shadow_notes: p.shadow_notes || '',
        is_at_risk: isAtRisk,
        archetype: archetype
      };
    });

    setUsers(mappedUsers);
  };

  const exportAudiences = () => {
    const headers = ['Email', 'Level', 'Tier', 'Total Spent', 'Archetype', 'Last Activity'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => [
        u.email,
        u.level,
        u.tier,
        u.total_spent,
        u.archetype,
        u.last_activity
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `holocard_audience_${filterType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setLiveLogs(prev => [{
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      message: `DATA EXPORT: ${filteredUsers.length} profiles exported for ad campaign.`,
      type: 'system'
    }, ...prev]);
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
      filtered = filtered.filter(u => u.is_at_risk);
    } else if (filterType === 'active_sub') {
      filtered = filtered.filter(u => u.tier.toLowerCase() !== 'entrenador');
    }

    setFilteredUsers(filtered);
  };

  const fetchUserOrders = async (userId: string) => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUserOrders(data);
    }
    setOrdersLoading(false);
  };

  useEffect(() => {
    if (selectedUser) {
      setEditLevel(selectedUser.level);
      setEditExp(selectedUser.exp);
      setEditTier(selectedUser.tier);
      setEditPokeballs(selectedUser.pokeballs);
      setEditShadowNotes(selectedUser.shadow_notes || '');
      setEditPhone(selectedUser.phone || '');
      setEditStreet(selectedUser.address_street || '');
      setEditCity(selectedUser.address_city || '');
      setEditZip(selectedUser.address_zip || '');
      setEditCountry(selectedUser.address_country || '');
      fetchVault(selectedUser.id);
      fetchUserOrders(selectedUser.id);
      setActiveConsoleTab('mainframe');
    }
  }, [selectedUser]);

  const saveUserEdits = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        level: editLevel,
        points: editExp,
        tier: editTier,
        pokeballs: editPokeballs,
        shadow_notes: editShadowNotes,
        phone: editPhone,
        address_street: editStreet,
        address_city: editCity,
        address_zip: editZip,
        address_country: editCountry
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
      pokeballs: editPokeballs,
      shadow_notes: editShadowNotes,
      phone: editPhone,
      address_street: editStreet,
      address_city: editCity,
      address_zip: editZip,
      address_country: editCountry
    } : u));
    
    setIsConfirmingEdit(false);
    setSelectedUser(null);
    
    // Add log
    setLiveLogs(prev => [{
      id: Math.random().toString(), 
      timestamp: new Date().toISOString(), 
      message: `ADMIN OVERRIDE: Profile ${selectedUser.email} rewritten in the mainframe. Nodes synced.`, 
      type: 'system'
    }, ...prev]);
  };

  const calculateAirdropImpact = () => {
    return users.filter(u => {
      const matchesTier = giftTier === 'All' || u.tier === giftTier;
      const matchesLevel = u.level >= giftMinLevel && u.level <= giftMaxLevel;
      const matchesLTV = u.total_spent >= giftMinLTV;
      
      const lastActivityDate = new Date(u.last_activity);
      const daysInactive = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
      const matchesInactivity = daysInactive >= giftInactivity;

      return matchesTier && matchesLevel && matchesLTV && matchesInactivity;
    });
  };

  const executeMassiveGift = async () => {
    const targets = calculateAirdropImpact();
    if (targets.length === 0) return;

    setIsDeploying(true);
    setDeployProgress(0);
    
    // Safety Log
    setLiveLogs(prev => [{
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      message: `INITIATING GLOBAL AIRDROP: Target Count ${targets.length}. Resource: ${giftResourceType.toUpperCase()}. Payload authorized.`,
      type: 'system'
    }, ...prev]);

    // Batching Simulation & Execution
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      
      const updateData: any = {};
      if (giftResourceType === 'exp') updateData.points = target.exp + giftAmount;
      if (giftResourceType === 'pokeballs') updateData.pokeballs = target.pokeballs + giftAmount;
      if (giftResourceType === 'bp') updateData.points = (target.battle_pass_points || 0) + giftAmount;

      await supabase.from('user_profiles').update(updateData).eq('id', target.id);
      
      if (giftMessage) {
        // Notification engine logic (placeholder if table missing)
        await supabase.from('user_notifications').insert({
          user_id: target.id,
          message: giftMessage,
          type: 'gift',
          read: false
        }).select();
      }

      setDeployProgress(Math.round(((i + 1) / targets.length) * 100));
      if (targets.length < 50) await new Promise(r => setTimeout(r, 50));
    }

    await fetchUsers();
    setIsDeploying(false);
    setIsConfirmingGift(false);
    setLiveLogs(prev => [{
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      message: `AIRDROP COMPLETE: ${targets.length} nodes updated. Broadcast finalized.`,
      type: 'system'
    }, ...prev]);
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
            <button 
              title="Reiniciar Temporada de Battle Pass"
              aria-label="Reiniciar Temporada"
              className="px-4 py-2 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
            >
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
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-white/5">
              {(['all', 'whales', 'dormant', 'active_sub'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === t ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            
            <button 
              onClick={exportAudiences}
              title="Exportar audiencia a CSV"
              aria-label="Exportar audiencia"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Database className="w-4 h-4" />
              Export Audience
            </button>
          </div>
            <div className="relative">
              <label htmlFor="user-search" className="sr-only">Search Users</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                id="user-search"
                type="text" 
                title="Buscar usuarios por Email o ID"
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
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={cn(
                      "group border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer",
                      user.is_at_risk && "bg-red-900/10 animate-pulse-slow border-l-2 border-l-red-600"
                    )}
                    onClick={() => openGodConsole(user)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-900 to-black border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                          <User className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-red-500 transition-colors">
                            {user.email}
                            {user.is_at_risk && <span className="ml-2 text-[8px] text-red-500 uppercase tracking-tighter animate-pulse">⚠️ AT RISK</span>}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-500">ID: {user.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <p className="text-sm font-bold text-white">Lvl {user.level}</p>
                        <div className="flex gap-1">
                          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest px-1.5 py-0.5 bg-yellow-500/10 rounded border border-yellow-500/20">{user.tier}</span>
                          {user.archetype === 'Whale' && <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-black flex items-center gap-1"><Star className="w-2 h-2" /> Whale</span>}
                          {user.archetype === 'Collector' && <span className="px-1.5 py-0.5 rounded bg-cyan-600 text-white text-[8px] font-black">Collector</span>}
                          {user.archetype === 'Hunter' && <span className="px-1.5 py-0.5 rounded bg-green-600 text-white text-[8px] font-black">Hunter</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-sm font-bold text-green-400">${user.total_spent.toLocaleString()}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                        <Hexagon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-black text-cyan-400">{user.pokeballs}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => quickAirdrop(user)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-cyan-600/20 text-zinc-500 hover:text-cyan-400 transition-all border border-white/5"
                          title="Quick Re-engage Airdrop"
                          aria-label="Quick Airdrop"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openGodConsole(user)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-600/20 hover:text-red-500 text-zinc-400 transition-colors inline-flex items-center justify-center border border-white/5"
                          title="Open God Console"
                          aria-label="Open God Console"
                        >
                          <Crosshair className="w-5 h-5" />
                        </button>
                      </div>
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

          {/* ULTIMATE GIFT SPAWNER (AIRDROP PRO) */}
          <div className="bg-[#09090b] border border-yellow-500/30 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-yellow-500/10 transition-all"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <Gift className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Airdrop Pro</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">Precision supply deployment</p>
                </div>
              </div>
              <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                <span className="text-[10px] font-black text-yellow-500 animate-pulse uppercase">Tactical Mode</span>
              </div>
            </div>

            {isDeploying ? (
              <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Deploying Payload...</p>
                  <span className="text-sm font-mono text-yellow-500">{deployProgress}%</span>
                </div>
                <div className="h-3 bg-zinc-900 rounded-full border border-white/5 overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${deployProgress}%` }}
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]" 
                  />
                </div>
                <div className="flex justify-center">
                  <Activity className="w-8 h-8 text-yellow-500/30 animate-spin" />
                </div>
              </div>
            ) : isConfirmingGift ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-red-500">
                    <ShieldAlert className="w-5 h-5" />
                    <p className="text-xs font-black uppercase tracking-widest">Critical Confirmation</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-zinc-300">
                      You are about to deploy <span className="text-yellow-500 font-bold">{giftAmount} {giftResourceType.toUpperCase()}</span> to 
                      <span className="text-white font-bold"> {calculateAirdropImpact().length} users</span> matching your filters.
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono italic">Signature: AUTH_SIG_GIFT_{Math.random().toString(36).substring(7).toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative h-14 w-full bg-zinc-900/50 rounded-xl border border-white/10 overflow-hidden group/btn">
                    <div 
                      className="absolute inset-0 bg-red-600/30 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                    <button 
                      onMouseDown={() => {
                        const start = Date.now();
                        const timer = setInterval(() => {
                          const elapsed = Date.now() - start;
                          const progress = Math.min((elapsed / 3000) * 100, 100);
                          setHoldProgress(progress);
                          if (progress >= 100) {
                            clearInterval(timer);
                            executeMassiveGift();
                          }
                        }, 30);
                        const stopHold = () => {
                          clearInterval(timer);
                          if (holdProgress < 100) setHoldProgress(0);
                          window.removeEventListener('mouseup', stopHold);
                        };
                        window.addEventListener('mouseup', stopHold);
                      }}
                      className="absolute inset-0 w-full h-full text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      {holdProgress > 0 ? `HOLDING (${Math.ceil(3 - (holdProgress*3/100))}s)` : "Hold 3s to Deploy"}
                    </button>
                  </div>
                  <button onClick={() => setIsConfirmingGift(false)} className="w-full py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">Abort Mission</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Advanced Segmentation */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Users className="w-3 h-3" /> Targeted Population
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-zinc-600 uppercase">Tier</label>
                      <select value={giftTier} onChange={e => setGiftTier(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-bold text-white outline-none focus:border-yellow-500" title="Tier">
                        <option value="All">All Tiers</option>
                        <option value="Entrenador">Entrenador</option>
                        <option value="Elite">Elite</option>
                        <option value="Apex">Apex</option>
                        <option value="Legend">Legend</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-zinc-600 uppercase">Inactivity (Days+)</label>
                      <input type="number" value={giftInactivity} onChange={e => setGiftInactivity(parseInt(e.target.value) || 0)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-yellow-500" title="Inactivity" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-zinc-600 uppercase">Level Range</label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={giftMinLevel} onChange={e => setGiftMinLevel(parseInt(e.target.value) || 0)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white text-center" title="Min Level" />
                        <span className="text-zinc-600">-</span>
                        <input type="number" value={giftMaxLevel} onChange={e => setGiftMaxLevel(parseInt(e.target.value) || 100)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white text-center" title="Max Level" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono text-zinc-600 uppercase">Min LTV ($)</label>
                      <input type="number" value={giftMinLTV} onChange={e => setGiftMinLTV(parseInt(e.target.value) || 0)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-yellow-500" title="Min LTV" />
                    </div>
                  </div>
                </div>

                {/* Resource Injection */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Package className="w-3 h-3" /> Supply Configuration
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={giftResourceType} onChange={e => setGiftResourceType(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-bold text-white outline-none focus:border-yellow-500" title="Resource Type">
                      <option value="exp">Experience (EXP)</option>
                      <option value="pokeballs">HoloBalls</option>
                      <option value="bp">BP Points</option>
                      <option value="sku">Custom SKU</option>
                    </select>
                    <input type="number" value={giftAmount} onChange={e => setGiftAmount(parseInt(e.target.value) || 0)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-yellow-500" title="Amount" placeholder="Amount" />
                  </div>
                  {giftResourceType === 'sku' && (
                    <input type="text" value={giftSKU} onChange={e => setGiftSKU(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-yellow-500" placeholder="ENTER PRODUCT SKU..." title="Product SKU" />
                  )}
                </div>

                {/* Broadcast Engine */}
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-zinc-600 uppercase">Custom Broadcast Message</label>
                  <textarea 
                    value={giftMessage}
                    title="Mensaje de difusión"
                    onChange={e => setGiftMessage(e.target.value)}
                    placeholder="Subject: A gift from Sasori Labs..."
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] text-zinc-300 outline-none focus:border-yellow-500 h-16 resize-none"
                  />
                </div>

                {/* Impact Simulation */}
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-yellow-500 animate-spin-slow" />
                    <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Simulator Result</span>
                  </div>
                  <span className="text-xs font-black text-white">{calculateAirdropImpact().length} Targets</span>
                </div>

                <button 
                  onClick={() => setIsConfirmingGift(true)}
                  disabled={calculateAirdropImpact().length === 0}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Launch Airdrop
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
                <button onClick={() => setSelectedUser(null)} className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full" title="Close" aria-label="Cerrar consola">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-white/5 bg-black/20">
                {[
                  { id: 'mainframe', label: 'Mainframe', icon: Activity },
                  { id: 'identity', label: 'Identity', icon: Shield },
                  { id: 'transactions', label: 'Logs', icon: History }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveConsoleTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
                      activeConsoleTab === tab.id ? "text-cyan-400 bg-cyan-400/5" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {activeConsoleTab === tab.id && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {activeConsoleTab === 'mainframe' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Hot Editor */}
                    <section className="space-y-6">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
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

                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase">Subscription Tier</label>
                        <select value={editTier} onChange={e => setEditTier(e.target.value)} className="w-full mt-1 bg-black border border-white/10 rounded-lg p-3 text-sm font-bold text-white uppercase outline-none focus:border-cyan-500" title="Subscription Tier">
                          <option value="Entrenador">Entrenador</option>
                          <option value="Elite">Elite</option>
                          <option value="Apex">Apex</option>
                          <option value="Legend">Legend</option>
                        </select>
                      </div>

                      {/* Shadow Notes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase">Shadow Notes (Admin Only)</label>
                          <span className="text-[8px] text-red-500 animate-pulse font-bold">ENCRYPTED</span>
                        </div>
                        <textarea 
                          value={editShadowNotes}
                          onChange={(e) => setEditShadowNotes(e.target.value)}
                          placeholder="Enter private observations about this subject..."
                          className="w-full h-24 bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-medium text-zinc-300 focus:outline-none focus:border-red-600 resize-none custom-scrollbar"
                        />
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 border border-dashed border-white/10 rounded-xl text-center bg-black/20">
                          <Package className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                          <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Vault Empty</p>
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {activeConsoleTab === 'identity' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section className="space-y-6">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Identity Matrix
                      </h3>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase">Primary Email (Immutable)</label>
                          <div className="w-full bg-zinc-900 border border-white/5 rounded-lg p-3 text-sm text-zinc-400 font-mono">
                            {selectedUser.email}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase">Phone Number</label>
                          <input 
                            type="text" 
                            value={editPhone} 
                            onChange={e => setEditPhone(e.target.value)} 
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white font-mono outline-none focus:border-cyan-500" 
                            placeholder="+1 234 567 890" 
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Logistics Data (Address)</h3>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono text-zinc-600 uppercase">Street / Address</label>
                          <input 
                            type="text" 
                            value={editStreet} 
                            onChange={e => setEditStreet(e.target.value)} 
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-zinc-300 outline-none focus:border-cyan-500" 
                            placeholder="Street name, Number, Suite..." 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-mono text-zinc-600 uppercase">City</label>
                            <input 
                              type="text" 
                              value={editCity} 
                              onChange={e => setEditCity(e.target.value)} 
                              className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-zinc-300 outline-none focus:border-cyan-500" 
                              placeholder="City" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-mono text-zinc-600 uppercase">Zip Code</label>
                            <input 
                              type="text" 
                              value={editZip} 
                              onChange={e => setEditZip(e.target.value)} 
                              className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-zinc-300 outline-none focus:border-cyan-500" 
                              placeholder="12345" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono text-zinc-600 uppercase">Country</label>
                          <input 
                            type="text" 
                            value={editCountry} 
                            onChange={e => setEditCountry(e.target.value)} 
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-zinc-300 outline-none focus:border-cyan-500" 
                            placeholder="Country" 
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeConsoleTab === 'transactions' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                      <History className="w-4 h-4" /> Transaction History
                    </h3>

                    {ordersLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Syncing with Odoo...</p>
                      </div>
                    ) : userOrders.length > 0 ? (
                      <div className="space-y-3">
                        {userOrders.map((order) => (
                          <div key={order.id} className="bg-black border border-white/5 rounded-xl p-4 hover:border-white/20 transition-all group/order">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">ID: {order.id.split('-')[0]}</span>
                              <span className={cn(
                                "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                order.status === 'paid' ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                              )}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-sm font-black text-white">${order.total_amount.toFixed(2)}</p>
                                <p className="text-[10px] text-zinc-600 font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] text-zinc-700 uppercase font-bold">Admin Insights</p>
                                <p className="text-[10px] text-green-500/50 font-mono">COGS: ${(order.total_amount * 0.7).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-black/20 rounded-2xl border border-dashed border-white/5">
                        <ShoppingCart className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                        <p className="text-[10px] text-zinc-600 uppercase font-black">No transactions found</p>
                      </div>
                    )}
                  </div>
                )}

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
