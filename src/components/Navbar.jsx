import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HACKATHON_CONFIG } from '../supabase/client';
import { 
  QrCode, 
  ShieldCheck, 
  Users, 
  History, 
  LogOut, 
  Menu, 
  X, 
  FileSpreadsheet, 
  Cpu,
  UserCheck,
  ExternalLink
} from 'lucide-react';

export function Navbar() {
  const { user, profile, role, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo with ACM Club Emblem */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="h-10 px-2.5 py-1 rounded-xl bg-white/[0.07] border border-white/[0.12] backdrop-blur-md flex items-center justify-center shadow-sm group-hover:border-sky-500/40 transition-colors">
              <img src="/acm-logo.png" alt="ACM NMAMIT" className="h-7 w-auto object-contain" />
            </div>
            <div className="h-7 w-px bg-white/[0.12] hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base text-white">
                  {HACKATHON_CONFIG.name}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
                  ACM NMAMIT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block tracking-tight">
                {HACKATHON_CONFIG.date} • {HACKATHON_CONFIG.venue} • {HACKATHON_CONFIG.time}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center gap-1 ${!user ? 'absolute left-1/2 -translate-x-1/2' : ''}`}>
            {user ? (
              role === 'admin' ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive('/admin/dashboard')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/admin/scanner"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                      isActive('/admin/scanner')
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    Scan Lunch QR
                  </Link>
                  <Link
                    to="/admin/participants"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive('/admin/participants')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Participants
                  </Link>
                  <Link
                    to="/admin/import"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive('/admin/import')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV Import
                  </Link>
                  <Link
                    to="/admin/history"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive('/admin/history')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Lunch Audit Log
                  </Link>
                </>
              ) : role === 'scanner' ? (
                <>
                  <Link
                    to="/admin/scanner"
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                      isActive('/admin/scanner')
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    Lunch Scanner
                  </Link>
                  <Link
                    to="/admin/history"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive('/admin/history')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Recent Scans
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive('/dashboard')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/pass"
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                      isActive('/pass')
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    My Lunch Pass
                  </Link>
                </>
              )
            ) : (
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                <Link
                  to="/"
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive('/')
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/login"
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive('/login')
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                  }`}
                >
                  Participant Login
                </Link>
              </div>
            )}
          </nav>

          {/* Right Action / Role Pill / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                      {profile?.name || user.email}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : role === 'scanner'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {role || 'Participant'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                    {user.email}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800 hidden lg:inline-block">
                  1 OCT 2026 • NMAMIT
                </span>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  role === 'admin'
                    ? 'bg-purple-500/20 text-purple-300'
                    : role === 'scanner'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {role || 'Participant'}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#080c14] px-4 pt-3 pb-6 space-y-2">
          {user ? (
            <>
              <div className="p-3 mb-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <p className="text-sm font-semibold text-white">{profile?.name || user.email}</p>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              </div>

              {role === 'admin' ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Admin Dashboard
                  </Link>
                  <Link
                    to="/admin/scanner"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10"
                  >
                    🍱 Scan Lunch QR
                  </Link>
                  <Link
                    to="/admin/participants"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Participants Management
                  </Link>
                  <Link
                    to="/admin/import"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    CSV Import
                  </Link>
                  <Link
                    to="/admin/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Lunch Audit Log
                  </Link>
                </>
              ) : role === 'scanner' ? (
                <>
                  <Link
                    to="/admin/scanner"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10"
                  >
                    🍱 Scan Lunch QR
                  </Link>
                  <Link
                    to="/admin/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Recent Scans
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Participant Dashboard
                  </Link>
                  <Link
                    to="/pass"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10"
                  >
                    🍱 View Lunch Pass
                  </Link>
                </>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
              >
                Home
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10"
              >
                Participant Login
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
