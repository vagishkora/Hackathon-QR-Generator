import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

// Public Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';

// Participant Pages
import { Dashboard } from './pages/Dashboard';
import { DigitalPass } from './pages/DigitalPass';

// Admin & Scanner Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Scanner } from './pages/admin/Scanner';
import { Participants } from './pages/admin/Participants';
import { CsvImport } from './pages/admin/CsvImport';
import { EntryHistory } from './pages/admin/EntryHistory';

// Database Schema Helper Modal
import { Database, Check, Copy, X } from 'lucide-react';

function SchemaHelper() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`-- Open supabase/schema.sql in this project directory to copy full SQL`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 print:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-2xl text-xs font-mono transition"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Postgres Schema & Setup</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="max-w-2xl w-full glass-panel border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Supabase Postgres Schema Setup
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto text-xs text-slate-300 pr-1">
              <p>
                To enable all live tables, RLS policies, and atomic RPC functions in your Supabase project:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 font-mono text-[11px] text-slate-400">
                <li>Log in to your Supabase Dashboard (<span className="text-emerald-400">https://supabase.com</span>).</li>
                <li>Navigate to your project <strong className="text-white">SQL Editor</strong> on the left panel.</li>
                <li>
                  Open <code className="text-emerald-300 font-bold">supabase/schema.sql</code> in this repository.
                </li>
                <li>Copy and paste all SQL into the SQL Editor and click <strong className="text-white">Run</strong>.</li>
              </ol>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                💡 <strong>Pre-configured:</strong> The app is already connected to your Supabase project and features an intelligent local fallback cache so all flows (registration, eligibility check, pass generation, atomic scanner, concurrency testing, CSV import) work immediately!
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400">
                <strong>Project Schema Location:</strong><br />
                <code className="text-slate-200">c:\Vagish\portfolio\Hackathon QR Generator\supabase\schema.sql</code>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Participant Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pass"
                element={
                  <ProtectedRoute>
                    <DigitalPass />
                  </ProtectedRoute>
                }
              />

              {/* Admin & Scanner Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/participants"
                element={
                  <AdminRoute>
                    <Participants />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/import"
                element={
                  <AdminRoute>
                    <CsvImport />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/scanner"
                element={
                  <AdminRoute allowScanner={true}>
                    <Scanner />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/history"
                element={
                  <AdminRoute allowScanner={true}>
                    <EntryHistory />
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
