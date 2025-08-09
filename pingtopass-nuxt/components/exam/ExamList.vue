<template>
  <div class="exam-list-container">
    <!-- Header Section -->
    <div class="header-section">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        Available IT Certifications
      </h2>
      <p class="text-gray-600 mb-6">
        Choose an exam to start your certification journey
      </p>
    </div>

    <!-- Search and Filter Controls -->
    <div 
      v-if="searchable || filterable || sortable" 
      class="controls-section mb-6"
    >
      <!-- Search Input -->
      <div v-if="searchable" class="search-container mb-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            data-test="search-input"
            type="text"
            placeholder="Search exams by name or code..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="handleSearch"
          />
          <div class="absolute left-3 top-2.5 text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Filters and Sort Row -->
      <div 
        v-if="filterable || sortable"
        class="flex flex-col sm:flex-row gap-4"
      >
        <!-- Vendor Filter -->
        <div v-if="filterable" class="flex-1">
          <select
            v-model="selectedVendor"
            data-test="vendor-filter"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @change="handleFilter"
          >
            <option value="">All Vendors</option>
            <option v-for="vendor in availableVendors" :key="vendor" :value="vendor">
              {{ vendor }}
            </option>
          </select>
        </div>

        <!-- Sort Options -->
        <div v-if="sortable" class="flex-1">
          <select
            v-model="sortBy"
            data-test="sort-select"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @change="handleSort"
          >
            <option value="name">Sort by Name</option>
            <option value="vendor">Sort by Vendor</option>
            <option value="code">Sort by Code</option>
            <option value="questionCount">Sort by Questions</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div 
      v-if="examStore.isLoading" 
      data-test="loading-state"
      class="flex flex-col items-center justify-center py-12"
    >
      <div 
        data-test="loading-spinner"
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
      ></div>
      <p class="mt-4 text-gray-600">Loading available exams...</p>
    </div>

    <!-- Error State -->
    <div 
      v-else-if="examStore.error" 
      data-test="error-state"
      class="flex flex-col items-center justify-center py-12"
    >
      <div class="text-red-500 mb-4">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Failed to Load Exams
      </h3>
      <p class="text-gray-600 mb-4 text-center max-w-md">
        {{ examStore.error }}
      </p>
      <button
        data-test="retry-button"
        @click="retryLoadingExams"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="!filteredExams.length" 
      data-test="empty-state"
      class="flex flex-col items-center justify-center py-12"
    >
      <div class="text-gray-400 mb-4">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No exams available
      </h3>
      <p class="text-gray-600 text-center max-w-md">
        {{ searchQuery || selectedVendor ? 'No exams match your current filters. Try adjusting your search criteria.' : 'There are currently no exams available. Please check back later.' }}
      </p>
    </div>

    <!-- Exam List -->
    <div 
      v-else
      data-test="exam-list"
      role="list"
      aria-label="Available exams"
      :class="[
        'grid gap-6',
        isMobile ? 'grid-cols-1 mobile-layout' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      ]"
    >
      <div
        v-for="exam in filteredExams"
        :key="exam.id"
        data-test="exam-card"
        role="listitem"
        tabindex="0"
        class="exam-card bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        @click="handleExamSelect(exam)"
        @keydown.enter="handleExamSelect(exam)"
        @keydown.space.prevent="handleExamSelect(exam)"
      >
        <!-- Exam Header -->
        <div class="exam-header mb-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-1">
                {{ exam.code }}
              </h3>
              <h4 class="text-sm font-medium text-blue-600 mb-2">
                {{ exam.name }}
              </h4>
              <p class="text-sm text-gray-500">
                {{ exam.vendor }}
              </p>
            </div>
          </div>
        </div>

        <!-- Exam Description -->
        <div v-if="exam.description" class="exam-description mb-4">
          <p class="text-sm text-gray-600 line-clamp-2">
            {{ exam.description }}
          </p>
        </div>

        <!-- Exam Stats -->
        <div class="exam-stats mb-4">
          <div class="flex items-center justify-between text-sm text-gray-600">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ exam.questionCount }} questions
            </div>
            <div v-if="exam.timeLimit" class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ exam.timeLimit }} min
            </div>
          </div>
        </div>

        <!-- Progress Indicator -->
        <div 
          v-if="exam.progress" 
          data-test="progress-indicator"
          class="progress-section border-t border-gray-200 pt-4"
        >
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="text-gray-600">Progress</span>
            <span class="font-medium text-gray-900">
              {{ Math.round((exam.progress.questionsAnswered / exam.questionCount) * 100) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${Math.min((exam.progress.questionsAnswered / exam.questionCount) * 100, 100)}%` }"
            ></div>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{{ exam.progress.questionsAnswered }} answered</span>
            <span v-if="exam.progress.averageScore" class="font-medium">
              Avg: {{ Math.round(exam.progress.averageScore) }}%
            </span>
          </div>
        </div>

        <!-- Action Button -->
        <div class="action-section mt-4 pt-4 border-t border-gray-200">
          <button
            class="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            @click.stop="handleExamSelect(exam)"
          >
            {{ exam.progress ? 'Continue Study' : 'Start Study' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Results Count -->
    <div 
      v-if="!examStore.isLoading && !examStore.error && filteredExams.length > 0"
      class="results-count mt-6 text-center text-sm text-gray-600"
    >
      Showing {{ filteredExams.length }} of {{ examStore.exams.length }} exam{{ examStore.exams.length !== 1 ? 's' : '' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useExamStore } from '../../stores/exam';
import type { ExamListItem } from '../../types/exam';

// Props
interface Props {
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  searchable: true,
  filterable: true,
  sortable: true,
  autoLoad: true,
});

// Emits
const emit = defineEmits<{
  'exam-selected': [exam: ExamListItem];
}>();

// Store
const examStore = useExamStore();

// Reactive data
const searchQuery = ref('');
const selectedVendor = ref('');
const sortBy = ref('name');
const isMobile = ref(false);

// Computed properties
const availableVendors = computed(() => {
  const vendors = new Set(examStore.exams.map(exam => exam.vendor));
  return Array.from(vendors).sort();
});

const filteredExams = computed(() => {
  let filtered = [...examStore.exams];

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(exam => 
      exam.name.toLowerCase().includes(query) ||
      exam.code.toLowerCase().includes(query) ||
      exam.vendor.toLowerCase().includes(query) ||
      (exam.description && exam.description.toLowerCase().includes(query))
    );
  }

  // Apply vendor filter
  if (selectedVendor.value) {
    filtered = filtered.filter(exam => exam.vendor === selectedVendor.value);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'vendor':
        return a.vendor.localeCompare(b.vendor);
      case 'code':
        return a.code.localeCompare(b.code);
      case 'questionCount':
        return b.questionCount - a.questionCount;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return filtered;
});

// Methods
const handleExamSelect = (exam: ExamListItem) => {
  emit('exam-selected', exam);
};

const handleSearch = () => {
  // Search is handled by the computed property
  // This method is for potential future enhancements like debouncing
};

const handleFilter = () => {
  // Filter is handled by the computed property
  // This method is for potential future enhancements
};

const handleSort = () => {
  // Sort is handled by the computed property
  // This method is for potential future enhancements
};

const retryLoadingExams = async () => {
  try {
    await examStore.fetchExams();
  } catch (error) {
    // Error is handled by the store
    console.error('Failed to retry loading exams:', error);
  }
};

const checkScreenSize = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
  }
};

// Lifecycle hooks
onMounted(async () => {
  // Check screen size
  checkScreenSize();
  
  // Add resize listener
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', checkScreenSize);
  }

  // Load exams if autoLoad is enabled
  if (props.autoLoad && !examStore.exams.length && !examStore.isLoading) {
    try {
      await examStore.fetchExams();
    } catch (error) {
      // Error is handled by the store
      console.error('Failed to load exams on mount:', error);
    }
  }
});

// Watch for changes in screen size
watch(() => isMobile.value, (newValue) => {
  // Handle mobile layout changes if needed
});

// Cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', checkScreenSize);
  });
}
</script>

<style scoped>
.exam-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.exam-card {
  transition: all 0.2s ease-in-out;
}

.exam-card:hover {
  transform: translateY(-2px);
}

.exam-card:focus {
  transform: translateY(-2px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-layout .exam-card {
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  .exam-list-container {
    padding: 0.5rem;
  }
  
  .controls-section {
    flex-direction: column;
  }
  
  .exam-card {
    padding: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .exam-card,
  .bg-blue-600 {
    transition: none;
  }
  
  .animate-spin {
    animation: none;
  }
}
</style>