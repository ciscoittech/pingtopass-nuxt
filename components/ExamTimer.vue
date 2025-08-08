<template>
  <div class="exam-timer" :class="timerClass" data-testid="exam-timer">
    <!-- Timer Display -->
    <div class="timer-display" data-testid="timer-display">
      <div class="timer-icon" data-testid="timer-icon">
        <svg 
          class="icon" 
          :class="{ 'animate-pulse': isWarning }"
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="timer-time">
        <span class="time-value" data-testid="time-remaining">{{ formattedTimeRemaining }}</span>
        <span v-if="showProgress" class="time-progress" data-testid="time-progress">
          {{ Math.round(progressPercentage) }}% remaining
        </span>
      </div>
    </div>

    <!-- Timer Controls -->
    <div v-if="showControls" class="timer-controls" data-testid="timer-controls">
      <button
        v-if="!isRunning && !isFinished"
        class="control-button primary"
        @click="startTimer"
        :disabled="isFinished"
        data-testid="start-button"
        aria-label="Start timer"
      >
        Start
      </button>
      
      <button
        v-if="isRunning"
        class="control-button secondary"
        @click="pauseTimer"
        data-testid="pause-button"
        aria-label="Pause timer"
      >
        Pause
      </button>
      
      <button
        v-if="isPaused"
        class="control-button primary"
        @click="resumeTimer"
        data-testid="resume-button"
        aria-label="Resume timer"
      >
        Resume
      </button>
      
      <button
        v-if="!isFinished && (isRunning || isPaused)"
        class="control-button danger"
        @click="resetTimer"
        data-testid="reset-button"
        aria-label="Reset timer"
      >
        Reset
      </button>
    </div>

    <!-- Progress Bar -->
    <div v-if="showProgressBar" class="timer-progress-bar" data-testid="timer-progress-bar">
      <div class="progress-track">
        <div 
          class="progress-fill"
          :style="{ width: `${100 - progressPercentage}%` }"
          data-testid="progress-fill"
        />
      </div>
    </div>

    <!-- Warning Messages -->
    <div v-if="warningMessage" class="warning-message" data-testid="warning-message">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">{{ warningMessage }}</span>
    </div>

    <!-- Status Indicator -->
    <div class="timer-status" data-testid="timer-status">
      <span class="status-dot" :class="statusClass" />
      <span class="status-text">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  duration: number; // duration in seconds
  autoStart?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
  showProgressBar?: boolean;
  warningThresholds?: number[]; // warning thresholds in seconds
  criticalThreshold?: number; // critical threshold in seconds
}

interface Emits {
  (e: 'time-up'): void;
  (e: 'warning', timeRemaining: number): void;
  (e: 'critical', timeRemaining: number): void;
  (e: 'started'): void;
  (e: 'paused'): void;
  (e: 'resumed'): void;
  (e: 'reset'): void;
  (e: 'tick', timeRemaining: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: false,
  showControls: true,
  showProgress: false,
  showProgressBar: false,
  warningThresholds: () => [300, 120, 60], // 5min, 2min, 1min
  criticalThreshold: 30 // 30 seconds
});

const emit = defineEmits<Emits>();

// Reactive state
const timeRemaining = ref(props.duration);
const isRunning = ref(false);
const isPaused = ref(false);
const isFinished = ref(false);
const intervalId = ref<NodeJS.Timeout | null>(null);
const hasWarned = ref<Set<number>>(new Set());
const hasCriticalWarned = ref(false);

// Computed properties
const formattedTimeRemaining = computed(() => formatTime(timeRemaining.value));

const progressPercentage = computed(() => {
  if (props.duration === 0) return 0;
  return (timeRemaining.value / props.duration) * 100;
});

const timerClass = computed(() => ({
  'warning': isWarning.value,
  'critical': isCritical.value,
  'finished': isFinished.value,
  'running': isRunning.value,
  'paused': isPaused.value
}));

const isWarning = computed(() => {
  return props.warningThresholds.some(threshold => 
    timeRemaining.value <= threshold && timeRemaining.value > props.criticalThreshold
  );
});

const isCritical = computed(() => {
  return timeRemaining.value <= props.criticalThreshold && timeRemaining.value > 0;
});

const warningMessage = computed(() => {
  if (isCritical.value) {
    return `Critical: Only ${formattedTimeRemaining.value} remaining!`;
  }
  if (isWarning.value) {
    return `Warning: ${formattedTimeRemaining.value} remaining`;
  }
  return '';
});

const statusClass = computed(() => {
  if (isFinished.value) return 'finished';
  if (isCritical.value) return 'critical';
  if (isWarning.value) return 'warning';
  if (isRunning.value) return 'running';
  if (isPaused.value) return 'paused';
  return 'idle';
});

const statusText = computed(() => {
  if (isFinished.value) return 'Time\'s up';
  if (isRunning.value) return 'Running';
  if (isPaused.value) return 'Paused';
  return 'Ready';
});

