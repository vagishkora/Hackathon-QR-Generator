import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HACKATHON_CONFIG } from '../../supabase/client';
import WebThreads from '../../components/WebThreads';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  QrCode 
} from 'lucide-react';

export function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      if (email.toLowerCase().includes('scanner')) {
        navigate('/admin/scanner', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials. Check your email & password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-[#040711] flex items-center justify-center px-4 py-12">
      {/* Interactive WebThreads WebGL Canvas Background (Violet / Cyan / Pink Cyber Palette) */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <WebThreads
          color1="#7c3aed"      // Deep Violet
          color2="#06b6d4"      // Neon Cyan
          color3="#f43f5e"      // Rose Accent Core
          speed={0.22}
          threadCount={8}
          frequency={4.8}
          spread={0.24}
          taper={1.15}
          position={0.5}
          fanMode="center"
          glow={0.035}
          falloff={0.62}
          thickness={1.15}
          brightness={0.85}
          opacity={0.88}
          mirror={true}
          shimmer={true}
          grain={true}
          grainIntensity={0.06}
          mouseInteraction={true}
          mouseStrength={0.4}
        />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#040711]/50 to-[#040711]/90 pointer-events-none" />
      </div>

      {/* Floating Center Card */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="relative rounded-[28px] bg-[#090e1c]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_80px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-7 sm:p-9 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-11 px-3.5 py-1 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shadow-sm">
                <img src="/acm-logo.png" alt="ACM NMAMIT" className="h-8 w-auto object-contain" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[11px] font-mono font-medium tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              ACM TECH TEAM CONSOLE
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {HACKATHON_CONFIG.name} Command
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              NMAMIT • 1 October 2026 • 9:00 AM – 5:00 PM
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                Admin / Scanner Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vagish@hackdays.io"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/50 shadow-inner transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                  Master Password
                </label>
                <span className="text-[11px] font-mono text-slate-500">Default: password123</span>
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/50 shadow-inner transition-all font-sans"
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
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-[0_8px_25px_-5px_rgba(2,132,199,0.35)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Console</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-500 font-mono">
              ACM Student Chapter • NMAMIT Tech Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
