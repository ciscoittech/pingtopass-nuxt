# Turso Database Schema - Edge SQLite Design

## 1. Schema Overview

### Design Principles
- **Normalized structure** for data integrity
- **JSON fields** for flexible nested data
- **Optimized indexes** for query performance
- **Edge-first** with minimal joins
- **Audit trails** for compliance

### Database Configuration
```sql
-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Set journal mode for better concurrency
PRAGMA journal_mode = WAL;

-- Optimize for read-heavy workload
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;
```

## 2. Core Tables

### 2.1 Users Table
```sql
-- Users: Core authentication and profile data
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  
  -- Authentication
  provider TEXT DEFAULT 'google' CHECK(provider IN ('google', 'email')),
  provider_id TEXT,
  password_hash TEXT, -- For future email auth
  
  -- Roles & Permissions
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'moderator')),
  permissions TEXT DEFAULT '[]', -- JSON array of permissions
  
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

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX idx_users_active ON users(is_active, subscription_status);
```

### 2.2 Exams Table
```sql
-- Exams: Certification exam definitions
CREATE TABLE exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Identification
  vendor_id TEXT NOT NULL, -- 'comptia', 'cisco', 'microsoft'
  code TEXT NOT NULL, -- 'N10-008', 'CCNA', 'AZ-900'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  passing_score REAL DEFAULT 0.65 CHECK(passing_score BETWEEN 0 AND 1),
  question_count INTEGER DEFAULT 65,
  time_limit_minutes INTEGER DEFAULT 90,
  
  -- Metadata
  version TEXT, -- '2024.1'
  expires_at TIMESTAMP, -- When exam version expires
  difficulty_level INTEGER DEFAULT 3 CHECK(difficulty_level BETWEEN 1 AND 5),
  prerequisites TEXT, -- JSON array of exam codes
  
  -- Pricing (for future monetization)
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

-- Indexes
CREATE INDEX idx_exams_vendor ON exams(vendor_id, is_active);
CREATE INDEX idx_exams_active ON exams(is_active, is_beta);
```

### 2.3 Objectives Table
```sql
-- Objectives: Exam domains/objectives
CREATE TABLE objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  
  -- Identification
  code TEXT NOT NULL, -- '1.0', '1.1', '1.2'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Weighting
  weight REAL DEFAULT 0.25 CHECK(weight BETWEEN 0 AND 1),
  question_percentage REAL, -- Expected % of questions
  
  -- Hierarchy (for nested objectives)
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_objectives_exam ON objectives(exam_id, is_active);
CREATE INDEX idx_objectives_parent ON objectives(parent_id, sort_order);
```

### 2.4 Questions Table
```sql
-- Questions: The core question bank
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  objective_id INTEGER NOT NULL,
  
  -- Question Content
  text TEXT NOT NULL,
  type TEXT DEFAULT 'multiple_choice' 
    CHECK(type IN ('multiple_choice', 'multi_select', 'true_false', 'drag_drop', 'hotspot')),
  
  -- Answers (JSON format for flexibility)
  -- Format: [{"id": "a", "text": "Answer", "is_correct": true}]
  answers TEXT NOT NULL,
  
  -- Explanation & References
  explanation TEXT,
  reference TEXT, -- 'CompTIA Network+ Study Guide, Chapter 5'
  external_link TEXT, -- URL to documentation
  
  -- Difficulty & Classification
  difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
  tags TEXT DEFAULT '[]', -- JSON array: ["networking", "security", "ports"]
  
  -- AI Generation Tracking
  ai_generated BOOLEAN DEFAULT 0,
  ai_model TEXT, -- 'qwen-2.5-72b'
  ai_prompt_version TEXT, -- 'v1.2'
  ai_confidence_score REAL, -- 0.95
  
  -- Quality Metrics
  review_status TEXT DEFAULT 'pending' 
    CHECK(review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  
  -- Performance Tracking
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  discrimination_index REAL, -- Statistical quality measure
  
  -- Media Attachments (future)
  image_url TEXT,
  diagram_data TEXT, -- JSON for rendering diagrams
  
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

-- Indexes for performance-critical queries
CREATE INDEX idx_questions_exam_objective ON questions(exam_id, objective_id, is_active);
CREATE INDEX idx_questions_difficulty ON questions(exam_id, difficulty, is_active);
CREATE INDEX idx_questions_review ON questions(review_status, ai_generated);
CREATE INDEX idx_questions_performance ON questions(discrimination_index DESC);

-- Full-text search index
CREATE VIRTUAL TABLE questions_fts USING fts5(
  text, 
  explanation,
  reference,
  content=questions,
  content_rowid=id
);

-- Trigger to keep FTS index updated
CREATE TRIGGER questions_fts_insert AFTER INSERT ON questions
BEGIN
  INSERT INTO questions_fts(rowid, text, explanation, reference)
  VALUES (new.id, new.text, new.explanation, new.reference);
END;

CREATE TRIGGER questions_fts_update AFTER UPDATE ON questions
BEGIN
  UPDATE questions_fts 
  SET text = new.text, 
      explanation = new.explanation,
      reference = new.reference
  WHERE rowid = new.id;
END;

CREATE TRIGGER questions_fts_delete AFTER DELETE ON questions
BEGIN
  DELETE FROM questions_fts WHERE rowid = old.id;
END;
```

