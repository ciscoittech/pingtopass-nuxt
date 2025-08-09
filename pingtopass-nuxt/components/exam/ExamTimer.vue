<template>
  <div
    data-test="exam-timer"
    :class="[
      'exam-timer',
      'border rounded-lg bg-white shadow-sm transition-all duration-200',
      {
        'compact': variant === 'compact',
        'minimal': variant === 'minimal',
        'timer-warning': isWarning,
        'timer-critical': isCritical
      }
    ]"
    :style="customStyles"
    role="timer"
    :aria-live="isCritical ? 'assertive' : 'polite'"
    aria-label="Exam timer"
  >
    <!-- Header -->
    <div 
      data-test="timer-header"
      :class="[
        'timer-header p-3 border-b',
        {
          'bg-yellow-50 border-yellow-200': isWarning && !isCritical,
          'bg-red-50 border-red-200': isCritical,
          'bg-gray-50 border-gray-200': !isWarning && !isCritical
        }
      ]"
    >
      <h3 class="text-sm font-medium text-gray-900 text-center">
        {{ headerText || 'Time Remaining' }}
      </h3>
    </div>

    <!-- Main Timer Display -->
    <div class="timer-body p-4">
      <!-- Time Display -->
      <div 
        data-test="time-display"
        :class="[
          'time-display text-center font-mono text-3xl font-bold mb-2 transition-colors duration-200',
          {
            'text-gray-900': !isWarning && !isCritical,
            'text-yellow-600': isWarning && !isCritical,
            'text-red-600': isCritical
          }
        ]"
      >
        {{ formattedTime }}
      </div>

      <!-- Progress Bar -->
      <div 
        v-if="showProgress"
        data-test="progress-bar"
        class="progress-bar w-full bg-gray-200 rounded-full h-2 mb-4"
      >
        <div
          data-test="progress-fill"
          :class="[
            'progress-fill h-2 rounded-full transition-all duration-200',
            {
              'bg-blue-500': !isWarning && !isCritical,
              'bg-yellow-500': isWarning && !isCritical,
              'bg-red-500': isCritical
            }
          ]"
          :style="`width: ${progressPercentage}%`"
        ></div>
      </div>

      <!-- Warning Messages -->
      <div 
        v-if="isWarning && !isCritical"
        data-test="timer-warning"
        class="warning-message text-center text-sm text-yellow-700 bg-yellow-50 p-2 rounded mb-2"
      >
        {{ warningThreshold / 60 }} minutes remaining!
      </div>

      <div 
        v-if="isCritical"
        data-test="timer-critical"
        class="critical-message text-center text-sm text-red-700 bg-red-50 p-2 rounded mb-2 animate-pulse"
      >
        {{ criticalThreshold / 60 }} minute{{ criticalThreshold !== 60 ? 's' : '' }} remaining!
      </div>

      <!-- Timer Controls -->
      <div 
        v-if="showControls"
        data-test="timer-controls"
        class="timer-controls flex justify-center space-x-2"
      >
        <button
          v-if="!isRunning"
          data-test="start-button"
          @click="startTimer"
          @keydown="handleKeyDown"
          :aria-label="currentTime === totalTime ? 'Start timer' : 'Resume timer'"
          class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
        >
          {{ currentTime === totalTime ? 'Start' : 'Resume' }}
        </button>

        <button
          v-if="isRunning"
          data-test="pause-button"
          @click="pauseTimer"
          @keydown="handleKeyDown"
          aria-label="Pause timer"
          class="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
        >
          Pause
        </button>

        <button
          v-if="!isRunning"
          data-test="resume-button"
          @click="resumeTimer"
          @keydown="handleKeyDown"
          :disabled="currentTime === totalTime"
          aria-label="Resume timer"
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Resume
        </button>

        <button
          v-if="currentTime !== totalTime"
          data-test="reset-button"
          @click="resetTimer"
          @keydown="handleKeyDown"
          aria-label="Reset timer"
          class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Screen Reader Announcements -->
    <div class="sr-only" aria-live="polite">
      <span 
        v-if="screenReaderMessage"
        data-test="sr-announcement"
      >
        {{ screenReaderMessage }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

// Props
interface Props {
  totalTime: number; // in seconds
  currentTime?: number; // in seconds, for restoring state
  autoStart?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
  enableSounds?: boolean;
  warningThreshold?: number; // seconds remaining for warning
  criticalThreshold?: number; // seconds remaining for critical warning
  variant?: 'default' | 'compact' | 'minimal';
  headerText?: string;
  persistState?: boolean;
  examId?: string;
  color?: string;
  warningColor?: string;
  criticalColor?: string;
  onTick?: (timeRemaining: number) => void;
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: false,
  showControls: true,
  showProgress: false,
  enableSounds: true,
  warningThreshold: 300, // 5 minutes
  criticalThreshold: 60,  // 1 minute
  variant: 'default',
  persistState: false,
  color: 'blue',
  warningColor: 'yellow',
  criticalColor: 'red'
});

