// Exam-related TypeScript interfaces based on database schema

export interface Exam {
  id: string;
  code: string; // e.g., 'CCNA', 'AWS-SAA'
  name: string;
  vendor: string; // e.g., 'Cisco', 'AWS'
  description?: string;
  passingScore: number;
  timeLimit?: number; // in minutes
  questionCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  examId: string;
  type: 'single' | 'multiple' | 'drag-drop';
  text: string;
  explanation?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  objectiveId?: string;
  isActive: boolean;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  answerOptions?: AnswerOption[];
}

export interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
  createdAt: Date;
}

export interface StudySession {
  id: string;
  userId: string;
  examId: string;
  mode: 'practice' | 'timed' | 'exam';
  totalQuestions: number;
  correctAnswers: number;
  timeSpent?: number; // in seconds
  score?: number;
  completedAt?: Date;
  createdAt: Date;
}

export interface UserProgress {
  id: string;
  userId: string;
  examId: string;
  questionsAnswered: number;
  correctAnswers: number;
  averageScore?: number;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  selectedOptions: string[]; // Array of selected option IDs
  isCorrect: boolean;
  timeSpent?: number; // in seconds
  createdAt: Date;
}

// Component-specific interfaces
export interface ExamListItem extends Pick<Exam, 'id' | 'code' | 'name' | 'vendor' | 'description' | 'questionCount' | 'timeLimit'> {
  progress?: UserProgress;
}

export interface QuestionWithAnswers extends Question {
  answerOptions: AnswerOption[];
}

export interface ExamTimerConfig {
  totalTime: number; // in seconds
  warningTime?: number; // time in seconds when to show warning
  onTimeUp?: () => void;
  onWarning?: () => void;
}