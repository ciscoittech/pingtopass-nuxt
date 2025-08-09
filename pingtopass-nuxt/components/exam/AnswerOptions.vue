<template>
  <div 
    data-test="answer-options"
    :role="questionType === 'multiple' ? 'group' : 'radiogroup'"
    aria-label="Answer options"
    class="answer-options space-y-3"
  >
    <div
      v-for="(option, index) in options"
      :key="option.id"
      :role="questionType === 'multiple' ? 'checkbox' : 'radio'"
      :aria-label="`Option ${index + 1}: ${option.text}`"
      :aria-checked="isSelected(option.id).toString()"
      :aria-disabled="disabled.toString()"
      :aria-describedby="getAriaDescribedBy(option)"
      :tabindex="disabled ? -1 : 0"
      :class="[
        'answer-option p-4 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        {
          'border-blue-500 bg-blue-50': isSelected(option.id) && !showCorrectAnswers,
          'border-gray-300 hover:border-gray-400 cursor-pointer': !isSelected(option.id) && !disabled && !showCorrectAnswers,
          'border-green-500 bg-green-50': showCorrectAnswers && option.isCorrect,
          'border-red-500 bg-red-50': showCorrectAnswers && isSelected(option.id) && !option.isCorrect,
          'opacity-50 cursor-not-allowed': disabled,
          'cursor-pointer': !disabled
        }
      ]"
      @click="handleOptionClick(option.id)"
      @keydown="handleKeyDown($event, option.id, index)"
    >
      <div class="flex items-start">
        <!-- Checkbox/Radio Button -->
        <div class="flex-shrink-0 mt-0.5 mr-3">
          <input
            :type="questionType === 'multiple' ? 'checkbox' : 'radio'"
            :name="`question-${questionType}`"
            :checked="isSelected(option.id)"
            :disabled="disabled"
            @change="handleOptionClick(option.id)"
            class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        <!-- Option Text -->
        <div class="flex-1">
          <span class="text-gray-900 leading-relaxed break-words">
            {{ option.text }}
          </span>
          
          <!-- Correct Answer Indicator -->
          <div 
            v-if="showCorrectAnswers && option.isCorrect"
            :id="`correct-answer-${option.id}`"
            class="mt-2 text-sm text-green-600 font-medium"
          >
            ✓ Correct Answer
          </div>
          
          <!-- Wrong Answer Indicator -->
          <div 
            v-if="showCorrectAnswers && isSelected(option.id) && !option.isCorrect"
            :id="`incorrect-answer-${option.id}`"
            class="mt-2 text-sm text-red-600 font-medium"
          >
            ✗ Incorrect
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnswerOption } from '../../types/exam';

// Props
interface Props {
  options: AnswerOption[];
  questionType: 'single' | 'multiple' | 'drag-drop';
  selectedAnswers?: string[];
  showCorrectAnswers?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedAnswers: () => [],
  showCorrectAnswers: false,
  disabled: false,
});

// Emits
const emit = defineEmits<{
  'answer-selected': [answers: string[]];
}>();

// Methods
const isSelected = (optionId: string): boolean => {
  return props.selectedAnswers.includes(optionId);
};

const handleOptionClick = (optionId: string) => {
  if (props.disabled) return;

  let newSelection: string[];

  if (props.questionType === 'multiple') {
    // Multiple choice: toggle selection
    if (isSelected(optionId)) {
      newSelection = props.selectedAnswers.filter(id => id !== optionId);
    } else {
      newSelection = [...props.selectedAnswers, optionId];
    }
  } else {
    // Single choice: replace selection
    newSelection = [optionId];
  }

  emit('answer-selected', newSelection);
};

const handleKeyDown = (event: KeyboardEvent, optionId: string, index: number) => {
  if (props.disabled) return;

  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      handleOptionClick(optionId);
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      focusNextOption(index);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      focusPreviousOption(index);
      break;
  }
};

const focusNextOption = (currentIndex: number) => {
  if (typeof document !== 'undefined') {
    const nextIndex = currentIndex === props.options.length - 1 ? 0 : currentIndex + 1;
    const nextOption = document.querySelectorAll('.answer-option')[nextIndex] as HTMLElement;
    nextOption?.focus();
  }
};

const focusPreviousOption = (currentIndex: number) => {
  if (typeof document !== 'undefined') {
    const prevIndex = currentIndex === 0 ? props.options.length - 1 : currentIndex - 1;
    const prevOption = document.querySelectorAll('.answer-option')[prevIndex] as HTMLElement;
    prevOption?.focus();
  }
};

const getAriaDescribedBy = (option: AnswerOption): string => {
  const describedBy: string[] = [];
  
  if (props.showCorrectAnswers && option.isCorrect) {
    describedBy.push(`correct-answer-${option.id}`);
  }
  
  if (props.showCorrectAnswers && isSelected(option.id) && !option.isCorrect) {
    describedBy.push(`incorrect-answer-${option.id}`);
  }
  
  return describedBy.join(' ');
};
</script>

<style scoped>
.answer-option {
  transition: all 0.2s ease-in-out;
}

.answer-option:hover:not(.cursor-not-allowed) {
  transform: translateX(2px);
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .answer-option {
    transition: none;
    transform: none;
  }
  
  .answer-option:hover {
    transform: none;
  }
}
</style>