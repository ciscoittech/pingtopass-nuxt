import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ExamList from '../../../../components/exam/ExamList.vue';
import { useExamStore } from '../../../../stores/exam';
import type { ExamListItem } from '../../../../types/exam';

// Mock $fetch globally
globalThis.$fetch = vi.fn().mockResolvedValue({ data: [] });

// Mock navigateTo
globalThis.navigateTo = vi.fn();

// Mock data
const mockExams: ExamListItem[] = [
  {
    id: '1',
    code: 'CCNA',
    name: 'Cisco Certified Network Associate',
    vendor: 'Cisco',
    description: 'Foundation networking certification',
    questionCount: 120,
    timeLimit: 90,
    progress: {
      id: 'progress-1',
      userId: 'user-1',
      examId: '1',
      questionsAnswered: 50,
      correctAnswers: 40,
      averageScore: 80.0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },
  {
    id: '2',
    code: 'AWS-SAA',
    name: 'AWS Solutions Architect Associate',
    vendor: 'Amazon Web Services',
    description: 'Cloud architecture certification',
    questionCount: 65,
    timeLimit: 130,
  }
];

describe('ExamList.vue', () => {
  let wrapper: any;
  let examStore: any;

  const createWrapper = (props = {}) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
      initialState: {
        exam: {
          exams: [],
          isLoading: false,
          error: null,
        }
      }
    });

    wrapper = mount(ExamList, {
      global: {
        plugins: [pinia],
        stubs: {
          // Stub any child components if needed
        },
      },
      props,
    });

    examStore = useExamStore();
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('[data-test="exam-list"]').exists()).toBe(true);
    });

    it('should display loading state when fetching exams', async () => {
      createWrapper();
      examStore.isLoading = true;
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="loading-state"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true);
    });

    it('should display empty state when no exams available', async () => {
      createWrapper();
      examStore.exams = [];
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('No exams available');
    });

    it('should display error state when there is an error', async () => {
      createWrapper();
      examStore.error = 'Failed to load exams';
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load exams');
    });
  });

  describe('Exam List Display', () => {
    it('should render exam cards when exams are available', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const examCards = wrapper.findAll('[data-test="exam-card"]');
      expect(examCards).toHaveLength(2);
    });

    it('should display exam information correctly', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      // Note: exams are sorted alphabetically, so AWS comes before CCNA
      const firstExamCard = wrapper.find('[data-test="exam-card"]:first-child');
      expect(firstExamCard.text()).toContain('AWS-SAA');
      expect(firstExamCard.text()).toContain('AWS Solutions Architect Associate');
      expect(firstExamCard.text()).toContain('Amazon Web Services');
    });

    it('should show progress information when available', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      // CCNA (with progress) is now second due to alphabetical sorting
      const secondExamCard = wrapper.find('[data-test="exam-card"]:nth-child(2)');
      expect(secondExamCard.find('[data-test="progress-indicator"]').exists()).toBe(true);
    });

    it('should not show progress for exams without progress data', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      // AWS (without progress) is first due to alphabetical sorting
      const firstExamCard = wrapper.find('[data-test="exam-card"]:first-child');
      expect(firstExamCard.find('[data-test="progress-indicator"]').exists()).toBe(false);
    });
  });

  describe('User Interactions', () => {
    it('should emit exam-selected event when exam card is clicked', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const firstExamCard = wrapper.find('[data-test="exam-card"]:first-child');
      await firstExamCard.trigger('click');
      
      expect(wrapper.emitted('exam-selected')).toBeTruthy();
      // AWS exam should be first due to alphabetical sorting
      expect(wrapper.emitted('exam-selected')[0]).toEqual([mockExams[1]]);
    });

    it('should call fetchExams when retry button is clicked in error state', async () => {
      createWrapper();
      examStore.error = 'Network error';
      examStore.isLoading = false;
      examStore.fetchExams = vi.fn();
      
      await wrapper.vm.$nextTick();
      
      const retryButton = wrapper.find('[data-test="retry-button"]');
      await retryButton.trigger('click');
      
      expect(examStore.fetchExams).toHaveBeenCalled();
    });

    it('should handle search/filter functionality', async () => {
      const wrapper = createWrapper({ searchable: true });
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const searchInput = wrapper.find('[data-test="search-input"]');
      expect(searchInput.exists()).toBe(true);
      
      await searchInput.setValue('CCNA');
      await wrapper.vm.$nextTick();
      
      // Should filter to show only CCNA exam
      const visibleCards = wrapper.findAll('[data-test="exam-card"]');
      expect(visibleCards).toHaveLength(1);
      expect(visibleCards[0].text()).toContain('CCNA');
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter exams by vendor when vendor filter is applied', async () => {
      const wrapper = createWrapper({ filterable: true });
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const vendorFilter = wrapper.find('[data-test="vendor-filter"]');
      await vendorFilter.setValue('Cisco');
      await wrapper.vm.$nextTick();
      
      const visibleCards = wrapper.findAll('[data-test="exam-card"]');
      expect(visibleCards).toHaveLength(1);
      expect(visibleCards[0].text()).toContain('Cisco');
    });

    it('should sort exams alphabetically by name', async () => {
      const wrapper = createWrapper({ sortable: true });
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const sortSelect = wrapper.find('[data-test="sort-select"]');
      await sortSelect.setValue('name');
      await wrapper.vm.$nextTick();
      
      const examCards = wrapper.findAll('[data-test="exam-card"]');
      expect(examCards).toHaveLength(2);
      
      const firstCardText = examCards[0].text();
      const secondCardText = examCards[1].text();
      
      // AWS should come before CCNA alphabetically
      expect(firstCardText).toContain('AWS');
      expect(secondCardText).toContain('CCNA');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const examList = wrapper.find('[data-test="exam-list"]');
      expect(examList.attributes('role')).toBe('list');
      expect(examList.attributes('aria-label')).toBe('Available exams');
      
      const examCards = wrapper.findAll('[data-test="exam-card"]');
      examCards.forEach(card => {
        expect(card.attributes('role')).toBe('listitem');
        expect(card.attributes('tabindex')).toBe('0');
      });
    });

    it('should support keyboard navigation', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const firstExamCard = wrapper.find('[data-test="exam-card"]:first-child');
      await firstExamCard.trigger('keydown.enter');
      
      expect(wrapper.emitted('exam-selected')).toBeTruthy();
      // AWS exam should be first due to alphabetical sorting
      expect(wrapper.emitted('exam-selected')[0]).toEqual([mockExams[1]]);
    });
  });

  describe('Component Lifecycle', () => {
    it('should fetch exams on mount', () => {
      examStore.fetchExams = vi.fn();
      createWrapper();
      
      expect(examStore.fetchExams).toHaveBeenCalled();
    });

    it('should not fetch exams on mount when autoLoad is false', () => {
      examStore.fetchExams = vi.fn();
      createWrapper({ autoLoad: false });
      
      expect(examStore.fetchExams).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should render with responsive grid classes', async () => {
      createWrapper();
      examStore.exams = mockExams;
      examStore.isLoading = false;
      
      await wrapper.vm.$nextTick();
      
      const examList = wrapper.find('[data-test="exam-list"]');
      expect(examList.exists()).toBe(true);
      expect(examList.classes()).toContain('grid');
    });
  });
});