import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkParticipantEligibility, registerParticipant } from '../supabase/queries';
import { useAuth } from '../context/AuthContext';
import { HACKATHON_CONFIG } from '../supabase/client';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Building2, 
  Users,
  ArrowRight,
  Info
} from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');

  // Eligibility verification state
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Verify email eligibility
  const verifyEmail = async (emailToCheck) => {
    const targetEmail = (emailToCheck || email).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEligibilityResult(null);
      setEligibilityError('Please enter a valid email format.');
      return;
    }

    setCheckingEmail(true);
    setEligibilityError(null);
    setEligibilityResult(null);

    try {
      const res = await checkParticipantEligibility(targetEmail);
      if (!res.isApproved) {
        setEligibilityError(res.message || 'This email is not registered as a selected participant.');
        setEligibilityResult(null);
      } else if (res.isRegistered) {
        setEligibilityError('This participant is already registered. Please log in.');
        setEligibilityResult(null);
      } else {
        setEligibilityResult(res);
        // Pre-fill fields from approved record if available
        if (res.details) {
          if (res.details.name && !fullName) setFullName(res.details.name);
          if (res.details.team && !teamName) setTeamName(res.details.team);
          if (res.details.college && !college) setCollege(res.details.college);
        }
      }
    } catch (err) {
      setEligibilityError(err.message || 'Error checking eligibility.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    if (email.trim() && !eligibilityResult) {
      verifyEmail(email);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!eligibilityResult?.isApproved) {
      setSubmitError('Please verify an approved participant email before completing registration.');
      return;
    }

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      await registerParticipant({
        email,
        password,
        name: fullName,
        phone,
        college,
        teamName,
      });

      setSuccessMessage('Registration successful! Redirecting to your digital lunch pass...');
      
      // Auto login
      try {
        await login(email, password);
      } catch {}

      setTimeout(() => {
        navigate('/pass');
      }, 1500);
    } catch (err) {
      setSubmitError(err.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[#080c14] flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            PARTICIPANT LUNCH CLAIM PORTAL
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Selected Participant Registration
          </h1>
          <p className="text-sm text-slate-400">
            Enter your selected email to activate your digital lunch pass for {HACKATHON_CONFIG.name}.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field with Verification Button */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Selected Email Address *
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEligibilityResult(null);
                      setEligibilityError(null);
                    }}
                    onBlur={handleEmailBlur}
                    placeholder="e.g. name@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => verifyEmail(email)}
                  disabled={checkingEmail || !email.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {checkingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </div>

              {/* Eligibility Feedback */}
              {eligibilityResult?.isApproved && (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">Email Verified & Selected!</span>
                    {eligibilityResult.details?.team && (
                      <span className="block text-[11px] text-emerald-400 font-mono mt-0.5">
                        Matched Team: {eligibilityResult.details.team} ({eligibilityResult.details.college})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {eligibilityError && (
                <div className="mt-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{eligibilityError}</span>
                </div>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* College & Team Name in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  College / Institution *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. Stanford / MIT"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Team Name *
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Quantum Hackers"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Set Account Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !eligibilityResult?.isApproved}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Lunch Pass & Provisioning Meal Token...
                </>
              ) : (
                <>
                  Create Account & Generate Lunch Pass
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already claimed your lunch pass?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2">
                Sign in to your Dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
