<template>
  <div
    data-test="question-card"
    :class="[
      'question-card bg-white rounded-lg shadow-sm border border-gray-200 p-6',
      {
        'mobile-layout': isMobile
      }
    ]"
    role="article"
    :aria-label="`Question ${questionNumber} of ${totalQuestions}`"
  >
    <!-- Loading State -->
    <div 
      v-if="loading"
      data-test="loading-spinner"
      class="flex items-center justify-center py-12"
    >
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Loading question...</span>
    </div>

    <!-- Error State -->
    <div 
      v-else-if="error || !question"
      data-test="error-state"
      class="flex flex-col items-center justify-center py-12"
    >
      <div class="text-red-500 mb-4">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Question Not Available
      </h3>
      <p class="text-gray-600 mb-4 text-center max-w-md">
        {{ error || 'This question could not be loaded.' }}
      </p>
      <button
        v-if="error"
        data-test="retry-button"
        @click="handleRetry"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Try Again
      </button>
    </div>

    <!-- Question Content -->
    <div v-else class="question-content">
      <!-- Question Header -->
      <div class="question-header mb-6">
        <div class="flex items-start justify-between mb-4">
          <!-- Question Number -->
          <div data-test="question-number" class="text-sm font-medium text-gray-500">
            Question {{ questionNumber }} of {{ totalQuestions }}
          </div>

          <!-- Question Meta Icons -->
          <div class="flex items-center space-x-2">
            <!-- AI Indicator -->
            <div 
              v-if="showAiIndicator && question.aiGenerated"
              data-test="ai-indicator"
              class="flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded"
              title="AI Generated Question"
            >
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              AI Generated
            </div>

            <!-- Debug Info -->
            <div 
              v-if="showDebugInfo"
              data-test="question-id"
              class="text-xs text-gray-400 font-mono"
            >
              ID: {{ question.id }}
            </div>
          </div>
        </div>

        <!-- Question Type and Difficulty Row -->
        <div class="flex items-center justify-between mb-4">
          <!-- Question Type -->
          <div data-test="question-type" class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    :d="questionTypeIcon" />
            </svg>
            <span>{{ questionTypeLabel }}</span>
            <span data-test="type-sr" class="sr-only">
              Question type: {{ questionTypeLabel }}
            </span>
          </div>

          <!-- Difficulty Indicator -->
          <div data-test="difficulty-indicator" class="flex items-center">
            <span class="text-sm text-gray-600 mr-2">Difficulty:</span>
            <div class="flex items-center">
              <span
                v-for="star in 5"
                :key="star"
                data-test="difficulty-star"
                :class="[
                  'w-4 h-4 mr-1',
                  star <= question.difficulty 
                    ? 'text-yellow-400 filled' 
                    : 'text-gray-300'
                ]"
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
              <span data-test="difficulty-sr" class="sr-only">
                Difficulty level: {{ question.difficulty }} out of 5 stars
              </span>
            </div>
          </div>
        </div>

        <!-- Objective -->
        <div 
          v-if="showObjective && question.objectiveId"
          data-test="objective"
          class="text-xs text-gray-500 mb-4"
        >
          Objective: {{ question.objectiveId }}
        </div>

        <!-- Metadata -->
        <div 
          v-if="showMetadata"
          data-test="created-date"
          class="text-xs text-gray-400 mb-4"
        >
          Created: {{ formatDate(question.createdAt) }}
        </div>
      </div>

      <!-- Question Text -->
      <div class="question-body mb-8">
        <h2 
          data-test="question-text"
          role="heading"
          aria-level="2"
          class="text-lg font-medium text-gray-900 leading-relaxed mb-4"
        >
          {{ question.text }}
        </h2>

        <!-- Question Instructions -->
        <div 
          v-if="questionInstructions"
          data-test="question-instructions"
          class="text-sm text-blue-600 italic mb-4"
        >
          {{ questionInstructions }}
        </div>
      </div>

      <!-- Answer Options -->
      <div class="answer-section mb-8">
        <AnswerOptions
          data-test="answer-options"
          :options="question.answerOptions || []"
          :question-type="question.type"
          :selected-answers="selectedAnswers"
          :show-correct-answers="showCorrectAnswers"
          :disabled="disabled"
          @answer-selected="handleAnswerSelected"
        />
      </div>

      <!-- Explanation Section -->
      <div 
        v-if="(showExplanation || localShowExplanation) && question.explanation"
        data-test="explanation"
        class="explanation-section border-t border-gray-200 pt-6 mb-8"
      >
        <div class="flex items-center mb-3">
          <svg class="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <h3 class="text-sm font-medium text-gray-900">Explanation</h3>
        </div>
        <div class="prose prose-sm max-w-none">
          <p class="text-gray-700 leading-relaxed">
            {{ question.explanation }}
          </p>
        </div>
      </div>

      <!-- Toggle Explanation Button -->
      <div 
        v-if="enableExplanationToggle && question.explanation && !showExplanation"
        class="mb-6"
      >
        <button
          data-test="toggle-explanation"
          @click="toggleExplanation"
          class="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
        >
          {{ localShowExplanation ? 'Hide' : 'Show' }} Explanation
        </button>
      </div>

      <!-- Navigation Section -->
      <div 
        v-if="showNavigation"
        data-test="navigation-section"
        :class="[
          'navigation-section border-t border-gray-200 pt-6',
          'flex items-center justify-between',
          { 'flex-col space-y-4': isMobile }
        ]"
      >
        <!-- Previous/Next Buttons -->
        <div :class="['flex items-center space-x-3', { 'order-2': isMobile }]">
          <button
            data-test="nav-previous"
            :disabled="isFirstQuestion"
            @click="handlePrevious"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              isFirstQuestion
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            ← Previous
          </button>

          <button
            data-test="nav-next"
            :disabled="isLastQuestion"
            @click="handleNext"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              isLastQuestion
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            ]"
          >
            Next →
          </button>
        </div>

        <!-- Question Jump -->
        <div 
          v-if="enableQuestionJump"
          :class="['flex items-center space-x-2', { 'order-1': isMobile }]"
        >
          <label for="question-jump" class="text-sm text-gray-600">
            Jump to question:
          </label>
          <select
            id="question-jump"
            data-test="question-jump"
            :value="questionNumber"
            @change="handleQuestionJump"
            class="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option 
              v-for="num in totalQuestions" 
              :key="num" 
              :value="num"
            >
              {{ num }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { QuestionWithAnswers } from '../../types/exam';
import AnswerOptions from './AnswerOptions.vue';

// Props
interface Props {
  question: QuestionWithAnswers | null;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswers?: string[];
  showExplanation?: boolean;
  showCorrectAnswers?: boolean;
  showNavigation?: boolean;
  showObjective?: boolean;
  showAiIndicator?: boolean;
  showDebugInfo?: boolean;
  showMetadata?: boolean;
  enableExplanationToggle?: boolean;
  enableQuestionJump?: boolean;
  isFirstQuestion?: boolean;
  isLastQuestion?: boolean;
  isMobile?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectedAnswers: () => [],
  showExplanation: false,
  showCorrectAnswers: false,
  showNavigation: false,
  showObjective: false,
  showAiIndicator: false,
  showDebugInfo: false,
  showMetadata: false,
  enableExplanationToggle: false,
  enableQuestionJump: false,
  isFirstQuestion: false,
  isLastQuestion: false,
  isMobile: false,
  disabled: false,
  loading: false,
  error: '',
});

