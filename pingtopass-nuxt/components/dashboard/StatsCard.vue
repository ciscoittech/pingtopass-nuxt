<template>
  <div
    :data-test="'stats-card'"
    :class="[
      'stats-card',
      'responsive-card',
      `stats-card--${color}`,
      `stats-card--${size}`,
      {
        'cursor-pointer hover:shadow-lg': clickable,
        'animate-pulse': loading
      }
    ]"
    :role="clickable ? 'button' : 'region'"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="accessibilityLabel"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- Loading Skeleton -->
    <div
      v-if="loading"
      data-test="stats-card-skeleton"
      class="animate-pulse"
    >
      <div class="flex items-center space-x-4 p-6">
        <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Card Content -->
    <div
      :data-test="'stats-card-content'"
      :class="['stats-card__content', { hidden: loading }]"
    >
      <div class="flex items-center justify-between p-6">
        <!-- Icon -->
        <div
          v-if="icon"
          :data-test="'stats-card-icon'"
          :class="['stats-card__icon', `icon-${icon}`]"
        >
          <component
            :is="iconComponent"
            class="w-8 h-8"
            aria-hidden="true"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between">
            <div>
              <h3
                :data-test="'stats-card-title'"
                class="text-sm font-medium text-gray-600 truncate"
              >
                {{ title }}
              </h3>
              
              <div
                v-if="!loading"
                :data-test="'stats-card-value'"
                class="mt-1 text-3xl font-bold text-gray-900"
                role="status"
                :aria-label="`Current value: ${formattedValue}`"
              >
                {{ formattedValue }}
              </div>

              <div
                v-if="subtitle"
                :data-test="'stats-card-subtitle'"
                class="mt-1 text-xs text-gray-500"
              >
                {{ subtitle }}
              </div>
            </div>

            <!-- Change Indicator -->
            <div
              v-if="change !== undefined"
              :data-test="'stats-card-change'"
              :class="[
                'flex items-center text-sm font-medium',
                {
                  'text-green-500': changeType === 'increase' || change > 0,
                  'text-red-500': changeType === 'decrease' || change < 0,
                  'text-gray-500': change === 0
                }
              ]"
            >
              <component
                :is="changeIcon"
                class="w-4 h-4 mr-1"
                aria-hidden="true"
              />
              {{ changeText }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Screen Reader Announcements -->
    <div
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ screenReaderText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue';

// Icons (using simple SVG components for this implementation)
const BookIcon = defineAsyncComponent(() => import('~/components/icons/BookIcon.vue'));
const UsersIcon = defineAsyncComponent(() => import('~/components/icons/UsersIcon.vue'));
const ChartIcon = defineAsyncComponent(() => import('~/components/icons/ChartIcon.vue'));
const CheckIcon = defineAsyncComponent(() => import('~/components/icons/CheckIcon.vue'));
const ClockIcon = defineAsyncComponent(() => import('~/components/icons/ClockIcon.vue'));
const ArrowUpIcon = defineAsyncComponent(() => import('~/components/icons/ArrowUpIcon.vue'));
const ArrowDownIcon = defineAsyncComponent(() => import('~/components/icons/ArrowDownIcon.vue'));

interface Props {
  title: string;
  value: number;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  animated?: boolean;
  clickable?: boolean;
  subtitle?: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
  size: 'medium',
  loading: false,
  animated: true,
  clickable: false
});

const emit = defineEmits<{
  click: [];
}>();

// Animation state
const displayValue = ref(0);
const animationInterval = ref<NodeJS.Timeout | null>(null);
const isAnimating = ref(false);

// Computed properties
const iconComponent = computed(() => {
  const iconMap = {
    book: BookIcon,
    users: UsersIcon,
    chart: ChartIcon,
    check: CheckIcon,
    clock: ClockIcon
  };
  return iconMap[props.icon as keyof typeof iconMap] || BookIcon;
});

const changeIcon = computed(() => {
  if (props.change === undefined) return null;
  if (props.changeType === 'increase' || props.change > 0) return ArrowUpIcon;
  if (props.changeType === 'decrease' || props.change < 0) return ArrowDownIcon;
  return null;
});

const changeText = computed(() => {
  if (props.change === undefined) return '';
  const sign = props.change > 0 ? '+' : '';
  return `${sign}${props.change.toFixed(1)}%`;
});

const formattedValue = computed(() => {
  return new Intl.NumberFormat('en-US').format(displayValue.value);
});

