import React, { useState, useEffect } from 'react';
import { adminGetEntryLogs } from '../../supabase/queries';
import { 
  History, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  User, 
  Users, 
  Building2, 
  Loader2,
  Calendar,
  RefreshCw
} from 'lucide-react';

export function EntryHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async (isInitial = false) => {
    try {
      if (!isInitial) setRefreshing(true);
      const data = await adminGetEntryLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs(true);
    // Real-time live auto-poll every 2.5s
    const interval = setInterval(() => loadLogs(false), 2500);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = () => {
    const headers = ['Entry ID', 'Participant Name', 'Email', 'Team', 'College', 'Scanned By', 'Scan Timestamp'];
    const rows = filteredLogs.map(l => [
      l.entry_id,
      `"${l.participant_name || ''}"`,
      l.participant_email || '',
      `"${l.team || ''}"`,
      `"${l.college || ''}"`,
      `"${l.scanned_by || ''}"`,
      l.scanned_at || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lunch_audit_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.participant_name?.toLowerCase().includes(q) ||
      l.participant_email?.toLowerCase().includes(q) ||
      l.team?.toLowerCase().includes(q) ||
      l.college?.toLowerCase().includes(q) ||
      l.token?.toLowerCase().includes(q) ||
      l.entry_id?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-mono text-slate-400">Loading immutable lunch distribution logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <History className="w-7 h-7 text-purple-400" />
              Lunch Distribution Audit Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Cryptographically verified, immutable record of every meal voucher claimed at the hackathon lunch counters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Total Meals Served: <strong className="text-emerald-400">{logs.length}</strong>
            </span>
            <button
              onClick={() => loadLogs(false)}
              disabled={refreshing}
              title="Refresh log entries"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Export Log
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lunch logs by participant name, email, team, pass ID, or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-3xl glass-panel border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Participant</th>
                  <th className="py-3.5 px-4 font-semibold">Team & Institution</th>
                  <th className="py-3.5 px-4 font-semibold">Lunch Claim Time</th>
                  <th className="py-3.5 px-4 font-semibold">Lunch Counter Station</th>
                  <th className="py-3.5 px-4 font-semibold">Meal Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-mono">
                      {logs.length === 0 ? 'No lunch passes scanned yet.' : 'No logs match your search filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.entry_id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-bold text-white text-sm block">
                          {log.participant_name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {log.participant_email}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-cyan-300 block">
                          {log.team || 'Solo'}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                          {log.college || 'Institution'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(log.scanned_at).toLocaleDateString()}</span>
                          <span className="text-white font-bold">
                            {new Date(log.scanned_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                          {log.scanned_by}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> LUNCH CLAIMED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
