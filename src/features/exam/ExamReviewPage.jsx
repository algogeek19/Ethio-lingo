import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';

const formatDateTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const AttemptCard = ({ attempt, isOpen, onToggle }) => {
  const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
  const correctCount = answers.filter((a) => a.isCorrect).length;

  return (
    <motion.div
      layout
      className="bg-surface-container-lowest border border-hairline rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Attempt Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus-ring hover:bg-surface-container-high/40 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
              attempt.passed
                ? 'bg-success-green/15 text-success-green border-success-green/30'
                : 'bg-destructive-red/15 text-destructive-red border-destructive-red/30'
            }`}
          >
            {attempt.passed ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div className="min-w-0">
            <span
              className={`inline-block px-2 py-0.5 font-mono text-[9px] font-bold rounded-full uppercase tracking-wider ${
                attempt.passed
                  ? 'bg-success-green/15 text-success-green'
                  : 'bg-destructive-red/15 text-destructive-red'
              }`}
            >
              {attempt.passed ? 'PASSED' : 'FAILED'}
            </span>
            <h3 className="font-cormorant text-lg font-medium text-on-surface mt-1 truncate">
              {attempt.level} — Day {attempt.dayNumber}
            </h3>
            <p className="text-[10px] font-mono text-on-surface-variant truncate">
              {formatDateTime(attempt.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center">
            <span className="font-mono text-lg font-bold text-on-surface block tabular-nums">
              {attempt.score}/{attempt.totalQuestions}
            </span>
            <span className="mono-micro-label text-on-surface-variant">Score</span>
          </div>
          <div className="text-center">
            <span className="font-mono text-lg font-bold text-primary block tabular-nums">
              {attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0}%
            </span>
            <span className="mono-micro-label text-on-surface-variant">Percent</span>
          </div>
          {isOpen ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-on-surface-variant" />}
        </div>
      </button>

      {/* Expandable Review */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-hairline/60 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                <span className="text-xs font-mono text-on-surface-variant">
                  Passing threshold: <strong className="text-primary">{attempt.passThreshold}/{attempt.totalQuestions}</strong>
                </span>
                <span className="text-xs font-mono text-on-surface-variant">
                  <strong className={correctCount === attempt.totalQuestions ? 'text-success-green' : 'text-on-surface'}>
                    {correctCount} matched
                  </strong> / {answers.length} answered
                </span>
              </div>

              {answers.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-on-surface-variant bg-surface-container-low rounded-xl">
                  No per-question details recorded for this attempt.
                </div>
              ) : (
                <div className="space-y-3">
                  {answers.map((a, idx) => {
                    const correct = !!a.isCorrect;
                    return (
                      <div
                        key={a.questionId || idx}
                        className={`p-4 rounded-xl border transition-all ${
                          correct
                            ? 'bg-success-green/5 border-success-green/25'
                            : 'bg-destructive-red/5 border-destructive-red/25'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {correct ? (
                            <CheckCircle2 size={15} className="text-success-green shrink-0" />
                          ) : (
                            <XCircle size={15} className="text-destructive-red shrink-0" />
                          )}
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${correct ? 'text-success-green' : 'text-destructive-red'}`}>
                            {correct ? '✓ Matched' : '✗ Incorrect'} — Question {idx + 1}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-on-surface leading-relaxed">{a.question}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-xs">
                          <div className={`p-2.5 rounded-lg font-mono ${correct ? 'bg-success-green/10 border border-success-green/25' : 'bg-destructive-red/10 border border-destructive-red/25'}`}>
                            <span className={`font-bold block text-[10px] uppercase tracking-wider mb-0.5 ${correct ? 'text-success-green' : 'text-destructive-red'}`}>
                              Your answer
                            </span>
                            <span className={correct ? 'text-success-green' : 'text-destructive-red'}>
                              {a.yourAnswer || '(Not answered)'}
                            </span>
                          </div>
                          <div className="p-2.5 bg-success-green/10 border border-success-green/25 rounded-lg font-mono">
                            <span className="font-bold text-success-green block text-[10px] uppercase tracking-wider mb-0.5">
                              Correct answer
                            </span>
                            <span className="text-success-green">{a.correctAnswer}</span>
                          </div>
                        </div>

                        {a.explanation && (
                          <div className="pt-2">
                            <span className="font-bold text-primary text-[10px] uppercase tracking-wider">Explanation</span>
                            <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">{a.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ExamReviewPage = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadAttempts = async () => {
      try {
        const res = await api.getMyExamAttempts();
        if (mounted && res && res.success) {
          const list = Array.isArray(res.data) ? res.data : [];
          setAttempts(list);
          if (list.length > 0) setOpenId(list[0].id); // auto-open the newest attempt
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load exam history.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAttempts();
    return () => {
      mounted = false;
    };
  }, []);

  const totalTaken = attempts.length;
  const passedCount = attempts.filter((a) => a.passed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-4xl mx-auto py-8 px-4 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <span className="mono-micro-label text-primary font-bold">
            Exam History & Mistake Review
          </span>
          <h1 className="font-cormorant text-3xl sm:text-4xl font-medium text-on-surface leading-tight">
            Review Your Exam Results
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Every exam you have taken — review your wrong and correct answers to learn from your mistakes.
          </p>
        </div>
        <Link
          to="/exam"
          className="px-5 py-2.5 bg-surface-container border border-hairline text-on-surface rounded-full text-xs font-semibold flex items-center gap-2 hover:bg-surface-container-high hover:border-primary transition-colors focus-ring"
        >
          <ArrowLeft size={14} />
          <span>Back to Exam</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 bg-destructive-red/10 border border-destructive-red/30 rounded-xl text-xs text-destructive-red font-mono">
          {error}
        </div>
      )}

      {/* Summary Strip */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-5 text-center shadow-xs">
            <BookOpen size={18} className="text-primary mx-auto mb-2" />
            <span className="font-cormorant text-3xl font-medium text-on-surface block tabular-nums">{totalTaken}</span>
            <span className="mono-micro-label text-on-surface-variant">Exams Taken</span>
          </div>
          <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-5 text-center shadow-xs">
            <ShieldCheck size={18} className="text-success-green mx-auto mb-2" />
            <span className="font-cormorant text-3xl font-medium text-success-green block tabular-nums">{passedCount}</span>
            <span className="mono-micro-label text-on-surface-variant">Passed</span>
          </div>
          <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-5 text-center shadow-xs">
            <ShieldAlert size={18} className="text-destructive-red mx-auto mb-2" />
            <span className="font-cormorant text-3xl font-medium text-destructive-red block tabular-nums">{totalTaken - passedCount}</span>
            <span className="mono-micro-label text-on-surface-variant">Failed</span>
          </div>
        </div>
      )}

      {/* Attempts List */}
      {loading ? (
        <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-8 space-y-4 animate-skeleton shadow-xs">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-surface-card rounded-xl" />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <ShieldCheck size={40} className="text-on-surface-variant/40 mx-auto" />
          <p className="text-sm font-mono text-on-surface-variant">No exam results yet.</p>
          <p className="text-xs text-on-surface-variant/70">
            Once you take your first daily exam, every result (pass or fail) will appear here for review.
          </p>
          <Link
            to="/exam"
            className="inline-flex items-center gap-2 mt-2 px-6 py-3 bg-primary text-on-primary text-xs font-semibold uppercase tracking-wider rounded-full transition-all hover:bg-primary-container focus-ring btn-interactive"
          >
            <RefreshCw size={14} />
            <span>Take the Daily Exam</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              isOpen={openId === attempt.id}
              onToggle={() => setOpenId(openId === attempt.id ? null : attempt.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ExamReviewPage;