import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getParticipantPass, regenerateTestPass } from '../supabase/queries';
import { PassCard } from '../components/PassCard';
import { HACKATHON_CONFIG } from '../supabase/client';
import WebThreads from '../components/WebThreads';
import { 
  ArrowLeft, 
  Smartphone, 
  ShieldCheck, 
  Sun, 
  IdCard, 
  Loader2, 
  Info,
  Zap,
  RotateCcw
} from 'lucide-react';

export function DigitalPass() {
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState(authProfile);
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const { profile: pData, pass: passData } = await getParticipantPass(user?.id, user?.email);
        if (mounted) {
          if (pData) setProfile(pData);
          if (passData) setPass(passData);
        }
      } catch (err) {
        console.error('Failed to load pass', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();

    // Live auto-refresh to reflect immediate gate scan status
    const interval = setInterval(loadData, 1500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040711] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Rendering high-res digital pass...</p>
        </div>
      </div>
    );
  }

  const isTestUser = user?.email?.toLowerCase() === 'test@hackdays.io' || profile?.email?.toLowerCase() === 'test@hackdays.io';

  const handleRegeneratePass = async () => {
    setRegenerating(true);
    try {
      const res = await regenerateTestPass('test@hackdays.io');
      if (res?.pass) {
        setPass({ ...res.pass });
        if (res.profile) setProfile({ ...res.profile });
      }
    } catch (e) {
      console.error('Failed to regenerate pass:', e);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#040711] text-slate-100 py-8 px-4 sm:px-6 overflow-hidden">
      {/* Background WebThreads Ambient Shimmer */}
      <div className="absolute inset-0 pointer-events-none opacity-35 z-0 overflow-hidden">
        <WebThreads
          color1="#10b981"
          color2="#6366f1"
          color3="#38bdf8"
          speed={0.18}
          threadCount={6}
          frequency={4.0}
          spread={0.2}
          position={0.4}
          glow={0.025}
          falloff={0.65}
          brightness={0.7}
          opacity={0.6}
          mouseInteraction={true}
          mouseStrength={0.25}
        />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#040711]/60 to-[#040711]/90" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto space-y-6">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {isTestUser && (
              <button
                type="button"
                onClick={handleRegeneratePass}
                disabled={regenerating}
                className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 rounded-full shadow-md hover:brightness-110 transition cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                <span>{regenerating ? 'Regenerating...' : 'Regenerate 🔄'}</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              OFFICIAL LUNCH PASS
            </div>
          </div>
        </div>

        {/* The Card Component */}
        <PassCard 
          profile={profile} 
          pass={pass} 
          onRegenerate={isTestUser ? handleRegeneratePass : null} 
          regenerating={regenerating} 
        />

        {/* Lunch Counter Guidelines */}
        <div className="rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            Lunch Distribution Protocol
          </h3>

          <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <Sun className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Screen Brightness:</strong> Please turn up your screen brightness to 70%+ when approaching the lunch counter for instant optical auto-detection.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <IdCard className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Team Identity Verification:</strong> Lunch volunteers will verify your participant name (<span className="text-slate-200">{profile?.name || 'Participant'}</span>) and team (<span className="text-slate-200">{profile?.team_name || 'Team'}</span>).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Single-Meal Limit:</strong> Upon scanning at the lunch counter, this pass state updates to <span className="text-amber-400 font-mono font-semibold">LUNCH CLAIMED</span>. Re-issuing meals using this QR is permanently locked.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
