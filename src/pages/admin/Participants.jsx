import React, { useState, useEffect, useMemo } from 'react';
import { 
  adminGetAllParticipants, 
  adminToggleParticipant, 
  adminAddParticipant,
  adminDeleteParticipant
} from '../../supabase/queries';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Ban, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  X,
  ExternalLink,
  ShieldAlert,
  Trash2,
  LayoutGrid,
  List,
  ShieldCheck
} from 'lucide-react';

export function Participants() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'registered' | 'unregistered' | 'entered' | 'not_entered' | 'disabled'
  const [viewMode, setViewMode] = useState('teams'); // 'teams' | 'table'

  // Delete Participant Modal State (Admin Exclusive)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Add Participant Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isTwoMemberTeam, setIsTwoMemberTeam] = useState(true);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addUsn, setAddUsn] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addMember2Name, setAddMember2Name] = useState('');
  const [addMember2Email, setAddMember2Email] = useState('');
  const [addMember2Usn, setAddMember2Usn] = useState('');
  const [addMember2Phone, setAddMember2Phone] = useState('');
  const [addTeam, setAddTeam] = useState('');
  const [addCollege, setAddCollege] = useState('NMAMIT');
  const [addingSubmitting, setAddingSubmitting] = useState(false);
  const [addError, setAddError] = useState(null);

  // Copied token state
  const [copiedToken, setCopiedToken] = useState(null);

  const loadData = async (isInitial = false) => {
    try {
      const data = await adminGetAllParticipants();
      setParticipants(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 3000);
    return () => clearInterval(interval);
  }, []);

  // Toggle Disable/Enable
  const handleToggleDisable = async (participant) => {
    const newStatus = !participant.disabled;
    const confirmMessage = newStatus
      ? `Are you sure you want to disable ${participant.name}? Their live lunch pass QR code will be immediately revoked at the lunch counter.`
      : `Re-enable participant ${participant.name} and restore their lunch pass?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await adminToggleParticipant(participant.userId, participant.email, newStatus);
      // Update local state
      setParticipants(prev =>
        prev.map(p => {
          if (p.email.toLowerCase() === participant.email.toLowerCase()) {
            return {
              ...p,
              disabled: newStatus,
              passStatus: newStatus ? 'disabled' : 'active',
            };
          }
          return p;
        })
      );
    } catch (err) {
      alert('Failed to update participant status: ' + err.message);
    }
  };

  // Delete Participant Handler (Admin Exclusive)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminDeleteParticipant(deleteTarget.user_id, deleteTarget.email);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete participant.');
    } finally {
      setDeleting(false);
    }
  };

  // Add Participant Submit (Supports Team of 2 or Single)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddingSubmitting(true);

    try {
      const res = await adminAddParticipant({
        name: addName.trim(),
        email: addEmail.trim(),
        usn: addUsn.trim(),
        team: addTeam.trim() || 'HACKDAYS Team',
        college: addCollege.trim() || 'NMAMIT',
        phone: addPhone.trim() || '',
        member2Name: isTwoMemberTeam ? addMember2Name.trim() : '',
        member2Email: isTwoMemberTeam ? addMember2Email.trim() : '',
        member2Usn: isTwoMemberTeam ? addMember2Usn.trim() : '',
        member2Phone: isTwoMemberTeam ? addMember2Phone.trim() : '',
      });

      if (res.existingCount > 0 && res.addedCount === 0) {
        setAddError('This email is already in the approved participants roster.');
        setAddingSubmitting(false);
        return;
      }

      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddUsn('');
      setAddPhone('');
      setAddMember2Name('');
      setAddMember2Email('');
      setAddMember2Usn('');
      setAddMember2Phone('');
      setAddTeam('');
      setAddCollege('NMAMIT');
      await loadData();
    } catch (err) {
      setAddError(err.message || 'Failed to add participant.');
    } finally {
      setAddingSubmitting(false);
    }
  };

  // Copy token to clipboard
  const handleCopy = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  // Export filtered to CSV
  const handleExportCSV = () => {
    const headers = ['Email', 'Name', 'Team', 'College', 'Registered', 'Entry Status', 'Pass Status', 'Pass Token', 'Entry Time'];
    const rows = filteredParticipants.map(p => [
      p.email,
      `"${p.name || ''}"`,
      `"${p.team || ''}"`,
      `"${p.college || ''}"`,
      p.isRegistered ? 'Yes' : 'No',
      p.entryStatus,
      p.passStatus,
      p.passToken || '',
      p.entryTime || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hackathon_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and search
  const filteredParticipants = participants.filter(p => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.usn?.toLowerCase().includes(q) ||
      p.team?.toLowerCase().includes(q) ||
      p.college?.toLowerCase().includes(q) ||
      p.passToken?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Filter
    if (statusFilter === 'registered') return p.isRegistered;
    if (statusFilter === 'unregistered') return !p.isRegistered;
    if (statusFilter === 'entered') return p.entryStatus === 'entered';
    if (statusFilter === 'not_entered') return p.isRegistered && p.entryStatus !== 'entered';
    if (statusFilter === 'disabled') return p.disabled;

    return true;
  });

  // Automatically group participants by their team
  const groupedTeams = useMemo(() => {
    const map = new Map();
    filteredParticipants.forEach(p => {
      const key = (p.team || 'Solo / Unassigned').trim();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(p);
    });

    return Array.from(map.entries()).map(([teamName, members]) => {
      const college = members[0]?.college || 'NMAMIT';
      const claimedCount = members.filter(m => m.entryStatus === 'entered').length;
      const registeredCount = members.filter(m => m.isRegistered).length;
      return {
        teamName,
        college,
        members,
        claimedCount,
        registeredCount,
        totalMembers: members.length,
      };
    });
  }, [filteredParticipants]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-mono text-slate-400">Loading participant registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-emerald-400" />
              Participant Roster Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search, verify status, add participants manually, and manage pass revocation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              Add Participant
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl glass-panel border border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, team, college or pass token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            {[
              { id: 'all', label: `All (${participants.length})` },
              { id: 'registered', label: 'Registered' },
              { id: 'unregistered', label: 'Unregistered' },
              { id: 'entered', label: 'Lunch Claimed' },
              { id: 'not_entered', label: 'Lunch Pending' },
              { id: 'disabled', label: 'Disabled' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition ${
                  statusFilter === f.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle & Status Count Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Showing <strong className="text-white">{filteredParticipants.length}</strong> participants across <strong className="text-emerald-400">{groupedTeams.length}</strong> teams
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                viewMode === 'teams'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Group by Team</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* 1. Grouped by Team View (Default) */}
        {viewMode === 'teams' ? (
          <div className="space-y-4">
            {groupedTeams.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-mono glass-panel rounded-3xl border border-slate-800">
                No teams found matching the current search & filters.
              </div>
            ) : (
              groupedTeams.map((team) => (
                <div 
                  key={team.teamName}
                  className="rounded-2xl glass-panel border border-slate-800/90 bg-[#090e1c]/70 p-5 shadow-xl hover:border-slate-700/80 transition-all space-y-4"
                >
                  {/* Team Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                        {team.teamName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-wide font-sans">
                            {team.teamName}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {team.totalMembers} {team.totalMembers === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans mt-0.5">
                          {team.college}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {team.claimedCount === team.totalMembers ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                          All Meals Claimed ({team.claimedCount}/{team.totalMembers})
                        </span>
                      ) : team.claimedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-mono font-bold">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          Partial: {team.claimedCount}/{team.totalMembers} Claimed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Available: 0/{team.totalMembers} Claimed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team Members List (Side by side on desktop, stacked on mobile) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {team.members.map((p, idx) => {
                      const isEntered = p.entryStatus === 'entered';
                      const isDisabled = p.disabled || p.passStatus === 'disabled';
                      return (
                        <div 
                          key={p.email} 
                          className={`p-4 rounded-xl border transition-all ${
                            isEntered 
                              ? 'bg-amber-950/15 border-amber-500/25' 
                              : isDisabled 
                              ? 'bg-red-950/15 border-red-500/20' 
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                  Member {idx + 1}
                                </span>
                                <h4 className="text-sm font-bold text-white truncate font-sans">
                                  {p.name}
                                </h4>
                              </div>

                              <p className="text-xs font-mono text-cyan-400">
                                USN: {p.usn || '—'}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400 truncate">
                                {p.email}
                              </p>
                              {p.phone && (
                                <p className="text-[10px] font-mono text-slate-500">
                                  {p.phone}
                                </p>
                              )}
                            </div>

                            {/* Member Meal Status Badge */}
                            <div>
                              {isDisabled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                                  <Ban className="w-3 h-3" /> REVOKED
                                </span>
                              ) : isEntered ? (
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                    <CheckCircle className="w-3 h-3" /> CLAIMED
                                  </span>
                                  {p.entryTime && (
                                    <span className="block text-[9px] font-mono text-slate-500 mt-0.5">
                                      {new Date(p.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              ) : p.isRegistered ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  AVAILABLE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                                  UNCLAIMED
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Token + Actions */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-xs">
                            <div className="flex items-center gap-1.5">
                              {p.passToken ? (
                                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  <span>{p.passToken.slice(0, 11)}...</span>
                                  <button
                                    onClick={() => handleCopy(p.passToken)}
                                    title="Copy pass token"
                                    className="hover:text-white cursor-pointer"
                                  >
                                    {copiedToken === p.passToken ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-mono">No pass issued</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleDisable(p)}
                                title={p.disabled ? 'Re-enable pass' : 'Revoke pass'}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition cursor-pointer ${
                                  p.disabled
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                }`}
                              >
                                {p.disabled ? 'Restore' : 'Revoke'}
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeleteTarget(p);
                                  }}
                                  title="Delete participant"
                                  className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* 2. Flat Table View */
          <div className="rounded-3xl glass-panel border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Participant Details</th>
                    <th className="py-3.5 px-4 font-semibold">Team & College</th>
                    <th className="py-3.5 px-4 font-semibold">Registration</th>
                    <th className="py-3.5 px-4 font-semibold">Lunch Status</th>
                    <th className="py-3.5 px-4 font-semibold">Meal Token</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                        No participants found matching the current search & filters.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => {
                      const isEntered = p.entryStatus === 'entered';
                      const isDisabled = p.disabled || p.passStatus === 'disabled';

                      return (
                        <tr key={p.email} className="hover:bg-slate-900/40 transition">
                          {/* Name & Email */}
                          <td className="py-3.5 px-4 font-sans">
                            <p className="font-bold text-white text-sm">
                              {p.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {p.email}
                              </span>
                              {p.usn && p.usn !== '—' && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 font-semibold">
                                  {p.usn}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Team & College */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-cyan-300 block">
                              {p.team || 'Solo'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                              {p.college || 'Institution'}
                            </span>
                          </td>

                          {/* Registration Status */}
                          <td className="py-3.5 px-4">
                            {p.isRegistered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                <CheckCircle className="w-3 h-3" /> REGISTERED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                                UNCLAIMED
                              </span>
                            )}
                          </td>

                          {/* Pass & Entry Status */}
                          <td className="py-3.5 px-4">
                            {isDisabled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                                <Ban className="w-3 h-3" /> PASS REVOKED
                              </span>
                            ) : isEntered ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                  <CheckCircle className="w-3 h-3" /> LUNCH CLAIMED
                                </span>
                                {p.entryTime && (
                                  <span className="block text-[10px] text-slate-500 mt-0.5">
                                    {new Date(p.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            ) : p.isRegistered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                MEAL AVAILABLE
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Pass Token */}
                          <td className="py-3.5 px-4">
                            {p.passToken ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
                                  {p.passToken.slice(0, 11)}...
                                </span>
                                <button
                                  onClick={() => handleCopy(p.passToken)}
                                  title="Copy token to clipboard"
                                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                                >
                                  {copiedToken === p.passToken ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px]">Not issued</span>
                            )}
                          </td>

                          {/* Actions (Toggle Disable + Delete) */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleDisable(p)}
                                title={p.disabled ? 'Re-enable pass' : 'Revoke & disable pass'}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                  p.disabled
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                }`}
                              >
                                {p.disabled ? 'Restore' : 'Revoke'}
                              </button>

                              {/* Delete Participant: Admin Exclusive */}
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeleteTarget(p);
                                  }}
                                  title="Permanently delete participant (Admin only)"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Participant Manually */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <div className="max-w-lg w-full glass-panel border border-slate-700 p-6 sm:p-7 rounded-3xl shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    Add Participant / Team Manually
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Missed out in DB? Add them here to automatically provision accounts & entry passes.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Team of 2 Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Team of 2 Structure</span>
                    <span className="text-[11px] text-slate-400">Creates accounts and passes for both teammates</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTwoMemberTeam}
                      onChange={(e) => setIsTwoMemberTeam(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Team Details */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={addTeam}
                      onChange={(e) => setAddTeam(e.target.value)}
                      placeholder="e.g. Byte Busters"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
                      College / Institution *
                    </label>
                    <input
                      type="text"
                      required
                      value={addCollege}
                      onChange={(e) => setAddCollege(e.target.value)}
                      placeholder="NMAMIT"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Member 1 Box */}
                <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono text-sky-400 font-semibold">
                    <span>{isTwoMemberTeam ? 'MEMBER 1 (LEADER)' : 'PARTICIPANT'}</span>
                    <span className="text-[10px] text-slate-400">Pass auto-generated</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        required
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="Full Name *"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        placeholder="Email Address *"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={addUsn}
                        onChange={(e) => setAddUsn(e.target.value)}
                        placeholder="USN / Roll No (Used as Password) *"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={addPhone}
                        onChange={(e) => setAddPhone(e.target.value)}
                        placeholder="Phone Number (Optional)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Member 2 Box (if Team of 2) */}
                {isTwoMemberTeam && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-mono text-sky-400 font-semibold">
                      <span>MEMBER 2</span>
                      <span className="text-[10px] text-slate-400">Pass auto-generated</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          required={isTwoMemberTeam}
                          value={addMember2Name}
                          onChange={(e) => setAddMember2Name(e.target.value)}
                          placeholder="Member 2 Full Name *"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          required={isTwoMemberTeam}
                          value={addMember2Email}
                          onChange={(e) => setAddMember2Email(e.target.value)}
                          placeholder="Member 2 Email *"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          value={addMember2Usn}
                          onChange={(e) => setAddMember2Usn(e.target.value)}
                          placeholder="Member 2 USN / Roll No *"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={addMember2Phone}
                          onChange={(e) => setAddMember2Phone(e.target.value)}
                          placeholder="Phone Number (Optional)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
                  🔑 <strong>Secure Instant Login Access:</strong> Participant accounts will be activated immediately. Their initial password is their <strong className="text-amber-300 font-mono">College USN</strong> (or fallback: password123).
                </div>

                {addError && (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/30 font-mono">
                    {addError}
                  </p>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/25 cursor-pointer"
                  >
                    {addingSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Provision Account & Pass'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Participant Confirmation (Admin Exclusive) */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="max-w-md w-full glass-panel border border-red-500/30 p-6 rounded-3xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Participant</h3>
                  <p className="text-xs text-slate-400">Admin-exclusive destructive action</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>
                  Are you sure you want to permanently remove <strong className="text-white">{deleteTarget.name}</strong> (<span className="text-sky-300 font-mono">{deleteTarget.email}</span>)?
                </p>
                <p className="text-[11px] text-red-300/90 leading-relaxed">
                  ⚠️ This will permanently revoke their pass, delete their account credentials, and erase them from all connected devices and database.
                </p>
              </div>

              {deleteError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/30 font-mono">
                  {deleteError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
