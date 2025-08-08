-- PingToPass Database Performance Optimization
-- Critical indexes for <200ms global performance target
-- Optimized for Turso SQLite edge runtime

-- ====================
-- STUDY QUERIES OPTIMIZATION (Target: <50ms)
-- ====================

-- Critical composite index for study question retrieval
-- Supports exam_id + objective_id + difficulty + is_active filtering
CREATE INDEX IF NOT EXISTS idx_questions_study_optimized 
ON questions (exam_id, objective_id, difficulty, is_active, review_status) 
WHERE is_active = 1 AND review_status = 'approved';

-- Covering index for question selection with all needed fields
-- Avoids additional table lookups for question data
CREATE INDEX IF NOT EXISTS idx_questions_study_covering 
ON questions (exam_id, difficulty, is_active) 
INCLUDE (id, text, type, answers, explanation, reference, tags, objective_id)
WHERE is_active = 1;

-- Optimized index for recent question exclusion
-- Replaces expensive NOT IN operations with efficient date range queries
CREATE INDEX IF NOT EXISTS idx_user_answers_recent_optimized 
ON user_answers (user_id, answered_at DESC, question_id) 
WHERE answered_at > datetime('now', '-30 days');

-- Index for question performance statistics updates
CREATE INDEX IF NOT EXISTS idx_questions_stats_update 
ON questions (id, total_attempts, correct_attempts, avg_time_seconds);

-- ====================  
-- PROGRESS TRACKING OPTIMIZATION (Target: <100ms)
-- ====================

-- Session progress calculation optimization
CREATE INDEX IF NOT EXISTS idx_user_answers_session_calc 
ON user_answers (study_session_id, is_correct, time_spent_seconds, question_id);

-- User progress lookup optimization  
CREATE INDEX IF NOT EXISTS idx_user_progress_lookup 
ON user_progress (user_id, exam_id) 
INCLUDE (overall_accuracy, readiness_score, total_study_minutes);

-- Leaderboard query optimization
CREATE INDEX IF NOT EXISTS idx_user_progress_leaderboard 
ON user_progress (exam_id, readiness_score DESC, total_questions_seen) 
WHERE total_questions_seen > 50;

-- ====================
-- TWITTER ANALYTICS OPTIMIZATION (Target: <150ms)  
-- ====================

-- Engagement opportunities priority queue
CREATE INDEX IF NOT EXISTS idx_opportunities_priority_queue 
ON engagement_opportunities (status, relevance_score DESC, created_at DESC) 
WHERE status = 'pending';

-- Growth metrics time-series optimization
CREATE INDEX IF NOT EXISTS idx_growth_metrics_timeseries 
ON growth_metrics (date DESC) 
INCLUDE (new_followers, ai_costs, engagement_rate);

-- Tweet analysis performance
CREATE INDEX IF NOT EXISTS idx_tweets_analysis_perf 
ON tweets (account_id, created_at DESC) 
INCLUDE (text, metrics, ai_analysis);

-- ====================
-- FULL-TEXT SEARCH OPTIMIZATION
-- ====================

-- Virtual FTS5 table for question content search
CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
  content=questions,
  text,
  explanation,
  reference,
  content_rowid=id
);

-- Populate FTS index with existing questions
INSERT INTO questions_fts(rowid, text, explanation, reference)
SELECT id, text, COALESCE(explanation, ''), COALESCE(reference, '')
FROM questions 
WHERE is_active = 1;

-- FTS triggers to keep search index synchronized
CREATE TRIGGER IF NOT EXISTS questions_fts_insert AFTER INSERT ON questions BEGIN
  INSERT INTO questions_fts(rowid, text, explanation, reference) 
  VALUES (new.id, new.text, COALESCE(new.explanation, ''), COALESCE(new.reference, ''));
END;

