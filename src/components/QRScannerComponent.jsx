import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { scanQRPass, regenerateTestPass } from '../supabase/queries';
import { sound } from '../utils/soundEffects';
import { useAuth } from '../context/AuthContext';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Keyboard,
  ShieldCheck,
  Clock,
  User,
  Zap,
  Lock
} from 'lucide-react';

export function QRScannerComponent({ onScanSuccess, todayEntriesCount = 0 }) {
  const { user } = useAuth();
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  
  // Scan result state
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isResettingTest, setIsResettingTest] = useState(false);
  const [resetTestMsg, setResetTestMsg] = useState(null);

  // Manual fallback input
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const html5QrCodeRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const resetTimerRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // Trigger celebratory confetti on entry approved
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8'],
      });
    } catch (e) {}
  };

  // Check if browser context allows camera
  const isSecureContextAvailable = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  };

  // Stop Scanner
  const stopScanner = async () => {
    if (!html5QrCodeRef.current) {
      setScannerActive(false);
      return;
    }
    if (isTransitioningRef.current) return;
    try {
      if (html5QrCodeRef.current.isScanning) {
        isTransitioningRef.current = true;
        await html5QrCodeRef.current.stop();
      }
    } catch (e) {
      // Ignore transition error on cleanup
    } finally {
      isTransitioningRef.current = false;
      setScannerActive(false);
    }
  };

  // Start Real-Time Live Optical Camera Scanner
  const startScanner = async () => {
    setCameraError(null);

    // If on insecure HTTP on network IP, guide user to HTTPS
    if (!isSecureContextAvailable() && window.location.protocol === 'http:') {
      setCameraError('INSECURE_HTTP');
      setScannerActive(false);
      return;
    }

    if (isTransitioningRef.current) {
      setTimeout(startScanner, 250);
      return;
    }

    isTransitioningRef.current = true;

    try {
      const scannerId = 'reader-viewport';
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      // Stop any existing session first
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // 1. Enumerate device cameras to find the best rear/environment optical sensor
      let cameraConfig = { facingMode: facingMode };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Look for rear / back camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          ) || devices[devices.length - 1]; // On iOS, the last camera is typically the main rear camera

          if (backCam && facingMode === 'environment') {
            cameraConfig = backCam.id;
            setSelectedCameraId(backCam.id);
          } else if (facingMode === 'user' && devices[0]) {
            cameraConfig = devices[0].id;
            setSelectedCameraId(devices[0].id);
          }
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras, falling back to facingMode constraint:', camErr);
      }

      // 2. Start continuous live video feed
      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 20, // High frame rate for instant detection as soon as QR is shown
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.75);
            return { width: Math.max(edgeSize, 220), height: Math.max(edgeSize, 220) };
          },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true, // Hardware-accelerated scanning on mobile
          },
        },
        onScanSuccessCallback,
        onScanFailureCallback
      );

      setScannerActive(true);
      setCameraError(null);
    } catch (err) {
      const errStr = err?.toString() || '';
      if (!errStr.includes('Cannot transition')) {
        console.error('Camera startup error:', err);
        if (err.name === 'NotAllowedError' || errStr.includes('Permission')) {
          setCameraError('PERMISSION_DENIED');
        } else {
          setCameraError('CAMERA_UNAVAILABLE');
        }
      }
      setScannerActive(false);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  // Toggle Camera (Front / Back)
  const toggleCameraFacing = async () => {
    await stopScanner();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Instant optical decode callback
  const onScanSuccessCallback = async (decodedText) => {
    // Avoid double firing while processing
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;
    handleValidateToken(decodedText);
  };

  const onScanFailureCallback = () => {
    // Silent per-frame non-match
  };

  // Atomic Token Validation
  const handleValidateToken = async (tokenString) => {
    setIsProcessing(true);
    clearTimeout(resetTimerRef.current);

    try {
      const res = await scanQRPass(tokenString, user);
      setScanResult(res);

      if (res.success && res.code === 'ENTRY_APPROVED') {
        if (soundEnabled) sound.playSuccess();
        triggerConfetti();
        if (onScanSuccess) onScanSuccess(res);
      } else if (res.code === 'ALREADY_USED') {
        if (soundEnabled) sound.playWarning();
      } else {
        if (soundEnabled) sound.playError();
      }

      // Auto-reset back to scanning mode in ~2.5 seconds
      let remaining = 3;
      setCountdown(remaining);
      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          setScanResult(null);
          setCountdown(null);
          scanInProgressRef.current = false;
          setIsProcessing(false);
        } else {
          setCountdown(remaining);
        }
      }, 850);

      resetTimerRef.current = setTimeout(() => {
        clearInterval(interval);
        setScanResult(null);
        setCountdown(null);
        scanInProgressRef.current = false;
        setIsProcessing(false);
      }, 2500);

    } catch (err) {
      if (soundEnabled) sound.playError();
      setScanResult({
        success: false,
        code: 'NETWORK_ERROR',
        message: 'Network verification failed. Please check connection and retry.',
      });
      setTimeout(() => {
        setScanResult(null);
        scanInProgressRef.current = false;
        setIsProcessing(false);
      }, 3000);
    }
  };

  // Manual token submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleValidateToken(manualToken.trim());
    setManualToken('');
  };

  useEffect(() => {
    startScanner();
    return () => {
      clearTimeout(resetTimerRef.current);
      stopScanner();
    };
  }, [facingMode]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Top Telemetry / Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${scannerActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Live Lunch Counter Scanner
            </p>
            <p className="text-sm font-semibold text-white">
              {scannerActive ? 'Continuous Optical Detection Active' : 'Camera Ready / Standby'}
            </p>
          </div>
        </div>

        {/* Live today's entries counter badge */}
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
            MEALS SERVED TODAY
          </span>
          <span className="text-xl font-black font-mono text-white">
            {todayEntriesCount}
          </span>
        </div>
      </div>

      {/* Camera Viewport Container */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 aspect-square sm:aspect-[4/3] flex items-center justify-center shadow-2xl">
        {/* html5-qrcode live video canvas target */}
        <div id="reader-viewport" className="w-full h-full object-cover" />

        {/* Cyber Scanning Overlays (Active continuous video scan) */}
        {!scanResult && scannerActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Viewfinder Target Frame */}
            <div className="w-64 h-64 sm:w-72 sm:h-72 border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_30px_rgba(245,158,11,0.25)] overflow-hidden">
              {/* Golden Corner Accents */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl pointer-events-none" />

              {/* Straight Golden Laser Scanning Line traversing top to bottom */}
              <div className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_16px_#fbbf24,0_0_32px_#f59e0b] animate-golden-laser pointer-events-none">
                {/* Trailing golden aura sheen */}
                <div className="absolute -top-7 left-0 right-0 h-7 bg-gradient-to-t from-amber-400/20 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="absolute bottom-4 bg-slate-950/90 px-4 py-1.5 rounded-full border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-1.5 shadow-lg">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Direct Optical Auto-Scan Active
            </div>
          </div>
        )}

        {/* Camera Permission / Insecure HTTP Prompt */}
        {cameraError && !scanResult && (
          <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-10 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>

            {cameraError === 'INSECURE_HTTP' ? (
              <div>
                <p className="text-sm font-bold text-white mb-1">
                  HTTPS Required for Live Camera
                </p>
                <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-3">
                  Apple iOS and Android browsers restrict live video streaming to secure <strong>HTTPS</strong> connections.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = window.location.href.replace('http:', 'https:');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-emerald-500/20"
                >
                  Switch to Secure HTTPS Now 🔒
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-white mb-1">
                  Camera Permission Required
                </p>
                <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-3">
                  Please tap the button below to grant camera access for continuous optical QR scanning.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    Activate Live Camera
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* RESULT MODAL OVERLAY (ENTRY APPROVED / ALREADY USED / INVALID / DISABLED) */}
        {/* ========================================================================= */}
        {scanResult && (
          <div
            className={`absolute inset-0 z-30 p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-200 backdrop-blur-md ${
              scanResult.code === 'ENTRY_APPROVED'
                ? 'bg-emerald-950/95 border-4 border-emerald-500'
                : scanResult.code === 'ALREADY_USED'
                ? 'bg-amber-950/95 border-4 border-amber-500'
                : 'bg-red-950/95 border-4 border-red-500'
            }`}
          >
            {/* Auto-reset countdown pill */}
            {countdown !== null && (
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-slate-950/80 text-xs font-mono text-slate-300 border border-slate-700">
                Ready for next lunch pass in {countdown}s...
              </div>
            )}

            {/* Icon & Primary Headline */}
            {scanResult.code === 'ENTRY_APPROVED' && (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-12 h-12 animate-bounce" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1">
                  LUNCH APPROVED
                </h3>
                <p className="text-xs font-mono text-emerald-300 uppercase tracking-widest mb-4">
                  SINGLE-USE MEAL VOUCHER REDEEMED & CLAIMED
                </p>

                {/* Participant Details Card */}
                {scanResult.participant && (
                  <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span className="text-base font-bold text-white">
                        {scanResult.participant.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                      <div>
                        <span className="text-slate-400 block font-mono text-[10px]">TEAM</span>
                        <span className="text-slate-200 font-semibold truncate block">
                          {scanResult.participant.team || 'Solo'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono text-[10px]">COLLEGE</span>
                        <span className="text-slate-200 font-semibold truncate block">
                          {scanResult.participant.college || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {scanResult.code === 'ALREADY_USED' && (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wider uppercase mb-1">
                  LUNCH ALREADY CLAIMED
                </h3>
                <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-4">
                  MEAL LIMIT REACHED — RE-ISSUE NOT PERMITTED
                </p>

                <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 text-left space-y-2">
                  <p className="text-sm font-bold text-white">
                    {scanResult.participant?.name || 'Participant'}
                  </p>
                  <p className="text-xs text-slate-300 font-mono">
                    Team: {scanResult.participant?.team || 'N/A'}
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-amber-300 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    Originally Claimed: {scanResult.original_entry_time ? new Date(scanResult.original_entry_time).toLocaleTimeString() : 'Earlier'}
                  </div>
                </div>
              </>
            )}

            {scanResult.code === 'PASS_DISABLED' && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center mb-3">
                  <XCircle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-red-400 tracking-wider uppercase mb-1">
                  PASS REVOKED
                </h3>
                <p className="text-xs font-mono text-red-300 mb-3">
                  This lunch pass has been disabled by event organizers.
                </p>
              </>
            )}

            {(scanResult.code === 'INVALID_PASS' || scanResult.code === 'UNAUTHORIZED' || scanResult.code === 'NETWORK_ERROR') && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center mb-3">
                  <XCircle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-red-400 tracking-wider uppercase mb-1">
                  INVALID LUNCH PASS
                </h3>
                <p className="text-sm text-slate-300 mb-3 max-w-xs">
                  {scanResult.message || 'Unknown QR token. Please instruct participant to contact the help desk.'}
                </p>
              </>
            )}

            {/* Tech Team Test Instant Re-Arm Button */}
            {scanResult.participant?.email?.toLowerCase() === 'test@hackdays.io' && (
              <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                <span className="text-[11px] font-mono text-amber-300 block font-bold">
                  🧪 Tech Team Test Account
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setIsResettingTest(true);
                    try {
                      await regenerateTestPass('test@hackdays.io');
                      setResetTestMsg('Pass regenerated & active! Ready for re-scan.');
                      setTimeout(() => {
                        setResetTestMsg(null);
                        setScanResult(null);
                        scanInProgressRef.current = false;
                        setIsProcessing(false);
                      }, 1600);
                    } catch (e) {
                      setResetTestMsg('Error resetting test pass');
                    } finally {
                      setIsResettingTest(false);
                    }
                  }}
                  disabled={isResettingTest}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 text-xs font-mono font-bold transition shadow cursor-pointer"
                >
                  {isResettingTest ? 'Regenerating Pass...' : 'Regenerate test@hackdays.io for Next Scan 🔄'}
                </button>
                {resetTestMsg && (
                  <p className="text-[11px] text-emerald-400 font-mono font-semibold">{resetTestMsg}</p>
                )}
              </div>
            )}

            {/* Quick Resume Button */}
            <button
              onClick={() => {
                clearTimeout(resetTimerRef.current);
                setScanResult(null);
                setCountdown(null);
                scanInProgressRef.current = false;
                setIsProcessing(false);
              }}
              className="mt-4 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold font-mono transition"
            >
              Scan Next Lunch Pass Now ↵
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl glass-panel border border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleCameraFacing}
            title="Flip camera"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!scannerActive && (
            <button
              onClick={startScanner}
              className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              Start Live Camera
            </button>
          )}
        </div>

        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition"
        >
          <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
          {showManualInput ? 'Hide Manual Input' : 'Type Token Manually'}
        </button>
      </div>

      {/* Manual Token Input Fallback */}
      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-2">
          <label className="text-xs font-mono text-slate-400 block">
            Manual Token Verification:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. HACK-9F8C2A..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isProcessing || !manualToken.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono"
            >
              Verify
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
