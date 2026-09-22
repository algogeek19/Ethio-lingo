import { useExamStore } from '../exam.store';

export const useExam = () => {
  const questions = useExamStore((state) => state.questions);
  const currentIdx = useExamStore((state) => state.currentIdx);
  const answers = useExamStore((state) => state.answers);
  const timerSeconds = useExamStore((state) => state.timerSeconds);
  const isSubmitted = useExamStore((state) => state.isSubmitted);
  const result = useExamStore((state) => state.result);

  const setAnswer = useExamStore((state) => state.setAnswer);
  const setCurrentIdx = useExamStore((state) => state.setCurrentIdx);
  const setTimerSeconds = useExamStore((state) => state.setTimerSeconds);
  const setSubmittedResult = useExamStore((state) => state.setSubmittedResult);
  const resetExam = useExamStore((state) => state.resetExam);

  return {
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
    resetExam,
  };
};
