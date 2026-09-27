import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

export function AdminRoute({ children, allowScanner = false }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-mono text-slate-400">Verifying authorization permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const isPermitted = role === 'admin' || (allowScanner && role === 'scanner');

  if (!isPermitted) {
    // If scanner tries to access full admin dashboard, redirect to scanner page
    if (role === 'scanner') {
      return <Navigate to="/admin/scanner" replace />;
    }
    // If participant tries to access admin routes
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] px-4">
        <div className="max-w-md w-full glass-panel border border-red-500/30 p-8 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account role (<span className="font-mono text-red-400">{role || 'participant'}</span>) does not have administrative clearance for this section.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/dashboard"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
            >
              Participant Portal
            </a>
            <a
              href="/admin/login"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition"
            >
              Admin Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
