<template>
  <component
    :is="computedTag"
    :type="computedTag === 'button' ? type : undefined"
    :disabled="isDisabled"
    :href="href"
    :to="to"
    :class="buttonClasses"
    :aria-busy="loading"
    :aria-disabled="isDisabled"
    :aria-label="ariaLabel"
    :tabindex="isDisabled ? -1 : undefined"
    v-bind="$attrs"
    @click="handleClick"
    @focus="handleFocus"
    @blur="handleBlur"
    @keydown="handleKeydown"
  >
    <!-- Loading Spinner -->
    <span v-if="loading" class="spike-button__loader">
      <svg
        class="spike-button__spinner"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          class="spike-button__spinner-track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          class="spike-button__spinner-path"
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </span>

    <!-- Button Content -->
    <span 
      class="spike-button__content" 
      :class="{ 'spike-button__content--loading': loading }"
    >
      <!-- Left Icon Slot -->
      <span v-if="$slots['icon-left']" class="spike-button__icon spike-button__icon--left">
        <slot name="icon-left" />
      </span>

      <!-- Button Label -->
      <span class="spike-button__label">
        <slot />
      </span>

      <!-- Right Icon Slot -->
      <span v-if="$slots['icon-right']" class="spike-button__icon spike-button__icon--right">
        <slot name="icon-right" />
      </span>
    </span>
  </component>
</template>

<script setup lang="ts">
import type { ButtonVariant, ButtonSize } from '~/types/spike-theme'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  block?: boolean
  href?: string
  to?: string | object
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}

interface Emits {
  click: [event: MouseEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
  type: 'button'
})

const emit = defineEmits<Emits>()

// Computed Properties
const computedTag = computed(() => {
  if (props.href) return 'a'
  if (props.to) return resolveComponent('NuxtLink')
  return 'button'
})

const isDisabled = computed(() => props.disabled || props.loading)

const buttonClasses = computed(() => [
  'spike-button',
  `spike-button--${props.variant}`,
  `spike-button--${props.size}`,
  {
    'spike-button--block': props.block,
    'spike-button--disabled': props.disabled,
    'spike-button--loading': props.loading
  }
])

// Event Handlers
const handleClick = (event: MouseEvent) => {
  if (!isDisabled.value) {
    emit('click', event)
  }
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
  
  // Handle Enter and Space keys for non-button elements
  if ((event.key === 'Enter' || event.key === ' ') && computedTag.value !== 'button') {
    if (!isDisabled.value) {
      event.preventDefault()
      handleClick(event as unknown as MouseEvent)
    }
  }
}
</script>

<style scoped>
/* Base Button Styles */
.spike-button {
  /* CSS Custom Properties for theming */
  --button-height: var(--spike-control-height-md);
  --button-padding-x: var(--spike-button-padding-x-md);
  --button-padding-y: var(--spike-button-padding-y-md);
  --button-font-size: var(--spike-button-font-size);
  --button-font-weight: var(--spike-button-font-weight);
  --button-line-height: var(--spike-button-line-height);
  --button-letter-spacing: var(--spike-button-letter-spacing);
  --button-border-radius: var(--spike-space-2);

  /* Base styles */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spike-space-2);
  height: var(--button-height);
  padding: var(--button-padding-y) var(--button-padding-x);
  font-family: var(--spike-font-family-sans);
  font-size: var(--button-font-size);
  font-weight: var(--button-font-weight);
  line-height: var(--button-line-height);
  letter-spacing: var(--button-letter-spacing);
  text-decoration: none;
  border: 2px solid transparent;
  border-radius: var(--button-border-radius);
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: var(--spike-transition-default);
  
  /* Performance optimizations */
  will-change: transform, box-shadow;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Size Variants */
.spike-button--xs {
  --button-height: var(--spike-control-height-xs);
  --button-padding-x: var(--spike-button-padding-x-xs);
  --button-padding-y: var(--spike-button-padding-y-xs);
  --button-font-size: var(--spike-font-size-xs);
  --button-border-radius: var(--spike-space-1);
  gap: var(--spike-space-1);
}

.spike-button--sm {
  --button-height: var(--spike-control-height-sm);
  --button-padding-x: var(--spike-button-padding-x-sm);
  --button-padding-y: var(--spike-button-padding-y-sm);
  --button-font-size: var(--spike-font-size-sm);
  --button-border-radius: var(--spike-space-1-5);
  gap: var(--spike-space-1-5);
}

.spike-button--lg {
  --button-height: var(--spike-control-height-lg);
  --button-padding-x: var(--spike-button-padding-x-lg);
  --button-padding-y: var(--spike-button-padding-y-lg);
  --button-font-size: var(--spike-font-size-lg);
  --button-border-radius: var(--spike-space-3);
  gap: var(--spike-space-3);
}

.spike-button--xl {
  --button-height: var(--spike-control-height-xl);
  --button-padding-x: var(--spike-button-padding-x-xl);
  --button-padding-y: var(--spike-button-padding-y-xl);
  --button-font-size: var(--spike-font-size-xl);
  --button-border-radius: var(--spike-space-3);
  gap: var(--spike-space-3);
}