// Emits
const emit = defineEmits<{
  'answer-selected': [answers: string[]];
  'previous-question': [];
  'next-question': [];
  'jump-to-question': [questionNumber: number];
  'retry-load': [];
}>();

// Local state
const localShowExplanation = ref(false);

// Computed properties
const questionTypeLabel = computed(() => {
  if (!props.question) return '';
  
  switch (props.question.type) {
    case 'single':
      return 'Single Choice';
    case 'multiple':
      return 'Multiple Choice';
    case 'drag-drop':
      return 'Drag & Drop';
    default:
      return 'Unknown';
  }
});

const questionTypeIcon = computed(() => {
  if (!props.question) return '';
  
  switch (props.question.type) {
    case 'single':
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    case 'multiple':
      return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
    case 'drag-drop':
      return 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12';
    default:
      return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3';
  }
});

const questionInstructions = computed(() => {
  if (!props.question) return '';
  
  switch (props.question.type) {
    case 'multiple':
      return 'Select all that apply';
    case 'drag-drop':
      return 'Drag items to their correct positions';
    default:
      return '';
  }
});

// Methods
const handleAnswerSelected = (answers: string[]) => {
  emit('answer-selected', answers);
};

const handlePrevious = () => {
  if (!props.isFirstQuestion) {
    emit('previous-question');
  }
};

const handleNext = () => {
  if (!props.isLastQuestion) {
    emit('next-question');
  }
};

const handleQuestionJump = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const questionNumber = parseInt(target.value);
  emit('jump-to-question', questionNumber);
};

const toggleExplanation = () => {
  localShowExplanation.value = !localShowExplanation.value;
};

const handleRetry = () => {
  emit('retry-load');
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};
</script>

<style scoped>
.question-card {
  transition: all 0.2s ease-in-out;
}

.mobile-layout {
  padding: 1rem;
}

.mobile-layout .navigation-section {
  flex-direction: column;
  gap: 1rem;
}

.mobile-layout .question-body {
  margin-bottom: 2rem;
}

/* Line clamping for long text */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Difficulty stars hover effect */
.difficulty-indicator .filled {
  animation: starGlow 0.3s ease-in-out;
}

@keyframes starGlow {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Prose styling for explanations */
.prose p {
  margin-bottom: 1rem;
  line-height: 1.7;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .question-header {
    margin-bottom: 1.5rem;
  }
  
  .question-body {
    margin-bottom: 2rem;
  }
  
  .answer-section {
    margin-bottom: 2rem;
  }
  
  .explanation-section {
    padding-top: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .navigation-section {
    padding-top: 1.5rem;
  }
}

/* Print styles */
@media print {
  .question-card {
    box-shadow: none;
    border: 1px solid #e5e7eb;
    break-inside: avoid;
  }
  
  .navigation-section {
    display: none;
  }
  
  .explanation-section {
    break-before: avoid;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .question-card,
  .filled {
    transition: none;
    animation: none;
  }
  
  .animate-spin {
    animation: none;
  }
}

/* Focus management */
.question-card:focus-within {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .question-card {
    border: 2px solid #000;
  }
  
  .difficulty-star.filled {
    color: #000;
  }
  
  .text-blue-600 {
    color: #000;
    font-weight: bold;
  }
}
</style>