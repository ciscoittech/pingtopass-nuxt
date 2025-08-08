-- PingToPass Database Schema
-- Optimized for Turso (SQLite at the edge)

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users: Core authentication and profile data
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  
  -- Authentication
  provider TEXT DEFAULT 'google' CHECK(provider IN ('google', 'email')),
  provider_id TEXT,
  password_hash TEXT,
  
  -- Roles & Permissions
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'moderator')),
  permissions TEXT DEFAULT '[]',
  
  -- Subscription
  subscription_status TEXT DEFAULT 'free' CHECK(subscription_status IN ('free', 'premium', 'enterprise')),
  subscription_expires_at TIMESTAMP,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Profile
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferred_language TEXT DEFAULT 'en',
  
  -- Activity
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  email_verified BOOLEAN DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams: Certification exam definitions
CREATE TABLE exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Identification
  vendor_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  passing_score REAL DEFAULT 0.65 CHECK(passing_score BETWEEN 0 AND 1),
  question_count INTEGER DEFAULT 65,
  time_limit_minutes INTEGER DEFAULT 90,
  
  -- Metadata
  version TEXT,
  expires_at TIMESTAMP,
  difficulty_level INTEGER DEFAULT 3 CHECK(difficulty_level BETWEEN 1 AND 5),
  prerequisites TEXT,
  
  -- Pricing
  price_cents INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  is_beta BOOLEAN DEFAULT 0,
  
  -- Statistics
  total_attempts INTEGER DEFAULT 0,
  pass_rate REAL DEFAULT 0,
  avg_score REAL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(vendor_id, code)
);

