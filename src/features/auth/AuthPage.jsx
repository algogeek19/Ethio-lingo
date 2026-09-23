import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Award, UserPlus, LogIn, AlertCircle, Eye, EyeOff, Phone, Users, Headphones, ShieldCheck } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useStaking } from '../../context/StakingContext';
import { api } from '../../services/api';
import { formatETB } from '../../utils/formatters';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Offline fallback placement questions (used only if the backend is unreachable)
const LOCAL_FALLBACK_QUESTIONS = [
  { id: 'fb1', question: 'She _____ to the library every day to study for her daily exam.', options: ['go', 'goes', 'going', 'gone'], answerIndex: 1 },
  { id: 'fb2', question: 'By the time we arrived at the classroom, the teacher _____ the lecture.', options: ['start', 'has started', 'had started', 'was started'], answerIndex: 2 },
  { id: 'fb3', question: 'If I _____ more time, I would practice listening skills every morning.', options: ['have', 'had', 'were having', 'would have'], answerIndex: 1 },
  { id: 'fb4', question: 'The learner _____ daily exam score was highest received a certificate.', options: ['who', 'whom', 'whose', 'which'], answerIndex: 2 },
  { id: 'fb5', question: 'He was praised _____ completing his 30-day curriculum without breaking streak.', options: ['with', 'for', 'about', 'on'], answerIndex: 1 },
  { id: 'fb6', question: 'Neither the instructor nor the students _____ present at the auditorium.', options: ['was', 'were', 'is', 'be'], answerIndex: 1 },
  { id: 'fb7', question: 'Hardly had she started reading the PDF book _____ the timer chimed.', options: ['than', 'when', 'then', 'while'], answerIndex: 1 },
  { id: 'fb8', question: 'The financial escrow policy requires that all stakes _____ locked for 30 days.', options: ['is', 'are', 'be', 'was'], answerIndex: 2 },
  { id: 'fb9', question: 'Having _____ the required 20-minute reading task, he opened the daily exam.', options: ['finish', 'finishing', 'completed', 'complete'], answerIndex: 2 },
  { id: 'fb10', question: 'The course material is far superior _____ any other language program available.', options: ['than', 'to', 'from', 'with'], answerIndex: 1 },
  { id: 'fb11', question: 'We have been studying English here _____ six months now.', options: ['for', 'since', 'during', 'while'], answerIndex: 0 },
  { id: 'fb12', question: 'The report _____ yesterday by the finance team was very detailed.', options: ['prepare', 'prepared', 'preparing', 'be prepared'], answerIndex: 1 },
  { id: 'fb13', question: '_____ walking to work every day, he also jogs in the evening.', options: ['Except', 'Beside', 'Besides', 'Apart'], answerIndex: 2 },
  { id: 'fb14', question: 'Each of the students _____ to submit their assignment by Friday.', options: ['have', 'has', 'are', 'were'], answerIndex: 1 },
  { id: 'fb15', question: 'The manager asked me where I _____ my training certificate.', options: ['did get', 'got', 'have got', 'had got'], answerIndex: 3 },
];

const LISTENING_MINUTES_OPTIONS = [
  { value: 15, label: '0–15 min / day', description: 'Light daily listening — fits a busy schedule.' },
  { value: 30, label: '15–30 min / day', description: 'Deeper daily listening — fastest progress.' },
];

const INTEREST_OPTIONS = ['Business', 'Travel', 'Health', 'Technology', 'Education', 'Music', 'Sports', 'Science'];
const LISTENING_CATEGORY_OPTIONS = ['Informative', 'Entertainment', 'Academic', 'News', 'Conversations', 'Music'];

