<template>
  <div 
    v-if="isVisible"
    data-test="answer-explanation"
    :class="[
      'answer-explanation',
      'border rounded-lg bg-white shadow-sm transition-all duration-200',
      {
        'compact': variant === 'compact',
        'detailed': variant === 'detailed',
        'correct-answer': answerCorrect === true,
        'incorrect-answer': answerCorrect === false
      }
    ]"
    role="region"
    aria-label="Answer explanation"
  >
    <!-- Loading State -->
    <div 
      v-if="loading"
      data-test="explanation-loading"
      class="p-4 text-center text-gray-500"
    >
      <div class="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
      Loading explanation...
    </div>

    <!-- Error State -->
    <div 
      v-else-if="error"
      data-test="explanation-error"
      class="p-4 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg"
    >
      <p class="mb-2">{{ error }}</p>
      <button
        data-test="retry-button"
        @click="$emit('retry')"
        class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>

    <!-- No Explanation State -->
    <div 
      v-else-if="!explanation || explanation.trim() === ''"
      data-test="no-explanation"
      class="p-4 text-gray-500 text-center italic"
    >
      No explanation available for this question.
    </div>

    <!-- Normal State -->
    <template v-else>
      <!-- Header -->
      <h3
        data-test="explanation-header"
        :class="[
          'explanation-header flex items-center justify-between p-4 border-b',
          {
            'cursor-pointer select-none': collapsible,
            'bg-green-50 border-green-200': answerCorrect === true,
            'bg-red-50 border-red-200': answerCorrect === false,
            'bg-gray-50 border-gray-200': answerCorrect === null
          }
        ]"
        :role="collapsible ? 'button' : undefined"
        :aria-expanded="collapsible ? (!isCollapsed).toString() : undefined"
        :tabindex="collapsible ? 0 : undefined"
        @click="collapsible && toggleCollapse()"
        @keydown="collapsible && handleHeaderKeydown($event)"
      >
        <span class="font-medium text-gray-900">
          {{ headerText || 'Explanation' }}
        </span>
        
        <div class="flex items-center space-x-2">
          <!-- Copy Button -->
          <button
            v-if="showCopyButton"
            data-test="copy-button"
            :disabled="copyState !== 'idle'"
            @click.stop="copyExplanation"
            :aria-label="copyState === 'success' ? 'Copied to clipboard' : 'Copy explanation to clipboard'"
            :class="[
              'p-1 rounded transition-colors text-gray-500',
              {
                'hover:bg-gray-100 hover:text-gray-700': copyState === 'idle',
                'text-green-600': copyState === 'success',
                'text-red-600': copyState === 'error'
              }
            ]"
          >
            <svg v-if="copyState === 'idle'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <svg v-else-if="copyState === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Collapse Icon -->
          <div 
            v-if="collapsible"
            data-test="collapse-icon"
            class="text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-180': isCollapsed }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </h3>

      <!-- Copy Status Messages -->
      <div v-if="copyState === 'success'" data-test="copy-success" class="px-4 py-2 bg-green-50 border-b border-green-200 text-green-700 text-sm">
        Copied to clipboard!
      </div>
      <div v-if="copyState === 'error'" data-test="copy-error" class="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
        Copy failed. Please try again.
      </div>

      <!-- Content -->
      <div 
        v-if="!isCollapsed"
        data-test="explanation-content"
        class="p-4"
      >
        <!-- Explanation Text -->
        <div 
          :class="[
            'prose prose-sm max-w-none leading-relaxed',
            {
              'text-gray-700': true,
              'break-all': !supportMarkdown
            }
          ]"
        >
          <!-- Markdown Content -->
          <div 
            v-if="supportMarkdown"
            v-html="renderedMarkdown"
            class="markdown-content"
          ></div>
          
          <!-- Plain Text Content -->
          <div v-else class="break-all">
            <template v-if="shouldTruncate && !isExpanded">
              {{ truncatedText }}
              <button
                data-test="show-more-button"
                @click="isExpanded = true"
                class="ml-1 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Show more
              </button>
            </template>
            <template v-else>
              {{ explanation }}
              <button
                v-if="shouldTruncate && isExpanded"
                data-test="show-less-button"
                @click="isExpanded = false"
                class="ml-1 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Show less
              </button>
            </template>
          </div>
        </div>

        <!-- References Section -->
        <div 
          v-if="references && references.length > 0"
          data-test="references-section"
          class="mt-4 pt-4 border-t border-gray-200"
        >
          <h4 class="text-sm font-medium text-gray-900 mb-2">References</h4>
          <ul class="space-y-1">
            <li 
              v-for="(reference, index) in validReferences" 
              :key="index"
              class="text-sm"
            >
              <a 
                v-if="reference.url"
                :href="reference.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 underline"
              >
                {{ reference.title }}
              </a>
              <span v-else class="text-gray-700">
                {{ reference.title }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Props
interface Reference {
  title: string;
  url?: string;
}

interface Props {
  explanation: string;
  isVisible?: boolean;
  collapsible?: boolean;
  initiallyCollapsed?: boolean;
  supportMarkdown?: boolean;
  showCopyButton?: boolean;
  references?: Reference[];
  variant?: 'default' | 'compact' | 'detailed';
  answerCorrect?: boolean | null;
  headerText?: string;
  maxLength?: number;
  loading?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: true,
  collapsible: false,
  initiallyCollapsed: false,
  supportMarkdown: true,
  showCopyButton: false,
  variant: 'default',
  answerCorrect: null,
  maxLength: 500,
  loading: false,
});

