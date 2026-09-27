import React, { useState, useEffect } from 'react';
import { QRScannerComponent } from '../../components/QRScannerComponent';
import { adminGetStats } from '../../supabase/queries';
import { useAuth } from '../../context/AuthContext';
import { HACKATHON_CONFIG } from '../../supabase/client';
import { ShieldCheck } from 'lucide-react';

export function Scanner() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({ todayEntries: 0 });

  const refreshStats = async () => {
    try {
      const s = await adminGetStats();
      setStats(s);
    } catch (e) {}
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const handleScanSuccess = () => {
    refreshStats();
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              LUNCH COUNTER STATION
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Optical Lunch QR Scanner
            </h1>
            <p className="text-xs text-slate-400">
              Single-use meal voucher verification for {HACKATHON_CONFIG.name}.
            </p>
          </div>

          <div className="flex items-center justify-center sm:justify-end">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              Operator: <strong className="text-emerald-400">{user?.email?.split('@')[0]}</strong> ({role})
            </span>
          </div>
        </div>

        {/* Main Clean Camera Scanner Component */}
        <QRScannerComponent
          onScanSuccess={handleScanSuccess}
          todayEntriesCount={stats.todayEntries || 0}
        />
      </div>
    </div>
  );
}
