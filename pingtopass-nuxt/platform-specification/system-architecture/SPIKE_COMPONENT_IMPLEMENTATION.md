# Spike Theme Component Implementation Guide

## Component Implementation Strategy

This guide provides the complete implementation details for all Spike theme components, including Vue 3 composition API patterns, TypeScript interfaces, and testing strategies.

---

## 1. Base Components

### 1.1 SpikeButton Component

```vue
<!-- components/base/SpikeButton.vue -->
<template>
  <component
    :is="componentType"
    :class="buttonClasses"
    :disabled="disabled || loading"
    :href="href"
    :to="to"
    :type="type"
    @click="handleClick"
    v-bind="$attrs"
  >
    <!-- Loading Spinner -->
    <Transition name="spike-fade">
      <span v-if="loading" class="spike-btn__spinner">
        <SpikeSpinner :size="spinnerSize" color="currentColor" />
      </span>
    </Transition>
    
    <!-- Button Content -->
    <span class="spike-btn__content" :class="{ 'spike-btn__content--loading': loading }">
      <!-- Left Icon Slot -->
      <span v-if="$slots['icon-left'] || iconLeft" class="spike-btn__icon spike-btn__icon--left">
        <slot name="icon-left">
          <SpikeIcon v-if="iconLeft" :name="iconLeft" :size="iconSize" />
        </slot>
      </span>
      
      <!-- Main Content -->
      <span class="spike-btn__text">
        <slot />
      </span>
      
      <!-- Right Icon Slot -->
      <span v-if="$slots['icon-right'] || iconRight" class="spike-btn__icon spike-btn__icon--right">
        <slot name="icon-right">
          <SpikeIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
        </slot>
      </span>
    </span>
    
    <!-- Ripple Effect -->
    <span v-if="ripple" ref="rippleContainer" class="spike-btn__ripple"></span>
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ButtonVariant, ButtonSize } from '~/types/spike-theme'

// Props Interface
interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  block?: boolean
  ripple?: boolean
  href?: string
  to?: string | object
  type?: 'button' | 'submit' | 'reset'
  iconLeft?: string
  iconRight?: string
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
  ripple: true,
  type: 'button'
})

// Emits
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// Router instance
const router = useRouter()

// Refs
const rippleContainer = ref<HTMLElement>()

// Computed properties
const componentType = computed(() => {
  if (props.href) return 'a'
  if (props.to) return resolveComponent('NuxtLink')
  return 'button'
})

const buttonClasses = computed(() => [
  'spike-btn',
  `spike-btn--${props.variant}`,
  `spike-btn--${props.size}`,
  {
    'spike-btn--block': props.block,
    'spike-btn--disabled': props.disabled,
    'spike-btn--loading': props.loading,
    'spike-btn--with-ripple': props.ripple
  }
])

const spinnerSize = computed(() => {
  const sizeMap = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 }
  return sizeMap[props.size] || 16
})

const iconSize = computed(() => {
  const sizeMap = { xs: 14, sm: 16, md: 18, lg: 20, xl: 24 }
  return sizeMap[props.size] || 18
})

// Methods
const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  
  // Create ripple effect
  if (props.ripple && rippleContainer.value) {
    createRipple(event)
  }
  
  emit('click', event)
}

const createRipple = (event: MouseEvent) => {
  if (!rippleContainer.value) return
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  const ripple = document.createElement('span')
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  ripple.classList.add('spike-btn__ripple-effect')
  
  rippleContainer.value.appendChild(ripple)
  
  setTimeout(() => {
    ripple.remove()
  }, 600)
}
</script>

<style scoped>
/* Component-specific animations */
.spike-fade-enter-active,
.spike-fade-leave-active {
  transition: opacity 0.2s ease;
}

.spike-fade-enter-from,
.spike-fade-leave-to {
  opacity: 0;
}

/* Ripple effect */
.spike-btn__ripple {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.spike-btn__ripple-effect {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: spike-ripple 0.6s ease-out;
}

@keyframes spike-ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* Loading state */
.spike-btn__spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spike-btn__content--loading {
  opacity: 0;
  visibility: hidden;
}
</style>
```

### 1.2 SpikeCard Component

