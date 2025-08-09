<template>
  <div
    data-test="exam-card"
    role="button"
    tabindex="0"
    :aria-label="`${exam.code} exam - ${exam.name}`"
    :class="[
      'exam-card',
      'bg-white rounded-lg shadow-md border border-gray-200 p-6',
      'hover:shadow-lg hover:border-blue-300 transition-all duration-200',
      'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
      {
        'ring-2 ring-blue-500': selected,
        'opacity-75 cursor-not-allowed': loading,
        'compact p-4': variant === 'compact'
      }
    ]"
    @click="handleCardClick"
    @keydown.enter="handleCardClick"
    @keydown.space.prevent="handleCardClick"
  >
    <!-- Exam Header -->
    <div class="exam-header mb-4">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <!-- Exam Code -->
          <h3 
            data-test="exam-code"
            class="text-lg font-bold text-gray-900 mb-1 truncate"
          >
            {{ exam.code }}
          </h3>
          
          <!-- Exam Name -->
          <h4 
            data-test="exam-name"
            class="text-sm font-medium text-blue-600 mb-2 line-clamp-2"
          >
            {{ exam.name }}
          </h4>
          
          <!-- Vendor -->
          <p 
            data-test="exam-vendor"
            class="text-sm text-gray-500 truncate"
          >
            {{ exam.vendor }}
          </p>
        </div>

        <!-- Status Badge (if needed) -->
        <div v-if="selected" class="ml-2 flex-shrink-0">
          <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- Exam Description -->
    <div 
      v-if="exam.description && !isCompact"
      data-test="exam-description"
      class="exam-description mb-4"
    >
      <p class="text-sm text-gray-600 line-clamp-3">
        {{ exam.description }}
      </p>
    </div>

    <!-- Exam Statistics -->
    <div class="exam-stats mb-4">
      <div class="flex items-center justify-between text-sm text-gray-600">
        <div class="flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ exam.questionCount }} question{{ exam.questionCount !== 1 ? 's' : '' }}</span>
        </div>
        
        <div v-if="exam.timeLimit" class="flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ exam.timeLimit }} min</span>
        </div>
      </div>
    </div>

    <!-- Progress Section -->
    <div 
      v-if="exam.progress && !isCompact"
      data-test="progress-section"
      class="progress-section border-t border-gray-200 pt-4 mb-4"
    >
      <div class="flex items-center justify-between text-sm mb-2">
        <span class="text-gray-600">Progress</span>
        <span 
          data-test="progress-percentage"
          class="font-medium text-gray-900"
        >
          {{ progressPercentage }}%
        </span>
      </div>
      
      <!-- Progress Bar -->
      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          data-test="progress-bar"
          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${Math.min(progressPercentage, 100)}%` }"
        ></div>
      </div>
      
      <!-- Progress Details -->
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>{{ exam.progress.questionsAnswered }} answered</span>
        <span 
          v-if="exam.progress.averageScore !== undefined && exam.progress.averageScore > 0"
          class="font-medium"
        >
          Avg: {{ Math.round(exam.progress.averageScore) }}%
        </span>
      </div>
    </div>

    <!-- Compact Progress (for compact variant) -->
    <div 
      v-if="exam.progress && isCompact"
      class="compact-progress mb-4"
    >
      <div class="flex items-center text-xs text-gray-600">
        <div class="w-12 bg-gray-200 rounded-full h-1 mr-2">
          <div 
            class="bg-blue-600 h-1 rounded-full"
            :style="{ width: `${Math.min(progressPercentage, 100)}%` }"
          ></div>
        </div>
        <span>{{ progressPercentage }}%</span>
      </div>
    </div>

    <!-- Action Button -->
    <div class="action-section">
      <button
        data-test="action-button"
        type="button"
        :disabled="loading"
        :aria-label="`${actionButtonText} for ${exam.name}`"
        :class="[
          'w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          loading 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        ]"
        @click.stop="handleActionClick"
      >
        <!-- Loading Spinner -->
        <div v-if="loading" class="flex items-center justify-center">
          <svg 
            data-test="loading-spinner"
            class="animate-spin h-4 w-4 mr-2" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              class="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              stroke-width="4"
            />
            <path 
              class="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </div>
        
        <!-- Button Text -->
        <span v-else>
          {{ actionButtonText }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ExamListItem } from '../../types/exam';

// Props
interface Props {
  exam: ExamListItem;
  variant?: 'default' | 'compact';
  selected?: boolean;
  loading?: boolean;
  buttonText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  selected: false,
  loading: false,
  buttonText: '',
});

// Emits
const emit = defineEmits<{
  'card-click': [exam: ExamListItem];
  'start-exam': [exam: ExamListItem];
}>();

// Computed properties
const isCompact = computed(() => props.variant === 'compact');

const progressPercentage = computed(() => {
  if (!props.exam.progress || props.exam.questionCount === 0) return 0;
  return Math.round((props.exam.progress.questionsAnswered / props.exam.questionCount) * 100);
});

const actionButtonText = computed(() => {
  if (props.buttonText) return props.buttonText;
  return props.exam.progress ? 'Continue Study' : 'Start Study';
});

// Methods
const handleCardClick = () => {
  if (props.loading) return;
  emit('card-click', props.exam);
};

const handleActionClick = () => {
  if (props.loading) return;
  emit('start-exam', props.exam);
};
</script>

<style scoped>
.exam-card {
  transition: all 0.2s ease-in-out;
  min-height: 200px;
}

.exam-card:hover:not(.cursor-not-allowed) {
  transform: translateY(-2px);
}

.exam-card:focus {
  transform: translateY(-2px);
}

.exam-card.compact {
  min-height: 150px;
}

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

/* Responsive adjustments */
@media (max-width: 640px) {
  .exam-card {
    min-height: 180px;
    padding: 1rem;
  }
  
  .exam-card.compact {
    min-height: 120px;
    padding: 0.75rem;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .exam-card,
  .bg-blue-600,
  .progress-bar {
    transition: none;
  }
  
  .animate-spin {
    animation: none;
  }
}

/* Print styles */
@media print {
  .exam-card {
    box-shadow: none;
    border: 1px solid #e5e7eb;
    break-inside: avoid;
  }
}
</style>