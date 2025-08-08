<template>
  <div class="study-progress" data-testid="study-progress">
    <!-- Progress Header -->
    <div class="progress-header">
      <div class="progress-title">
        <h3 class="title-text" data-testid="progress-title">Study Progress</h3>
        <span class="session-status" :class="sessionStatus" data-testid="session-status">
          {{ formatSessionStatus(sessionStatus) }}
        </span>
      </div>
      <div class="progress-stats" data-testid="progress-stats">
        <span class="stat-item">
          <span class="stat-value">{{ currentProgress }}</span>
          <span class="stat-label">of</span>
          <span class="stat-value">{{ totalQuestions }}</span>
          <span class="stat-label">questions</span>
        </span>
        <span class="stat-divider">•</span>
        <span class="stat-item">
          <span class="stat-value">{{ progressPercentage }}%</span>
          <span class="stat-label">complete</span>
        </span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar-container" data-testid="progress-bar-container">
      <div class="progress-bar-track">
        <div 
          class="progress-bar-fill"
          :style="{ width: `${progressPercentage}%` }"
          data-testid="progress-bar-fill"
          role="progressbar"
          :aria-valuenow="progressPercentage"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Study progress: ${progressPercentage}% complete`"
        />
        <!-- Milestones -->
        <div 
          v-for="milestone in milestones"
          :key="milestone"
          class="progress-milestone"
          :class="{ 'reached': progressPercentage >= milestone }"
          :style="{ left: `${milestone}%` }"
          data-testid="progress-milestone"
        />
      </div>
    </div>

    <!-- Time Information -->
    <div class="time-info" data-testid="time-info">
      <div class="time-elapsed">
        <span class="time-label">Time Elapsed:</span>
        <span class="time-value" data-testid="time-elapsed">{{ formattedTimeElapsed }}</span>
      </div>
      <div class="time-estimated">
        <span class="time-label">Estimated Remaining:</span>
        <span class="time-value" data-testid="time-remaining">{{ formattedTimeRemaining }}</span>
      </div>
    </div>

    <!-- Detailed Statistics -->
    <div v-if="showDetailedStats" class="detailed-stats" data-testid="detailed-stats">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-number" data-testid="correct-count">{{ correctAnswers }}</div>
          <div class="stat-description">Correct</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" data-testid="incorrect-count">{{ incorrectAnswers }}</div>
          <div class="stat-description">Incorrect</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" data-testid="accuracy-rate">{{ accuracyRate }}%</div>
          <div class="stat-description">Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" data-testid="average-time">{{ averageTimePerQuestion }}s</div>
          <div class="stat-description">Avg Time</div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="showActions" class="progress-actions" data-testid="progress-actions">
      <button 
        v-if="canPause"
        class="action-button secondary"
        @click="$emit('pause')"
        data-testid="pause-button"
      >
        Pause Session
      </button>
      <button 
        v-if="canResume"
        class="action-button primary"
        @click="$emit('resume')"
        data-testid="resume-button"
      >
        Resume Session
      </button>
      <button 
        v-if="canFinish"
        class="action-button primary"
        @click="$emit('finish')"
        data-testid="finish-button"
      >
        Finish Session
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentProgress: number;
  totalQuestions: number;
  timeElapsed: number; // in seconds
  correctAnswers?: number;
  incorrectAnswers?: number;
  showDetailedStats?: boolean;
  showActions?: boolean;
  canPause?: boolean;
  canResume?: boolean;
  canFinish?: boolean;
  sessionStatus?: 'active' | 'paused' | 'completed' | 'idle';
  milestones?: number[]; // percentage milestones to show on progress bar
}

interface Emits {
  (e: 'pause'): void;
  (e: 'resume'): void;
  (e: 'finish'): void;
  (e: 'milestone-reached', milestone: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  correctAnswers: 0,
  incorrectAnswers: 0,
  showDetailedStats: true,
  showActions: false,
  canPause: false,
  canResume: false,
  canFinish: false,
  sessionStatus: 'active',
  milestones: () => [25, 50, 75]
});

const emit = defineEmits<Emits>();

// Computed properties
const progressPercentage = computed(() => {
  if (props.totalQuestions === 0) return 0;
  return Math.round((props.currentProgress / props.totalQuestions) * 100);
});

const formattedTimeElapsed = computed(() => {
  return formatTime(props.timeElapsed);
});

const formattedTimeRemaining = computed(() => {
  if (props.currentProgress === 0) return '--:--';
  
  const averageTimePerQuestion = props.timeElapsed / props.currentProgress;
  const remainingQuestions = props.totalQuestions - props.currentProgress;
  const estimatedTimeRemaining = averageTimePerQuestion * remainingQuestions;
  
  return formatTime(Math.round(estimatedTimeRemaining));
});

const accuracyRate = computed(() => {
  const totalAnswered = props.correctAnswers + props.incorrectAnswers;
  if (totalAnswered === 0) return 0;
  return Math.round((props.correctAnswers / totalAnswered) * 100);
});

const averageTimePerQuestion = computed(() => {
  if (props.currentProgress === 0) return 0;
  return Math.round(props.timeElapsed / props.currentProgress);
});

// Watch for milestone achievements
const previousPercentage = ref(0);
watch(progressPercentage, (newPercentage, oldPercentage) => {
  props.milestones.forEach(milestone => {
    if (oldPercentage < milestone && newPercentage >= milestone) {
      emit('milestone-reached', milestone);
    }
  });
  previousPercentage.value = newPercentage;
});

// Methods
const formatTime = (seconds: number): string => {
  if (seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatSessionStatus = (status: string): string => {
  switch (status) {
    case 'active': return 'In Progress';
    case 'paused': return 'Paused';
    case 'completed': return 'Completed';
    case 'idle': return 'Ready';
    default: return 'Unknown';
  }
};

// Expose methods for testing
defineExpose({
  formatTime,
  progressPercentage,
  accuracyRate,
  averageTimePerQuestion
});
</script>

<style scoped>
.study-progress {
  @apply bg-white rounded-lg border border-gray-200 p-6 shadow-sm;
}

.progress-header {
  @apply mb-6;
}

.progress-title {
  @apply flex items-center justify-between mb-2;
}

.title-text {
  @apply text-lg font-semibold text-gray-900;
}

.session-status {
  @apply px-3 py-1 text-sm font-medium rounded-full;
}

.session-status.active {
  @apply bg-green-100 text-green-800;
}

.session-status.paused {
  @apply bg-yellow-100 text-yellow-800;
}

.session-status.completed {
  @apply bg-blue-100 text-blue-800;
}

.session-status.idle {
  @apply bg-gray-100 text-gray-800;
}

.progress-stats {
  @apply text-sm text-gray-600;
}

.stat-item {
  @apply space-x-1;
}

.stat-value {
  @apply font-semibold text-gray-900;
}

.stat-label {
  @apply text-gray-500;
}

.stat-divider {
  @apply mx-3 text-gray-300;
}

.progress-bar-container {
  @apply mb-4;
}

.progress-bar-track {
  @apply relative w-full h-3 bg-gray-200 rounded-full overflow-hidden;
}

.progress-bar-fill {
  @apply h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out;
}

.progress-milestone {
  @apply absolute top-0 h-full w-1 bg-white border border-gray-300 transform -translate-x-1/2;
  @apply transition-colors duration-200;
}

.progress-milestone.reached {
  @apply bg-blue-700 border-blue-700;
}

.time-info {
  @apply grid grid-cols-2 gap-4 mb-4 text-sm;
}

.time-label {
  @apply text-gray-500 mr-2;
}

.time-value {
  @apply font-mono font-medium text-gray-900;
}

.detailed-stats {
  @apply mb-4;
}

.stats-row {
  @apply grid grid-cols-2 md:grid-cols-4 gap-3;
}

.stat-card {
  @apply bg-gray-50 rounded-lg p-3 text-center;
}

.stat-number {
  @apply text-2xl font-bold text-gray-900 mb-1;
}

.stat-description {
  @apply text-xs text-gray-500 uppercase tracking-wide;
}

.progress-actions {
  @apply flex gap-3 justify-end;
}

.action-button {
  @apply px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200;
}

.action-button.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50;
}

.action-button.secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50;
}

.action-button:focus {
  @apply outline-none;
}

@media (max-width: 640px) {
  .progress-stats {
    @apply flex flex-col space-y-1;
  }
  
  .stat-divider {
    @apply hidden;
  }
  
  .time-info {
    @apply grid-cols-1 gap-2;
  }
  
  .stats-row {
    @apply grid-cols-2 gap-2;
  }
}
</style>