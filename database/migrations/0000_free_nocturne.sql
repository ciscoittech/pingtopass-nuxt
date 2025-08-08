CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`picture` text,
	`provider` text DEFAULT 'google',
	`provider_id` text,
	`password_hash` text,
	`role` text DEFAULT 'user',
	`permissions` text DEFAULT '[]',
	`subscription_status` text DEFAULT 'free',
	`subscription_expires_at` integer,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`bio` text,
	`timezone` text DEFAULT 'UTC',
	`preferred_language` text DEFAULT 'en',
	`last_login` integer,
	`login_count` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`email_verified` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_provider` ON `users` (`provider`,`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_users_stripe` ON `users` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_users_active` ON `users` (`is_active`,`subscription_status`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`passing_score` real DEFAULT 0.65,
	`question_count` integer DEFAULT 65,
	`time_limit_minutes` integer DEFAULT 90,
	`version` text,
	`expires_at` integer,
	`difficulty_level` integer DEFAULT 3,
	`prerequisites` text,
	`price_cents` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`is_beta` integer DEFAULT false,
	`total_attempts` integer DEFAULT 0,
	`pass_rate` real DEFAULT 0,
	`avg_score` real DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exams_vendor_code` ON `exams` (`vendor_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_exams_vendor` ON `exams` (`vendor_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_exams_active` ON `exams` (`is_active`,`is_beta`);--> statement-breakpoint
CREATE INDEX `idx_exams_difficulty` ON `exams` (`difficulty_level`,`is_active`);--> statement-breakpoint
CREATE TABLE `objectives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` real DEFAULT 0.25,
	`question_percentage` real,
	`parent_id` integer,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `objectives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_objectives_exam` ON `objectives` (`exam_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_objectives_parent` ON `objectives` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_objectives_exam_code` ON `objectives` (`exam_id`,`code`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`objective_id` integer NOT NULL,
	`text` text NOT NULL,
	`type` text DEFAULT 'multiple_choice',
	`answers` text NOT NULL,
	`explanation` text,
	`reference` text,
	`external_link` text,
	`difficulty` integer DEFAULT 3,
	`tags` text DEFAULT '[]',
	`ai_generated` integer DEFAULT false,
	`ai_model` text,
	`ai_prompt_version` text,
	`ai_confidence_score` real,
	`review_status` text DEFAULT 'pending',
	`reviewed_by` integer,
	`reviewed_at` integer,
	`total_attempts` integer DEFAULT 0,
	`correct_attempts` integer DEFAULT 0,
	`avg_time_seconds` integer DEFAULT 0,
	`discrimination_index` real,
	`image_url` text,
	`diagram_data` text,
	`is_active` integer DEFAULT true,
	`is_beta` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`objective_id`) REFERENCES `objectives`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_questions_exam_objective` ON `questions` (`exam_id`,`objective_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_questions_difficulty` ON `questions` (`exam_id`,`difficulty`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_questions_review` ON `questions` (`review_status`,`ai_generated`);--> statement-breakpoint
CREATE INDEX `idx_questions_performance` ON `questions` (`discrimination_index`);--> statement-breakpoint
CREATE INDEX `idx_questions_tags` ON `questions` (`tags`);--> statement-breakpoint
CREATE INDEX `idx_questions_active` ON `questions` (`is_active`,`is_beta`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`exam_id` integer NOT NULL,
	`mode` text DEFAULT 'practice',
	`objectives` text,
	`difficulty_filter` text,
	`question_count` integer DEFAULT 20,
	`total_questions` integer DEFAULT 0,
	`correct_answers` integer DEFAULT 0,
	`skipped_questions` integer DEFAULT 0,
	`flagged_questions` integer DEFAULT 0,
	`time_spent_seconds` integer DEFAULT 0,
	`avg_time_per_question` real,
	`accuracy` real,
	`streak_count` integer DEFAULT 0,
	`max_streak` integer DEFAULT 0,
	`objective_scores` text DEFAULT '{}',
	`status` text DEFAULT 'active',
	`current_question_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`last_activity` integer DEFAULT CURRENT_TIMESTAMP,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user_exam` ON `study_sessions` (`user_id`,`exam_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_active` ON `study_sessions` (`status`,`last_activity`);--> statement-breakpoint
CREATE INDEX `idx_sessions_performance` ON `study_sessions` (`user_id`,`accuracy`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_status` ON `study_sessions` (`user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `test_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`exam_id` integer NOT NULL,
	`question_ids` text NOT NULL,
	`time_limit_minutes` integer,
	`passing_score` real,
	`score` real,
	`passed` integer,
	`correct_count` integer,
	`incorrect_count` integer,
	`skipped_count` integer,
	`objective_breakdown` text,
	`total_time_seconds` integer,
	`time_per_question` text,
	`review_enabled` integer DEFAULT true,
	`certificate_issued` integer DEFAULT false,
	`status` text DEFAULT 'in_progress',
	`started_at` integer DEFAULT CURRENT_TIMESTAMP,
	`completed_at` integer,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_test_attempts_user_exam` ON `test_attempts` (`user_id`,`exam_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_test_attempts_scores` ON `test_attempts` (`exam_id`,`passed`,`score`);--> statement-breakpoint
CREATE INDEX `idx_test_attempts_status` ON `test_attempts` (`status`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_test_attempts_user_passed` ON `test_attempts` (`user_id`,`passed`,`score`);--> statement-breakpoint
CREATE INDEX `idx_test_attempts_completed` ON `test_attempts` (`completed_at`);--> statement-breakpoint
CREATE TABLE `user_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`study_session_id` integer,
	`test_attempt_id` integer,
	`selected_answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`time_spent_seconds` integer,
	`confidence_level` integer,
	`flagged` integer DEFAULT false,
	`changed_answer` integer DEFAULT false,
	`attempt_number` integer DEFAULT 1,
	`days_since_last_seen` integer,
	`answered_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_attempt_id`) REFERENCES `test_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_answers_user_question` ON `user_answers` (`user_id`,`question_id`,`answered_at`);--> statement-breakpoint
CREATE INDEX `idx_user_answers_session` ON `user_answers` (`study_session_id`);--> statement-breakpoint
CREATE INDEX `idx_user_answers_test` ON `user_answers` (`test_attempt_id`);--> statement-breakpoint
CREATE INDEX `idx_user_answers_recent` ON `user_answers` (`user_id`,`answered_at`);--> statement-breakpoint
CREATE INDEX `idx_user_answers_correct` ON `user_answers` (`user_id`,`is_correct`,`answered_at`);--> statement-breakpoint
CREATE INDEX `idx_user_answers_performance` ON `user_answers` (`question_id`,`is_correct`,`time_spent_seconds`);--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`exam_id` integer NOT NULL,
	`total_questions_seen` integer DEFAULT 0,
	`unique_questions_seen` integer DEFAULT 0,
	`total_correct` integer DEFAULT 0,
	`total_incorrect` integer DEFAULT 0,
	`overall_accuracy` real DEFAULT 0,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`avg_time_per_question` real,
	`total_study_minutes` integer DEFAULT 0,
	`last_study_date` text,
	`study_days_count` integer DEFAULT 0,
	`objective_mastery` text DEFAULT '{}',
	`readiness_score` real DEFAULT 0,
	`predicted_exam_score` real,
	`confidence_interval` real,
	`weak_topics` text DEFAULT '[]',
	`recommended_objectives` text DEFAULT '[]',
	`tests_taken` integer DEFAULT 0,
	`tests_passed` integer DEFAULT 0,
	`best_score` real DEFAULT 0,
	`avg_test_score` real DEFAULT 0,
	`last_test_date` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_progress_user_exam` ON `user_progress` (`user_id`,`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_user_progress_user` ON `user_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_progress_readiness` ON `user_progress` (`exam_id`,`readiness_score`);--> statement-breakpoint
CREATE INDEX `idx_user_progress_accuracy` ON `user_progress` (`exam_id`,`overall_accuracy`);--> statement-breakpoint
CREATE INDEX `idx_user_progress_streak` ON `user_progress` (`exam_id`,`longest_streak`);--> statement-breakpoint
CREATE INDEX `idx_user_progress_study_time` ON `user_progress` (`exam_id`,`total_study_minutes`);--> statement-breakpoint
CREATE TABLE `engagement_opportunities` (
	`id` text PRIMARY KEY DEFAULT lower(hex(randomblob(16))) NOT NULL,
	`tweet_id` text NOT NULL,
	`account_id` text NOT NULL,
	`opportunity_type` text,
	`relevance_score` real,
	`suggested_response` text,
	`ai_model_used` text,
	`ai_cost` real,
	`status` text DEFAULT 'pending',
	`executed_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tweet_id`) REFERENCES `tweets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `twitter_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_opportunities_status` ON `engagement_opportunities` (`status`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_created` ON `engagement_opportunities` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_relevance` ON `engagement_opportunities` (`relevance_score`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_status_created` ON `engagement_opportunities` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_tweet` ON `engagement_opportunities` (`tweet_id`);--> statement-breakpoint
CREATE TABLE `growth_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`followers_count` integer,
	`following_count` integer,
	`new_followers` integer,
	`lost_followers` integer,
	`tweets_sent` integer,
	`engagements_made` integer,
	`impressions` integer,
	`profile_visits` integer,
	`engagement_rate` real,
	`ai_costs` real,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `growth_metrics_date_unique` ON `growth_metrics` (`date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_date` ON `growth_metrics` (`date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_followers` ON `growth_metrics` (`date`,`new_followers`);--> statement-breakpoint
CREATE INDEX `idx_metrics_costs` ON `growth_metrics` (`date`,`ai_costs`);--> statement-breakpoint
CREATE TABLE `tweets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`text` text NOT NULL,
	`metrics` text,
	`entities` text,
	`ai_analysis` text,
	`created_at` integer,
	`analyzed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `twitter_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tweets_account` ON `tweets` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_tweets_created` ON `tweets` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tweets_analyzed` ON `tweets` (`analyzed_at`);--> statement-breakpoint
CREATE INDEX `idx_tweets_account_created` ON `tweets` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `twitter_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`bio` text,
	`followers_count` integer DEFAULT 0,
	`following_count` integer DEFAULT 0,
	`tweet_count` integer DEFAULT 0,
	`is_own_account` integer DEFAULT false,
	`is_competitor` integer DEFAULT false,
	`is_target_audience` integer DEFAULT false,
	`last_analyzed_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twitter_accounts_username_unique` ON `twitter_accounts` (`username`);--> statement-breakpoint
CREATE INDEX `idx_twitter_accounts_username` ON `twitter_accounts` (`username`);--> statement-breakpoint
CREATE INDEX `idx_twitter_accounts_own` ON `twitter_accounts` (`is_own_account`);--> statement-breakpoint
CREATE INDEX `idx_twitter_accounts_target` ON `twitter_accounts` (`is_target_audience`,`last_analyzed_at`);--> statement-breakpoint
CREATE INDEX `idx_twitter_accounts_competitor` ON `twitter_accounts` (`is_competitor`,`last_analyzed_at`);--> statement-breakpoint
CREATE TABLE `voice_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tone` text,
	`topics` text,
	`vocabulary` text,
	`examples` text,
	`voice_data` text,
	`is_active` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_voice_profiles_active` ON `voice_profiles` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_voice_profiles_name` ON `voice_profiles` (`name`);--> statement-breakpoint
CREATE TABLE `ai_generation_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purpose` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`cost_cents` real,
	`exam_id` integer,
	`objective_id` integer,
	`question_ids` text,
	`tweet_id` text,
	`opportunity_id` text,
	`success` integer DEFAULT true,
	`error_message` text,
	`generation_time_ms` integer,
	`request_id` text,
	`user_id` integer,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`objective_id`) REFERENCES `objectives`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_ai_log_date` ON `ai_generation_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_log_cost` ON `ai_generation_log` (`created_at`,`cost_cents`);--> statement-breakpoint
CREATE INDEX `idx_ai_log_purpose` ON `ai_generation_log` (`purpose`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_log_model` ON `ai_generation_log` (`model`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_log_user` ON `ai_generation_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_log_success` ON `ai_generation_log` (`success`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`ip_address` text,
	`user_agent` text,
	`session_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`old_values` text,
	`new_values` text,
	`metadata` text,
	`request_id` text,
	`method` text,
	`path` text,
	`success` integer DEFAULT true,
	`error_code` text,
	`error_message` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_user` ON `audit_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_entity` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_action` ON `audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_date` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_session` ON `audit_log` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_success` ON `audit_log` (`success`,`created_at`);