// Emits
const emit = defineEmits<{
  'toggle': [isExpanded: boolean];
  'copy': [success: boolean];
  'retry': [];
}>();

// State
const isCollapsed = ref(props.initiallyCollapsed);
const isExpanded = ref(false);
const copyState = ref<'idle' | 'success' | 'error'>('idle');
const lastCopyTime = ref(0);

// Computed
const validReferences = computed(() => {
  if (!props.references) return [];
  return props.references.filter(ref => ref && ref.title);
});

const shouldTruncate = computed(() => {
  return !props.supportMarkdown && props.maxLength > 0 && props.explanation.length > props.maxLength;
});

const truncatedText = computed(() => {
  if (!shouldTruncate.value) return props.explanation;
  return props.explanation.slice(0, props.maxLength) + '...';
});

const renderedMarkdown = computed(() => {
  if (!props.supportMarkdown) return '';
  
  try {
    const html = marked(props.explanation, {
      breaks: true,
      gfm: true,
    });
    return DOMPurify.sanitize(html);
  } catch (error) {
    console.warn('Failed to render markdown:', error);
    return props.explanation;
  }
});

// Methods
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('toggle', !isCollapsed.value);
};

const handleHeaderKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleCollapse();
  }
};

const copyExplanation = async () => {
  // Debounce rapid clicks
  const now = Date.now();
  if (now - lastCopyTime.value < 500) return;
  lastCopyTime.value = now;

  try {
    await navigator.clipboard.writeText(props.explanation);
    copyState.value = 'success';
    emit('copy', true);
    
    // Reset success state after 2 seconds
    setTimeout(() => {
      copyState.value = 'idle';
    }, 2000);
  } catch (error) {
    copyState.value = 'error';
    emit('copy', false);
    console.error('Failed to copy to clipboard:', error);
    
    // Reset error state after 3 seconds
    setTimeout(() => {
      copyState.value = 'idle';
    }, 3000);
  }
};

// Watch for prop changes
watch(() => props.initiallyCollapsed, (newValue) => {
  isCollapsed.value = newValue;
});
</script>

<style scoped>
.answer-explanation {
  transition: all 0.2s ease-in-out;
}

.answer-explanation.compact {
  font-size: 0.875rem;
}

.answer-explanation.detailed {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.answer-explanation.correct-answer {
  border-color: rgb(187 247 208); background-color: rgb(240 253 244 / 0.3);
}

.answer-explanation.incorrect-answer {
  border-color: rgb(254 202 202); background-color: rgb(254 242 242 / 0.3);
}

.explanation-header {
  transition: background-color 0.2s ease-in-out;
}

.explanation-header:hover {
  background-color: rgb(243 244 246);
}

.prose {
  color: inherit;
}

/* Markdown content styling */
.markdown-content :deep(h1) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(h1:first-child) {
  margin-top: 0;
}

.markdown-content :deep(h2) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(h3) {
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(p) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(ul) {
  list-style-type: disc;
  list-style-position: inside;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(ul > li + li) {
  margin-top: 0.25rem;
}

.markdown-content :deep(ol) {
  list-style-type: decimal;
  list-style-position: inside;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(ol > li + li) {
  margin-top: 0.25rem;
}

.markdown-content :deep(code) {
  background-color: rgb(243 244 246);
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.markdown-content :deep(pre) {
  background-color: rgb(243 244 246);
  padding: 0.5rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(blockquote) {
  border-left-width: 4px;
  border-left-color: rgb(209 213 219);
  padding-left: 0.75rem;
  font-style: italic;
  color: rgb(75 85 99);
  margin-bottom: 0.5rem;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(a) {
  color: rgb(37 99 235);
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: rgb(30 64 175);
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .answer-explanation,
  .explanation-header,
  [data-test="collapse-icon"] {
    transition: none;
  }
}

/* Focus styles */
.explanation-header:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgb(59 130 246);
}

button:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgb(59 130 246);
}

/* Print styles */
@media print {
  .answer-explanation {
    break-inside: avoid;
  }
  
  [data-test="copy-button"],
  [data-test="collapse-icon"] {
    display: none;
  }
}
</style>