```vue
<!-- components/base/SpikeCard.vue -->
<template>
  <article
    :class="cardClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Card Image -->
    <div v-if="$slots.image || image" class="spike-card__image-wrapper">
      <slot name="image">
        <img 
          v-if="image" 
          :src="image" 
          :alt="imageAlt"
          class="spike-card__image"
          :loading="lazyLoad ? 'lazy' : 'eager'"
        />
      </slot>
      <div v-if="$slots.overlay" class="spike-card__overlay">
        <slot name="overlay" />
      </div>
    </div>
    
    <!-- Card Header -->
    <header v-if="$slots.header || title" class="spike-card__header">
      <slot name="header">
        <h3 v-if="title" class="spike-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="spike-card__subtitle">{{ subtitle }}</p>
      </slot>
    </header>
    
    <!-- Card Body -->
    <div class="spike-card__body">
      <slot />
    </div>
    
    <!-- Card Footer -->
    <footer v-if="$slots.footer" class="spike-card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  variant?: 'flat' | 'outlined' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  selected?: boolean
  disabled?: boolean
  title?: string
  subtitle?: string
  image?: string
  imageAlt?: string
  lazyLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'elevated',
  padding: 'md',
  hoverable: false,
  clickable: false,
  selected: false,
  disabled: false,
  lazyLoad: true
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  mouseenter: [event: MouseEvent]
  mouseleave: [event: MouseEvent]
}>()

// State
const isHovered = ref(false)

// Computed
const cardClasses = computed(() => [
  'spike-card',
  `spike-card--${props.variant}`,
  `spike-card--padding-${props.padding}`,
  {
    'spike-card--hoverable': props.hoverable,
    'spike-card--clickable': props.clickable,
    'spike-card--selected': props.selected,
    'spike-card--disabled': props.disabled,
    'spike-card--hovered': isHovered.value
  }
])

// Methods
const handleClick = (event: MouseEvent) => {
  if (props.disabled) return
  if (props.clickable) {
    emit('click', event)
  }
}

const handleMouseEnter = (event: MouseEvent) => {
  isHovered.value = true
  emit('mouseenter', event)
}

const handleMouseLeave = (event: MouseEvent) => {
  isHovered.value = false
  emit('mouseleave', event)
}
</script>
```

### 1.3 SpikeInput Component

