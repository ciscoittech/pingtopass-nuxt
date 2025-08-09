import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  Exam, 
  Question, 
  QuestionWithAnswers, 
  StudySession, 
  UserProgress, 
  UserAnswer,
  ExamListItem 
} from '~/types/exam';

export const useExamStore = defineStore('exam', () => {
  // State
  const exams = ref<ExamListItem[]>([]);
  const currentExam = ref<Exam | null>(null);
  const currentSession = ref<StudySession | null>(null);
  const questions = ref<QuestionWithAnswers[]>([]);
  const currentQuestion = ref<QuestionWithAnswers | null>(null);
  const currentQuestionIndex = ref(0);
  const userAnswers = ref<UserAnswer[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Timer state
  const timeRemaining = ref(0); // in seconds
  const isTimerActive = ref(false);
  const timerInterval = ref<NodeJS.Timeout | null>(null);

  // Getters
  const totalQuestions = computed(() => questions.value.length);
  const answeredQuestions = computed(() => userAnswers.value.length);
  const progress = computed(() => 
    totalQuestions.value > 0 ? (answeredQuestions.value / totalQuestions.value) * 100 : 0
  );
  const currentScore = computed(() => {
    const correct = userAnswers.value.filter(answer => answer.isCorrect).length;
    return answeredQuestions.value > 0 ? (correct / answeredQuestions.value) * 100 : 0;
  });

  // Actions
  const clearError = () => {
    error.value = null;
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  // Fetch all available exams
  const fetchExams = async (): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await $fetch<{data: ExamListItem[]}>('/api/exams');
      exams.value = response.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch exams';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific exam details
  const fetchExam = async (examId: string): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await $fetch<{data: Exam}>(`/api/exams/${examId}`);
      currentExam.value = response.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch exam details';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Start a new study session
  const startSession = async (examId: string, mode: 'practice' | 'timed' | 'exam'): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await $fetch<{data: {session: StudySession, questions: QuestionWithAnswers[]}}>('/api/sessions', {
        method: 'POST',
        body: { examId, mode }
      });

      currentSession.value = response.data.session;
      questions.value = response.data.questions;
      currentQuestionIndex.value = 0;
      currentQuestion.value = questions.value[0] || null;
      userAnswers.value = [];

      // Start timer if needed
      if (mode === 'timed' || mode === 'exam') {
        const timeLimit = currentExam.value?.timeLimit;
        if (timeLimit) {
          startTimer(timeLimit * 60); // Convert minutes to seconds
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Submit an answer
  const submitAnswer = async (selectedOptionIds: string[]): Promise<void> => {
    if (!currentSession.value || !currentQuestion.value) {
      throw new Error('No active session or question');
    }

    try {
      const response = await $fetch<{data: UserAnswer}>('/api/sessions/answer', {
        method: 'POST',
        body: {
          sessionId: currentSession.value.id,
          questionId: currentQuestion.value.id,
          selectedOptions: selectedOptionIds
        }
      });

      userAnswers.value.push(response.data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(errorMessage);
      throw err;
    }
  };

  // Navigate to next question
  const nextQuestion = (): boolean => {
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++;
      currentQuestion.value = questions.value[currentQuestionIndex.value];
      return true;
    }
    return false;
  };

  // Navigate to previous question
  const previousQuestion = (): boolean => {
    if (currentQuestionIndex.value > 0) {
      currentQuestionIndex.value--;
      currentQuestion.value = questions.value[currentQuestionIndex.value];
      return true;
    }
    return false;
  };

  // Jump to specific question
  const goToQuestion = (index: number): boolean => {
    if (index >= 0 && index < questions.value.length) {
      currentQuestionIndex.value = index;
      currentQuestion.value = questions.value[index];
      return true;
    }
    return false;
  };

  // Timer management
  const startTimer = (seconds: number) => {
    timeRemaining.value = seconds;
    isTimerActive.value = true;

    timerInterval.value = setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        stopTimer();
        // Auto-submit session when time is up
        finishSession();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
    isTimerActive.value = false;
  };

  const pauseTimer = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
    isTimerActive.value = false;
  };

  const resumeTimer = () => {
    if (timeRemaining.value > 0) {
      startTimer(timeRemaining.value);
    }
  };

  // Finish current session
  const finishSession = async (): Promise<StudySession> => {
    if (!currentSession.value) {
      throw new Error('No active session');
    }

    try {
      setLoading(true);
      stopTimer();

      const response = await $fetch<{data: StudySession}>(`/api/sessions/${currentSession.value.id}/finish`, {
        method: 'POST'
      });

      const completedSession = response.data;
      
      // Reset state
      currentSession.value = null;
      questions.value = [];
      currentQuestion.value = null;
      currentQuestionIndex.value = 0;
      userAnswers.value = [];
      timeRemaining.value = 0;

      return completedSession;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finish session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset all state
  const resetState = () => {
    stopTimer();
    currentSession.value = null;
    questions.value = [];
    currentQuestion.value = null;
    currentQuestionIndex.value = 0;
    userAnswers.value = [];
    timeRemaining.value = 0;
    clearError();
  };

  return {
    // State
    exams,
    currentExam,
    currentSession,
    questions,
    currentQuestion,
    currentQuestionIndex,
    userAnswers,
    isLoading,
    error,
    timeRemaining,
    isTimerActive,

    // Getters
    totalQuestions,
    answeredQuestions,
    progress,
    currentScore,

    // Actions
    fetchExams,
    fetchExam,
    startSession,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    finishSession,
    resetState,
    clearError,
  };
});

export type ExamStore = ReturnType<typeof useExamStore>;