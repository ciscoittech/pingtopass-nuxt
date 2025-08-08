<template>
  <div 
    class="question-card" 
    :class="{ 'disabled': disabled, 'answered': selectedAnswer !== null }"
    data-testid="question-card"
  >
    <!-- Question Header -->
    <div class="question-header">
      <div class="question-number" data-testid="question-number">
        Question {{ question.id }}
      </div>
      <div class="question-difficulty" :class="`difficulty-${question.difficulty}`" data-testid="question-difficulty">
        <span class="difficulty-text">Difficulty: {{ question.difficulty }}/5</span>
      </div>
    </div>

    <!-- Question Text -->
    <div class="question-text" data-testid="question-text">
      <p>{{ question.text }}</p>
    </div>

    <!-- Question Type Badge -->
    <div class="question-type" data-testid="question-type">
      <span class="type-badge" :class="question.type">
        {{ formatQuestionType(question.type) }}
      </span>
    </div>

    <!-- Answer Options -->
    <div 
      class="answers-container" 
      :class="{ 'multiple-select': question.type === 'multiple_select' }"
      data-testid="answers-container"
      role="radiogroup"
      :aria-label="`Answers for question ${question.id}`"
    >
      <div 
        v-for="answer in question.answers" 
        :key="answer.id"
        class="answer-option"
        :class="{ 
          'selected': isAnswerSelected(answer.id),
          'correct': showCorrectAnswer && answer.is_correct,
          'incorrect': showCorrectAnswer && isAnswerSelected(answer.id) && !answer.is_correct
        }"
        data-testid="answer-option"
        @click="selectAnswer(answer.id)"
        @keydown.enter="selectAnswer(answer.id)"
        @keydown.space="selectAnswer(answer.id)"
        :tabindex="disabled ? -1 : 0"
        :aria-checked="isAnswerSelected(answer.id)"
        role="radio"
      >
        <div class="answer-selector">
          <input
            :type="question.type === 'multiple_select' ? 'checkbox' : 'radio'"
            :name="`question-${question.id}`"
            :value="answer.id"
            :checked="isAnswerSelected(answer.id)"
            :disabled="disabled"
            @change="selectAnswer(answer.id)"
            :aria-label="`Select answer ${answer.id}`"
          />
        </div>
        <div class="answer-content">
          <span class="answer-label">{{ answer.id.toUpperCase() }}.</span>
          <span class="answer-text">{{ answer.text }}</span>
        </div>
      </div>
    </div>

    <!-- Visual Feedback -->
    <div v-if="showFeedback" class="feedback-container" data-testid="feedback-container">
      <div 
        v-if="isCorrect !== null" 
        class="feedback-message"
        :class="{ 'correct': isCorrect, 'incorrect': !isCorrect }"
      >
        <span v-if="isCorrect" class="feedback-icon">✓</span>
        <span v-else class="feedback-icon">✗</span>
        <span class="feedback-text">
          {{ isCorrect ? 'Correct!' : 'Incorrect' }}
        </span>
      </div>
    </div>

    <!-- Question Tags -->
    <div v-if="question.tags && question.tags.length > 0" class="question-tags" data-testid="question-tags">
      <span 
        v-for="tag in question.tags" 
        :key="tag" 
        class="tag"
      >
        {{ tag }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  text: string;
  type: 'multiple_choice' | 'multiple_select' | 'drag_drop';
  difficulty: 1 | 2 | 3 | 4 | 5;
  answers: Answer[];
  tags?: string[];
}

interface Props {
  question: Question;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  showFeedback?: boolean;
}

interface Emits {
  (e: 'answer-selected', payload: { questionId: number; answerId: string | string[]; isCorrect: boolean }): void;
  (e: 'answer-changed', payload: { questionId: number; answerId: string | string[]; isCorrect: boolean }): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showCorrectAnswer: false,
  showFeedback: false
});

const emit = defineEmits<Emits>();

// Reactive state
const selectedAnswer = ref<string | string[] | null>(null);
const isCorrect = ref<boolean | null>(null);

// Computed properties
const isMultipleSelect = computed(() => props.question.type === 'multiple_select');