// Methods
const startTimer = () => {
  if (isFinished.value) return;
  
  isRunning.value = true;
  isPaused.value = false;
  
  intervalId.value = setInterval(() => {
    timeRemaining.value--;
    emit('tick', timeRemaining.value);
    
    checkWarnings();
    
    if (timeRemaining.value <= 0) {
      finishTimer();
    }
  }, 1000);
  
  emit('started');
};

const pauseTimer = () => {
  if (!isRunning.value) return;
  
  isRunning.value = false;
  isPaused.value = true;
  
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
  
  emit('paused');
};

const resumeTimer = () => {
  if (!isPaused.value || isFinished.value) return;
  
  isPaused.value = false;
  startTimer();
  
  emit('resumed');
};

const resetTimer = () => {
  isRunning.value = false;
  isPaused.value = false;
  isFinished.value = false;
  timeRemaining.value = props.duration;
  hasWarned.value.clear();
  hasCriticalWarned.value = false;
  
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
  
  emit('reset');
};

const finishTimer = () => {
  isRunning.value = false;
  isPaused.value = false;
  isFinished.value = true;
  timeRemaining.value = 0;
  
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
  
  emit('time-up');
};

const checkWarnings = () => {
  // Check warning thresholds
  props.warningThresholds.forEach(threshold => {
    if (timeRemaining.value === threshold && !hasWarned.value.has(threshold)) {
      hasWarned.value.add(threshold);
      emit('warning', timeRemaining.value);
    }
  });
  
  // Check critical threshold
  if (timeRemaining.value === props.criticalThreshold && !hasCriticalWarned.value) {
    hasCriticalWarned.value = true;
    emit('critical', timeRemaining.value);
  }
};

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

// Auto-start if enabled
onMounted(() => {
  if (props.autoStart) {
    startTimer();
  }
});

// Watch for duration changes
watch(() => props.duration, (newDuration) => {
  if (!isRunning.value && !isPaused.value) {
    timeRemaining.value = newDuration;
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
});

// Expose methods and state for testing
defineExpose({
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  timeRemaining: readonly(timeRemaining),
  isRunning: readonly(isRunning),
  isPaused: readonly(isPaused),
  isFinished: readonly(isFinished),
  formatTime
});
</script>

<style scoped>
.exam-timer {
  @apply bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-all duration-200;
}

.exam-timer.warning {
  @apply border-yellow-300 bg-yellow-50;
}

.exam-timer.critical {
  @apply border-red-300 bg-red-50;
}

.exam-timer.finished {
  @apply border-gray-400 bg-gray-100;
}

.timer-display {
  @apply flex items-center space-x-3 mb-4;
}

.timer-icon {
  @apply flex-shrink-0;
}

.icon {
  @apply w-6 h-6;
}

.exam-timer.warning .icon {
  @apply text-yellow-600;
}

.exam-timer.critical .icon {
  @apply text-red-600;
}

.exam-timer.running .icon {
  @apply text-blue-600;
}

.exam-timer.finished .icon {
  @apply text-gray-500;
}

.timer-time {
  @apply flex flex-col;
}

.time-value {
  @apply text-2xl font-mono font-bold text-gray-900;
}

.exam-timer.warning .time-value {
  @apply text-yellow-900;
}

.exam-timer.critical .time-value {
  @apply text-red-900;
}

.time-progress {
  @apply text-sm text-gray-600;
}

.timer-controls {
  @apply flex flex-wrap gap-2 mb-4;
}

.control-button {
  @apply px-3 py-1 rounded text-sm font-medium transition-colors duration-200;
}

.control-button.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50;
}

.control-button.secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50;
}

.control-button.danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50;
}

.control-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.control-button:focus {
  @apply outline-none;
}

.timer-progress-bar {
  @apply mb-4;
}

.progress-track {
  @apply w-full h-2 bg-gray-200 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-linear;
}

.exam-timer.warning .progress-fill {
  @apply from-yellow-500 to-yellow-600;
}

.exam-timer.critical .progress-fill {
  @apply from-red-500 to-red-600;
}

.warning-message {
  @apply flex items-center space-x-2 p-3 rounded-lg mb-4;
}

.exam-timer.warning .warning-message {
  @apply bg-yellow-100 text-yellow-800;
}

.exam-timer.critical .warning-message {
  @apply bg-red-100 text-red-800;
}

.warning-icon {
  @apply text-lg;
}

.warning-text {
  @apply font-medium;
}

.timer-status {
  @apply flex items-center space-x-2 text-sm;
}

.status-dot {
  @apply w-2 h-2 rounded-full;
}

.status-dot.idle {
  @apply bg-gray-400;
}

.status-dot.running {
  @apply bg-green-500 animate-pulse;
}

.status-dot.paused {
  @apply bg-yellow-500;
}

.status-dot.warning {
  @apply bg-yellow-500 animate-pulse;
}

.status-dot.critical {
  @apply bg-red-500 animate-pulse;
}

.status-dot.finished {
  @apply bg-gray-500;
}

.status-text {
  @apply text-gray-700 font-medium;
}
</style>