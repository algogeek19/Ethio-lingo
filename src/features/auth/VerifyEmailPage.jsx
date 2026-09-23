import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, KeyRound, RefreshCw, CheckCircle, LogOut, AlertCircle, MailCheck } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { api } from '../../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, refreshUser, logout } = useRole();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [debugCode, setDebugCode] = useState(
    (location.state && location.state.debugCode) || null
  );

  // Google Identity Services for "Verify with Google"
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiError, setGsiError] = useState('');
  const gsiButtonRef = useRef(null);
  const gsiInitializedRef = useRef(false);

  const email = authUser?.email || '';

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    let scriptEl = document.getElementById('gsi-client-script');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'gsi-client-script';
      scriptEl.src = 'https://accounts.google.com/gsi/client';
      scriptEl.async = true;
      scriptEl.defer = true;
      document.head.appendChild(scriptEl);
    }
    scriptEl.addEventListener('load', () => {
      if (!cancelled) setGsiReady(!!window.google?.accounts?.id);
    });
    scriptEl.addEventListener('error', () => {
      if (!cancelled) setGsiError('Google sign-in could not be loaded.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !gsiReady || gsiInitializedRef.current || !gsiButtonRef.current) return;
    gsiInitializedRef.current = true;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleVerify,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(gsiButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: gsiButtonRef.current.clientWidth || 320,
        logo_alignment: 'left',
      });
    } catch (err) {
      console.error('Google Identity initialize failed:', err);
      setGsiError('Google sign-in could not be initialized.');
    }
  }, [gsiReady]);

  const handleGoogleVerify = async (response) => {
    if (!response || !response.credential) {
      setError('Google verification returned no credential. Please try again.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const res = await api.verifyEmailByGoogle(response.credential);
      if (res && res.success) {
        await refreshUser();
        navigate('/dashboard');
      } else {
        setError(res?.message || 'Google verification failed.');
      }
    } catch (err) {
      setError(err?.message || 'Google verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyByCode = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const res = await api.verifyEmailByCode(code.trim());
      if (res && res.success) {
        await refreshUser();
        navigate('/dashboard');
      } else {
        setError(res?.message || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setNotice('');
    try {
      const res = await api.resendVerificationCode();
      if (res && res.success) {
        setNotice(res.message || 'A new verification code has been issued.');
        if (res.data && res.data.debugCode) {
          setDebugCode(res.data.debugCode);
        }
      } else {
        setError(res?.message || 'Could not resend verification code.');
      }
    } catch (err) {
      setError(err?.message || 'Could not resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full bg-white border-2 border-[#e6dfd8] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
        {/* Top Gradient Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#8f482f] via-[#e8a55a] to-[#181715]" />

        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-[#faf9f5] border border-[#e6dfd8] flex items-center justify-center mx-auto text-[#8f482f] shadow-inner">
            <MailCheck size={32} className="text-[#8f482f]" />
          </div>

          <div className="inline-block px-3 py-1 bg-[#181715] text-[#e8a55a] font-mono text-[10px] font-bold rounded uppercase tracking-wider">
            EMAIL VERIFICATION REQUIRED
          </div>

          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#1b1c1a]">
            Verify your Google email
          </h2>

          <p className="text-xs sm:text-sm text-[#54433e] max-w-md mx-auto leading-relaxed">
            To keep Ethio-Lingo free of bots and temporary accounts, every account must be
            tied to a <strong>Google-verified email address</strong>. We sent a 6-digit code to{' '}
            <strong className="break-all text-[#8f482f]">{email || 'your email'}</strong> — or verify
            instantly with your Google account below.
          </p>
        </div>

        {/* Error / Notice */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2.5 font-mono">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="p-3.5 bg-[#eef7ee] border border-[#c3e6c3] text-[#2b662b] text-xs rounded-xl flex items-center gap-2.5 font-mono">
            <CheckCircle size={16} className="shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Dev-only debug code */}
        {debugCode && (
          <div className="p-4 bg-[#f5f0e8] border-2 border-dashed border-[#e8a55a] rounded-xl space-y-1.5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8f482f]">
              ⚠ Development Verification Code (no SMTP in this build)
            </div>
            <div className="font-mono text-2xl font-bold tracking-[0.3em] text-[#1b1c1a] text-center py-1">
              {debugCode}
            </div>
            <p className="text-[10px] text-[#6c6a64] text-center">
              Enter this 6-digit code below to simulate receiving the email.
            </p>
          </div>
        )}

        {/* Verify with Google */}
        {GOOGLE_CLIENT_ID && (
          <div className="space-y-3">
            {gsiError && (
              <p className="text-xs text-red-600 font-mono bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {gsiError}
              </p>
            )}
            <div ref={gsiButtonRef} className="w-full min-h-[46px] flex items-center justify-center" />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e6dfd8]" />
              <span className="text-[10px] text-[#6c6a64] uppercase font-mono font-semibold tracking-wider">
                or enter the code
              </span>
              <div className="h-px flex-1 bg-[#e6dfd8]" />
            </div>
          </div>
        )}

        {/* Code entry form */}
        <form onSubmit={handleVerifyByCode} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54433e] uppercase tracking-wider mb-1">
              <KeyRound size={13} className="text-[#8f482f]" /> 6-Digit Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-center font-mono text-2xl tracking-[0.4em] text-[#1b1c1a] focus-ring"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={verifying || !code || code.length !== 6}
            className="w-full py-3 bg-[#8f482f] hover:bg-[#a9583e] disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            {verifying ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            <span>{verifying ? 'Verifying...' : 'Verify Email & Unlock Learning'}</span>
          </button>
        </form>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 bg-[#181715] hover:bg-[#282622] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
              <span>{resending ? 'Sending...' : 'Resend Verification Code'}</span>
            </button>
          </div>

          <div className="flex justify-between items-center text-xs font-mono pt-2">
            <span className="text-[#6c6a64]">Logged in as: {email}</span>
            <button
              onClick={() => {
                logout();
                navigate('/auth');
              }}
              className="text-red-600 hover:text-red-800 font-bold flex items-center gap-1"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;