```vue
<!-- components/base/SpikeInput.vue -->
<template>
  <div class="spike-input-wrapper" :class="wrapperClasses">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="spike-form-label" :class="{ 'spike-form-label--required': required }">
      {{ label }}
    </label>
    
    <!-- Input Container -->
    <div class="spike-input-container">
      <!-- Prefix -->
      <span v-if="$slots.prefix || prefix" class="spike-input__prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </span>
      
      <!-- Input Element -->
      <input
        :id="inputId"
        ref="inputRef"
        v-model="modelValue"
        :type="type"
        :class="inputClasses"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autofocus="autofocus"
        :autocomplete="autocomplete"
        :min="min"
        :max="max"
        :step="step"
        :pattern="pattern"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        v-bind="$attrs"
      />
      
      <!-- Clear Button -->
      <button
        v-if="clearable && modelValue"
        type="button"
        class="spike-input__clear"
        @click="handleClear"
        aria-label="Clear input"
      >
        <SpikeIcon name="x" size="16" />
      </button>
      
      <!-- Suffix -->
      <span v-if="$slots.suffix || suffix" class="spike-input__suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </span>
    </div>
    
    <!-- Help Text / Error Message -->
    <div v-if="helpText || errorMessage" class="spike-input__messages">
      <span v-if="errorMessage" class="spike-form-error">
        <SpikeIcon name="alert-circle" size="14" />
        {{ errorMessage }}
      </span>
      <span v-else-if="helpText" class="spike-form-help">
        {{ helpText }}
      </span>
    </div>
    
    <!-- Character Counter -->
    <div v-if="showCounter && maxlength" class="spike-input__counter">
      {{ modelValue?.length || 0 }} / {{ maxlength }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useId } from '~/composables/useId'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  placeholder?: string
  helpText?: string
  errorMessage?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  autofocus?: boolean
  clearable?: boolean
  showCounter?: boolean
  prefix?: string
  suffix?: string
  autocomplete?: string
  min?: string | number
  max?: string | number
  step?: string | number
  maxlength?: number
  pattern?: string
  validate?: (value: string | number) => string | boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  readonly: false,
  required: false,
  autofocus: false,
  clearable: false,
  showCounter: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
  'input': [value: string | number | undefined]
  'change': [value: string | number | undefined]
  'focus': [event: FocusEvent]
  'blur': [event: FocusEvent]
  'keydown': [event: KeyboardEvent]
  'clear': []
  'validate': [isValid: boolean, message?: string]
}>()

// State
const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)
const internalError = ref('')

// Generate unique ID
const inputId = useId('spike-input')

// Model
const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Computed
const wrapperClasses = computed(() => ({
  'spike-input-wrapper--focused': isFocused.value,
  'spike-input-wrapper--disabled': props.disabled,
  'spike-input-wrapper--error': !!errorMessage.value
}))

const inputClasses = computed(() => [
  'spike-input',
  `spike-input--${props.size}`,
  {
    'spike-input--error': !!errorMessage.value,
    'spike-input--disabled': props.disabled,
    'spike-input--with-prefix': !!props.prefix || !!props.$slots.prefix,
    'spike-input--with-suffix': !!props.suffix || !!props.$slots.suffix || props.clearable
  }
])

const errorMessage = computed(() => props.errorMessage || internalError.value)

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  modelValue.value = value
  emit('input', value)
  
  // Run validation if provided
  if (props.validate) {
    validateInput()
  }
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('change', value)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
  
  // Validate on blur
  if (props.validate) {
    validateInput()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

const handleClear = () => {
  modelValue.value = undefined
  emit('clear')
  inputRef.value?.focus()
}

const validateInput = () => {
  if (!props.validate || !modelValue.value) {
    internalError.value = ''
    emit('validate', true)
    return
  }
  
  const result = props.validate(modelValue.value)
  if (typeof result === 'string') {
    internalError.value = result
    emit('validate', false, result)
  } else {
    internalError.value = ''
    emit('validate', result)
  }
}

// Expose methods
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
  validate: validateInput
})
</script>
```

---

## 2. Composite Components

### 2.1 SpikeModal Component

```vue
<!-- components/ui/SpikeModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="spike-modal">
      <div v-if="modelValue" class="spike-modal" @click="handleBackdropClick">
        <div class="spike-modal__backdrop" />
        <div 
          class="spike-modal__container"
          :class="modalClasses"
          @click.stop
        >
          <!-- Modal Header -->
          <header v-if="!hideHeader" class="spike-modal__header">
            <slot name="header">
              <h2 class="spike-modal__title">{{ title }}</h2>
            </slot>
            <button
              v-if="!hideClose"
              type="button"
              class="spike-modal__close"
              @click="close"
              aria-label="Close modal"
            >
              <SpikeIcon name="x" size="20" />
            </button>
          </header>
          
          <!-- Modal Body -->
          <div class="spike-modal__body" :style="bodyStyle">
            <slot />
          </div>
          
          <!-- Modal Footer -->
          <footer v-if="$slots.footer" class="spike-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useLockScroll } from '~/composables/useLockScroll'
import { useKeyboard } from '~/composables/useKeyboard'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  persistent?: boolean
  hideHeader?: boolean
  hideClose?: boolean
  maxHeight?: string
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  persistent: false,
  hideHeader: false,
  hideClose: false,
  centered: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
  'open': []
}>()

// Composables
const { lockScroll, unlockScroll } = useLockScroll()
const { onEscape } = useKeyboard()

// Computed
const modalClasses = computed(() => [
  `spike-modal__container--${props.size}`,
  {
    'spike-modal__container--centered': props.centered
  }
])

const bodyStyle = computed(() => ({
  maxHeight: props.maxHeight
}))

// Methods
const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleBackdropClick = () => {
  if (!props.persistent) {
    close()
  }
}

// Lifecycle
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    lockScroll()
    emit('open')
  } else {
    unlockScroll()
  }
})

onMounted(() => {
  onEscape(() => {
    if (props.modelValue && !props.persistent) {
      close()
    }
  })
})

onUnmounted(() => {
  unlockScroll()
})
</script>

<style scoped>
/* Modal animations */
.spike-modal-enter-active,
.spike-modal-leave-active {
  transition: opacity 0.3s ease;
}

.spike-modal-enter-from,
.spike-modal-leave-to {
  opacity: 0;
}

.spike-modal-enter-active .spike-modal__container,
.spike-modal-leave-active .spike-modal__container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.spike-modal-enter-from .spike-modal__container {
  transform: scale(0.9);
  opacity: 0;
}

.spike-modal-leave-to .spike-modal__container {
  transform: scale(0.9);
  opacity: 0;
}
</style>
```

