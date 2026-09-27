import React from 'react';
import { Link } from 'react-router-dom';
import { HACKATHON_CONFIG } from '../supabase/client';
import { useAuth } from '../context/AuthContext';
import SplitFlapText from '../components/SplitFlapText';
import {
  QrCode,
  ShieldCheck,
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Users,
  Smartphone,
  Cpu
} from 'lucide-react';

export function Home() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Mechanical Split-Flap Departure Board Display */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="inline-block p-4 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl max-w-full overflow-x-auto transition-all duration-300">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80 text-[10px] font-mono uppercase tracking-widest text-slate-400 gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACM NMAMIT TERMINAL
                </span>
                <span className="text-slate-500 font-mono">DECK: 1 OCT 2026</span>
              </div>
              <div className="flex justify-center items-center">
                <SplitFlapText
                  words={['HACKDAYS', 'LUNCH PASS', 'ACM NMAMIT', 'MEAL ACTIVE']}
                  autoResize={true}
                  cycleDelay={3200}
                  tileColor="#0b1120"
                  textColor="#f8fafc"
                  tileRadius={8}
                  gap="clamp(3px, 1vw, 6px)"
                  fontSize="clamp(22px, 5.2vw, 48px)"
                  loop={true}
                />
              </div>
            </div>
          </div>

          {/* Subheading Title */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-300">
              Digital Lunch Pass
            </span>
          </h1>

          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm font-mono text-slate-300 mb-8">
            <span>📅 {HACKATHON_CONFIG.date}</span>
            <span>•</span>
            <span>📍 {HACKATHON_CONFIG.venue}</span>
            <span>•</span>
            <span>⏰ 1:00 PM – 2:00 PM (Lunch Distribution)</span>
          </div>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-10 leading-relaxed">
            Single-use QR credential system for registered hackathon teams. Present your pass at the lunch distribution counter for instant meal verification.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {user ? (
              role === 'admin' || role === 'scanner' ? (
                <Link
                  to="/admin/scanner"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition"
                >
                  <QrCode className="w-4 h-4" />
                  Launch Lunch Scanner
                </Link>
              ) : (
                <Link
                  to="/pass"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition"
                >
                  <QrCode className="w-4 h-4" />
                  Open My Lunch Pass
                </Link>
              )
            ) : (
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition"
              >
                Sign In to Access Lunch Pass
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Clean Institutional Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
        © 2026 ACM Student Chapter, NMAMIT • {HACKATHON_CONFIG.name} Official Lunch Pass Portal
      </footer>
    </div>
  );
}
