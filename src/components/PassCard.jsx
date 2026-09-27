import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { HACKATHON_CONFIG } from '../supabase/client';
import { downloadQRCodeOnly } from '../utils/downloadQR';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download, 
  Lock, 
  User, 
  Building2, 
  Users,
  RotateCcw
} from 'lucide-react';

export function PassCard({ profile, pass, onRegenerate, regenerating }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const cardRef = useRef(null);

  // Live anti-screenshot clock update every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isEntered = pass?.entry_status === 'entered' || pass?.used === true;
  const isDisabled = pass?.status === 'disabled' || profile?.disabled === true;
  const isActive = !isEntered && !isDisabled;
  const isTestUser = profile?.email?.toLowerCase() === 'test@hackdays.io';

  // Clean participant display details
  const participantName = profile?.name || 'Hackathon Participant';
  const teamName = profile?.team_name || 'Individual';
  const college = profile?.college || 'NMAMIT';
  const passId = pass?.pass_id ? pass.pass_id.slice(0, 13).toUpperCase() : 'PASS-PENDING';
  const passToken = pass?.token || 'HACK-NO-TOKEN';

  const handleDownloadQR = () => {
    downloadQRCodeOnly({
      token: passToken,
      participantName,
      teamName,
      passId,
    });
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* The Digital Pass Card */}
      <div
        ref={cardRef}
        className={`relative overflow-hidden rounded-3xl transition-all duration-300 ${
          isDisabled
            ? 'border-2 border-red-500/50 bg-[#0c0d14] shadow-2xl shadow-red-950/40'
            : isEntered
            ? 'border-2 border-amber-500/40 bg-[#0d1117] shadow-2xl shadow-amber-950/30'
            : 'border-2 border-sky-500/40 bg-[#080e1a] shadow-2xl shadow-sky-950/40'
        }`}
      >
        {/* Institutional Header Bar */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border-b border-slate-700/60 overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 px-2 py-1 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shadow-sm">
                <img src="/acm-logo.png" alt="ACM NMAMIT" className="h-6 w-auto object-contain" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-wider text-white">
                  {HACKATHON_CONFIG.name}
                </h3>
                <p className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-semibold">
                  ACM STUDENT CHAPTER • NMAMIT
                </p>
              </div>
            </div>

            {/* Live Security Anti-Screenshot Heartbeat */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-300">
                {currentTime.toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
          </div>
        </div>

        {/* Pass Status Banner */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">STATUS</span>
          {isDisabled ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              PASS REVOKED
            </span>
          ) : isEntered ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              LUNCH CLAIMED
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              LUNCH PASS ACTIVE
            </span>
          )}
        </div>

        {/* Participant Information Section */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-400" /> Participant
              </span>
              <span className="font-mono text-[11px] text-slate-400">ID: {passId}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {participantName}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                <Users className="w-3 h-3 text-sky-400" /> Team
              </p>
              <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                {teamName}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                <Building2 className="w-3 h-3 text-sky-400" /> Institution
              </p>
              <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                {college}
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Perforation Notches */}
        <div className="relative py-2">
          <div className="ticket-notch-l" />
          <div className="ticket-notch-r" />
          <div className="w-full border-b-2 border-dashed border-slate-700/70" />
        </div>

        {/* Secure QR Code Section */}
        <div className="p-6 flex flex-col items-center justify-center relative">
          {/* Watermark Overlay when Pass is USED */}
          {isEntered && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="px-4 py-2 border-4 border-amber-500/80 text-amber-400 font-mono font-black text-xl tracking-widest uppercase rotate-[-8deg] rounded-lg shadow-xl shadow-amber-950/50">
                LUNCH CLAIMED
              </div>
              <p className="text-xs text-slate-300 font-mono mt-4">
                Meal redeemed on:
              </p>
              <p className="text-xs text-amber-300 font-semibold font-mono mt-0.5">
                {pass.entry_time ? new Date(pass.entry_time).toLocaleString() : 'Lunch Served'}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 max-w-[200px]">
                Single-use limit reached. Re-issuing lunch using this QR is permanently locked.
              </p>

              {isTestUser && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs font-mono flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-950/60 transition cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{regenerating ? 'Regenerating Pass...' : 'Regenerate for Re-scan 🔄'}</span>
                </button>
              )}
            </div>
          )}

          {/* Watermark Overlay when Pass is DISABLED */}
          {isDisabled && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="px-4 py-2 border-4 border-red-500 text-red-400 font-mono font-black text-xl tracking-widest uppercase rotate-[-8deg] rounded-lg">
                PASS REVOKED
              </div>
              <p className="text-xs text-slate-300 mt-3 max-w-[220px]">
                This lunch pass has been disabled by event organizers.
              </p>
            </div>
          )}

          {/* High-Resolution QR Container with ACM Logo Embedded */}
          <div id="pass-qr-container" className="relative p-4 rounded-2xl bg-white shadow-2xl flex flex-col items-center justify-center">
            <QRCodeSVG
              value={passToken}
              size={195}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: '/acm-logo.png',
                height: 44,
                width: 44,
                excavate: true,
              }}
              className="w-[175px] h-[175px] sm:w-[195px] sm:h-[195px]"
            />
          </div>

          {/* Security Notice: Encodes Token Only */}
          <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-xs">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-[11px]">
              Secure Meal Token: <span className="text-slate-300">{passToken.slice(0, 14)}...</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-1">
            Single-use lunch voucher. Encodes encrypted token only. Valid for 1 lunch meal.
          </p>
        </div>

        {/* Footer info & Venue */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-[11px] font-semibold text-slate-300 tracking-wide">
            {HACKATHON_CONFIG.venue} • {HACKATHON_CONFIG.date}
          </p>
          <p className="text-[10px] font-mono text-sky-400 uppercase mt-0.5">
            LUNCH TIMING: 1:00 PM – 2:00 PM • MUST PRESENT AT LUNCH COUNTER
          </p>
        </div>
      </div>

      {/* Action Button: Download QR Code Only & Test Regenerate */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
        {isTestUser && onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 text-xs font-bold font-mono tracking-wide shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate Test Pass 🔄'}
          </button>
        )}
        <button
          onClick={handleDownloadQR}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download Lunch QR Only (PNG)
        </button>
      </div>
    </div>
  );
}