### 2.2 SpikeDropdown Component

```vue
<!-- components/ui/SpikeDropdown.vue -->
<template>
  <div ref="dropdownRef" class="spike-dropdown" :class="dropdownClasses">
    <!-- Trigger -->
    <div
      ref="triggerRef"
      class="spike-dropdown__trigger"
      @click="toggle"
      @keydown="handleTriggerKeydown"
      :tabindex="disabled ? -1 : 0"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :aria-disabled="disabled"
    >
      <slot name="trigger" :is-open="isOpen">
        <SpikeButton v-bind="triggerButtonProps">
          {{ triggerText }}
          <template #icon-right>
            <SpikeIcon 
              :name="isOpen ? 'chevron-up' : 'chevron-down'"
              size="16"
            />
          </template>
        </SpikeButton>
      </slot>
    </div>
    
    <!-- Dropdown Menu -->
    <Teleport to="body" :disabled="!teleport">
      <Transition name="spike-dropdown">
        <div
          v-if="isOpen"
          ref="menuRef"
          class="spike-dropdown__menu"
          :class="menuClasses"
          :style="menuStyle"
          @click="handleMenuClick"
        >
          <div class="spike-dropdown__content">
            <slot />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useFloating } from '@floating-ui/vue'

interface Props {
  modelValue?: boolean
  triggerText?: string
  triggerButtonProps?: object
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  align?: 'start' | 'center' | 'end'
  offset?: number
  disabled?: boolean
  closeOnClick?: boolean
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom',
  align: 'start',
  offset: 8,
  disabled: false,
  closeOnClick: true,
  teleport: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'open': []
  'close': []
  'select': [item: any]
}>()

// Refs
const dropdownRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const menuRef = ref<HTMLElement>()

// State
const isOpen = ref(false)

// Floating UI setup
const { x, y, strategy, placement: actualPlacement } = useFloating(triggerRef, menuRef, {
  placement: `${props.placement}-${props.align}` as any,
  offset: props.offset
})

// Computed
const dropdownClasses = computed(() => ({
  'spike-dropdown--open': isOpen.value,
  'spike-dropdown--disabled': props.disabled
}))

const menuClasses = computed(() => [
  `spike-dropdown__menu--${actualPlacement.value}`
])

const menuStyle = computed(() => ({
  position: strategy.value,
  top: `${y.value}px`,
  left: `${x.value}px`
}))

// Methods
const open = () => {
  if (props.disabled) return
  isOpen.value = true
  emit('update:modelValue', true)
  emit('open')
  
  nextTick(() => {
    menuRef.value?.focus()
  })
}

const close = () => {
  isOpen.value = false
  emit('update:modelValue', false)
  emit('close')
}

const toggle = () => {
  isOpen.value ? close() : open()
}

const handleMenuClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.closest('[data-dropdown-item]') && props.closeOnClick) {
    close()
  }
}

const handleTriggerKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      toggle()
      break
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) {
        open()
      }
      break
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault()
        close()
      }
      break
  }
}

// Click outside handler
onClickOutside(dropdownRef, () => {
  if (isOpen.value) {
    close()
  }
}, {
  ignore: [menuRef]
})

// Watch modelValue
watch(() => props.modelValue, (value) => {
  if (value !== undefined) {
    isOpen.value = value
  }
})
</script>
```

---

## 3. Pattern Components

### 3.1 SpikeQuestionCard Component

