<template>
  <div
    :class="cardClasses"
    :role="computedRole"
    :tabindex="computedTabindex"
    :aria-selected="selected ? 'true' : undefined"
    :aria-disabled="isDisabled"
    :aria-busy="loading"
    :aria-label="ariaLabel"
    v-bind="filteredAttrs"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleFocus"
    @blur="handleBlur"
    @keydown="handleKeydown"
  >
    <!-- Loading Overlay -->
    <div v-if="loading" class="spike-card__loading-overlay">
      <div class="spike-card__loading-content">
        <svg
          class="spike-card__spinner"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            class="spike-card__spinner-track"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            class="spike-card__spinner-path"
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>

    <!-- Card Header -->
    <div v-if="$slots.header" class="spike-card__header">
      <slot name="header" />
    </div>

    <!-- Card Body -->
    <div class="spike-card__body">
      <slot />
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" class="spike-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardVariant, CardPadding } from '~/types/spike-theme'

interface Props {
  variant?: CardVariant
  padding?: CardPadding
  hoverable?: boolean
  clickable?: boolean
  selected?: boolean
  disabled?: boolean
  loading?: boolean
  ariaLabel?: string
}

interface Emits {
  click: [event: MouseEvent]
  hover: [event: MouseEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'flat',
  padding: 'md',
  hoverable: false,
  clickable: false,
  selected: false,
  disabled: false,
  loading: false
})

const emit = defineEmits<Emits>()
const $attrs = useAttrs()

// Computed Properties
const isDisabled = computed(() => props.disabled || props.loading)

const computedRole = computed(() => {
  if (props.clickable) return 'button'
  return undefined
})

const computedTabindex = computed(() => {
  if (!props.clickable) return undefined
  return isDisabled.value ? -1 : 0
})

const cardClasses = computed(() => [
  'spike-card',
  `spike-card--${props.variant}`,
  `spike-card--padding-${props.padding}`,
  {
    'spike-card--hoverable': props.hoverable,
    'spike-card--clickable': props.clickable,
    'spike-card--selected': props.selected,
    'spike-card--disabled': props.disabled,
    'spike-card--loading': props.loading
  }
])

// Filter out attrs that have explicit bindings to prevent conflicts
const filteredAttrs = computed(() => {
  const { 'aria-selected': _, 'aria-disabled': __, 'aria-busy': ___, 'aria-label': ____, 'role': _____, 'tabindex': ______, ...rest } = $attrs
  return rest
})

// Event Handlers
const handleClick = (event: MouseEvent) => {
  if (props.clickable && !isDisabled.value) {
    emit('click', event)
  }
}

const handleMouseEnter = (event: MouseEvent) => {
  if (props.hoverable) {
    emit('hover', event)
  }
}

const handleMouseLeave = (event: MouseEvent) => {
  if (props.hoverable) {
    emit('hover', event)
  }
}

const handleFocus = (event: FocusEvent) => {
  if (props.clickable) {
    emit('focus', event)
  }
}

const handleBlur = (event: FocusEvent) => {
  if (props.clickable) {
    emit('blur', event)
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.clickable && !isDisabled.value) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick(event as unknown as MouseEvent)
    }
  }
}
</script>

<style scoped>
/* Base Card Styles */
.spike-card {
  /* CSS Custom Properties for theming */
  --card-background: var(--spike-surface);
  --card-border: var(--spike-border);
  --card-border-radius: var(--spike-space-3);
  --card-padding: var(--spike-card-padding-md);
  --card-gap: var(--spike-card-gap);
  --card-shadow: var(--spike-shadow-card);

  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--card-background);
  border: 1px solid var(--card-border);
  border-radius: var(--card-border-radius);
  box-shadow: var(--card-shadow);
  transition: var(--spike-transition-default);
  overflow: hidden;
  
  /* Performance optimizations */
  will-change: transform, box-shadow;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Variant Styles */
.spike-card--flat {
  --card-shadow: none;
  --card-background: var(--spike-surface);
  --card-border: var(--spike-border-muted);
}

.spike-card--outlined {
  --card-shadow: none;
  --card-background: var(--spike-surface);
  --card-border: var(--spike-border);
  border-width: 2px;
}

.spike-card--elevated {
  --card-shadow: var(--spike-shadow-card-elevated);
  --card-background: var(--spike-surface);
  --card-border: transparent;
  border-width: 0;
}

.spike-card--filled {
  --card-background: var(--spike-neutral-50);
  --card-border: transparent;
  --card-shadow: var(--spike-shadow-inner);
  border-width: 0;
}

/* Padding Variants */
.spike-card--padding-none {
  --card-padding: 0;
}

.spike-card--padding-xs {
  --card-padding: var(--spike-card-padding-sm);
  --card-gap: var(--spike-space-2);
}

.spike-card--padding-sm {
  --card-padding: var(--spike-card-padding-sm);
  --card-gap: var(--spike-space-3);
}

.spike-card--padding-md {
  --card-padding: var(--spike-card-padding-md);
  --card-gap: var(--spike-space-4);
}

.spike-card--padding-lg {
  --card-padding: var(--spike-card-padding-lg);
  --card-gap: var(--spike-space-5);
}

.spike-card--padding-xl {
  --card-padding: var(--spike-space-10);
  --card-gap: var(--spike-space-6);
}

