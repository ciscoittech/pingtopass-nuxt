import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AnswerExplanation from '../../../../components/exam/AnswerExplanation.vue';

// Mock external dependencies
vi.mock('marked', () => ({
  marked: vi.fn((text: string) => {
    // Simple markdown simulation
    return text
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^```[\s\S]*?```$/gm, '<pre><code>code block</code></pre>');
  })
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => {
      // Simple XSS protection simulation
      return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    })
  }
}));

const writeTextMock = vi.fn().mockResolvedValue(undefined);

// Mock navigator.clipboard for copy functionality
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: writeTextMock,
  },
  configurable: true
});

describe('AnswerExplanation.vue', () => {
  let wrapper: any;

  const createWrapper = (props = {}) => {
    wrapper = mount(AnswerExplanation, {
      props: {
        explanation: 'This is the correct answer because it demonstrates the fundamental principle.',
        isVisible: true,
        ...props,
      },
    });
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    writeTextMock.mockClear();
    writeTextMock.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('should render the answer explanation container', () => {
      createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('[data-test="answer-explanation"]').exists()).toBe(true);
    });

    it('should render explanation text correctly', () => {
      const explanation = 'This is a detailed explanation of why this answer is correct.';
      createWrapper({ explanation });
      
      expect(wrapper.text()).toContain(explanation);
    });

    it('should not render when isVisible is false', () => {
      createWrapper({ isVisible: false });
      
      const container = wrapper.find('[data-test="answer-explanation"]');
      expect(container.exists()).toBe(false);
    });

    it('should render empty state when no explanation provided', () => {
      createWrapper({ explanation: '' });
      
      expect(wrapper.find('[data-test="no-explanation"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('No explanation available');
    });

    it('should render explanation header', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="explanation-header"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Explanation');
    });
  });

  describe('Collapsible Interface', () => {
    it('should toggle collapse state when header is clicked', async () => {
      createWrapper({ collapsible: true });
      
      const header = wrapper.find('[data-test="explanation-header"]');
      expect(header.exists()).toBe(true);
      
      await header.trigger('click');
      
      // Should collapse (hide content)
      expect(wrapper.find('[data-test="explanation-content"]').exists()).toBe(false);
      
      await header.trigger('click');
      
      // Should expand (show content)
      expect(wrapper.find('[data-test="explanation-content"]').exists()).toBe(true);
    });

    it('should show collapse/expand icons when collapsible', () => {
      createWrapper({ collapsible: true });
      
      const header = wrapper.find('[data-test="explanation-header"]');
      expect(header.find('[data-test="collapse-icon"]').exists()).toBe(true);
    });

    it('should not show collapse icons when not collapsible', () => {
      createWrapper({ collapsible: false });
      
      const header = wrapper.find('[data-test="explanation-header"]');
      expect(header.find('[data-test="collapse-icon"]').exists()).toBe(false);
    });

    it('should start expanded by default', () => {
      createWrapper({ collapsible: true });
      
      expect(wrapper.find('[data-test="explanation-content"]').exists()).toBe(true);
    });

    it('should start collapsed when initiallyCollapsed is true', () => {
      createWrapper({ collapsible: true, initiallyCollapsed: true });
      
      expect(wrapper.find('[data-test="explanation-content"]').exists()).toBe(false);
    });

    it('should emit toggle events', async () => {
      createWrapper({ collapsible: true });
      
      const header = wrapper.find('[data-test="explanation-header"]');
      await header.trigger('click');
      
      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')[0]).toEqual([false]); // collapsed
      
      await header.trigger('click');
      expect(wrapper.emitted('toggle')[1]).toEqual([true]); // expanded
    });
  });

  describe('Markdown Support', () => {
    it('should render markdown content correctly', () => {
      const markdownExplanation = `
# Main Concept

This is **bold text** and *italic text*.

## Key Points
- Point 1
- Point 2
- Point 3

\`inline code\` example.

\`\`\`javascript
const example = 'code block';
\`\`\`
      `;
      
      createWrapper({ 
        explanation: markdownExplanation,
        supportMarkdown: true 
      });
      
      const content = wrapper.find('[data-test="explanation-content"]');
      expect(content.exists()).toBe(true);
      
      // Check for rendered markdown elements
      expect(content.html()).toContain('<h1>');
      expect(content.html()).toContain('<strong>');
      expect(content.html()).toContain('<em>');
      expect(content.html()).toContain('<ul>');
      expect(content.html()).toContain('<code>');
    });

    it('should render plain text when markdown support is disabled', () => {
      const markdownText = '**Bold text** and *italic*';
      
      createWrapper({ 
        explanation: markdownText,
        supportMarkdown: false 
      });
      
      const content = wrapper.find('[data-test="explanation-content"]');
      expect(content.text()).toContain('**Bold text**');
      expect(content.html()).not.toContain('<strong>');
    });

    it('should sanitize HTML in markdown to prevent XSS', () => {
      const maliciousContent = `
# Safe Title
<script>alert('xss')</script>
Normal content
      `;
      
      createWrapper({ 
        explanation: maliciousContent,
        supportMarkdown: true 
      });
      
      const content = wrapper.find('[data-test="explanation-content"]');
      expect(content.html()).toContain('<h1>');
      expect(content.html()).not.toContain('<script>');
      expect(content.text()).not.toContain('alert(');
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy button when showCopyButton is true', () => {
      createWrapper({ showCopyButton: true });
      
      expect(wrapper.find('[data-test="copy-button"]').exists()).toBe(true);
    });

    it('should not show copy button by default', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="copy-button"]').exists()).toBe(false);
    });

    it('should copy explanation text to clipboard when copy button clicked', async () => {
      const explanation = 'This is the explanation to copy';
      createWrapper({ 
        explanation,
        showCopyButton: true 
      });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      await copyButton.trigger('click');
      
      expect(writeTextMock).toHaveBeenCalledWith(explanation);
    });

    it('should show copy success feedback', async () => {
      createWrapper({ showCopyButton: true });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      await copyButton.trigger('click');
      
      // Wait for next tick to ensure reactive updates
      await wrapper.vm.$nextTick();
      
      // Should show temporary success state
      expect(wrapper.find('[data-test="copy-success"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Copied to clipboard!');
    });

    it('should reset copy success state after timeout', async () => {
      vi.useFakeTimers();
      
      createWrapper({ showCopyButton: true });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      await copyButton.trigger('click');
      
      expect(wrapper.find('[data-test="copy-success"]').exists()).toBe(true);
      
      // Fast-forward time
      vi.advanceTimersByTime(2000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="copy-success"]').exists()).toBe(false);
      
      vi.useRealTimers();
    });

    it('should handle copy failure gracefully', async () => {
      // Mock clipboard write failure
      writeTextMock.mockRejectedValueOnce(new Error('Copy failed'));
      
      createWrapper({ showCopyButton: true });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      await copyButton.trigger('click');
      
      // Should show error state
      expect(wrapper.find('[data-test="copy-error"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Copy failed');
    });

    it('should emit copy events', async () => {
      createWrapper({ showCopyButton: true });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      await copyButton.trigger('click');
      
      expect(wrapper.emitted('copy')).toBeTruthy();
      expect(wrapper.emitted('copy')[0]).toEqual([true]); // success
    });
  });

  describe('References and Resources', () => {
    it('should display references when provided', () => {
      const references = [
        { title: 'Official Documentation', url: 'https://example.com/docs' },
        { title: 'Tutorial', url: 'https://example.com/tutorial' }
      ];
      
      createWrapper({ references });
      
      expect(wrapper.find('[data-test="references-section"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('References');
      expect(wrapper.text()).toContain('Official Documentation');
      expect(wrapper.text()).toContain('Tutorial');
    });

    it('should not show references section when none provided', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="references-section"]').exists()).toBe(false);
    });

    it('should render reference links correctly', () => {
      const references = [
        { title: 'Test Resource', url: 'https://example.com' }
      ];
      
      createWrapper({ references });
      
      const link = wrapper.find('a[href="https://example.com"]');
      expect(link.exists()).toBe(true);
      expect(link.text()).toContain('Test Resource');
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toBe('noopener noreferrer');
    });

    it('should handle references without URLs', () => {
      const references = [
        { title: 'Internal Reference' }
      ];
      
      createWrapper({ references });
      
      expect(wrapper.text()).toContain('Internal Reference');
      expect(wrapper.find('a').exists()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      createWrapper({ collapsible: true });
      
      const container = wrapper.find('[data-test="answer-explanation"]');
      expect(container.attributes('role')).toBe('region');
      expect(container.attributes('aria-label')).toBe('Answer explanation');
      
      const header = wrapper.find('[data-test="explanation-header"]');
      expect(header.attributes('role')).toBe('button');
      expect(header.attributes('aria-expanded')).toBe('true');
      expect(header.attributes('tabindex')).toBe('0');
    });

    it('should update aria-expanded when collapsed', async () => {
      createWrapper({ collapsible: true });
      
      const header = wrapper.find('[data-test="explanation-header"]');
      await header.trigger('click');
      
      expect(header.attributes('aria-expanded')).toBe('false');
    });

    it('should support keyboard navigation', async () => {
      createWrapper({ collapsible: true });
      
      const header = wrapper.find('[data-test="explanation-header"]');
      
      // Test Enter key
      await header.trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('toggle')).toBeTruthy();
      
      // Reset
      await header.trigger('keydown', { key: 'Enter' });
      
      // Test Space key
      await header.trigger('keydown', { key: ' ' });
      expect(wrapper.emitted('toggle')).toHaveLength(3);
    });

    it('should have proper heading structure', () => {
      createWrapper();
      
      const header = wrapper.find('[data-test="explanation-header"]');
      expect(header.element.tagName.toLowerCase()).toBe('h3');
    });

    it('should provide screen reader friendly copy button', () => {
      createWrapper({ showCopyButton: true });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      expect(copyButton.attributes('aria-label')).toBe('Copy explanation to clipboard');
    });
  });

  describe('Visual Variants', () => {
    it('should apply compact variant styling', () => {
      createWrapper({ variant: 'compact' });
      
      const container = wrapper.find('[data-test="answer-explanation"]');
      expect(container.classes()).toContain('compact');
    });

    it('should apply detailed variant styling', () => {
      createWrapper({ variant: 'detailed' });
      
      const container = wrapper.find('[data-test="answer-explanation"]');
      expect(container.classes()).toContain('detailed');
    });

    it('should apply correct/incorrect styling based on answer correctness', async () => {
      createWrapper({ answerCorrect: true });
      
      const container = wrapper.find('[data-test="answer-explanation"]');
      expect(container.classes()).toContain('correct-answer');
      
      await wrapper.setProps({ answerCorrect: false });
      
      expect(container.classes()).toContain('incorrect-answer');
    });
  });

  describe('Content Truncation', () => {
    it('should truncate long explanations with show more/less', () => {
      const longExplanation = 'A'.repeat(1000);
      
      createWrapper({ 
        explanation: longExplanation,
        maxLength: 200,
        supportMarkdown: false  // Truncation only works with plain text
      });
      
      expect(wrapper.find('[data-test="show-more-button"]').exists()).toBe(true);
      expect(wrapper.text()).not.toContain('A'.repeat(1000));
    });

    it('should expand full content when show more is clicked', async () => {
      const longExplanation = 'A'.repeat(1000);
      
      createWrapper({ 
        explanation: longExplanation,
        maxLength: 200,
        supportMarkdown: false  // Truncation only works with plain text
      });
      
      const showMoreButton = wrapper.find('[data-test="show-more-button"]');
      await showMoreButton.trigger('click');
      
      expect(wrapper.text()).toContain('A'.repeat(1000));
      expect(wrapper.find('[data-test="show-less-button"]').exists()).toBe(true);
    });

    it('should not show truncation for short content', () => {
      const shortExplanation = 'Short explanation';
      
      createWrapper({ 
        explanation: shortExplanation,
        maxLength: 200 
      });
      
      expect(wrapper.find('[data-test="show-more-button"]').exists()).toBe(false);
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state when loading', () => {
      createWrapper({ loading: true });
      
      expect(wrapper.find('[data-test="explanation-loading"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading explanation');
    });

    it('should show error state when error occurs', () => {
      createWrapper({ 
        error: 'Failed to load explanation',
        loading: false 
      });
      
      expect(wrapper.find('[data-test="explanation-error"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load explanation');
    });

    it('should show retry button in error state', async () => {
      createWrapper({ error: 'Network error' });
      
      const retryButton = wrapper.find('[data-test="retry-button"]');
      expect(retryButton.exists()).toBe(true);
      
      await retryButton.trigger('click');
      expect(wrapper.emitted('retry')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long single words', () => {
      const longWord = 'A'.repeat(200);
      
      createWrapper({ 
        explanation: longWord,
        supportMarkdown: false  // break-all class only applies to plain text
      });
      
      // Check for break-all class in the plain text div
      const plainTextDiv = wrapper.find('div.break-all');
      expect(plainTextDiv.exists()).toBe(true);
    });

    it('should handle special characters in explanation', () => {
      const specialChars = 'Special chars: < > & " \' \n\t';
      
      createWrapper({ explanation: specialChars });
      
      // Check that the content contains the basic special chars (newlines and tabs may be normalized)
      expect(wrapper.text()).toContain('Special chars: < > & " \'');
    });

    it('should handle empty references array', () => {
      createWrapper({ references: [] });
      
      expect(wrapper.find('[data-test="references-section"]').exists()).toBe(false);
    });

    it('should handle malformed reference objects', () => {
      const badReferences = [
        { title: null, url: 'https://example.com' },
        { url: 'https://example2.com' },
        null
      ];
      
      expect(() => createWrapper({ references: badReferences })).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large markdown content efficiently', () => {
      const largeMarkdown = `
# ${Array.from({ length: 100 }, (_, i) => `Section ${i}`).join('\n## ')}
${Array.from({ length: 1000 }, (_, i) => `- List item ${i}`).join('\n')}
      `;
      
      const startTime = performance.now();
      createWrapper({ 
        explanation: largeMarkdown,
        supportMarkdown: true 
      });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
    });

    it('should debounce copy button clicks', async () => {
      createWrapper({ showCopyButton: true });
      
      const copyButton = wrapper.find('[data-test="copy-button"]');
      
      // Rapid clicks
      await copyButton.trigger('click');
      await copyButton.trigger('click');
      await copyButton.trigger('click');
      
      // Should only call clipboard once due to debouncing
      expect(writeTextMock).toHaveBeenCalledTimes(1);
    });
  });
});