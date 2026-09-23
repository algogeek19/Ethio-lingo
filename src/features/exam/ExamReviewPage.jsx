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
      className="bg-surface-lowest border border-hairline rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Attempt Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus-ring hover:bg-surface-card/40 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              attempt.passed
                ? 'bg-green-500/15 text-success-green'
                : 'bg-red-500/15 text-destructive-red'
            }`}
          >
            {attempt.passed ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div className="min-w-0">
            <span
              className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded uppercase tracking-wider ${
                attempt.passed
                  ? 'bg-green-500/15 text-success-green'
                  : 'bg-red-500/15 text-destructive-red'
              }`}
            >
              {attempt.passed ? 'PASSED' : 'FAILED'}
            </span>
            <h3 className="font-serif font-bold text-base text-on-surface mt-1 truncate">
              {attempt.level} — Day {attempt.dayNumber}
            </h3>
            <p className="text-[11px] font-mono text-on-surface-variant truncate">
              {formatDateTime(attempt.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center">
            <span className="font-mono text-xl font-bold text-on-surface block">
              {attempt.score}/{attempt.totalQuestions}
            </span>
            <span className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
              Score
            </span>
          </div>
          <div className="text-center">
            <span className="font-mono text-xl font-bold text-primary-coral block">
              {attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0}%
            </span>
            <span className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
              Percent
            </span>
          </div>
          {isOpen ? <ChevronUp size={18} className="text-primary-coral" /> : <ChevronDown size={18} className="text-on-surface-variant" />}
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
            <div className="px-5 pb-5 pt-1 border-t border-hairline space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                <span className="text-xs font-mono text-on-surface-variant">
                  Passing threshold: <strong className="text-primary-coral">{attempt.passThreshold}/{attempt.totalQuestions}</strong>
                </span>
                <span className="text-xs font-mono text-on-surface-variant">
                  <strong className={correctCount === attempt.totalQuestions ? 'text-success-green' : 'text-on-surface'}>
                    {correctCount} matched
                  </strong> / {answers.length} answered
                </span>
              </div>

              {answers.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-on-surface-variant bg-surface-card/40 rounded-xl">
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
                            ? 'bg-green-500/5 border-green-500/25'
                            : 'bg-red-500/5 border-red-500/25'
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
                          <div className={`p-2.5 rounded-lg font-mono ${correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                            <span className={`font-bold block text-[10px] uppercase tracking-wider mb-0.5 ${correct ? 'text-success-green' : 'text-destructive-red'}`}>
                              Your answer
                            </span>
                            <span className={correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                              {a.yourAnswer || '(Not answered)'}
                            </span>
                          </div>
                          <div className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg font-mono">
                            <span className="font-bold text-success-green block text-[10px] uppercase tracking-wider mb-0.5">
                              Correct answer
                            </span>
                            <span className="text-green-700 dark:text-green-300">{a.correctAnswer}</span>
                          </div>
                        </div>

                        {a.explanation && (
                          <div className="pt-2">
                            <span className="font-bold text-primary-coral text-[10px] uppercase tracking-wider">Explanation</span>
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
        <div>
          <span className="text-xs font-mono text-primary-coral uppercase tracking-wider font-bold">
            Exam History & Mistake Review
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-on-surface mt-1">
            Review Your Exam Results
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Every exam you have taken — review your wrong and correct answers to learn from your mistakes.
          </p>
        </div>
        <Link
          to="/exam"
          className="px-4 py-2.5 bg-surface-card border border-hairline text-on-surface rounded-xl text-xs font-semibold flex items-center gap-2 hover:border-primary-coral transition-colors focus-ring"
        >
          <ArrowLeft size={14} />
          <span>Back to Exam</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 font-mono">
          {error}
        </div>
      )}

      {/* Summary Strip */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-lowest border border-hairline rounded-2xl p-4 text-center">
            <BookOpen size={18} className="text-primary-coral mx-auto mb-1.5" />
            <span className="font-mono text-2xl font-bold text-on-surface block">{totalTaken}</span>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Exams Taken</span>
          </div>
          <div className="bg-surface-lowest border border-hairline rounded-2xl p-4 text-center">
            <ShieldCheck size={18} className="text-success-green mx-auto mb-1.5" />
            <span className="font-mono text-2xl font-bold text-success-green block">{passedCount}</span>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Passed</span>
          </div>
          <div className="bg-surface-lowest border border-hairline rounded-2xl p-4 text-center">
            <ShieldAlert size={18} className="text-destructive-red mx-auto mb-1.5" />
            <span className="font-mono text-2xl font-bold text-destructive-red block">{totalTaken - passedCount}</span>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Failed</span>
          </div>
        </div>
      )}

      {/* Attempts List */}
      {loading ? (
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-8 space-y-4 animate-skeleton">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-surface-card rounded-xl" />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-10 text-center space-y-3">
          <ShieldCheck size={40} className="text-on-surface-variant/40 mx-auto" />
          <p className="text-sm font-mono text-on-surface-variant">No exam results yet.</p>
          <p className="text-xs text-on-surface-variant/70">
            Once you take your first daily exam, every result (pass or fail) will appear here for review.
          </p>
          <Link
            to="/exam"
            className="inline-flex items-center gap-2 mt-2 px-5 py-3 bg-primary-coral hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all focus-ring btn-interactive"
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