-- Objectives: Exam domains/objectives
CREATE TABLE objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  
  -- Identification
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Weighting
  weight REAL DEFAULT 0.25 CHECK(weight BETWEEN 0 AND 1),
  question_percentage REAL,
  
  -- Hierarchy
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Questions: The core question bank
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  objective_id INTEGER NOT NULL,
  
  -- Question Content
  text TEXT NOT NULL,
  type TEXT DEFAULT 'multiple_choice' 
    CHECK(type IN ('multiple_choice', 'multi_select', 'true_false', 'drag_drop', 'hotspot')),
  
  -- Answers (JSON format)
  answers TEXT NOT NULL,
  
  -- Explanation & References
  explanation TEXT,
  reference TEXT,
  external_link TEXT,
  
  -- Difficulty & Classification
  difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
  tags TEXT DEFAULT '[]',
  
  -- AI Generation Tracking
  ai_generated BOOLEAN DEFAULT 0,
  ai_model TEXT,
  ai_prompt_version TEXT,
  ai_confidence_score REAL,
  
  -- Quality Metrics
  review_status TEXT DEFAULT 'pending' 
    CHECK(review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  
  -- Performance Tracking
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  discrimination_index REAL,
  
  -- Media
  image_url TEXT,
  diagram_data TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  is_beta BOOLEAN DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Study Sessions: Track practice and study sessions
CREATE TABLE study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  
  -- Session Configuration
  mode TEXT DEFAULT 'practice' 
    CHECK(mode IN ('practice', 'review', 'speed_drill', 'weak_areas', 'custom')),
  objectives TEXT,
  difficulty_filter TEXT,
  question_count INTEGER DEFAULT 20,
  
  -- Progress Tracking
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  skipped_questions INTEGER DEFAULT 0,
  flagged_questions INTEGER DEFAULT 0,
  
  -- Time Tracking
  time_spent_seconds INTEGER DEFAULT 0,
  avg_time_per_question REAL,
  
  -- Performance Metrics
  accuracy REAL,
  streak_count INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  
  -- Mastery Tracking
  objective_scores TEXT DEFAULT '{}',
  
  -- Session State
  status TEXT DEFAULT 'active' 
    CHECK(status IN ('active', 'paused', 'completed', 'abandoned')),
  current_question_id INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Test Attempts: Formal exam simulations
CREATE TABLE test_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  
  -- Test Configuration
  question_ids TEXT NOT NULL,
  time_limit_minutes INTEGER,
  passing_score REAL,
  
  -- Results
  score REAL,
  passed BOOLEAN,
  correct_count INTEGER,
  incorrect_count INTEGER,
  skipped_count INTEGER,
  
  -- Detailed Scoring
  objective_breakdown TEXT,
  
  -- Time Analysis
  total_time_seconds INTEGER,
  time_per_question TEXT,
  
  -- Question Review
  review_enabled BOOLEAN DEFAULT 1,
  certificate_issued BOOLEAN DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'in_progress' 
    CHECK(status IN ('in_progress', 'completed', 'abandoned', 'invalidated')),
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- User Answers: Individual answer tracking
CREATE TABLE user_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  
  -- Session References
  study_session_id INTEGER,
  test_attempt_id INTEGER,
  
  -- Answer Details
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  
  -- Interaction Metrics
  time_spent_seconds INTEGER,
  confidence_level INTEGER CHECK(confidence_level BETWEEN 1 AND 5),
  flagged BOOLEAN DEFAULT 0,
  changed_answer BOOLEAN DEFAULT 0,
  
  -- Learning Analytics
  attempt_number INTEGER DEFAULT 1,
  days_since_last_seen INTEGER,
  
  -- Timestamp
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (study_session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (test_attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
);

-- User Progress: Aggregated progress tracking
CREATE TABLE user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  
  -- Overall Statistics
  total_questions_seen INTEGER DEFAULT 0,
  unique_questions_seen INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_incorrect INTEGER DEFAULT 0,
  
  -- Performance Metrics
  overall_accuracy REAL DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  avg_time_per_question REAL,
  
  -- Study Time
  total_study_minutes INTEGER DEFAULT 0,
  last_study_date DATE,
  study_days_count INTEGER DEFAULT 0,
  
  -- Mastery Levels
  objective_mastery TEXT DEFAULT '{}',
  
  -- Readiness Score
  readiness_score REAL DEFAULT 0,
  predicted_exam_score REAL,
  confidence_interval REAL,
  
  -- Weak Areas
  weak_topics TEXT DEFAULT '[]',
  recommended_objectives TEXT DEFAULT '[]',
  
  -- Test History
  tests_taken INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  best_score REAL DEFAULT 0,
  avg_test_score REAL DEFAULT 0,
  last_test_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  UNIQUE(user_id, exam_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id);

CREATE INDEX idx_exams_vendor ON exams(vendor_id, is_active);
CREATE INDEX idx_exams_active ON exams(is_active, is_beta);

CREATE INDEX idx_objectives_exam ON objectives(exam_id, is_active);
CREATE INDEX idx_objectives_parent ON objectives(parent_id, sort_order);

CREATE INDEX idx_questions_exam_objective ON questions(exam_id, objective_id, is_active);
CREATE INDEX idx_questions_difficulty ON questions(exam_id, difficulty, is_active);
CREATE INDEX idx_questions_review ON questions(review_status, ai_generated);

CREATE INDEX idx_sessions_user ON study_sessions(user_id, exam_id, status);
CREATE INDEX idx_sessions_active ON study_sessions(status, last_activity);

CREATE INDEX idx_test_attempts_user ON test_attempts(user_id, exam_id, status);
CREATE INDEX idx_test_attempts_scores ON test_attempts(exam_id, passed, score DESC);

CREATE INDEX idx_user_answers_user_question ON user_answers(user_id, question_id, answered_at DESC);
CREATE INDEX idx_user_answers_session ON user_answers(study_session_id);
CREATE INDEX idx_user_answers_test ON user_answers(test_attempt_id);
CREATE INDEX idx_user_answers_recent ON user_answers(user_id, answered_at DESC);

CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_readiness ON user_progress(exam_id, readiness_score DESC);