/* Variant Styles */
.spike-button--primary {
  background: var(--spike-gradient-primary);
  color: var(--spike-neutral-0);
  border-color: transparent;
}

.spike-button--primary:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  transform: translateY(-2px);
  box-shadow: var(--spike-shadow-primary-lg);
}

.spike-button--primary:active:not(.spike-button--disabled):not(.spike-button--loading) {
  transform: translateY(0);
  box-shadow: var(--spike-shadow-primary);
}

.spike-button--secondary {
  background: transparent;
  color: var(--spike-primary);
  border-color: var(--spike-primary);
}

.spike-button--secondary:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  background: var(--spike-primary-alpha-10);
  transform: translateY(-1px);
  box-shadow: var(--spike-shadow-button-hover);
}

.spike-button--secondary:active:not(.spike-button--disabled):not(.spike-button--loading) {
  background: var(--spike-primary-alpha-20);
  transform: translateY(0);
}

.spike-button--success {
  background: var(--spike-gradient-success);
  color: var(--spike-neutral-0);
  border-color: transparent;
}

.spike-button--success:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px 0 rgba(40, 167, 69, 0.2);
}

.spike-button--warning {
  background: var(--spike-gradient-warning);
  color: var(--spike-neutral-900);
  border-color: transparent;
}

.spike-button--warning:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px 0 rgba(255, 193, 7, 0.2);
}

.spike-button--danger {
  background: var(--spike-gradient-error);
  color: var(--spike-neutral-0);
  border-color: transparent;
}

.spike-button--danger:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px 0 rgba(220, 53, 69, 0.2);
}

.spike-button--ghost {
  background: transparent;
  color: var(--spike-text-primary);
  border-color: transparent;
}

.spike-button--ghost:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  background: var(--spike-neutral-alpha-10);
}

.spike-button--outline {
  background: transparent;
  color: var(--spike-text-primary);
  border-color: var(--spike-border);
}

.spike-button--outline:hover:not(.spike-button--disabled):not(.spike-button--loading) {
  background: var(--spike-neutral-50);
  border-color: var(--spike-neutral-300);
}

/* State Modifiers */
.spike-button--block {
  width: 100%;
}

.spike-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.spike-button--loading {
  cursor: wait;
  position: relative;
}

/* Focus States */
.spike-button:focus-visible {
  box-shadow: var(--spike-shadow-focus);
  z-index: 1;
}

.spike-button--primary:focus-visible {
  box-shadow: var(--spike-shadow-focus);
}

.spike-button--success:focus-visible {
  box-shadow: var(--spike-shadow-focus-success);
}

.spike-button--warning:focus-visible {
  box-shadow: var(--spike-shadow-focus-warning);
}

.spike-button--danger:focus-visible {
  box-shadow: var(--spike-shadow-focus-error);
}

/* Button Content */
.spike-button__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: inherit;
  transition: var(--spike-transition-opacity);
}

.spike-button__content--loading {
  opacity: 0;
}

.spike-button__label {
  white-space: nowrap;
}

.spike-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.spike-button__icon--left {
  margin-right: calc(var(--spike-space-1) * -0.5);
}

.spike-button__icon--right {
  margin-left: calc(var(--spike-space-1) * -0.5);
}

/* Loading Spinner */
.spike-button__loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spike-button__spinner {
  width: 1.25em;
  height: 1.25em;
  animation: spike-spin var(--spike-spinner-duration) linear infinite;
}

.spike-button__spinner-track {
  opacity: 0.2;
}

.spike-button__spinner-path {
  opacity: 0.8;
}

/* Responsive Adjustments */
@media (max-width: 576px) {
  .spike-button {
    /* Slightly smaller on mobile for better touch targets */
    min-height: 44px; /* iOS recommended minimum */
  }
  
  .spike-button--xs {
    min-height: 36px;
  }
  
  .spike-button--sm {
    min-height: 40px;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .spike-button {
    border-width: 2px;
  }
  
  .spike-button--primary,
  .spike-button--success,
  .spike-button--warning,
  .spike-button--danger {
    border-color: currentColor;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .spike-button {
    transition: none;
  }
  
  .spike-button:hover {
    transform: none;
  }
  
  .spike-button__spinner {
    animation: none;
  }
}

/* Dark Mode Adjustments */
[data-theme="dark"] {
  .spike-button--ghost {
    color: var(--spike-text-primary);
  }
  
  .spike-button--ghost:hover:not(.spike-button--disabled):not(.spike-button--loading) {
    background: var(--spike-neutral-alpha-15);
  }
  
  .spike-button--outline {
    border-color: var(--spike-border);
    color: var(--spike-text-primary);
  }
  
  .spike-button--outline:hover:not(.spike-button--disabled):not(.spike-button--loading) {
    background: var(--spike-neutral-alpha-10);
  }
}
</style>