```vue
<!-- components/patterns/SpikeQuestionCard.vue -->
<template>
  <SpikeCard class="spike-question-card" :class="questionCardClasses">
    <!-- Question Header -->
    <template #header>
      <div class="spike-question-card__header">
        <div class="spike-question-card__meta">
          <SpikeBadge :variant="difficultyVariant">
            {{ difficultyLabel }}
          </SpikeBadge>
          <span class="spike-question-card__number">
            Question {{ questionNumber }} of {{ totalQuestions }}
          </span>
        </div>
        <div class="spike-question-card__actions">
          <SpikeButton
            variant="ghost"
            size="sm"
            @click="toggleFlag"
            :aria-label="isFlagged ? 'Unflag question' : 'Flag question'"
          >
            <template #icon-left>
              <SpikeIcon 
                :name="isFlagged ? 'flag-filled' : 'flag'"
                :color="isFlagged ? 'var(--spike-warning)' : undefined"
              />
            </template>
          </SpikeButton>
        </div>
      </div>
    </template>
    
    <!-- Question Text -->
    <div class="spike-question-card__text" v-html="sanitizedQuestionText" />
    
    <!-- Code Block (if present) -->
    <div v-if="codeBlock" class="spike-question-card__code">
      <SpikeCodeBlock :code="codeBlock" :language="codeLanguage" />
    </div>
    
    <!-- Answer Options -->
    <div class="spike-question-card__options">
      <SpikeAnswerOption
        v-for="option in options"
        :key="option.id"
        :option="option"
        :selected="selectedOptionId === option.id"
        :correct="showResult && option.isCorrect"
        :incorrect="showResult && selectedOptionId === option.id && !option.isCorrect"
        :disabled="answered || disabled"
        @select="selectOption(option.id)"
      />
    </div>
    
    <!-- Action Buttons -->
    <template #footer>
      <div class="spike-question-card__footer">
        <SpikeButton
          v-if="!answered"
          variant="primary"
          size="lg"
          :disabled="!selectedOptionId || disabled"
          :loading="submitting"
          @click="submitAnswer"
        >
          Submit Answer
        </SpikeButton>
        
        <div v-else class="spike-question-card__result">
          <SpikeAlert
            :variant="isCorrect ? 'success' : 'error'"
            :title="isCorrect ? 'Correct!' : 'Incorrect'"
          >
            <p v-if="explanation">{{ explanation }}</p>
          </SpikeAlert>
          
          <SpikeButton
            variant="primary"
            size="lg"
            @click="nextQuestion"
          >
            Next Question
            <template #icon-right>
              <SpikeIcon name="arrow-right" />
            </template>
          </SpikeButton>
        </div>
      </div>
    </template>
  </SpikeCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSanitize } from '~/composables/useSanitize'
import type { Question, AnswerOption } from '~/types/exam'

interface Props {
  question: Question
  questionNumber: number
  totalQuestions: number
  showResult?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showResult: false,
  disabled: false
})

const emit = defineEmits<{
  submit: [optionId: string]
  next: []
  flag: [questionId: string]
  unflag: [questionId: string]
}>()

// Composables
const { sanitize } = useSanitize()

// State
const selectedOptionId = ref<string>()
const answered = ref(false)
const submitting = ref(false)
const isFlagged = ref(false)

// Computed
const questionCardClasses = computed(() => ({
  'spike-question-card--answered': answered.value,
  'spike-question-card--flagged': isFlagged.value
}))

const sanitizedQuestionText = computed(() => 
  sanitize(props.question.text)
)

const difficultyVariant = computed(() => {
  const variantMap = {
    1: 'success',
    2: 'success',
    3: 'warning',
    4: 'error',
    5: 'error'
  }
  return variantMap[props.question.difficulty] || 'info'
})

const difficultyLabel = computed(() => {
  const labelMap = {
    1: 'Very Easy',
    2: 'Easy',
    3: 'Medium',
    4: 'Hard',
    5: 'Very Hard'
  }
  return labelMap[props.question.difficulty] || 'Unknown'
})

const options = computed(() => props.question.options)

const codeBlock = computed(() => props.question.codeBlock)

const codeLanguage = computed(() => props.question.codeLanguage || 'javascript')

const explanation = computed(() => {
  if (!answered.value || !props.showResult) return null
  return props.question.explanation
})

const isCorrect = computed(() => {
  if (!answered.value || !selectedOptionId.value) return false
  const selectedOption = options.value.find(o => o.id === selectedOptionId.value)
  return selectedOption?.isCorrect || false
})

// Methods
const selectOption = (optionId: string) => {
  if (answered.value || props.disabled) return
  selectedOptionId.value = optionId
}

const submitAnswer = async () => {
  if (!selectedOptionId.value || answered.value || props.disabled) return
  
  submitting.value = true
  
  try {
    // Emit submit event
    emit('submit', selectedOptionId.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    answered.value = true
  } finally {
    submitting.value = false
  }
}

const nextQuestion = () => {
  // Reset state
  selectedOptionId.value = undefined
  answered.value = false
  
  emit('next')
}

const toggleFlag = () => {
  isFlagged.value = !isFlagged.value
  
  if (isFlagged.value) {
    emit('flag', props.question.id)
  } else {
    emit('unflag', props.question.id)
  }
}
</script>
```