### 2.5 Study Sessions Table
```sql
-- Study Sessions: Track practice and study sessions
CREATE TABLE study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  
  -- Session Configuration
  mode TEXT DEFAULT 'practice' 
    CHECK(mode IN ('practice', 'review', 'speed_drill', 'weak_areas', 'custom')),
  objectives TEXT, -- JSON array of objective IDs
  difficulty_filter TEXT, -- JSON: {"min": 1, "max": 3}
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
  accuracy REAL, -- Calculated: correct/total
  streak_count INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  
  -- Mastery Tracking (JSON object)
  -- Format: {"obj_1": 0.85, "obj_2": 0.72}
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

-- Indexes
CREATE INDEX idx_sessions_user ON study_sessions(user_id, exam_id, status);
CREATE INDEX idx_sessions_active ON study_sessions(status, last_activity);
CREATE INDEX idx_sessions_performance ON study_sessions(user_id, accuracy DESC);
```

### 2.6 Test Attempts Table
```sql
-- Test Attempts: Formal exam simulations
CREATE TABLE test_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  
  -- Test Configuration
  question_ids TEXT NOT NULL, -- JSON array of question IDs in order
  time_limit_minutes INTEGER,
  passing_score REAL,
  
  -- Results
  score REAL,
  passed BOOLEAN,
  correct_count INTEGER,
  incorrect_count INTEGER,
  skipped_count INTEGER,
  
  -- Detailed Scoring (JSON)
  -- Format: {"obj_1": {"correct": 8, "total": 10}, ...}
  objective_breakdown TEXT,
  
  -- Time Analysis
  total_time_seconds INTEGER,
  time_per_question TEXT, -- JSON array of times
  
  -- Question Review
  review_enabled BOOLEAN DEFAULT 1,
  certificate_issued BOOLEAN DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'in_progress' 
    CHECK(status IN ('in_progress', 'completed', 'abandoned', 'invalidated')),
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP, -- When test access expires
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id, exam_id, status);
CREATE INDEX idx_test_attempts_scores ON test_attempts(exam_id, passed, score DESC);
```

### 2.7 User Answers Table
```sql
-- User Answers: Individual answer tracking
CREATE TABLE user_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  
  -- Session References
  study_session_id INTEGER,
  test_attempt_id INTEGER,
  
  -- Answer Details
  selected_answer TEXT NOT NULL, -- 'a' or '["a", "c"]' for multi-select
  is_correct BOOLEAN NOT NULL,
  
  -- Interaction Metrics
  time_spent_seconds INTEGER,
  confidence_level INTEGER CHECK(confidence_level BETWEEN 1 AND 5),
  flagged BOOLEAN DEFAULT 0,
  changed_answer BOOLEAN DEFAULT 0,
  
  -- Learning Analytics
  attempt_number INTEGER DEFAULT 1, -- Which attempt for this question
  days_since_last_seen INTEGER,
  
  -- Timestamp
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (study_session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (test_attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_user_answers_user_question ON user_answers(user_id, question_id, answered_at DESC);
CREATE INDEX idx_user_answers_session ON user_answers(study_session_id);
CREATE INDEX idx_user_answers_test ON user_answers(test_attempt_id);
CREATE INDEX idx_user_answers_recent ON user_answers(user_id, answered_at DESC);
```