const AuthPage = () => {
  const navigate = useNavigate();
  const { authUser, role, login, signup, googleLogin } = useRole();
  const { setInitialLevel, toggleFreeTrialMode } = useStaking();

  // Redirect depending on auth state (Google sign-in may produce an unverified admin-less learner)
  React.useEffect(() => {
    if (authUser) {
      if (role === 'admin' || authUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (authUser.emailVerified === false) {
        navigate('/verify', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [authUser, role, navigate]);

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [step, setStep] = useState('form');   // 'form' | 'onboarding' | 'level_choice' | 'quiz' | 'stake'

  // Credentials form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Onboarding / demographic state
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [interests, setInterests] = useState([]);
  const [listeningMinutes, setListeningMinutes] = useState(15);
  const [listeningCategories, setListeningCategories] = useState([]);

  // Grammar placement quiz state (server-sourced 15 questions)
  const [placementQuestions, setPlacementQuestions] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [evaluatedLevel, setEvaluatedLevel] = useState('Beginner I');
  const [scoreCount, setScoreCount] = useState(0);

  // Stake tier choice
  const [stakeOption, setStakeOption] = useState('stake_1000');

  // Google Identity Services button state
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiError, setGsiError] = useState('');
  const gsiButtonRef = useRef(null);
  const gsiInitializedRef = useRef(false);

  // Handle a successful Google ID-token credential
  const handleGoogleCredential = async (response) => {
    if (!response || !response.credential) {
      setAuthError('Google sign-in returned no credential. Please try again.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const result = await googleLogin(response.credential);
      if (result && result.success) {
        if (result.role === 'admin') {
          navigate('/admin');
        } else if (result.user && result.user.emailVerified === false) {
          navigate('/verify');
        } else {
          navigate('/dashboard');
        }
      } else {
        setAuthError(result?.message || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      setAuthError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load Google Identity Services client lazily and render the branded button
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
      if (cancelled) return;
      setGsiReady(!!window.google?.accounts?.id);
    });
    scriptEl.addEventListener('error', () => {
      if (cancelled) return;
      setGsiError('Google sign-in could not be loaded. Please try again or use email sign-in.');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Render the Google button once the library is available
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !gsiReady) return;
    if (gsiInitializedRef.current) return;
    if (!gsiButtonRef.current) return;

    gsiInitializedRef.current = true;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
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

  const toggleChip = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const loadPlacementQuestions = useCallback(async () => {
    if (placementQuestions) return placementQuestions;
    try {
      const res = await api.getPlacementQuestions();
      if (res && res.success && res.data && Array.isArray(res.data.questions) && res.data.questions.length >= 15) {
        setPlacementQuestions(res.data.questions);
        return res.data.questions;
      }
    } catch {}
    setPlacementQuestions(LOCAL_FALLBACK_QUESTIONS);
    return LOCAL_FALLBACK_QUESTIONS;
  }, [placementQuestions]);

  // Load placement questions as soon as the quiz step is reached
  useEffect(() => {
    if (step === 'quiz') {
      loadPlacementQuestions();
    }
  }, [step, loadPlacementQuestions]);

  // Handle Sign In submission
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result && result.success) {
      if (result.role === 'admin') {
        navigate('/admin');
      } else if (result.user && result.user.emailVerified === false) {
        navigate('/verify', { replace: true });
      } else {
        navigate('/dashboard');
      }
    } else {
      setAuthError(result?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  // Handle Sign Up initial form submission
  const handleSignUpForm = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setAuthError('');
    setStep('onboarding');
  };

  const validateOnboarding = () => {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const isValidPhone =
      cleanPhone === '' ||
      /^(?:\+?251|0)?9\d{8}$/.test(cleanPhone) ||
      /^\d{9,10}$/.test(cleanPhone);
    if (!isValidPhone) {
      setAuthError('Please enter a valid Ethiopian phone number (e.g. 0911223344 or +251911223344).');
      return false;
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 15 || parsedAge > 70) {
      setAuthError('Please select a valid age (15–70).');
      return false;
    }
    if (interests.length === 0) {
      setAuthError('Please select at least one learning interest.');
      return false;
    }
    const validMinutes = [15, 30];
    if (!validMinutes.includes(listeningMinutes)) {
      setAuthError('Please choose your daily listening track (0–15 min or 15–30 min per day).');
      return false;
    }
    if (listeningCategories.length === 0) {
      setAuthError('Please select at least one listening category.');
      return false;
    }
    return true;
  };

  const handleOnboardingSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!validateOnboarding()) return;
    setStep('level_choice');
  };

  // Choice A: Start directly as Beginner I
  const handleChooseBeginner = () => {
    setEvaluatedLevel('Beginner I');
    setScoreCount(0);
    setInitialLevel('Beginner I');
    setStep('stake');
  };

  // Choice B: Submit 15-Question Placement Quiz
  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    const questions = placementQuestions || LOCAL_FALLBACK_QUESTIONS;
    let score = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.answerIndex) {
        score++;
      }
    });

    // 15-question placement thresholds: >10 -> Intermediate I, 7-10 -> Beginner II, <7 -> Beginner I
    let assignedLevel = 'Beginner I';
    if (score > 10) {
      assignedLevel = 'Intermediate I';
    } else if (score >= 7) {
      assignedLevel = 'Beginner II';
    }

    setScoreCount(score);
    setEvaluatedLevel(assignedLevel);
    setInitialLevel(assignedLevel);
    setStep('stake');
  };

  // Finalize Sign Up and entry to portal
  const handleFinalSignUp = async () => {
    setIsSubmitting(true);
    const isTrial = stakeOption === 'free_trial';
    const res = await signup({
      name,
      email,
      password,
      level: evaluatedLevel,
      role: 'learner',
      isFreeTrial: isTrial,
      phone: phone.replace(/[\s-]/g, ''),
      age: parseInt(age, 10),
      interests,
      listeningMinutesPerDay: listeningMinutes,
      listeningCategories,
    });
    setIsSubmitting(false);

    if (!res || !res.success) {
      setAuthError(res?.message || 'Registration failed.');
      setStep('form');
      return;
    }

    toggleFreeTrialMode(isTrial);

    // Every new account is created in PENDING_VERIFICATION — require email verification first.
    if (res.user && res.user.emailVerified === false) {
      navigate('/verify', {
        replace: true,
        state: { debugCode: res.verification?.debugCode || null },
      });
      return;
    }

    navigate('/dashboard');
  };

  const renderChips = ({ options, selected, onToggle }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSel = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full border text-xs transition-all cursor-pointer focus-ring ${
              isSel
                ? 'bg-primary-coral text-white border-primary-coral font-semibold shadow-xs'
                : 'bg-surface-lowest text-on-surface-variant border-hairline hover:border-primary-coral'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="bg-canvas border border-hairline rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors duration-250">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-surface-card border border-hairline rounded-2xl flex items-center justify-center p-2 mx-auto shadow-md">
            <img src="/ethiolingo-logo.png" alt="Ethio-Lingo" className="w-full h-full object-contain" />
          </div>
          <h2 className="font-serif font-bold text-2xl text-on-surface">
            {mode === 'signin' ? 'Sign In to Ethio-Lingo' : 'Create Ethio-Lingo Account'}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {mode === 'signin'
              ? 'Access your daily learning workspace and escrow vault.'
              : 'Sign up for a secure learning account.'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In vs Sign Up) */}
        {step === 'form' && (
          <div className="flex bg-surface-card p-1 rounded-xl border border-hairline">
            <button
              onClick={() => {
                setMode('signin');
                setEmail('');
                setPassword('');
                setAuthError('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer ${
                mode === 'signin'
                  ? 'bg-primary-coral text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => {
                setMode('signup');
                setEmail('');
                setPassword('');
                setName('');
                setAuthError('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer ${
                mode === 'signup'
                  ? 'bg-primary-coral text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {authError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2.5 font-mono">
            <AlertCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Google Identity Sign-In (only visible when a client ID is configured) */}
        {step === 'form' && GOOGLE_CLIENT_ID && (
          <div className="space-y-3">
            {gsiError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {gsiError}
              </p>
            )}
            <div ref={gsiButtonRef} className="w-full min-h-[46px] flex items-center justify-center" />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-hairline" />
              <span className="text-[10px] text-on-surface-variant uppercase font-mono font-semibold tracking-wider">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-hairline" />
            </div>
          </div>
        )}

        {/* Google-verified email notice */}
        {step === 'form' && (
          <p className="text-[11px] text-on-surface-variant font-mono flex items-center gap-1.5 leading-relaxed">
            <ShieldCheck size={13} className="shrink-0 text-primary-coral" />
            Only Google-verified email addresses (Gmail) are accepted — no temporary or disposable emails.
          </p>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && step === 'form' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="User@example.com"
                className="w-full px-4 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-4 pr-11 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm mt-4 cursor-pointer btn-interactive focus-ring"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && step === 'form' && (
          <form onSubmit={handleSignUpForm} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abebe Kebede"
                className="w-full px-4 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-4 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 6 chars)"
                  className="w-full pl-4 pr-11 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm mt-4 cursor-pointer btn-interactive focus-ring"
            >
              <span>Continue to Profile Setup</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STEP 1B: Onboarding / Demographics Profile */}
        {mode === 'signup' && step === 'onboarding' && (
          <form onSubmit={handleOnboardingSubmit} className="space-y-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-surface-card border border-hairline text-primary-coral font-mono text-[10px] font-bold rounded uppercase">
                ONBOARDING PROFILE
              </span>
              <h3 className="font-serif font-bold text-xl text-on-surface">Tell us about your learning goals</h3>
              <p className="text-xs text-on-surface-variant">
                Your daily listening track is personalized to your interests and schedule.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                <Phone size={13} /> Phone Number (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0911223344"
                className="w-full px-4 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
              />
              <p className="text-[11px] text-on-surface-variant font-mono mt-1">Used for profile only. SMS verification is disabled in this build.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Age (15–70)
              </label>
              <select
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
              >
                <option value="">Select age...</option>
                {Array.from({ length: 56 }, (_, i) => i + 15).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                What are you most interested in learning about?
              </label>
              {renderChips({ options: INTEREST_OPTIONS, selected: interests, onToggle: (v) => toggleChip(interests, setInterests, v) })}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                <Headphones size={13} /> Daily Listening Track
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LISTENING_MINUTES_OPTIONS.map((opt) => {
                  const isSelected = listeningMinutes === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setListeningMinutes(opt.value)}
                      aria-pressed={isSelected}
                      className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer focus-ring btn-interactive ${
                        isSelected
                          ? 'border-primary-coral bg-primary-coral/10 shadow-sm'
                          : 'border-hairline bg-surface-lowest hover:border-primary-coral/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-serif font-bold text-sm ${isSelected ? 'text-primary-coral' : 'text-on-surface'}`}>
                          {opt.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isSelected ? 'bg-primary-coral text-white' : 'bg-surface-card text-on-surface-variant border border-hairline'
                        }`}>
                          {isSelected ? '✓ Chosen' : 'Choose'}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-on-surface-variant font-mono mt-1.5">
                Your personalized daily listening track: {listeningMinutes} min/day.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                <Users size={13} /> Listening categories you prefer
              </label>
              {renderChips({
                options: LISTENING_CATEGORY_OPTIONS,
                selected: listeningCategories,
                onToggle: (v) => toggleChip(listeningCategories, setListeningCategories, v),
              })}
              <p className="text-[11px] text-on-surface-variant font-mono mt-1">
                These power your personalized daily listening track content.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer btn-interactive focus-ring"
            >
              <span>Continue to Level Placement</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STEP 2: Level Placement Choice */}
        {step === 'level_choice' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-surface-card border border-hairline text-primary-coral font-mono text-[10px] font-bold rounded uppercase">
                ONBOARDING LEVEL PLACEMENT
              </span>
              <h3 className="font-serif font-bold text-xl text-on-surface">Set your starting curriculum level</h3>
              <p className="text-xs text-on-surface-variant">
                Placement quiz maps you to <strong>Beginner I</strong>, <strong>Beginner II</strong>, or <strong>Intermediate I</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div
                onClick={handleChooseBeginner}
                className="p-5 rounded-2xl border border-hairline bg-surface-lowest hover:border-primary-coral hover:bg-surface-soft cursor-pointer transition-all space-y-2 group btn-interactive"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-on-surface group-hover:text-primary-coral">
                    Start Directly as Beginner I
                  </h4>
                  <span className="px-2 py-0.5 bg-surface-card text-on-surface-variant text-[10px] font-mono font-bold rounded">
                    BEGINNER I TRACK
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Skip placement testing and begin immediately at the primary Beginner I level.
                </p>
              </div>

              <div
                onClick={() => setStep('quiz')}
                className="p-5 rounded-2xl border border-primary-coral bg-surface-soft cursor-pointer transition-all space-y-2 group btn-interactive"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-primary-coral">
                    Take 15-Question Placement Quiz
                  </h4>
                  <span className="px-2 py-0.5 bg-primary-coral text-white text-[10px] font-mono font-bold rounded">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Answer 15 diagnostic English questions. Score &gt;10 → Intermediate I, 7–10 → Beginner II, &lt;7 → Beginner I.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2B: 15-Question Placement Quiz */}
        {step === 'quiz' && (
          <form onSubmit={handleQuizSubmit} className="space-y-6">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-surface-card border border-hairline text-primary-coral font-mono text-[10px] font-bold rounded uppercase">
                15-QUESTION ENGLISH PLACEMENT QUIZ
              </span>
              <h3 className="font-serif font-bold text-xl text-on-surface">Placement Diagnostic Test</h3>
              <p className="text-xs text-on-surface-variant">Select the correct answer for each sentence to determine your level.</p>
            </div>

            {!placementQuestions ? (
              <div className="p-8 text-center text-sm text-on-surface-variant border border-hairline rounded-xl bg-surface-lowest animate-skeleton">
                Loading placement questions...
              </div>
            ) : (
              <>
                <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                  {placementQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 bg-surface-lowest border border-hairline rounded-xl space-y-3">
                      <div className="text-xs font-mono font-semibold text-primary-coral">
                        QUESTION {idx + 1} OF {placementQuestions.length}
                      </div>
                      <p className="font-serif font-medium text-sm text-on-surface">{q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = quizAnswers[idx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setQuizAnswers({ ...quizAnswers, [idx]: oIdx })}
                              className={`p-2.5 rounded-lg border text-xs text-left transition-all cursor-pointer focus-ring ${
                                isSelected
                                  ? 'bg-primary-coral text-white border-primary-coral font-semibold shadow-xs ring-2 ring-primary-coral/40'
                                  : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary-coral'
                              }`}
                            >
                              <span className="font-mono mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={Object.keys(quizAnswers).length < placementQuestions.length}
                  className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer btn-interactive focus-ring"
                >
                  <span>Submit Placement Test & Evaluate</span>
                  <Award size={16} />
                </button>
              </>
            )}
          </form>
        )}

        {/* STEP 3: Stake Commitment Choice */}
        {step === 'stake' && (
          <div className="space-y-6">
            <div className="p-4 bg-green-500/15 border border-green-500/30 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-success-green font-semibold text-sm">
                <CheckCircle size={18} />
                <span>Assigned Placement Level: {evaluatedLevel}</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {scoreCount > 0
                  ? `You scored ${scoreCount}/15 on the placement test and earned placement in ${evaluatedLevel}!`
                  : `You are starting in the ${evaluatedLevel} curriculum track.`}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase">
                Choose Access Mode
              </label>

              <div
                onClick={() => setStakeOption('stake_1000')}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 btn-interactive ${
                  stakeOption === 'stake_1000'
                    ? 'border-primary-coral bg-surface-soft ring-1 ring-primary-coral'
                    : 'border-hairline bg-surface-lowest hover:border-primary-coral'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-lg text-on-surface">
                    Accountability Stake Tier ({formatETB(1000)})
                  </span>
                  <span className="px-2 py-0.5 bg-primary-coral text-white text-[10px] font-mono font-bold rounded">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Deposit ETB 1,000 via manual bank transfer into escrow. A <strong>0% platform fee</strong> applies, locking the full <strong>1,000 ETB</strong> in your vault. Pass daily tasks and exams to protect your money!
                </p>
              </div>

              <div
                onClick={() => setStakeOption('free_trial')}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 btn-interactive ${
                  stakeOption === 'free_trial'
                    ? 'border-primary-coral bg-surface-soft ring-1 ring-primary-coral'
                    : 'border-hairline bg-surface-lowest hover:border-primary-coral'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-lg text-on-surface">
                    3-Day Free Trial Mode
                  </span>
                  <span className="px-2 py-0.5 bg-surface-card border border-hairline text-on-surface-variant text-[10px] font-mono font-bold rounded">
                    3 DAYS FREE
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Enjoy 3 days of free trial modules without financial stake or penalties. Upgrade anytime to unlock the full 30-day staked curriculum.
                </p>
              </div>
            </div>

            <button
              onClick={handleFinalSignUp}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer btn-interactive focus-ring"
            >
              <span>{isSubmitting ? 'Creating Account...' : 'Complete Account Creation & Enter Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;