/**
 * Study Session Factory
 * Generate test session data
 */

export interface SessionFactoryOptions {
  id?: number;
  user_id?: number;
  exam_id?: number;
  type?: 'practice' | 'timed' | 'review';
  status?: 'active' | 'paused' | 'completed';
  question_count?: number;
  correct_count?: number;
  time_spent_seconds?: number;
  started_at?: Date;
  completed_at?: Date | null;
}

export interface AnswerFactoryOptions {
  id?: number;
  user_id?: number;
  session_id?: number;
  question_id?: number;
  selected_answer?: string;
  is_correct?: boolean;
  time_spent_seconds?: number;
  flagged_for_review?: boolean;
}

let sessionIdCounter = 1;
let answerIdCounter = 1;

export class SessionFactory {
  static create(options: SessionFactoryOptions = {}) {
    const id = options.id || sessionIdCounter++;
    const started_at = options.started_at || new Date();
    
    return {
      id,
      user_id: options.user_id || 1,
      exam_id: options.exam_id || 1,
      type: options.type || 'practice',
      status: options.status || 'active',
      question_count: options.question_count || 0,
      correct_count: options.correct_count || 0,
      time_spent_seconds: options.time_spent_seconds || 0,
      started_at,
      completed_at: options.completed_at || null,
      updated_at: new Date()
    };
  }
  
  static createActive(userId: number = 1, examId: number = 1) {
    return this.create({
      user_id: userId,
      exam_id: examId,
      status: 'active',
      started_at: new Date(Date.now() - 300000) // Started 5 minutes ago
    });
  }
  
  static createCompleted(options: SessionFactoryOptions = {}) {
    const questionCount = options.question_count || 65;
    const correctCount = options.correct_count || Math.floor(questionCount * 0.75);
    
    return this.create({
      ...options,
      status: 'completed',
      question_count: questionCount,
      correct_count: correctCount,
      time_spent_seconds: options.time_spent_seconds || questionCount * 45,
      completed_at: options.completed_at || new Date()
    });
  }
  
  static createWithAnswers(answerCount: number = 10) {
    const session = this.create();
    const answers = AnswerFactory.createBatch(answerCount, {
      user_id: session.user_id,
      session_id: session.id
    });
    
    // Update session stats based on answers
    session.question_count = answers.length;
    session.correct_count = answers.filter(a => a.is_correct).length;
    session.time_spent_seconds = answers.reduce((sum, a) => sum + a.time_spent_seconds, 0);
    
    return {
      ...session,
      answers
    };
  }
  
  static createTimedExam(userId: number = 1, examId: number = 1) {
    return this.create({
      user_id: userId,
      exam_id: examId,
      type: 'timed',
      status: 'active',
      question_count: 90,
      time_spent_seconds: 0
    });
  }
  
  static createReviewSession(userId: number = 1, examId: number = 1) {
    return this.create({
      user_id: userId,
      exam_id: examId,
      type: 'review',
      status: 'active'
    });
  }
  
  static createBatch(count: number, options: SessionFactoryOptions = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create({ ...options, id: (options.id || 0) + i })
    );
  }
  
  static reset() {
    sessionIdCounter = 1;
    answerIdCounter = 1;
  }
}

export class AnswerFactory {
  static create(options: AnswerFactoryOptions = {}) {
    const id = options.id || answerIdCounter++;
    const isCorrect = options.is_correct !== undefined ? options.is_correct : Math.random() > 0.3;
    
    return {
      id,
      user_id: options.user_id || 1,
      session_id: options.session_id || 1,
      question_id: options.question_id || id,
      selected_answer: options.selected_answer || ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
      is_correct: isCorrect,
      time_spent_seconds: options.time_spent_seconds || Math.floor(Math.random() * 60) + 20,
      flagged_for_review: options.flagged_for_review || false,
      answered_at: new Date()
    };
  }
  
  static createCorrect(options: AnswerFactoryOptions = {}) {
    return this.create({ ...options, is_correct: true });
  }
  
  static createIncorrect(options: AnswerFactoryOptions = {}) {
    return this.create({ ...options, is_correct: false });
  }
  
  static createFlagged(options: AnswerFactoryOptions = {}) {
    return this.create({ ...options, flagged_for_review: true });
  }
  
  static createBatch(count: number, options: AnswerFactoryOptions = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create({ 
        ...options, 
        id: (options.id || 0) + i,
        question_id: (options.question_id || 0) + i
      })
    );
  }
  
  static createForSession(sessionId: number, questionIds: number[], correctRate: number = 0.75) {
    return questionIds.map((qId, index) => 
      this.create({
        session_id: sessionId,
        question_id: qId,
        is_correct: Math.random() < correctRate
      })
    );
  }
}

export class ProgressFactory {
  static create(userId: number, examId: number) {
    return {
      user_id: userId,
      exam_id: examId,
      total_questions_answered: 0,
      correct_answers: 0,
      mastery_scores: {},
      weak_areas: [],
      strong_areas: [],
      last_activity: new Date(),
      created_at: new Date()
    };
  }
  
  static createWithHistory(userId: number, examId: number, sessionCount: number = 5) {
    const progress = this.create(userId, examId);
    const sessions = SessionFactory.createBatch(sessionCount, {
      user_id: userId,
      exam_id: examId,
      status: 'completed'
    });
    
    // Calculate aggregate stats
    progress.total_questions_answered = sessions.reduce((sum, s) => sum + s.question_count, 0);
    progress.correct_answers = sessions.reduce((sum, s) => sum + s.correct_count, 0);
    
    // Mock mastery scores by objective
    progress.mastery_scores = {
      '1': 0.75,
      '2': 0.82,
      '3': 0.68,
      '4': 0.91,
      '5': 0.73
    };
    
    progress.weak_areas = ['3', '5'];
    progress.strong_areas = ['2', '4'];
    
    return {
      ...progress,
      sessions
    };
  }
}