### 2.8 User Progress Table
```sql
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
  
  -- Mastery Levels (JSON)
  -- Format: {"obj_1": {"level": 0.85, "questions_answered": 45}, ...}
  objective_mastery TEXT DEFAULT '{}',
  
  -- Readiness Score (ML-calculated)
  readiness_score REAL DEFAULT 0,
  predicted_exam_score REAL,
  confidence_interval REAL,
  
  -- Weak Areas (JSON array)
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

-- Indexes
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_readiness ON user_progress(exam_id, readiness_score DESC);
```

## 3. Supporting Tables

### 3.1 AI Generation Log
```sql
-- AI Generation Log: Track AI usage and costs
CREATE TABLE ai_generation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Request Details
  purpose TEXT NOT NULL, -- 'question_generation', 'explanation_enhancement'
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Cost Tracking
  cost_cents REAL,
  
  -- Content References
  exam_id INTEGER,
  objective_id INTEGER,
  question_ids TEXT, -- JSON array of generated question IDs
  
  -- Quality Metrics
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  generation_time_ms INTEGER,
  
  -- Metadata
  request_id TEXT,
  user_id INTEGER,
  ip_address TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL,
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_ai_log_date ON ai_generation_log(created_at DESC);
CREATE INDEX idx_ai_log_cost ON ai_generation_log(created_at, cost_cents);
```

### 3.2 Audit Log
```sql
-- Audit Log: Track important actions
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Actor
  user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Action
  action TEXT NOT NULL, -- 'user.login', 'question.create', 'payment.success'
  entity_type TEXT, -- 'user', 'question', 'exam'
  entity_id INTEGER,
  
  -- Details
  old_values TEXT, -- JSON of previous values
  new_values TEXT, -- JSON of new values
  metadata TEXT, -- Additional context
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);
```

## 4. Views for Common Queries

### 4.1 User Dashboard View
```sql
CREATE VIEW user_dashboard AS
SELECT 
  u.id as user_id,
  u.name,
  u.email,
  u.subscription_status,
  e.id as exam_id,
  e.name as exam_name,
  up.total_questions_seen,
  up.overall_accuracy,
  up.readiness_score,
  up.last_study_date,
  up.study_days_count,
  up.tests_taken,
  up.best_score
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id
LEFT JOIN exams e ON up.exam_id = e.id
WHERE u.is_active = 1;
```

### 4.2 Question Performance View
```sql
CREATE VIEW question_performance AS
SELECT 
  q.id,
  q.text,
  q.difficulty,
  e.name as exam_name,
  o.name as objective_name,
  q.total_attempts,
  q.correct_attempts,
  CASE 
    WHEN q.total_attempts > 0 
    THEN CAST(q.correct_attempts AS REAL) / q.total_attempts 
    ELSE 0 
  END as success_rate,
  q.avg_time_seconds,
  q.discrimination_index
FROM questions q
JOIN exams e ON q.exam_id = e.id
JOIN objectives o ON q.objective_id = o.id
WHERE q.is_active = 1;
```

## 5. Migration Scripts

