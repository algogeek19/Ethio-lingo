import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
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
      <div className="bg-[#181715] text-[#faf9f5] rounded-xl p-6 shadow-xl border border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-[#e8a55a] uppercase tracking-wider font-semibold">
            Daily Diagnostic Exam Window #19
          </span>
          <h1 className="font-serif font-bold text-2xl text-white mt-1">
            Microeconomics & Commercial Law Accountability
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-center">
            <span className="block text-[10px] text-stone-400 font-mono">TIME REMAINING</span>
            <span className="font-mono text-xl font-bold text-[#e8a55a]">
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Exam Quiz Area */}
      {!isSubmitted ? (
        <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-[#54433e] border-b border-[#e6dfd8] pb-3">
            <span>
              QUESTION {currentIdx + 1} OF {questions.length}
            </span>
            <span>
              Stake at Risk: <strong className="text-[#c64545]">{formatETB(wallet.penaltyRate)}</strong>
            </span>
          </div>

          <h3 className="font-serif font-bold text-xl text-[#1b1c1a] leading-relaxed">
            {currentQ.question}
          </h3>

          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = answers[currentIdx] === oIdx;
              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(currentIdx, oIdx)}
                  className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#181715] text-[#faf9f5] border-[#181715] shadow-md'
                      : 'bg-white text-[#1b1c1a] border-[#e6dfd8] hover:border-[#8f482f]'
                  }`}
                >
                  <span className="font-medium">{opt}</span>
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-xs ${
                      isSelected ? 'border-[#e8a55a] text-[#e8a55a]' : 'border-[#e6dfd8]'
                    }`}
                  >
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                </button>
              );
            })}
          </div>

          {answers[currentIdx] === undefined && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 font-mono text-center">
              Please select an answer option before proceeding to the next question.
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-[#e6dfd8]">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 border border-[#e6dfd8] rounded-lg text-xs font-semibold text-[#54433e] hover:bg-[#efeeea] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => {
                  if (answers[currentIdx] !== undefined) {
                    setCurrentIdx(currentIdx + 1);
                  }
                }}
                disabled={answers[currentIdx] === undefined}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                  answers[currentIdx] !== undefined
                    ? 'bg-[#8f482f] hover:bg-[#a9583e] text-white cursor-pointer'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
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
                className={`px-6 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all ${
                  answers[currentIdx] !== undefined
                    ? 'bg-[#5db872] hover:bg-[#4ea462] text-white cursor-pointer'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                }`}
              >
                Submit Exam & Validate Stake
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-8 text-center space-y-6 shadow-xl animate-fade-in">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              result.passed
                ? 'bg-[#5db872]/20 text-[#5db872]'
                : 'bg-[#c64545]/20 text-[#c64545]'
            }`}
          >
            {result.passed ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
          </div>

          <div className="space-y-2">
            <h2 className="font-serif font-bold text-3xl text-[#1b1c1a]">
              {result.passed ? 'Stake Protected!' : 'Penalty Deduction Applied'}
            </h2>
            <p className="text-sm text-[#54433e]">
              Score achieved: <strong className="font-mono text-lg">{result.score}%</strong> ({result.correctCount}/{result.total} correct)
            </p>
          </div>

          <div className="p-4 bg-[#181715] text-[#faf9f5] rounded-xl max-w-md mx-auto text-xs space-y-2 font-mono">
            {result.passed ? (
              <div className="text-[#5db872]">
                ✓ Streak extended! 100% of ETB {formatETB(wallet.stakedAmount)} remains safe in escrow.
              </div>
            ) : (
              <div className="text-[#c64545]">
                ⚠ Score below threshold (66%). ETB {formatETB(wallet.penaltyRate)} deducted into penalty pool.
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-[#8f482f] text-white font-semibold rounded-lg text-sm hover:bg-[#a9583e] flex items-center gap-2"
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
