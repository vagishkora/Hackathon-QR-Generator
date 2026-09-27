import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetStats, adminGetEntryLogs } from '../../supabase/queries';
import { HACKATHON_CONFIG } from '../../supabase/client';
import { 
  Users, 
  UserCheck, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  FileSpreadsheet, 
  History, 
  Database, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData(isInitial = false) {
      try {
        const [statsData, logsData] = await Promise.all([
          adminGetStats(),
          adminGetEntryLogs(),
        ]);
        if (mounted) {
          setStats(statsData);
          setRecentLogs(logsData.slice(0, 5));
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        if (mounted && isInitial) setLoading(false);
      }
    }
    loadData(true);
    const interval = setInterval(() => loadData(false), 2500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(`-- Run schema.sql from the project directory in your Supabase SQL Editor`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm font-mono text-slate-400">Loading live telemetry and analytics...</p>
        </div>
      </div>
    );
  }

  const {
    totalSelected = 0,
    totalRegistered = 0,
    totalEntered = 0,
    notYetEntered = 0,
    totalPassesGenerated = 0,
    todayEntries = 0,
    registrationRate = 0,
    entryRate = 0,
  } = stats || {};

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
                EVENT CONTROL CENTER
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {HACKATHON_CONFIG.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Administrative Command Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Live telemetry for lunch meal distribution, participant registration, and voucher status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/admin/scanner"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition"
            >
              <QrCode className="w-4 h-4" />
              Launch Lunch Scanner
            </Link>
            <Link
              to="/admin/import"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Import CSV
            </Link>
          </div>
        </div>

        {/* 5 Core Statistics Cards (Requirement #8) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* 1. Total Selected */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-mono uppercase">Selected</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-3xl font-black text-white">{totalSelected}</p>
            <p className="text-[11px] text-slate-400 font-mono">Pre-approved roster</p>
          </div>

          {/* 2. Registered */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-mono uppercase">Registered</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-white">{totalRegistered}</p>
            <p className="text-[11px] text-emerald-400 font-mono font-semibold">
              {registrationRate}% completion
            </p>
          </div>

          {/* 3. Passes Generated */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-mono uppercase">Lunch Passes</span>
              <QrCode className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-white">{totalPassesGenerated}</p>
            <p className="text-[11px] text-slate-400 font-mono">Unique meal vouchers</p>
          </div>

          {/* 4. Entered (Scanned) */}
          <div className="p-5 rounded-2xl glass-panel border border-emerald-500/30 bg-emerald-950/20 space-y-2 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-mono uppercase font-bold">Lunches Claimed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-emerald-300">{totalEntered}</p>
            <p className="text-[11px] text-emerald-400 font-mono">
              Today: +{todayEntries} meals served
            </p>
          </div>

          {/* 5. Not Yet Entered */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-mono uppercase">Lunch Pending</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-black text-white">{notYetEntered}</p>
            <p className="text-[11px] text-amber-400 font-mono">Eligible for lunch</p>
          </div>
        </div>

        {/* Charts & Analytical Progress Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Registration & Entry Progress Rate Visualizer */}
          <div className="lg:col-span-8 p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Turnout & Lunch Distribution Velocity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time ratio of approved selection vs registered account vs meals served
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded-full text-slate-300 border border-slate-800">
                Live Postgres RLS Telemetry
              </span>
            </div>

            {/* Registration Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">Registration Completion Rate</span>
                <span className="font-mono font-bold text-emerald-400">
                  {totalRegistered} / {totalSelected} ({registrationRate}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, registrationRate)}%` }}
                />
              </div>
            </div>

            {/* Lunch Distribution Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">Lunch Claim Rate</span>
                <span className="font-mono font-bold text-cyan-400">
                  {totalEntered} / {Math.max(1, totalRegistered)} ({entryRate}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, entryRate)}%` }}
                />
              </div>
            </div>

            {/* Visual Breakdown Strip */}
            <div className="pt-2">
              <span className="text-xs font-mono uppercase text-slate-400 mb-2 block">
                Lunch Pass Distribution Breakdown
              </span>
              <div className="h-6 w-full rounded-xl bg-slate-900 overflow-hidden flex border border-slate-800">
                <div
                  title={`Lunches Claimed: ${totalEntered}`}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${totalSelected > 0 ? (totalEntered / totalSelected) * 100 : 0}%` }}
                />
                <div
                  title={`Registered (Lunch Pending): ${notYetEntered}`}
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${totalSelected > 0 ? (notYetEntered / totalSelected) * 100 : 0}%` }}
                />
                <div
                  title={`Unregistered Selected: ${Math.max(0, totalSelected - totalRegistered)}`}
                  className="bg-slate-700 h-full transition-all duration-500"
                  style={{ width: `${totalSelected > 0 ? ((totalSelected - totalRegistered) / totalSelected) * 100 : 100}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-mono mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Lunches Claimed ({totalEntered})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-300">Registered (Lunch Pending) ({notYetEntered})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span className="text-slate-400">Not Yet Registered ({Math.max(0, totalSelected - totalRegistered)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300">
                Organizer Operations
              </h3>

              <div className="space-y-2">
                <Link
                  to="/admin/scanner"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-sm font-bold block text-white">Scan Lunch QR</span>
                      <span className="text-[11px] text-emerald-400/80">Redeem meals at lunch counter</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/admin/participants"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 text-slate-200 border border-slate-800 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <div>
                      <span className="text-sm font-bold block text-white">Manage Roster</span>
                      <span className="text-[11px] text-slate-400">Search, filter & manage passes</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/admin/import"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 text-slate-200 border border-slate-800 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-yellow-400" />
                    <div>
                      <span className="text-sm font-bold block text-white">Upload CSV List</span>
                      <span className="text-[11px] text-slate-400">Batch import selected emails</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/admin/history"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 text-slate-200 border border-slate-800 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-5 h-5 text-purple-400" />
                    <div>
                      <span className="text-sm font-bold block text-white">Audit Lunch Log</span>
                      <span className="text-[11px] text-slate-400">Full meal redemption history</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Gate Activity Preview */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Recent Lunch Distributions
            </h3>
            <Link
              to="/admin/history"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-medium flex items-center gap-1"
            >
              View Full Lunch Audit Log →
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No meals claimed yet today. Scanned lunch QR passes will appear here in real-time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                    <th className="pb-3 font-semibold">Participant</th>
                    <th className="pb-3 font-semibold">Team</th>
                    <th className="pb-3 font-semibold">Lunch Claimed At</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {recentLogs.map((log) => (
                    <tr key={log.entry_id} className="hover:bg-slate-900/40">
                      <td className="py-3 text-white font-sans font-medium">
                        {log.participant_name}
                        <span className="block text-[11px] text-slate-500 font-mono">
                          {log.participant_email}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{log.team || 'Solo'}</td>
                      <td className="py-3 text-slate-400">
                        {new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> SERVED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
