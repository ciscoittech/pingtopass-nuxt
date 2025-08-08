/**
 * AI/LangChain Test Mocks
 * Mock implementations for LangChain and OpenRouter integrations
 */

import { vi } from 'vitest';

/**
 * Setup AI-related mocks
 */
export function setupAIMocks() {
  // Mock LangChain
  vi.mock('langchain', () => ({
    OpenAI: vi.fn().mockImplementation(() => ({
      call: vi.fn(),
      generate: vi.fn(),
      predict: vi.fn()
    })),
    LLMChain: vi.fn().mockImplementation(() => ({
      call: vi.fn(),
      run: vi.fn()
    })),
    PromptTemplate: vi.fn().mockImplementation(() => ({
      format: vi.fn()
    }))
  }));
  
  // Mock OpenRouter
  vi.mock('@langchain/community/llms/openrouter', () => ({
    OpenRouter: vi.fn().mockImplementation(() => ({
      call: vi.fn(),
      generate: vi.fn()
    }))
  }));
}

/**
 * Mock question generation response
 */
export function mockQuestionGeneration(count: number = 10) {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      text: `Generated Question ${i}: What is the purpose of this concept?`,
      type: 'multiple_choice',
      difficulty: (i % 5) + 1,
      answers: [
        { id: 'a', text: 'Generated Answer A', is_correct: i % 4 === 0 },
        { id: 'b', text: 'Generated Answer B', is_correct: i % 4 === 1 },
        { id: 'c', text: 'Generated Answer C', is_correct: i % 4 === 2 },
        { id: 'd', text: 'Generated Answer D', is_correct: i % 4 === 3 }
      ],
      explanation: `AI-generated explanation for question ${i}`,
      references: [`AI Reference ${i}.1`]
    });
  }
  
  return {
    call: vi.fn().mockResolvedValue({
      text: JSON.stringify({ questions })
    }),
    generate: vi.fn().mockResolvedValue({
      generations: [[{ text: JSON.stringify({ questions }) }]]
    })
  };
}

/**
 * Mock Twitter reply generation
 */
export function mockTwitterReplyGeneration() {
  const replies = [
    "Great point! This aligns perfectly with modern DevOps practices.",
    "Interesting perspective. Have you considered the edge case scenarios?",
    "This is exactly what I've been looking for. Thanks for sharing!",
    "Brilliant implementation! The performance gains are impressive.",
    "Could you elaborate on the security implications of this approach?"
  ];
  
  return {
    call: vi.fn().mockResolvedValue({
      text: replies[Math.floor(Math.random() * replies.length)]
    })
  };
}

/**
 * Mock explanation generation for wrong answers
 */
export function mockExplanationGeneration() {
  return {
    call: vi.fn().mockResolvedValue({
      text: "The correct answer is B because it properly implements the security protocol. Answer A lacks encryption, Answer C has syntax errors, and Answer D would cause performance issues in production environments."
    })
  };
}

/**
 * Mock study recommendation generation
 */
export function mockStudyRecommendations() {
  return {
    call: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        recommendations: [
          {
            objective: "Network Security",
            weakness_level: "moderate",
            suggested_topics: ["Firewall configuration", "VPN setup", "IDS/IPS"],
            estimated_study_time: 120
          },
          {
            objective: "Cloud Architecture",
            weakness_level: "high",
            suggested_topics: ["AWS VPC", "Azure networking", "Load balancing"],
            estimated_study_time: 180
          }
        ]
      })
    })
  };
}

/**
 * Mock voice profile analysis
 */
export function mockVoiceProfileAnalysis() {
  return {
    call: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        tone: "professional",
        expertise_areas: ["cloud", "devops", "security"],
        communication_style: "technical but approachable",
        common_phrases: ["interesting approach", "performance matters", "edge-first"],
        engagement_rate: 0.15
      })
    })
  };
}

/**
 * Mock content moderation
 */
export function mockContentModeration() {
  return {
    call: vi.fn().mockImplementation((content: string) => {
      // Simple mock moderation logic
      const flaggedWords = ['spam', 'inappropriate', 'offensive'];
      const isFlagged = flaggedWords.some(word => content.toLowerCase().includes(word));
      
      return Promise.resolve({
        text: JSON.stringify({
          safe: !isFlagged,
          confidence: 0.95,
          categories: isFlagged ? ['inappropriate_content'] : []
        })
      });
    })
  };
}

/**
 * Create a mock LangChain chain
 */
export function createMockChain(responses: any[] = []) {
  let callIndex = 0;
  
  return {
    call: vi.fn().mockImplementation(() => {
      const response = responses[callIndex] || { text: 'Default response' };
      callIndex = (callIndex + 1) % responses.length;
      return Promise.resolve(response);
    }),
    run: vi.fn().mockImplementation(() => {
      const response = responses[callIndex] || 'Default response';
      callIndex = (callIndex + 1) % responses.length;
      return Promise.resolve(response);
    })
  };
}

/**
 * Mock rate limiting for AI services
 */
export class MockAIRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, number> = new Map([
    ['openrouter', 100], // 100 requests per minute
    ['langchain', 500]   // 500 requests per minute
  ]);
  
  async checkLimit(service: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (!this.requests.has(service)) {
      this.requests.set(service, []);
    }
    
    const serviceRequests = this.requests.get(service)!;
    const recentRequests = serviceRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= (this.limits.get(service) || 100)) {
      return false; // Rate limit exceeded
    }
    
    recentRequests.push(now);
    this.requests.set(service, recentRequests);
    return true;
  }
  
  reset() {
    this.requests.clear();
  }
}

/**
 * Mock token counting for cost estimation
 */
export function mockTokenCounter() {
  return {
    count: vi.fn().mockImplementation((text: string) => {
      // Rough approximation: 1 token per 4 characters
      return Math.ceil(text.length / 4);
    }),
    
    estimateCost: vi.fn().mockImplementation((tokens: number, model: string) => {
      const rates: Record<string, number> = {
        'gpt-3.5-turbo': 0.0015 / 1000, // $0.0015 per 1k tokens
        'gpt-4': 0.03 / 1000,            // $0.03 per 1k tokens
        'qwen-30b': 0.0001 / 1000        // $0.0001 per 1k tokens (free tier)
      };
      
      return tokens * (rates[model] || 0);
    })
  };
}

/**
 * Mock streaming response for real-time generation
 */
export function createMockStream(chunks: string[]) {
  let index = 0;
  
  return {
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (index < chunks.length) {
          return { value: chunks[index++], done: false };
        }
        return { done: true };
      }
    })
  };
}