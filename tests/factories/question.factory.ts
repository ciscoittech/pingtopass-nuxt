/**
 * Question Factory
 * Generate test question data
 */

export interface QuestionFactoryOptions {
  id?: number;
  exam_id?: number;
  objective_id?: number;
  text?: string;
  type?: 'multiple_choice' | 'multiple_select' | 'drag_drop';
  difficulty?: 1 | 2 | 3 | 4 | 5;
  answers?: Array<{
    id: string;
    text: string;
    is_correct: boolean;
  }>;
  explanation?: string;
  references?: string[];
  tags?: string[];
}

let questionIdCounter = 1;

export class QuestionFactory {
  static create(options: QuestionFactoryOptions = {}) {
    const id = options.id || questionIdCounter++;
    
    return {
      id,
      exam_id: options.exam_id || 1,
      objective_id: options.objective_id || 1,
      text: options.text || `Question ${id}: What is the correct implementation?`,
      type: options.type || 'multiple_choice',
      difficulty: options.difficulty || 3,
      answers: options.answers || this.generateAnswers(),
      explanation: options.explanation || `Explanation for question ${id}`,
      references: options.references || [`Reference ${id}.1`, `Reference ${id}.2`],
      tags: options.tags || ['networking', 'security'],
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  
  static createBatch(count: number, options: QuestionFactoryOptions = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create({ 
        ...options, 
        id: (options.id || 0) + i,
        difficulty: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5
      })
    );
  }
  
  static createWithStats() {
    const question = this.create();
    return {
      ...question,
      stats: {
        times_answered: 100,
        correct_rate: 0.65,
        average_time_seconds: 45,
        difficulty_rating: 3.2
      }
    };
  }
  
  static createMultipleSelect(options: QuestionFactoryOptions = {}) {
    return this.create({
      ...options,
      type: 'multiple_select',
      answers: [
        { id: 'a', text: 'Option A', is_correct: true },
        { id: 'b', text: 'Option B', is_correct: false },
        { id: 'c', text: 'Option C', is_correct: true },
        { id: 'd', text: 'Option D', is_correct: false },
        { id: 'e', text: 'Option E', is_correct: true }
      ]
    });
  }
  
  static createDragDrop(options: QuestionFactoryOptions = {}) {
    return this.create({
      ...options,
      type: 'drag_drop',
      answers: [
        { id: '1', text: 'Step 1: Initialize', is_correct: true },
        { id: '2', text: 'Step 2: Configure', is_correct: true },
        { id: '3', text: 'Step 3: Deploy', is_correct: true },
        { id: '4', text: 'Step 4: Monitor', is_correct: true }
      ]
    });
  }
  
  static createByDifficulty(difficulty: 1 | 2 | 3 | 4 | 5, count: number = 1) {
    return Array.from({ length: count }, () => 
      this.create({ difficulty })
    );
  }
  
  static createByObjective(examId: number, objectiveId: number, count: number = 10) {
    return this.createBatch(count, { exam_id: examId, objective_id: objectiveId });
  }
  
  private static generateAnswers() {
    const correctIndex = Math.floor(Math.random() * 4);
    return ['a', 'b', 'c', 'd'].map((id, index) => ({
      id,
      text: `Answer ${id.toUpperCase()}`,
      is_correct: index === correctIndex
    }));
  }
  
  static reset() {
    questionIdCounter = 1;
  }
}