const accessibilityLabel = computed(() => {
  let label = `${props.title}: ${formattedValue.value}`;
  if (props.subtitle) {
    label += `, ${props.subtitle}`;
  }
  if (props.change !== undefined) {
    label += `, Change: ${changeText.value}`;
  }
  return label;
});

const screenReaderText = ref('');

// Methods
const startAnimation = (targetValue: number) => {
  if (!props.animated || targetValue === displayValue.value) {
    displayValue.value = targetValue;
    return;
  }

  clearAnimation();
  isAnimating.value = true;

  const startValue = displayValue.value;
  const difference = targetValue - startValue;
  const duration = Math.min(2000, Math.max(500, Math.abs(difference) * 20)); // Dynamic duration
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    displayValue.value = Math.round(startValue + (difference * easeOut));

    if (progress < 1) {
      animationInterval.value = setTimeout(animate, 16); // ~60fps
    } else {
      displayValue.value = targetValue;
      isAnimating.value = false;
      
      // Announce final value to screen readers
      screenReaderText.value = `${props.title} updated to ${formattedValue.value}`;
    }
  };

  animate();
};

const clearAnimation = () => {
  if (animationInterval.value) {
    clearTimeout(animationInterval.value);
    clearInterval(animationInterval.value); // Support both types for test compatibility
    animationInterval.value = null;
  }
  isAnimating.value = false;
};

const handleClick = () => {
  if (props.clickable && !props.loading) {
    emit('click');
  }
};

// Watchers
watch(
  () => props.value,
  (newValue) => {
    if (!props.loading) {
      startAnimation(newValue);
    }
  },
  { immediate: true }
);

watch(
  () => props.loading,
  (loading) => {
    if (!loading && props.value !== displayValue.value) {
      startAnimation(props.value);
    }
  }
);

// Lifecycle
onMounted(() => {
  if (!props.loading) {
    startAnimation(props.value);
  }
});

onUnmounted(() => {
  clearAnimation();
});
</script>

<style scoped>
.stats-card {
  background-color: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 200ms ease-in-out;
  will-change: transform;
}

.stats-card__content {
  padding: 1.5rem;
}

[data-test="stats-card-title"] {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

[data-test="stats-card-value"] {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  will-change: contents;
  font-variant-numeric: tabular-nums;
}

.stats-card__icon {
  width: 2rem;
  height: 2rem;
}

/* Color variants */
.stats-card--blue {
  border-left: 4px solid #3b82f6;
}
.stats-card--blue .stats-card__icon {
  color: #3b82f6;
}

.stats-card--green {
  border-left: 4px solid #10b981;
}
.stats-card--green .stats-card__icon {
  color: #10b981;
}

.stats-card--yellow {
  border-left: 4px solid #f59e0b;
}
.stats-card--yellow .stats-card__icon {
  color: #f59e0b;
}

.stats-card--red {
  border-left: 4px solid #ef4444;
}
.stats-card--red .stats-card__icon {
  color: #ef4444;
}

.stats-card--purple {
  border-left: 4px solid #8b5cf6;
}
.stats-card--purple .stats-card__icon {
  color: #8b5cf6;
}

.stats-card--gray {
  border-left: 4px solid #6b7280;
}
.stats-card--gray .stats-card__icon {
  color: #6b7280;
}

/* Size variants */
.stats-card--small {
  font-size: 0.875rem;
}
.stats-card--small .stats-card__content {
  padding: 1rem;
}
.stats-card--small [data-test="stats-card-value"] {
  font-size: 1.5rem;
}

.stats-card--large {
  font-size: 1.125rem;
}
.stats-card--large .stats-card__content {
  padding: 2rem;
}
.stats-card--large [data-test="stats-card-value"] {
  font-size: 2.25rem;
}

/* Responsive design */
.responsive-card {
  width: 100%;
}

@media (max-width: 640px) {
  .stats-card {
    box-shadow: none;
    border: 0;
    border-bottom: 1px solid #e5e7eb;
    border-radius: 0;
  }
  
  .stats-card__content {
    padding: 1rem;
  }
  
  [data-test="stats-card-value"] {
    font-size: 1.5rem;
  }
}

/* Hover effects */
.stats-card.cursor-pointer:hover {
  transform: translateY(-0.25rem);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Focus styles for accessibility */
.stats-card:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

/* Loading skeleton */
.skeleton-text {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 0.25rem;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip: rect(0, 0, 0, 0);
}

/* Change indicator */
.change-indicator {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  font-size: 0.75rem;
}

.change-indicator--positive {
  color: #10b981;
}

.change-indicator--negative {
  color: #ef4444;
}
</style>