---

## 4. Composables

### 4.1 useSpikeTheme Composable

```typescript
// composables/useSpikeTheme.ts
import { ref, computed, watch, onMounted } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red'

interface ThemeConfig {
  mode: ThemeMode
  primaryColor: ThemeColor
  fontSize: number
  reducedMotion: boolean
  highContrast: boolean
}

export const useSpikeTheme = () => {
  // State
  const themeConfig = ref<ThemeConfig>({
    mode: 'light',
    primaryColor: 'blue',
    fontSize: 16,
    reducedMotion: false,
    highContrast: false
  })
  
  // Load saved theme
  onMounted(() => {
    const saved = localStorage.getItem('spike-theme')
    if (saved) {
      try {
        themeConfig.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved theme:', e)
      }
    }
    
    // Check system preferences
    if (themeConfig.value.mode === 'auto') {
      detectSystemTheme()
    }
    
    // Check motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    themeConfig.value.reducedMotion = motionQuery.matches
    
    // Apply theme
    applyTheme()
  })
  
  // Methods
  const setMode = (mode: ThemeMode) => {
    themeConfig.value.mode = mode
    applyTheme()
    saveTheme()
  }
  
  const setPrimaryColor = (color: ThemeColor) => {
    themeConfig.value.primaryColor = color
    applyTheme()
    saveTheme()
  }
  
  const setFontSize = (size: number) => {
    themeConfig.value.fontSize = Math.min(Math.max(size, 12), 24)
    applyTheme()
    saveTheme()
  }
  
  const toggleHighContrast = () => {
    themeConfig.value.highContrast = !themeConfig.value.highContrast
    applyTheme()
    saveTheme()
  }
  
  const detectSystemTheme = () => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const actualMode = darkQuery.matches ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', actualMode)
  }
  
  const applyTheme = () => {
    const root = document.documentElement
    
    // Apply mode
    if (themeConfig.value.mode === 'auto') {
      detectSystemTheme()
    } else {
      root.setAttribute('data-theme', themeConfig.value.mode)
    }
    
    // Apply primary color
    root.setAttribute('data-color', themeConfig.value.primaryColor)
    
    // Apply font size
    root.style.fontSize = `${themeConfig.value.fontSize}px`
    
    // Apply high contrast
    root.classList.toggle('spike-high-contrast', themeConfig.value.highContrast)
    
    // Apply reduced motion
    root.classList.toggle('spike-reduced-motion', themeConfig.value.reducedMotion)
  }
  
  const saveTheme = () => {
    localStorage.setItem('spike-theme', JSON.stringify(themeConfig.value))
  }
  
  const resetTheme = () => {
    themeConfig.value = {
      mode: 'light',
      primaryColor: 'blue',
      fontSize: 16,
      reducedMotion: false,
      highContrast: false
    }
    applyTheme()
    localStorage.removeItem('spike-theme')
  }
  
  // Computed
  const currentMode = computed(() => {
    if (themeConfig.value.mode === 'auto') {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
      return darkQuery.matches ? 'dark' : 'light'
    }
    return themeConfig.value.mode
  })
  
  const isDark = computed(() => currentMode.value === 'dark')
  
  return {
    themeConfig: readonly(themeConfig),
    currentMode,
    isDark,
    setMode,
    setPrimaryColor,
    setFontSize,
    toggleHighContrast,
    resetTheme
  }
}
```

