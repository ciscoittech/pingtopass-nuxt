<template>
  <main
    data-test="study-session"
    role="main"
    :aria-label="`Study Session for ${examId} - ${mode} mode`"
    :class="[
      'study-session min-h-screen bg-gray-50',
      {
        'mobile-layout': isMobile,
        'session-paused': isSessionPaused
      }
    ]"
    @keydown="handleKeyboardShortcut"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading"
      data-test="loading-state"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-lg text-gray-600">Loading study session...</p>
        <p class="text-sm text-gray-500 mt-2">Preparing your questions</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      data-test="error-state"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-center max-w-md">
        <div class="text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Session Error</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button
          data-test="retry-button"
          @click="retryFailedOperation"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Study Session Interface -->
    <div v-else class="study-session-content">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between py-4">
            <!-- Session Info -->
            <div class="flex items-center space-x-4">
              <h1 class="text-lg font-semibold text-gray-900">
                Study Session
              </h1>
              <div class="text-sm text-gray-500">
                {{ mode.charAt(0).toUpperCase() + mode.slice(1) }} Mode
              </div>
            </div>

            <!-- Progress and Controls -->
            <div class="flex items-center space-x-4">
              <!-- Progress Indicator -->
              <div data-test="progress-indicator" class="flex items-center space-x-2">
                <span data-test="answered-count" class="text-sm text-gray-600">
                  {{ answeredQuestionsCount }} of {{ totalQuestions }} answered
                </span>
                <div class="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    :style="`width: ${progressPercentage}%`"
                  ></div>
                </div>
              </div>

              <!-- Flag Count -->
              <div v-if="flaggedQuestionsCount > 0" data-test="flag-count" class="flex items-center text-sm text-amber-600">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 01.707 1.707L14.414 8l2.293 2.293A1 1 0 0116 12H4a1 1 0 01-1-1V5z" clip-rule="evenodd" />
                </svg>
                {{ flaggedQuestionsCount }} flagged
              </div>

              <!-- Session Controls -->
              <div class="flex items-center space-x-2">
                <button
                  v-if="!isSessionPaused"
                  @click="pauseSession"
                  class="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Pause
                </button>
                <button
                  v-else
                  @click="resumeSession"
                  class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Resume
                </button>
                
                <button
                  @click="showExitConfirmation = true"
                  class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- Question Area -->
          <div class="lg:col-span-3">
            <!-- Timer (for timed/exam modes) -->
            <div
              v-if="showTimer && (mode === 'timed' || mode === 'exam')"
              class="mb-6"
            >
              <ExamTimer
                data-test="exam-timer"
                :total-time="timeLimit * 60"
                :current-time="timeRemaining"
                :auto-start="!isSessionPaused"
                :show-controls="false"
                :variant="isMobile ? 'compact' : 'default'"
                @time-up="handleTimeUp"
                @warning="handleTimerWarning"
                @critical-warning="handleTimerCritical"
                @tick="handleTimerTick"
              />
            </div>

            <!-- Question Card -->
            <QuestionCard
              data-test="question-card"
              :question="currentQuestion"
              :question-number="currentQuestionIndex + 1"
              :total-questions="totalQuestions"
              :selected-answers="selectedAnswers"
              :show-explanation="shouldShowExplanation"
              :show-correct-answers="shouldShowCorrectAnswers"
              :show-navigation="true"
              :show-objective="studyPreferences.showObjectives"
              :show-ai-indicator="true"
              :enable-explanation-toggle="mode === 'practice'"
              :enable-question-jump="true"
              :is-first-question="isFirstQuestion"
              :is-last-question="isLastQuestion"
              :is-mobile="isMobile"
              :disabled="isSessionPaused"
              :loading="questionLoading"
              :error="questionError"
              @answer-selected="handleAnswerSelected"
              @next-question="handleNextQuestion"
              @previous-question="handlePreviousQuestion"
              @jump-to-question="handleJumpToQuestion"
              @retry-load="retryLoadQuestion"
            />

            <!-- Immediate Feedback (Practice Mode) -->
            <div
              v-if="showImmediateFeedback && lastAnswerFeedback"
              data-test="immediate-feedback"
              :class="[
                'mt-6 p-4 rounded-lg border',
                lastAnswerFeedback.isCorrect
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              ]"
            >
              <div class="flex items-start">
                <svg 
                  :class="[
                    'w-5 h-5 mt-0.5 mr-3',
                    lastAnswerFeedback.isCorrect ? 'text-green-600' : 'text-red-600'
                  ]"
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path v-if="lastAnswerFeedback.isCorrect" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  <path v-else fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h4 class="font-medium">
                    {{ lastAnswerFeedback.isCorrect ? 'Correct!' : 'Incorrect' }}
                  </h4>
                  <p class="mt-1 text-sm">{{ lastAnswerFeedback.message }}</p>
                </div>
              </div>
            </div>

            <!-- Navigation Controls -->
            <div class="mt-6 flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <!-- Flag Question -->
                <button
                  data-test="flag-button"
                  @click="toggleQuestionFlag"
                  :class="[
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isCurrentQuestionFlagged
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                  :title="isCurrentQuestionFlagged ? 'Remove flag' : 'Flag for review'"
                >
                  <svg 
                    data-test="flag-indicator"
                    :class="[
                      'w-4 h-4 mr-1',
                      { 'flagged': isCurrentQuestionFlagged }
                    ]"
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 01.707 1.707L14.414 8l2.293 2.293A1 1 0 0116 12H4a1 1 0 01-1-1V5z" clip-rule="evenodd" />
                  </svg>
                  {{ isCurrentQuestionFlagged ? 'Flagged' : 'Flag' }}
                </button>

                <!-- Question Timer -->
                <div v-if="showQuestionTimer" class="text-sm text-gray-500">
                  Time: {{ formatTime(currentQuestionTime) }}
                </div>
              </div>

              <!-- Auto-Advance Toggle (Practice Mode) -->
              <div v-if="mode === 'practice'" class="flex items-center">
                <label class="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    v-model="autoAdvanceEnabled"
                    class="mr-2 rounded"
                  >
                  Auto-advance
                </label>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <!-- Question Overview -->
            <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <h3 class="text-sm font-medium text-gray-900 mb-3">Question Overview</h3>
              <div class="grid grid-cols-5 gap-1">
                <button
                  v-for="(question, index) in questions"
                  :key="question.id"
                  data-test="question-overview-item"
                  @click="handleJumpToQuestion(index + 1)"
                  :class="[
                    'w-8 h-8 text-xs rounded flex items-center justify-center transition-colors',
                    {
                      'bg-blue-600 text-white': index === currentQuestionIndex,
                      'bg-green-100 text-green-800': hasAnswered(question.id) && !isCurrentQuestion(index),
                      'bg-amber-100 text-amber-800': isFlagged(question.id),
                      'bg-gray-100 text-gray-600': !hasAnswered(question.id) && !isCurrentQuestion(index) && !isFlagged(question.id)
                    }
                  ]"
                  :title="getQuestionStatusTitle(question, index)"
                >
                  {{ index + 1 }}
                </button>
              </div>
              
              <!-- Legend -->
              <div class="mt-3 text-xs text-gray-500 space-y-1">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                  Current
                </div>
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-green-100 rounded mr-2"></div>
                  Answered
                </div>
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-amber-100 rounded mr-2"></div>
                  Flagged
                </div>
              </div>
            </div>

            <!-- Session Statistics -->
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <h3 class="text-sm font-medium text-gray-900 mb-3">Session Stats</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Accuracy:</span>
                  <span class="font-medium">{{ Math.round(currentAccuracy) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Time:</span>
                  <span class="font-medium">{{ formatTime(totalTimeSpent) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Streak:</span>
                  <span class="font-medium">{{ currentStreak }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Resume Session Dialog -->
    <BaseModal
      v-if="showResumeDialog"
      data-test="resume-dialog"
      @close="showResumeDialog = false"
    >
      <template #title>Resume Previous Session?</template>
      <template #content>
        <p class="text-gray-600 mb-4">
          We found a previous study session. Would you like to resume where you left off?
        </p>
        <div class="text-sm text-gray-500">
          <p>Progress: {{ resumeSessionData?.answeredCount || 0 }} questions answered</p>
          <p>Last activity: {{ formatLastActivity(resumeSessionData?.lastActivity) }}</p>
        </div>
      </template>
      <template #actions>
        <button
          @click="startNewSession"
          class="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Start New
        </button>
        <button
          @click="resumePreviousSession"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Resume
        </button>
      </template>
    </BaseModal>

    <!-- Exit Confirmation Dialog -->
    <BaseModal
      v-if="showExitConfirmation"
      @close="showExitConfirmation = false"
    >
      <template #title>Exit Study Session?</template>
      <template #content>
        <p class="text-gray-600 mb-4">
          Your progress will be saved automatically. You can resume this session later.
        </p>
        <div class="text-sm text-gray-500">
          <p>Current progress: {{ answeredQuestionsCount }} of {{ totalQuestions }} questions</p>
        </div>
      </template>
      <template #actions>
        <button
          @click="showExitConfirmation = false"
          class="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          @click="exitSession"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Exit Session
        </button>
      </template>
    </BaseModal>

    <!-- Completion Dialog -->
    <BaseModal
      v-if="showCompletionDialog"
      data-test="completion-dialog"
      @close="handleCloseCompletion"
    >
      <template #title>Session Complete!</template>
      <template #content>
        <div class="text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            Congratulations!
          </h3>
          <p class="text-gray-600 mb-4">
            You've completed your study session.
          </p>
          
          <!-- Final Results -->
          <div class="bg-gray-50 rounded-lg p-4 text-left">
            <h4 class="font-medium text-gray-900 mb-2">Final Results:</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Questions Answered:</span>
                <span class="font-medium">{{ answeredQuestionsCount }}/{{ totalQuestions }}</span>
              </div>
              <div class="flex justify-between">
                <span>Final Score:</span>
                <span class="font-medium">{{ Math.round(finalScore) }}%</span>
              </div>
              <div class="flex justify-between">
                <span>Total Time:</span>
                <span class="font-medium">{{ formatTime(totalTimeSpent) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Questions Flagged:</span>
                <span class="font-medium">{{ flaggedQuestionsCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #actions>
        <button
          v-if="flaggedQuestionsCount > 0"
          @click="reviewFlaggedQuestions"
          class="mr-3 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Review Flagged ({{ flaggedQuestionsCount }})
        </button>
        <button
          @click="startNewSession"
          class="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          New Session
        </button>
        <button
          @click="finishAndExit"
          class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Finish
        </button>
      </template>
    </BaseModal>

    <!-- Time Warning Toast -->
    <div
      v-if="showTimeWarning"
      class="fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50"
      role="alert"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span class="text-yellow-800 font-medium">{{ timeWarningMessage }}</span>
      </div>
    </div>

    <!-- Error Toast -->
    <div
      v-if="showErrorToast"
      data-test="error-toast"
      class="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50"
      role="alert"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="text-red-800">{{ errorToastMessage }}</span>
      </div>
    </div>

    <!-- Screen Reader Announcements -->
    <div class="sr-only" aria-live="polite">
      <span data-test="sr-announcement">{{ screenReaderMessage }}</span>
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div
      v-if="showKeyboardInstructions"
      data-test="keyboard-instructions"
      class="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs z-40"
    >
      <h4 class="font-medium text-gray-900 mb-2">Keyboard Shortcuts</h4>
      <div class="space-y-1 text-gray-600">
        <div>← → Navigate questions</div>
        <div>1-4 Select answers</div>
        <div>F Flag question</div>
        <div v-if="mode === 'practice'">E Toggle explanation</div>
        <div>? Toggle this help</div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useExamStore } from '~/stores/exam';
import { useStudyStore } from '~/stores/study';
// Use @nuxt/ui toast instead of custom composable
import QuestionCard from '~/components/exam/QuestionCard.vue';
import ExamTimer from '~/components/exam/ExamTimer.vue';
import BaseModal from '~/components/base/BaseModal.vue';
import type { QuestionWithAnswers } from '~/types/exam';

// Props
interface Props {
  examId: string;
  mode?: 'practice' | 'timed' | 'exam';
  showTimer?: boolean;
  enableKeyboardShortcuts?: boolean;
  autoSave?: boolean;
  resumeSession?: boolean;
  timeLimit?: number; // in minutes
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'practice',
  showTimer: true,
  enableKeyboardShortcuts: true,
  autoSave: true,
  resumeSession: false,
  timeLimit: 90
});

// Emits
const emit = defineEmits<{
  'session-completed': [results: any];
  'session-paused': [];
  'session-resumed': [];
  'session-exited': [];
}>();

// Stores
const examStore = useExamStore();
const studyStore = useStudyStore();
const toast = useToast(); // @nuxt/ui provides this

// Local state
const isLoading = ref(true);
const error = ref<string | null>(null);
const questionLoading = ref(false);
const questionError = ref<string | null>(null);
const selectedAnswers = ref<string[]>([]);
const currentQuestionTime = ref(0);
const questionStartTime = ref(0);
const localShowExplanation = ref(false);
const lastAnswerFeedback = ref<any>(null);
const autoAdvanceEnabled = ref(false);
const isSessionPaused = ref(false);
const isMobile = ref(false);

// Dialog states
const showResumeDialog = ref(false);
const showExitConfirmation = ref(false);
const showCompletionDialog = ref(false);
const showKeyboardInstructions = ref(false);

// Toast states
const showTimeWarning = ref(false);
const timeWarningMessage = ref('');
const showErrorToast = ref(false);
const errorToastMessage = ref('');

// Screen reader
const screenReaderMessage = ref('');

// Resume data
const resumeSessionData = ref<any>(null);

// Timer
let questionTimer: NodeJS.Timeout | null = null;
let autoAdvanceTimer: NodeJS.Timeout | null = null;

// Computed properties
const questions = computed(() => examStore.questions);
const currentQuestion = computed(() => examStore.currentQuestion);
const currentQuestionIndex = computed(() => examStore.currentQuestionIndex);
const totalQuestions = computed(() => examStore.totalQuestions);
const timeRemaining = computed(() => examStore.timeRemaining);
const studyPreferences = computed(() => studyStore.studyPreferences);

const answeredQuestionsCount = computed(() => {
  return studyStore.currentSession?.answers 
    ? Object.keys(studyStore.currentSession.answers).length 
    : 0;
});

const progressPercentage = computed(() => {
  return totalQuestions.value > 0 
    ? (answeredQuestionsCount.value / totalQuestions.value) * 100 
    : 0;
});

const flaggedQuestionsCount = computed(() => {
  return studyStore.currentSession?.flaggedQuestions.size || 0;
});

const isCurrentQuestionFlagged = computed(() => {
  return currentQuestion.value 
    ? studyStore.currentSession?.flaggedQuestions.has(currentQuestion.value.id) || false
    : false;
});

const isFirstQuestion = computed(() => currentQuestionIndex.value === 0);
const isLastQuestion = computed(() => currentQuestionIndex.value === totalQuestions.value - 1);

const shouldShowExplanation = computed(() => {
  return (props.mode === 'practice' && studyPreferences.value.immediateExplanations) || localShowExplanation.value;
});

const shouldShowCorrectAnswers = computed(() => {
  return props.mode === 'practice' && lastAnswerFeedback.value?.isCorrect === false;
});

const showImmediateFeedback = computed(() => {
  return props.mode === 'practice' && lastAnswerFeedback.value !== null;
});

const showQuestionTimer = computed(() => {
  return props.mode !== 'exam';
});

const currentAccuracy = computed(() => {
  if (!studyStore.currentSession?.answers) return 0;
  
  const answers = Object.entries(studyStore.currentSession.answers);
  if (answers.length === 0) return 0;
  
  let correct = 0;
  answers.forEach(([questionId, selectedOptions]) => {
    const question = questions.value.find(q => q.id === questionId);
    if (question && validateAnswer(question, selectedOptions)) {
      correct++;
    }
  });
  
  return (correct / answers.length) * 100;
});

const currentStreak = computed(() => studyStore.performanceMetrics.streak);

const totalTimeSpent = computed(() => {
  return studyStore.currentSession?.timeSpent 
    ? Object.values(studyStore.currentSession.timeSpent).reduce((sum, time) => sum + time, 0)
    : 0;
});

const finalScore = computed(() => currentAccuracy.value);

// Methods
const initializeSession = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    // Check for resume session
    if (props.resumeSession) {
      const canResume = studyStore.loadSessionState(props.examId);
      if (canResume && studyStore.currentSession) {
        resumeSessionData.value = {
          answeredCount: Object.keys(studyStore.currentSession.answers).length,
          lastActivity: new Date(studyStore.currentSession.lastActivityTime)
        };
        showResumeDialog.value = true;
        isLoading.value = false;
        return;
      }
    }

    await startNewSession();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initialize session';
  } finally {
    isLoading.value = false;
  }
};

const startNewSession = async () => {
  try {
    showResumeDialog.value = false;
    
    // Fetch exam and start session
    await examStore.fetchExam(props.examId);
    await examStore.startSession(props.examId, props.mode);
    
    // Initialize study session
    studyStore.startStudySession(examStore.currentSession?.id || 'temp', props.mode);
    
    // Load first question
    if (questions.value.length > 0) {
      loadCurrentQuestion();
    }
    
    startQuestionTimer();
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start session';
    throw err;
  }
};

const resumePreviousSession = () => {
  showResumeDialog.value = false;
  
  // Resume from stored state
  if (studyStore.currentSession) {
    examStore.goToQuestion(studyStore.currentSession.currentQuestionIndex);
    loadCurrentQuestion();
    startQuestionTimer();
  }
};

const loadCurrentQuestion = () => {
  if (currentQuestion.value) {
    // Load previous answers for this question
    const questionId = currentQuestion.value.id;
    selectedAnswers.value = studyStore.currentSession?.answers[questionId] || [];
    
    // Reset feedback
    lastAnswerFeedback.value = null;
    localShowExplanation.value = false;
    
    // Announce to screen readers
    announceQuestionChange();
  }
};

const handleAnswerSelected = async (answers: string[]) => {
  if (!currentQuestion.value || isSessionPaused.value) return;
  
  selectedAnswers.value = answers;
  
  try {
    // Calculate time spent on question
    const timeSpent = Math.floor((Date.now() - questionStartTime.value) / 1000);
    
    // Validate answer
    const isCorrect = validateAnswer(currentQuestion.value, answers);
    
    // Save answer to study store
    studyStore.answerQuestion(currentQuestion.value.id, answers, isCorrect, timeSpent);
    
    // Submit to exam store
    await examStore.submitAnswer(answers);
    
    // Show feedback in practice mode
    if (props.mode === 'practice') {
      lastAnswerFeedback.value = {
        isCorrect,
        message: isCorrect 
          ? 'Well done! You selected the correct answer.' 
          : 'Not quite right. Review the explanation below.'
      };
      
      // Auto-advance if enabled
      if (autoAdvanceEnabled.value && isCorrect) {
        autoAdvanceTimer = setTimeout(() => {
          handleNextQuestion();
        }, 2000);
      }
    }
    
    // Auto-save if enabled
    if (props.autoSave) {
      studyStore.saveSessionState();
    }
    
    // Check for completion
    if (answeredQuestionsCount.value === totalQuestions.value) {
      setTimeout(() => {
        showCompletionDialog.value = true;
      }, 1000);
    }
    
  } catch (err) {
    showErrorToast.value = true;
    errorToastMessage.value = 'Failed to save answer. Please try again.';
    setTimeout(() => showErrorToast.value = false, 5000);
  }
};

const validateAnswer = (question: QuestionWithAnswers, selectedOptions: string[]): boolean => {
  const correctOptions = question.answerOptions
    ?.filter(option => option.isCorrect)
    .map(option => option.id) || [];
  
  if (question.type === 'single') {
    return selectedOptions.length === 1 && correctOptions.includes(selectedOptions[0]);
  } else if (question.type === 'multiple') {
    return selectedOptions.length === correctOptions.length &&
           selectedOptions.every(id => correctOptions.includes(id)) &&
           correctOptions.every(id => selectedOptions.includes(id));
  }
  
  return false;
};

const handleNextQuestion = () => {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
  
  if (examStore.nextQuestion()) {
    loadCurrentQuestion();
    startQuestionTimer();
  }
};

const handlePreviousQuestion = () => {
  if (examStore.previousQuestion()) {
    loadCurrentQuestion();
    startQuestionTimer();
  }
};

const handleJumpToQuestion = (questionNumber: number) => {
  const index = questionNumber - 1; // Convert to 0-indexed
  if (examStore.goToQuestion(index)) {
    studyStore.navigateToQuestion(index);
    loadCurrentQuestion();
    startQuestionTimer();
  }
};

const startQuestionTimer = () => {
  questionStartTime.value = Date.now();
  currentQuestionTime.value = 0;
  
  if (questionTimer) {
    clearInterval(questionTimer);
  }
  
  questionTimer = setInterval(() => {
    currentQuestionTime.value = Math.floor((Date.now() - questionStartTime.value) / 1000);
  }, 1000);
};

const stopQuestionTimer = () => {
  if (questionTimer) {
    clearInterval(questionTimer);
    questionTimer = null;
  }
};

const toggleQuestionFlag = () => {
  if (currentQuestion.value) {
    const questionId = currentQuestion.value.id;
    const isFlagged = studyStore.currentSession?.flaggedQuestions.has(questionId) || false;
    studyStore.flagQuestion(questionId, !isFlagged);
  }
};

const pauseSession = () => {
  isSessionPaused.value = true;
  stopQuestionTimer();
  studyStore.pauseSession();
  emit('session-paused');
};

const resumeSession = () => {
  isSessionPaused.value = false;
  startQuestionTimer();
  studyStore.resumeSession();
  emit('session-resumed');
};

const exitSession = async () => {
  showExitConfirmation.value = false;
  
  if (props.autoSave) {
    studyStore.saveSessionState();
  }
  
  emit('session-exited');
};

const finishSession = async () => {
  try {
    const results = await studyStore.endStudySession();
    await examStore.finishSession();
    
    emit('session-completed', results);
  } catch (err) {
    showErrorToast.value = true;
    errorToastMessage.value = 'Failed to finish session';
    setTimeout(() => showErrorToast.value = false, 5000);
  }
};

const handleTimeUp = async () => {
  showTimeWarning.value = false;
  await finishSession();
  showCompletionDialog.value = true;
};

const handleTimerWarning = (timeRemaining: number) => {
  const minutes = Math.floor(timeRemaining / 60);
  timeWarningMessage.value = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining!`;
  showTimeWarning.value = true;
  
  setTimeout(() => {
    showTimeWarning.value = false;
  }, 5000);
};

const handleTimerCritical = (timeRemaining: number) => {
  const minutes = Math.floor(timeRemaining / 60);
  timeWarningMessage.value = `Only ${minutes} minute${minutes !== 1 ? 's' : ''} left!`;
  showTimeWarning.value = true;
};

const handleTimerTick = (timeRemaining: number) => {
  // Update any time-based UI
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (!studyStore.keyboardShortcutsEnabled || isSessionPaused.value) return;
  
  const key = event.key.toLowerCase();
  
  switch (key) {
    case 'arrowright':
      event.preventDefault();
      handleNextQuestion();
      break;
    case 'arrowleft':
      event.preventDefault();
      handlePreviousQuestion();
      break;
    case 'f':
      event.preventDefault();
      toggleQuestionFlag();
      break;
    case 'e':
      if (props.mode === 'practice') {
        event.preventDefault();
        localShowExplanation.value = !localShowExplanation.value;
      }
      break;
    case '1':
    case '2':
    case '3':
    case '4':
      if (currentQuestion.value?.answerOptions) {
        const optionIndex = parseInt(key) - 1;
        const option = currentQuestion.value.answerOptions[optionIndex];
        if (option) {
          event.preventDefault();
          if (currentQuestion.value.type === 'single') {
            selectedAnswers.value = [option.id];
          } else {
            const index = selectedAnswers.value.indexOf(option.id);
            if (index === -1) {
              selectedAnswers.value.push(option.id);
            } else {
              selectedAnswers.value.splice(index, 1);
            }
          }
        }
      }
      break;
    case '?':
      event.preventDefault();
      showKeyboardInstructions.value = !showKeyboardInstructions.value;
      break;
  }
};

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

const retryFailedOperation = async () => {
  await initializeSession();
};

const retryLoadQuestion = () => {
  questionError.value = null;
  loadCurrentQuestion();
};

// Helper methods
const hasAnswered = (questionId: string): boolean => {
  return studyStore.currentSession?.answers[questionId] !== undefined;
};

const isFlagged = (questionId: string): boolean => {
  return studyStore.currentSession?.flaggedQuestions.has(questionId) || false;
};

const isCurrentQuestion = (index: number): boolean => {
  return index === currentQuestionIndex.value;
};

const getQuestionStatusTitle = (question: QuestionWithAnswers, index: number): string => {
  const statuses = [];
  
  if (isCurrentQuestion(index)) statuses.push('Current');
  if (hasAnswered(question.id)) statuses.push('Answered');
  if (isFlagged(question.id)) statuses.push('Flagged');
  
  return statuses.length > 0 ? statuses.join(', ') : 'Not answered';
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatLastActivity = (date?: Date): string => {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const announceQuestionChange = () => {
  screenReaderMessage.value = `Question ${currentQuestionIndex.value + 1} of ${totalQuestions.value}`;
  setTimeout(() => {
    screenReaderMessage.value = '';
  }, 1000);
};

// Completion handlers
const handleCloseCompletion = () => {
  showCompletionDialog.value = false;
};

const reviewFlaggedQuestions = () => {
  showCompletionDialog.value = false;
  // Find first flagged question
  if (studyStore.currentSession) {
    const flaggedIds = Array.from(studyStore.currentSession.flaggedQuestions);
    if (flaggedIds.length > 0) {
      const questionIndex = questions.value.findIndex(q => q.id === flaggedIds[0]);
      if (questionIndex !== -1) {
        handleJumpToQuestion(questionIndex + 1);
        studyStore.toggleReviewMode();
      }
    }
  }
};

const finishAndExit = async () => {
  await finishSession();
  showCompletionDialog.value = false;
};

// Lifecycle
onMounted(async () => {
  // Initialize mobile detection
  handleResize();
  window.addEventListener('resize', handleResize);
  
  // Initialize stores
  studyStore.initializeStore();
  
  // Initialize session
  await initializeSession();
});

onUnmounted(() => {
  stopQuestionTimer();
  
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
  }
  
  window.removeEventListener('resize', handleResize);
});

// Watch for question changes
watch(currentQuestionIndex, () => {
  loadCurrentQuestion();
});

// Focus management
const focusCurrentQuestion = async () => {
  await nextTick();
  const questionCard = document.querySelector('[data-test="question-card"]') as HTMLElement;
  questionCard?.focus();
};

// Expose for testing
defineExpose({
  isLoading,
  error,
  selectedAnswers,
  currentQuestionTime,
  localShowExplanation,
  showExplanation: shouldShowExplanation,
  isCurrentQuestionFlagged,
  progressPercentage,
  finalScore,
  isMobile,
  isSessionPaused,
  validateAnswer,
  handleAnswerSelected,
  handleNextQuestion,
  handlePreviousQuestion,
  handleJumpToQuestion,
  toggleQuestionFlag,
  pauseSession,
  resumeSession,
  finishSession,
  handleTimeUp,
  handleTimerWarning,
  retryFailedOperation,
  startQuestionTimer,
  calculateFinalScore: () => finalScore.value
});
</script>

<style scoped>
.study-session {
  transition: all 0.2s ease-in-out;
}

.mobile-layout {
  padding-left: 0.5rem; padding-right: 0.5rem;
}

.session-paused {
  filter: grayscale(0.3);
}

.session-paused .study-session-content {
  pointer-events: none;
  opacity: 0.7;
}

/* Question overview grid */
@media (max-width: 640px) {
  .grid-cols-5 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .study-session,
  .transition-all,
  .transition-colors {
    transition: none;
  }
}

/* Print styles */
@media print {
  .study-session {
    background-color: white;
  }
  
  header,
  .fixed,
  button {
    display: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .bg-gray-50 {
    background-color: white;
  }
  
  .border-gray-200 {
    border-color: rgb(31 41 55);
  }
}

/* Focus management */
.study-session:focus-within {
  outline: none;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>