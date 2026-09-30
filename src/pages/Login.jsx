import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HACKATHON_CONFIG } from '../supabase/client';
import WebThreads from '../components/WebThreads';
import { 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  KeyRound,
  CheckCircle2
} from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      if (email.toLowerCase().includes('admin')) {
        navigate('/admin/dashboard');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-[#040711] flex items-center justify-center px-4 py-12">
      {/* Interactive WebThreads WebGL Canvas Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <WebThreads
          color1="#10b981"      // Cyber Emerald
          color2="#6366f1"      // Electric Indigo
          color3="#38bdf8"      // Cyan Hot-Core
          speed={0.25}
          threadCount={7}
          frequency={4.5}
          spread={0.22}
          taper={1.1}
          position={0.5}
          fanMode="center"
          glow={0.03}
          falloff={0.65}
          thickness={1.2}
          brightness={0.8}
          opacity={0.85}
          mirror={true}
          shimmer={true}
          grain={true}
          grainIntensity={0.06}
          mouseInteraction={true}
          mouseStrength={0.4}
        />
        {/* Subtle vignette gradient so the card pops */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#040711]/50 to-[#040711]/90 pointer-events-none" />
      </div>

      {/* Floating Center Card */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="relative rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_80px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-7 sm:p-9 space-y-6">
          
          {/* Header Branding */}
          <div className="text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-11 px-3.5 py-1 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shadow-sm">
                <img src="/acm-logo.png" alt="ACM NMAMIT" className="h-8 w-auto object-contain" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[11px] font-mono font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              ACM HACKDAYS LUNCH PASS PORTAL
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign In to {HACKATHON_CONFIG.name}
            </h1>
            <p className="text-xs text-slate-400">
              NMAMIT • 1 October 2026 • 9:00 AM – 5:00 PM
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                Registered Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="student@nmamit.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/50 shadow-inner transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                  Password (College USN / Roll No)
                </label>
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 4NM23CS001"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 shadow-inner transition-all font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400 hover:opacity-95 disabled:opacity-50 text-slate-950 font-bold text-sm tracking-wide shadow-[0_8px_25px_-5px_rgba(245,158,11,0.35)] transition-all flex items-center justify-center gap-2 group"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In for Lunch Pass</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Teams are pre-enrolled by the Tech Team.<br />
              Sign in with your registered email and your <strong className="text-amber-300 font-mono">College USN</strong> as password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
