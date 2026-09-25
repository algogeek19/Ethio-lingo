import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useExam } from '../hooks/useExam';
import { useWallet } from '../../wallet/hooks/useWallet';
import { formatETB } from '../../../lib/formatters';

export const ExamRunner = () => {
  const navigate = useNavigate();
  const { wallet, submitExamResult } = useWallet();
  const {
    questions,
    currentIdx,
    answers,
    timerSeconds,
    isSubmitted,
    result,
    setAnswer,
    setCurrentIdx,
    setTimerSeconds,
    setSubmittedResult,
  } = useExam();

  useEffect(() => {
    if (isSubmitted || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(timerSeconds - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, timerSeconds, setTimerSeconds]);

  const handleSelectOption = (qIdx, optionIdx) => {
    if (isSubmitted) return;
    setAnswer(qIdx, optionIdx);
  };

  const handleFinishExam = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= 66;

    const res = {
      score: percentage,
      correctCount,
      total: questions.length,
      passed,
    };

    setSubmittedResult(res);

    if (passed) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    submitExamResult(percentage, passed);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-[9px] bg-tertiary-fixed-dim/30 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-[0.2em]">
              Escrow at Stake
            </span>
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em]">
              · {questions.length} Questions · 66% Pass Required
            </span>
          </div>
          <h1 className="font-cormorant text-3xl text-on-surface font-medium leading-tight">
            Daily Diagnostic Exam
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em]">Penalty for Failure</span>
            <span className="font-cormorant text-2xl text-tertiary font-bold tabular-nums">
              -{formatETB(wallet.penaltyRate)}
            </span>
          </div>
          <div className="h-12 w-px bg-hairline/60 hidden sm:block" />
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] flex items-center gap-1">
              <Clock size={11} className="text-warning-amber" />
              <span>Time Remaining</span>
            </span>
            <span className="font-mono text-2xl font-bold text-warning-amber tabular-nums leading-tight">
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Exam Quiz Area */}
      {!isSubmitted ? (
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-hairline/60 shadow-sm max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between pb-4 border-b border-hairline/60">
            <span className="font-mono text-[11px] text-primary font-bold tracking-widest uppercase">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              Stake at Risk: <strong className="text-primary">{formatETB(wallet.penaltyRate)}</strong>
            </span>
          </div>

          <h3 className="font-cormorant text-2xl text-on-surface leading-snug font-medium pt-5">
            {currentQ.question}
          </h3>

          <div className="flex flex-col gap-3 pt-5">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = answers[currentIdx] === oIdx;
              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(currentIdx, oIdx)}
                  className={`w-full text-left p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high cursor-pointer border transition-all flex items-center justify-between gap-4 focus-ring ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/40'
                      : 'border-hairline/40'
                  }`}
                >
                  <span className={`text-xs sm:text-sm ${isSelected ? 'font-medium text-on-surface' : 'text-on-surface'}`}>
                    {opt}
                  </span>
                  <span
                    className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-xs shrink-0 ${
                      isSelected ? 'border-primary text-primary font-bold' : 'border-hairline text-text-muted'
                    }`}
                  >
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                </button>
              );
            })}
          </div>

          {answers[currentIdx] === undefined && (
            <div className="p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-xl text-xs text-warning-amber font-mono text-center flex items-center justify-center gap-2 mt-5">
              <span className="w-2 h-2 rounded-full bg-warning-amber animate-ping" />
              <span>Please select an answer option before proceeding to the next question.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-hairline/60">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-5 py-2.5 border border-hairline/40 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed focus-ring cursor-pointer transition-colors"
            >
              &larr; Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => {
                  if (answers[currentIdx] !== undefined) {
                    setCurrentIdx(currentIdx + 1);
                  }
                }}
                disabled={answers[currentIdx] === undefined}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm transition-all focus-ring ${
                  answers[currentIdx] !== undefined
                    ? 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer btn-interactive'
                    : 'bg-surface-card text-text-muted cursor-not-allowed opacity-60'
                }`}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => {
                  if (answers[currentIdx] !== undefined) {
                    handleFinishExam();
                  }
                }}
                disabled={answers[currentIdx] === undefined}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm transition-all focus-ring ${
                  answers[currentIdx] !== undefined
                    ? 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer btn-interactive'
                    : 'bg-surface-card text-text-muted cursor-not-allowed opacity-60'
                }`}
              >
                Submit & Validate Stake
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm max-w-4xl mx-auto w-full animate-fade-in">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border ${
              result.passed
                ? 'bg-success-green/15 text-success-green border-success-green/30'
                : 'bg-destructive-red/15 text-destructive-red border-destructive-red/30'
            }`}
          >
            {result.passed ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
          </div>

          <div className="space-y-2">
            <span className={`inline-block px-3 py-1 font-mono text-[9px] font-bold rounded-full uppercase tracking-[0.2em] ${
              result.passed
                ? 'bg-success-green/15 text-success-green'
                : 'bg-destructive-red/15 text-destructive-red'
            }`}>
              {result.passed ? 'Stake Protected' : 'Penalty Deducted'}
            </span>
            <h2 className="font-cormorant text-3xl font-medium text-on-surface mt-2">
              {result.passed ? 'Stake Protected!' : 'Penalty Deduction Applied'}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Score achieved: <strong className="font-mono text-lg text-on-surface tabular-nums">{result.score}%</strong> ({result.correctCount}/{result.total} correct)
            </p>
          </div>

          <div className="p-4 bg-surface-dark text-stone-300 rounded-xl max-w-md mx-auto text-xs space-y-2 font-mono border border-stone-800">
            {result.passed ? (
              <div className="text-success-green">
                ✓ Streak extended! 100% of ETB {formatETB(wallet.stakedAmount)} remains safe in escrow.
              </div>
            ) : (
              <div className="text-destructive-red">
                ⚠ Score below threshold (66%). ETB {formatETB(wallet.penaltyRate)} deducted into penalty pool.
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider hover:bg-primary-container flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer"
            >
              <span>Return to Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};