// Methods
const selectAnswer = (answerId: string) => {
  if (props.disabled) return;

  if (isMultipleSelect.value) {
    // Handle multiple select
    const currentSelection = Array.isArray(selectedAnswer.value) ? [...selectedAnswer.value] : [];
    const answerIndex = currentSelection.indexOf(answerId);
    
    if (answerIndex > -1) {
      currentSelection.splice(answerIndex, 1);
    } else {
      currentSelection.push(answerId);
    }
    
    selectedAnswer.value = currentSelection;
  } else {
    // Handle single select
    selectedAnswer.value = answerId;
  }

  // Calculate correctness
  const correctness = calculateCorrectness();
  isCorrect.value = correctness;

  // Emit events
  emit('answer-selected', {
    questionId: props.question.id,
    answerId: selectedAnswer.value,
    isCorrect: correctness
  });

  emit('answer-changed', {
    questionId: props.question.id,
    answerId: selectedAnswer.value,
    isCorrect: correctness
  });
};

const isAnswerSelected = (answerId: string): boolean => {
  if (selectedAnswer.value === null) return false;
  
  if (Array.isArray(selectedAnswer.value)) {
    return selectedAnswer.value.includes(answerId);
  }
  
  return selectedAnswer.value === answerId;
};

const calculateCorrectness = (): boolean => {
  const correctAnswers = props.question.answers
    .filter(answer => answer.is_correct)
    .map(answer => answer.id);

  if (isMultipleSelect.value) {
    const selected = Array.isArray(selectedAnswer.value) ? selectedAnswer.value : [];
    return correctAnswers.length === selected.length && 
           correctAnswers.every(id => selected.includes(id));
  } else {
    return correctAnswers.includes(selectedAnswer.value as string);
  }
};

const formatQuestionType = (type: string): string => {
  switch (type) {
    case 'multiple_choice': return 'Multiple Choice';
    case 'multiple_select': return 'Multiple Select';
    case 'drag_drop': return 'Drag & Drop';
    default: return 'Unknown';
  }
};

// Watch for question changes to reset state
watch(() => props.question.id, () => {
  selectedAnswer.value = null;
  isCorrect.value = null;
});

// Expose methods for testing
defineExpose({
  selectAnswer,
  selectedAnswer: readonly(selectedAnswer),
  isCorrect: readonly(isCorrect)
});
</script>

<style scoped>
.question-card {
  @apply bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-200;
}

.question-card.disabled {
  @apply opacity-60 pointer-events-none;
}

.question-card.answered {
  @apply border-blue-200 shadow-md;
}

.question-header {
  @apply flex justify-between items-center mb-4;
}

.question-number {
  @apply text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full;
}

.question-difficulty {
  @apply text-sm px-2 py-1 rounded;
}

.difficulty-1 { @apply bg-green-100 text-green-800; }
.difficulty-2 { @apply bg-blue-100 text-blue-800; }
.difficulty-3 { @apply bg-yellow-100 text-yellow-800; }
.difficulty-4 { @apply bg-orange-100 text-orange-800; }
.difficulty-5 { @apply bg-red-100 text-red-800; }

.question-text {
  @apply mb-4;
}

.question-text p {
  @apply text-gray-800 font-medium leading-relaxed;
}

.question-type {
  @apply mb-4;
}

.type-badge {
  @apply inline-block px-3 py-1 text-xs font-medium rounded-full;
}

.type-badge.multiple_choice {
  @apply bg-blue-100 text-blue-800;
}

.type-badge.multiple_select {
  @apply bg-purple-100 text-purple-800;
}

.type-badge.drag_drop {
  @apply bg-indigo-100 text-indigo-800;
}

.answers-container {
  @apply space-y-3 mb-4;
}

.answer-option {
  @apply flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer 
         transition-all duration-200 hover:border-gray-300 hover:shadow-sm;
}

.answer-option:focus {
  @apply outline-none ring-2 ring-blue-500 ring-opacity-50;
}

.answer-option.selected {
  @apply border-blue-500 bg-blue-50;
}

.answer-option.correct {
  @apply border-green-500 bg-green-50;
}

.answer-option.incorrect {
  @apply border-red-500 bg-red-50;
}

.answer-selector {
  @apply flex-shrink-0 mr-3;
}

.answer-selector input {
  @apply w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2;
}

.answer-content {
  @apply flex items-center flex-1;
}

.answer-label {
  @apply font-semibold text-gray-700 mr-2;
}

.answer-text {
  @apply text-gray-800;
}

.feedback-container {
  @apply mb-4;
}

.feedback-message {
  @apply flex items-center p-3 rounded-lg;
}

.feedback-message.correct {
  @apply bg-green-100 text-green-800;
}

.feedback-message.incorrect {
  @apply bg-red-100 text-red-800;
}

.feedback-icon {
  @apply mr-2 text-lg font-bold;
}

.question-tags {
  @apply flex flex-wrap gap-2;
}

.tag {
  @apply inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded;
}
</style>