// Emits
const emit = defineEmits<{
  'time-up': [];
  'warning': [timeRemaining: number];
  'critical-warning': [timeRemaining: number];
  'tick': [timeRemaining: number];
  'started': [timeRemaining: number];
  'paused': [timeRemaining: number];
  'resumed': [timeRemaining: number];
  'reset': [];
  'state-changed': [state: { timeRemaining: number; isRunning: boolean }];
}>();

// State
const isRunning = ref(false);
const currentTime = ref(props.currentTime !== undefined ? props.currentTime : props.totalTime);
const intervalId = ref<NodeJS.Timeout | null>(null);
const hasWarned = ref(false);
const hasCriticalWarned = ref(false);
const screenReaderMessage = ref('');
const lastTickTime = ref(Date.now());

// Audio instances for sounds
let warningSound: HTMLAudioElement | null = null;
let criticalSound: HTMLAudioElement | null = null;

// Computed Properties
const formattedTime = computed(() => {
  const time = Math.max(0, currentTime.value);
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const progressPercentage = computed(() => {
  if (props.totalTime <= 0) return 0;
  const elapsed = props.totalTime - currentTime.value;
  return Math.min(100, Math.max(0, (elapsed / props.totalTime) * 100));
});

const isWarning = computed(() => {
  return currentTime.value <= props.warningThreshold && currentTime.value > props.criticalThreshold;
});

const isCritical = computed(() => {
  return currentTime.value <= props.criticalThreshold && currentTime.value > 0;
});

const customStyles = computed(() => {
  const styles: Record<string, string> = {};
  
  if (props.color !== 'blue') {
    styles['--color-primary'] = props.color;
  }
  if (props.warningColor !== 'yellow') {
    styles['--color-warning'] = props.warningColor;
  }
  if (props.criticalColor !== 'red') {
    styles['--color-critical'] = props.criticalColor;
  }
  
  return Object.keys(styles).length > 0 ? styles : undefined;
});

// Methods
const startTimer = () => {
  if (isRunning.value || currentTime.value <= 0) return;
  
  isRunning.value = true;
  
  intervalId.value = setInterval(() => {
    currentTime.value = Math.max(0, currentTime.value - 1);
    
    handleTick();
    
    if (currentTime.value <= 0) {
      stopTimer();
      emit('time-up');
    }
  }, 1000); // Check every second
  
  emit('started', currentTime.value);
  emitStateChange();
};

const pauseTimer = () => {
  if (!isRunning.value) return;
  
  isRunning.value = false;
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
  
  emit('paused', currentTime.value);
  emitStateChange();
};

const resumeTimer = () => {
  if (isRunning.value || currentTime.value <= 0) return;
  
  startTimer();
  emit('resumed', currentTime.value);
};

const resetTimer = () => {
  stopTimer();
  currentTime.value = props.totalTime;
  hasWarned.value = false;
  hasCriticalWarned.value = false;
  screenReaderMessage.value = '';
  
  emit('reset');
  emitStateChange();
};

const stopTimer = () => {
  isRunning.value = false;
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
};

const handleTick = () => {
  // Emit tick event (throttled to once per second)
  emit('tick', currentTime.value);
  if (props.onTick) {
    props.onTick(currentTime.value);
  }
  
  // Handle warnings
  if (isWarning.value && !hasWarned.value) {
    hasWarned.value = true;
    const minutesRemaining = Math.ceil(currentTime.value / 60);
    screenReaderMessage.value = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} remaining`;
    
    if (props.enableSounds) {
      playWarningSound();
    }
    
    emit('warning', currentTime.value);
  }
  
  if (isCritical.value && !hasCriticalWarned.value) {
    hasCriticalWarned.value = true;
    const minutesRemaining = Math.ceil(currentTime.value / 60);
    screenReaderMessage.value = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} remaining`;
    
    if (props.enableSounds) {
      playCriticalSound();
    }
    
    emit('critical-warning', currentTime.value);
  }
  
  emitStateChange();
};

const playWarningSound = async () => {
  try {
    if (!warningSound) {
      warningSound = new Audio();
      // You would set warningSound.src to an actual audio file URL
      // For demo purposes, we'll just create the Audio object
    }
    await warningSound.play();
  } catch (error) {
    console.warn('Failed to play warning sound:', error);
  }
};

const playCriticalSound = async () => {
  try {
    if (!criticalSound) {
      criticalSound = new Audio();
      // You would set criticalSound.src to an actual audio file URL
      // For demo purposes, we'll just create the Audio object
    }
    await criticalSound.play();
  } catch (error) {
    console.warn('Failed to play critical sound:', error);
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    (event.target as HTMLButtonElement).click();
  }
};

const resetWarnings = () => {
  hasWarned.value = false;
  hasCriticalWarned.value = false;
  screenReaderMessage.value = '';
};

const emitStateChange = () => {
  if (props.persistState) {
    emit('state-changed', {
      timeRemaining: currentTime.value,
      isRunning: isRunning.value
    });
  }
};

const handleVisibilityChange = () => {
  // Optional: Pause timer when tab is hidden (implementation choice)
  // if (document.visibilityState === 'hidden' && isRunning.value) {
  //   pauseTimer();
  // }
};

// Watchers
watch(() => props.totalTime, (newTotalTime) => {
  if (!isRunning.value) {
    currentTime.value = newTotalTime;
    resetWarnings();
  }
}, { immediate: true });

watch(() => props.currentTime, (newCurrentTime) => {
  if (newCurrentTime !== undefined && newCurrentTime !== currentTime.value) {
    currentTime.value = newCurrentTime;
  }
}, { immediate: true });

// Lifecycle
onMounted(() => {
  // Initialize current time if not set
  if (props.currentTime === undefined) {
    currentTime.value = props.totalTime;
  }
  
  // Initialize audio objects if sounds are enabled
  if (props.enableSounds) {
    warningSound = new Audio();
    criticalSound = new Audio();
  }
  
  // Add visibility change listener for tab switching behavior
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Auto-start if requested
  if (props.autoStart && currentTime.value > 0) {
    nextTick(() => {
      startTimer();
    });
  }
  
  // Clear screen reader message after announcements
  watch(screenReaderMessage, (message) => {
    if (message) {
      setTimeout(() => {
        screenReaderMessage.value = '';
      }, 3000);
    }
  });
});

onUnmounted(() => {
  stopTimer();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  
  // Clean up audio objects
  warningSound = null;
  criticalSound = null;
});

// Expose methods for testing
defineExpose({
  isRunning,
  currentTime,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  examId: props.examId
});
</script>

<style scoped>
.exam-timer {
  transition: all 0.2s ease-in-out;
  min-width: 200px;
}

.exam-timer.compact {
  font-size: 0.875rem;
}

.exam-timer.compact .time-display {
  font-size: 1.5rem;
}

.exam-timer.minimal {
  border: 0; box-shadow: none; background-color: transparent;
}

.exam-timer.minimal .timer-header {
  display: none;
}

.exam-timer.minimal .timer-body {
  padding: 0.5rem;
}

.time-display {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
}

.timer-warning {
  border-color: rgb(254 240 138); background-color: rgb(254 252 232 / 0.3);
}

.timer-critical {
  border-color: rgb(254 202 202); background-color: rgb(254 242 242 / 0.3);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.progress-fill {
  transition: width 0.5s ease-in-out;
}

/* Button hover and focus improvements */
button:disabled {
  opacity: 0.5; cursor: not-allowed;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
}

button:focus {
  --tw-ring-offset-width: 2px;
}

/* Animation for critical state */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .8;
  }
}

/* Custom color properties using Spike theme variables */
.exam-timer {
  --color-primary: var(--spike-primary, #3b82f6);
  --color-warning: var(--spike-warning, #eab308);
  --color-critical: var(--spike-error, #ef4444);
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .exam-timer,
  .timer-critical,
  .progress-fill,
  button {
    animation: none;
    transition: none;
    transform: none;
  }
}

/* Print styles */
@media print {
  .exam-timer {
    break-inside: avoid; border: 1px solid rgb(209 213 219);
  }
  
  .timer-controls {
    display: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .time-display {
    font-weight: 900;
  }
  
  .timer-warning {
    border-width: 2px;
    border-color: rgb(202 138 4);
  }
  
  .timer-critical {
    border-width: 2px;
    border-color: rgb(220 38 38);
  }
}

/* Screen reader only utilities */
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