### 5.1 Initial Schema Creation
```typescript
// database/migrations/001_initial_schema.ts
export async function up(db: Database) {
  // Read and execute schema.sql
  const schema = await readFile('database/schema.sql', 'utf-8')
  const statements = schema.split(';').filter(s => s.trim())
  
  for (const statement of statements) {
    await db.execute(statement)
  }
}

export async function down(db: Database) {
  // Drop all tables in reverse order
  const tables = [
    'audit_log',
    'ai_generation_log',
    'user_progress',
    'user_answers',
    'test_attempts',
    'study_sessions',
    'questions_fts',
    'questions',
    'objectives',
    'exams',
    'users'
  ]
  
  for (const table of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${table}`)
  }
}
```

### 5.2 Seed Data
```typescript
// database/seed.ts
export async function seedDatabase(db: Database) {
  // Create default admin user
  await db.execute(`
    INSERT INTO users (email, name, role, subscription_status)
    VALUES ('admin@pingtopass.com', 'Admin', 'admin', 'premium')
  `)
  
  // Create sample exam
  const examResult = await db.execute(`
    INSERT INTO exams (vendor_id, code, name, description)
    VALUES ('comptia', 'N10-008', 'CompTIA Network+', 
            'Validates the knowledge and skills needed to troubleshoot, configure, and manage networks')
    RETURNING id
  `)
  
  const examId = examResult.rows[0].id
  
  // Create objectives
  const objectives = [
    { code: '1.0', name: 'Networking Fundamentals', weight: 0.24 },
    { code: '2.0', name: 'Network Implementations', weight: 0.19 },
    { code: '3.0', name: 'Network Operations', weight: 0.20 },
    { code: '4.0', name: 'Network Security', weight: 0.19 },
    { code: '5.0', name: 'Network Troubleshooting', weight: 0.18 }
  ]
  
  for (const obj of objectives) {
    await db.execute(`
      INSERT INTO objectives (exam_id, code, name, weight)
      VALUES (?, ?, ?, ?)
    `, [examId, obj.code, obj.name, obj.weight])
  }
  
  console.log('Database seeded successfully!')
}
```

## 6. Query Optimization

### 6.1 Common Query Patterns
```sql
-- Get questions for study session (optimized)
SELECT 
  id, text, type, difficulty, answers, objective_id
FROM questions
WHERE 
  exam_id = ?
  AND objective_id IN (SELECT value FROM json_each(?))
  AND difficulty BETWEEN ? AND ?
  AND is_active = 1
  AND id NOT IN (
    SELECT question_id 
    FROM user_answers 
    WHERE user_id = ? 
    AND answered_at > datetime('now', '-24 hours')
  )
ORDER BY RANDOM()
LIMIT ?;

-- Update user progress (single query)
INSERT INTO user_progress (
  user_id, exam_id, total_questions_seen, total_correct, overall_accuracy
)
VALUES (?, ?, 1, ?, ?)
ON CONFLICT(user_id, exam_id) DO UPDATE SET
  total_questions_seen = total_questions_seen + 1,
  total_correct = total_correct + excluded.total_correct,
  overall_accuracy = CAST(total_correct + excluded.total_correct AS REAL) / 
                     (total_questions_seen + 1),
  updated_at = CURRENT_TIMESTAMP;
```

### 6.2 Performance Indexes Summary
```sql
-- Critical indexes for <100ms query performance
-- Questions: Cover all common query patterns
CREATE INDEX idx_questions_main ON questions(exam_id, objective_id, difficulty, is_active);

-- User answers: Fast recent question lookup
CREATE INDEX idx_user_answers_recent ON user_answers(user_id, question_id, answered_at DESC);

-- Sessions: Active session queries
CREATE INDEX idx_sessions_active ON study_sessions(user_id, status, last_activity DESC);

-- Progress: Dashboard queries
CREATE INDEX idx_progress_dashboard ON user_progress(user_id, exam_id);
```

## 7. Maintenance Scripts

### 7.1 Cleanup Old Sessions
```sql
-- Clean up abandoned sessions older than 24 hours
UPDATE study_sessions 
SET status = 'abandoned'
WHERE status = 'active' 
  AND last_activity < datetime('now', '-24 hours');

-- Delete old audit logs (keep 90 days)
DELETE FROM audit_log 
WHERE created_at < datetime('now', '-90 days');
```

### 7.2 Update Statistics
```sql
-- Update question performance metrics
UPDATE questions q
SET 
  total_attempts = (
    SELECT COUNT(*) FROM user_answers WHERE question_id = q.id
  ),
  correct_attempts = (
    SELECT COUNT(*) FROM user_answers WHERE question_id = q.id AND is_correct = 1
  ),
  avg_time_seconds = (
    SELECT AVG(time_spent_seconds) FROM user_answers WHERE question_id = q.id
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE q.id IN (
  SELECT DISTINCT question_id 
  FROM user_answers 
  WHERE answered_at > datetime('now', '-1 day')
);
```

This schema provides:
- **Optimized for edge runtime** with minimal joins
- **JSON fields** for flexible nested data
- **Full-text search** for question content
- **Comprehensive indexes** for sub-100ms queries
- **Audit trail** for compliance
- **Views** for common dashboard queries
- **Migration-friendly** structure