---

## 5. Testing Strategy

### 5.1 Component Unit Tests

```typescript
// tests/unit/components/base/SpikeButton.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SpikeButton from '~/components/base/SpikeButton.vue'

describe('SpikeButton', () => {
  describe('Props', () => {
    it('renders with default props', () => {
      const wrapper = mount(SpikeButton, {
        slots: {
          default: 'Click me'
        }
      })
      
      expect(wrapper.text()).toBe('Click me')
      expect(wrapper.classes()).toContain('spike-btn')
      expect(wrapper.classes()).toContain('spike-btn--primary')
      expect(wrapper.classes()).toContain('spike-btn--md')
    })
    
    it('applies variant classes correctly', () => {
      const variants = ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost']
      
      variants.forEach(variant => {
        const wrapper = mount(SpikeButton, {
          props: { variant }
        })
        expect(wrapper.classes()).toContain(`spike-btn--${variant}`)
      })
    })
    
    it('applies size classes correctly', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl']
      
      sizes.forEach(size => {
        const wrapper = mount(SpikeButton, {
          props: { size }
        })
        expect(wrapper.classes()).toContain(`spike-btn--${size}`)
      })
    })
  })
  
  describe('States', () => {
    it('disables button when disabled prop is true', () => {
      const wrapper = mount(SpikeButton, {
        props: { disabled: true }
      })
      
      expect(wrapper.attributes('disabled')).toBeDefined()
      expect(wrapper.classes()).toContain('spike-btn--disabled')
    })
    
    it('shows loading state', () => {
      const wrapper = mount(SpikeButton, {
        props: { loading: true }
      })
      
      expect(wrapper.classes()).toContain('spike-btn--loading')
      expect(wrapper.find('.spike-btn__spinner').exists()).toBe(true)
    })
    
    it('prevents click when loading', async () => {
      const handleClick = vi.fn()
      const wrapper = mount(SpikeButton, {
        props: { loading: true },
        attrs: { onClick: handleClick }
      })
      
      await wrapper.trigger('click')
      expect(handleClick).not.toHaveBeenCalled()
    })
  })
  
  describe('Events', () => {
    it('emits click event', async () => {
      const wrapper = mount(SpikeButton)
      
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
    
    it('creates ripple effect on click', async () => {
      const wrapper = mount(SpikeButton, {
        props: { ripple: true }
      })
      
      await wrapper.trigger('click')
      
      // Check if ripple element is created
      const rippleContainer = wrapper.find('.spike-btn__ripple')
      expect(rippleContainer.exists()).toBe(true)
    })
  })
  
  describe('Slots', () => {
    it('renders icon slots correctly', () => {
      const wrapper = mount(SpikeButton, {
        slots: {
          'icon-left': '<svg>left</svg>',
          'default': 'Button Text',
          'icon-right': '<svg>right</svg>'
        }
      })
      
      expect(wrapper.find('.spike-btn__icon--left').exists()).toBe(true)
      expect(wrapper.find('.spike-btn__icon--right').exists()).toBe(true)
      expect(wrapper.text()).toContain('Button Text')
    })
  })
  
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const wrapper = mount(SpikeButton, {
        props: { 
          disabled: true,
          loading: true 
        }
      })
      
      expect(wrapper.attributes('aria-disabled')).toBe('true')
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })
    
    it('supports keyboard navigation', async () => {
      const handleClick = vi.fn()
      const wrapper = mount(SpikeButton, {
        attrs: { onClick: handleClick }
      })
      
      await wrapper.trigger('keydown.enter')
      expect(handleClick).toHaveBeenCalled()
    })
  })
})
```

---

This comprehensive implementation guide provides:

1. **Complete Vue 3 components** with TypeScript support
2. **Composition API patterns** for reusability
3. **Accessibility features** built-in
4. **Testing strategies** with example tests
5. **Performance optimizations** including lazy loading and transitions
6. **Responsive design** considerations
7. **State management** patterns

Each component is production-ready and follows Vue 3 best practices with full TypeScript support.