/* Interactive States */
.spike-card--hoverable:hover {
  --card-shadow: var(--spike-shadow-card-hover);
  transform: translateY(-2px);
}

.spike-card--clickable {
  cursor: pointer;
}

.spike-card--clickable:hover {
  --card-shadow: var(--spike-shadow-card-hover);
  transform: translateY(-1px);
}

.spike-card--clickable:active {
  transform: translateY(0);
  --card-shadow: var(--spike-shadow-card);
}

.spike-card--selected {
  --card-border: var(--spike-primary);
  --card-shadow: var(--spike-shadow-primary);
  border-width: 2px;
}

.spike-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
  transform: none !important;
  --card-shadow: none;
}

.spike-card--loading {
  position: relative;
  pointer-events: none;
}

/* Focus States */
.spike-card--clickable:focus-visible {
  --card-shadow: var(--spike-shadow-focus);
  outline: none;
  z-index: 1;
}

.spike-card--selected:focus-visible {
  --card-shadow: var(--spike-shadow-focus), var(--spike-shadow-primary);
}

/* Card Sections */
.spike-card__header {
  padding: var(--card-padding);
  padding-bottom: 0;
  border-bottom: 1px solid var(--spike-border-muted);
  margin-bottom: var(--card-gap);
}

.spike-card--padding-none .spike-card__header {
  padding: var(--spike-card-padding-md);
  padding-bottom: 0;
  margin-bottom: var(--spike-space-4);
}

.spike-card__body {
  padding: var(--card-padding);
  flex: 1;
}

.spike-card--padding-none .spike-card__body {
  padding: 0;
}

.spike-card__footer {
  padding: var(--card-padding);
  padding-top: 0;
  border-top: 1px solid var(--spike-border-muted);
  margin-top: var(--card-gap);
}

.spike-card--padding-none .spike-card__footer {
  padding: var(--spike-card-padding-md);
  padding-top: 0;
  margin-top: var(--spike-space-4);
}

/* Remove borders when no gaps */
.spike-card--padding-none .spike-card__header,
.spike-card--padding-none .spike-card__footer {
  border: none;
  margin: 0;
}

/* Loading Overlay */
.spike-card__loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--spike-surface), 0.8);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.spike-card__loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spike-space-6);
  background-color: var(--spike-surface);
  border-radius: var(--spike-space-2);
  box-shadow: var(--spike-shadow-lg);
}

.spike-card__spinner {
  width: 2rem;
  height: 2rem;
  color: var(--spike-primary);
  animation: spike-spin var(--spike-spinner-duration) linear infinite;
}

.spike-card__spinner-track {
  opacity: 0.2;
}

.spike-card__spinner-path {
  opacity: 0.8;
}

/* Responsive Adjustments */
@media (max-width: 576px) {
  .spike-card {
    --card-border-radius: var(--spike-space-2);
  }
  
  .spike-card--padding-md {
    --card-padding: var(--spike-space-4);
  }
  
  .spike-card--padding-lg {
    --card-padding: var(--spike-space-5);
  }
  
  .spike-card--padding-xl {
    --card-padding: var(--spike-space-6);
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .spike-card {
    border-width: 2px;
  }
  
  .spike-card--selected {
    border-width: 3px;
  }
  
  .spike-card--elevated,
  .spike-card--filled {
    border: 2px solid var(--spike-border);
    border-width: 2px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .spike-card {
    transition: none;
  }
  
  .spike-card:hover,
  .spike-card--hoverable:hover,
  .spike-card--clickable:hover {
    transform: none;
  }
  
  .spike-card__spinner {
    animation: none;
  }
}

/* Dark Mode Adjustments */
[data-theme="dark"] {
  .spike-card--flat {
    --card-background: var(--spike-surface);
    --card-border: var(--spike-border-muted);
  }
  
  .spike-card--outlined {
    --card-background: var(--spike-surface);
    --card-border: var(--spike-border);
  }
  
  .spike-card--elevated {
    --card-background: var(--spike-surface);
    --card-shadow: var(--spike-elevation-4);
  }
  
  .spike-card--filled {
    --card-background: var(--spike-neutral-800);
  }
  
  .spike-card__loading-overlay {
    background-color: rgba(33, 37, 41, 0.8);
  }
}

/* Print Styles */
@media print {
  .spike-card {
    border: 1px solid #000;
    box-shadow: none;
    break-inside: avoid;
  }
  
  .spike-card__loading-overlay {
    display: none;
  }
  
  .spike-card--elevated,
  .spike-card--filled {
    background: white;
    border: 1px solid #000;
  }
}

/* Animation Classes */
.spike-card--animate-enter {
  animation: spike-scale-in var(--spike-duration-fast) var(--spike-ease-out);
}

.spike-card--animate-leave {
  animation: spike-scale-out var(--spike-duration-fast) var(--spike-ease-out);
}

/* Grid Layout Support */
.spike-card--grid-item {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.spike-card--grid-item .spike-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Accessibility Enhancements */
.spike-card[role="button"]:hover::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: var(--spike-primary-alpha-10);
  border-radius: calc(var(--card-border-radius) + 2px);
  z-index: -1;
  opacity: 0;
  transition: opacity var(--spike-duration-fast);
}

.spike-card[role="button"]:hover:not(.spike-card--disabled):not(.spike-card--loading)::before {
  opacity: 1;
}
</style>