CREATE TRIGGER IF NOT EXISTS questions_fts_update AFTER UPDATE ON questions BEGIN
  UPDATE questions_fts SET 
    text = new.text, 
    explanation = COALESCE(new.explanation, ''), 
    reference = COALESCE(new.reference, '')
  WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS questions_fts_delete AFTER DELETE ON questions BEGIN
  DELETE FROM questions_fts WHERE rowid = old.id;
END;

-- ====================
-- SQLITE PERFORMANCE TUNING
-- ====================

-- Optimize SQLite for read-heavy workload
PRAGMA journal_mode = WAL;              -- Write-Ahead Logging for better concurrency
PRAGMA synchronous = NORMAL;            -- Balance durability vs performance  
PRAGMA cache_size = 10000;             -- 40MB cache (4KB * 10000 pages)
PRAGMA temp_store = memory;            -- Store temporary tables in memory
PRAGMA mmap_size = 268435456;          -- 256MB memory-mapped I/O

-- Enable query planner optimizations
PRAGMA optimize;                       -- Update index statistics
PRAGMA analysis_limit = 1000;         -- Analyze up to 1000 rows per index

-- Foreign key performance (already enabled in schema)
PRAGMA foreign_keys = ON;

-- ====================
-- PERFORMANCE MONITORING VIEWS  
-- ====================

-- View for monitoring slow queries
CREATE VIEW IF NOT EXISTS v_performance_monitor AS
SELECT 
  'questions' as table_name,
  COUNT(*) as total_records,
  AVG(total_attempts) as avg_attempts,
  MAX(total_attempts) as max_attempts,
  COUNT(CASE WHEN total_attempts > 100 THEN 1 END) as high_usage_questions
FROM questions
WHERE is_active = 1

UNION ALL

SELECT 
  'user_answers' as table_name,
  COUNT(*) as total_records, 
  AVG(time_spent_seconds) as avg_time,
  MAX(time_spent_seconds) as max_time,
  COUNT(CASE WHEN time_spent_seconds > 300 THEN 1 END) as slow_answers
FROM user_answers;

-- View for index usage statistics  
CREATE VIEW IF NOT EXISTS v_index_usage AS
SELECT 
  name as index_name,
  tbl_name as table_name,
  sql as definition
FROM sqlite_master 
WHERE type = 'index' 
AND name NOT LIKE 'sqlite_%'
ORDER BY tbl_name, name;

-- ====================
-- MAINTENANCE PROCEDURES
-- ====================

-- Cleanup old user answers (beyond 90 days) to maintain performance
-- Run periodically via scheduled job
CREATE VIEW IF NOT EXISTS v_cleanup_candidates AS
SELECT COUNT(*) as old_answers_count
FROM user_answers 
WHERE answered_at < datetime('now', '-90 days');

-- Index maintenance - run weekly
-- VACUUM; -- Reclaim space and defragment
-- ANALYZE; -- Update query planner statistics
-- PRAGMA optimize; -- Apply automatic optimizations

-- ====================
-- PERFORMANCE VALIDATION QUERIES
-- ====================

-- Test critical query performance
-- Study questions query (target: <50ms)
EXPLAIN QUERY PLAN
SELECT id, text, type, answers, difficulty, objective_id, explanation 
FROM questions 
WHERE exam_id = 1 
AND objective_id IN (1, 2, 3)
AND difficulty BETWEEN 2 AND 4 
AND is_active = 1
AND review_status = 'approved'
AND id NOT IN (
  SELECT DISTINCT question_id 
  FROM user_answers 
  WHERE user_id = 1 
  AND answered_at > datetime('now', '-24 hours')
)
ORDER BY RANDOM() 
LIMIT 20;

-- User progress query (target: <100ms)  
EXPLAIN QUERY PLAN
SELECT up.*, u.name, u.picture
FROM user_progress up
JOIN users u ON up.user_id = u.id  
WHERE up.exam_id = 1
AND up.total_questions_seen > 50
ORDER BY up.readiness_score DESC
LIMIT 10;