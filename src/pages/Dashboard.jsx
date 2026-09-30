import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getParticipantPass, regenerateTestPass } from '../supabase/queries';
import { supabase } from '../supabase/client';
import { PassCard } from '../components/PassCard';
import { HACKATHON_CONFIG } from '../supabase/client';
import WebThreads from '../components/WebThreads';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Users, 
  QrCode, 
  Lock, 
  Clock, 
  Info,
  Loader2,
  ExternalLink,
  Sparkles,
  Zap,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export function Dashboard() {
  const { user, profile: authProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(authProfile);
  const [pass, setPass] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState(false);

  // Security PIN / Custom Password state
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState(null);
  const [savingPin, setSavingPin] = useState(false);
  const [hasSetPin, setHasSetPin] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hackpass_v2_passwords') || '{}');
      const email = (user?.email || authProfile?.email || '').toLowerCase();
      return !!(saved[email] || authProfile?.security_pin);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hackpass_v2_passwords') || '{}');
      const email = (user?.email || profile?.email || '').toLowerCase();
      if (email && (saved[email] || profile?.security_pin)) {
        setHasSetPin(true);
      }
    } catch {}
  }, [user, profile]);

  const handleSavePin = async (e) => {
    e.preventDefault();
    setSavingPin(true);
    setPinError(null);
    try {
      const clean = newPin.replace(/\D/g, '').slice(0, 6);
      if (clean.length < 4 || clean.length > 6) {
        throw new Error('PIN must be between 4 and 6 numeric digits.');
      }
      await changePassword(clean);
      setPinSuccess(true);
      setHasSetPin(true);
      setNewPin('');
      setTimeout(() => setPinSuccess(false), 5000);
    } catch (err) {
      setPinError(err.message || 'Failed to update PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const handleRegeneratePass = async () => {
    setRegenerating(true);
    setRegenSuccess(false);
    try {
      const res = await regenerateTestPass('test@hackdays.io');
      if (res?.pass) {
        setPass({ ...res.pass });
        if (res.profile) setProfile({ ...res.profile });
        setRegenSuccess(true);
        setTimeout(() => setRegenSuccess(false), 5000);
      }
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setRegenerating(false);
    }
  };

  const handleResetPass = async () => {
    setResetting(true);
    try {
      if (pass?.token) {
        await supabase
          .from('passes')
          .update({
            used: false,
            entry_status: 'not_entered',
            entry_time: null,
            scanned_by: null,
          })
          .eq('token', pass.token);

        if (pass?.pass_id) {
          await supabase.from('entry_logs').delete().eq('pass_id', pass.pass_id);
        }

        setPass(prev => ({
          ...prev,
          used: false,
          entry_status: 'not_entered',
          entry_time: null,
          scanned_by: null,
        }));
      }
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const { profile: pData, pass: passData } = await getParticipantPass(user?.id, user?.email);
        if (mounted) {
          if (pData) setProfile(pData);
          if (passData) setPass(passData);
        }

        // Fetch all teammates from the same team
        const teamName = pData?.team_name || profile?.team_name;
        if (teamName && teamName !== 'Individual') {
          try {
            const { data: teamApproved } = await supabase
              .from('approved_participants')
              .select('*')
              .ilike('team', teamName.trim());

            if (teamApproved && teamApproved.length > 0) {
              const { data: teamPasses } = await supabase
                .from('passes')
                .select('*, profiles(*)');

              const combined = teamApproved.map(member => {
                const memberCleanEmail = (member.email || '').toLowerCase();
                const matchedPass = teamPasses?.find(tp => 
                  tp.profiles?.email?.toLowerCase() === memberCleanEmail
                );
                return {
                  name: member.name,
                  email: member.email,
                  usn: member.usn,
                  isMe: memberCleanEmail === (user?.email || '').toLowerCase(),
                  used: matchedPass?.used || false,
                  entryStatus: matchedPass?.entry_status || 'not_entered',
                  entryTime: matchedPass?.entry_time || null,
                };
              });
              if (mounted) setTeamMembers(combined);
            }
          } catch (teamErr) {}
        }
      } catch (err) {
        console.error('Failed to load pass', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();

    // 1. Live polling fallback (detects scans across any cellular network)
    const interval = setInterval(loadData, 1500);

    // 2. Real-time WebSocket listener via Supabase
    let channel;
    try {
      channel = supabase
        .channel(`pass-live-${user?.id || 'client'}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'passes' },
          (payload) => {
            if (payload?.new) {
              setPass(prev => {
                if (!prev || payload.new.user_id === prev.user_id || payload.new.token === prev.token) {
                  return { ...prev, ...payload.new };
                }
                return prev;
              });
            }
          }
        )
        .subscribe();
    } catch (e) {}

    return () => {
      mounted = false;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040711] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Loading participant session...</p>
        </div>
      </div>
    );
  }

  const isEntered = pass?.entry_status === 'entered' || pass?.used === true;
  const isDisabled = pass?.status === 'disabled' || profile?.disabled === true;
  const isTestUser = user?.email?.toLowerCase() === 'test@hackdays.io' || profile?.email?.toLowerCase() === 'test@hackdays.io';

  return (
    <div className="relative min-h-screen bg-[#040711] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background WebThreads Ambient Shimmer */}
      <div className="absolute top-0 left-0 right-0 h-[480px] pointer-events-none opacity-40 z-0 overflow-hidden">
        <WebThreads
          color1="#10b981"
          color2="#6366f1"
          color3="#38bdf8"
          speed={0.15}
          threadCount={5}
          frequency={3.5}
          spread={0.2}
          position={0.3}
          glow={0.02}
          falloff={0.7}
          brightness={0.6}
          opacity={0.5}
          mouseInteraction={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#040711]/60 to-[#040711]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="relative rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                VERIFIED LUNCH PASS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {HACKATHON_CONFIG.name}
              </span>
              {isTestUser && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  TEST ACCOUNT
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {profile?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Your digital lunch pass is cryptographically bound to your team registration.
            </p>

            {regenSuccess && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fresh pass generated with token <strong className="text-white font-bold">{pass?.token}</strong>! Ready for scanning.</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isTestUser && (
              <button
                type="button"
                onClick={handleRegeneratePass}
                disabled={regenerating}
                title="Generate a brand-new QR code to test scanning again (Test Account only)"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-bold text-xs font-mono transition shadow-[0_4px_20px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${regenerating ? 'animate-spin' : ''}`} />
                <span>{regenerating ? 'Regenerating Pass...' : 'Regenerate Lunch Pass (Test) 🔄'}</span>
              </button>
            )}
            {isEntered && !isTestUser && (
              <button
                type="button"
                onClick={handleResetPass}
                disabled={resetting}
                title="Reset pass back to active state to test scanning again"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium transition shadow-sm cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>Reset Lunch Pass (Demo)</span>
              </button>
            )}
            <Link
              to="/pass"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-bold text-sm shadow-[0_8px_25px_-5px_rgba(245,158,11,0.35)] transition group"
            >
              <QrCode className="w-4 h-4" />
              <span>Fullscreen Lunch Pass</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Details & Real-Time Status */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Lunch Status Card */}
            <div className="rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Live Lunch Verification Telemetry
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Auto-Sync Active
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-3.5">
                  {isDisabled ? (
                    <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : isEntered ? (
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Pass State
                    </span>
                    <p className="text-lg font-black tracking-wide font-sans">
                      {isDisabled ? (
                        <span className="text-red-400">PASS DISABLED</span>
                      ) : isEntered ? (
                        <span className="text-amber-400 flex items-center gap-1.5">
                          LUNCH CLAIMED (SERVED)
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          LUNCH PASS ACTIVE
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Meal Limit
                  </span>
                  <span className="text-xs font-mono font-bold">
                    {isEntered ? (
                      <span className="text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                        0 / 1 (Claimed)
                      </span>
                    ) : (
                      <span className="text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                        1 / 1 (Available)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {isEntered && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Successfully verified and meal served at lunch counter on{' '}
                    <strong>
                      {pass?.entry_time
                        ? new Date(pass.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Just now'}
                    </strong>. Single-use meal voucher permanently marked.
                  </span>
                </div>
              )}
            </div>

            {/* Profile Information */}
            <div className="rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                Participant Credentials
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Full Name
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 font-sans">
                    {profile?.name || '—'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email
                  </span>
                  <p className="text-xs font-mono text-slate-200 mt-1 truncate">
                    {profile?.email || user?.email}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Assigned Team
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 font-sans">
                    {profile?.team_name || 'Individual'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Institution
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 font-sans truncate">
                    {profile?.college || '—'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 sm:col-span-2">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> College USN / Roll Number
                  </span>
                  <p className="text-sm font-bold text-amber-300 mt-1 font-mono tracking-wider">
                    {profile?.usn || '4NM23CS001'}
                  </p>
                </div>
              </div>
            </div>

            {/* Team Members Grouped Card */}
            {profile?.team_name && teamMembers.length > 0 && (
              <div className="rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Team Roster: <span className="text-white font-bold">{profile.team_name}</span>
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/25 font-bold">
                    {teamMembers.length} {teamMembers.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {teamMembers.map((m) => (
                    <div 
                      key={m.email} 
                      className={`p-4 rounded-2xl border transition-all ${
                        m.isMe 
                          ? 'bg-slate-950/80 border-slate-700/80 ring-1 ring-emerald-500/30 shadow-md' 
                          : 'bg-slate-950/50 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                          {m.isMe ? 'You (Current Pass)' : 'Teammate'}
                        </span>
                        {m.used ? (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-amber-400" /> LUNCH CLAIMED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" /> MEAL AVAILABLE
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white font-sans truncate">
                        {m.name}
                      </h4>
                      <p className="text-xs font-mono text-cyan-400 mt-0.5">
                        USN: {m.usn || '—'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {m.email}
                      </p>

                      {m.used && m.entryTime && (
                        <p className="text-[10px] font-mono text-slate-500 mt-2.5 pt-2 border-t border-slate-800/60">
                          Meal served at {new Date(m.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pass Protection / Security PIN Card */}
            {hasSetPin ? (
              <div className="rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-emerald-500/25 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(16,185,129,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-2">
                      Pass Locked & Anti-Theft Protected
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your lunch pass is secured with your private numeric PIN. Default USN password login is deactivated.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasSetPin(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-mono transition shrink-0 self-start sm:self-center cursor-pointer"
                >
                  Change PIN 🔑
                </button>
              </div>
            ) : (
              <div className="rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Protect Pass with Personal PIN / Password
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Anti-Theft Protection
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Your initial login password is your College USN (<strong className="text-amber-300 font-mono">{profile?.usn || '4NM23CS001'}</strong>). You can set a private <strong className="text-amber-300">4 to 6 digit numeric PIN</strong> below to lock your pass so nobody else can claim it.
                </p>

                <form onSubmit={handleSavePin} className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4 to 6 digit PIN"
                    className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/80 shadow-inner tracking-widest text-center sm:text-left"
                  />
                  <button
                    type="submit"
                    disabled={savingPin || newPin.length < 4}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono transition shrink-0 cursor-pointer"
                  >
                    {savingPin ? 'Locking...' : 'Lock My Pass 🔒'}
                  </button>
                </form>

                {pinSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Pass successfully locked! Default USN login is now deactivated for your email.</span>
                  </div>
                )}

                {pinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Pass Preview */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                Live Lunch Pass Voucher
              </span>
              <Link
                to="/pass"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono font-medium transition"
              >
                Fullscreen Pass <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <PassCard 
              profile={profile} 
              pass={pass} 
              onRegenerate={isTestUser ? handleRegeneratePass : null} 
              regenerating={regenerating} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}
