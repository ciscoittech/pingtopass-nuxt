# MongoDB Schema Design - Optimized for Fast Question Delivery

## 1. Database Architecture Overview

### Design Principles
- **Denormalization** for read performance
- **Strategic indexing** for <100ms query times
- **Document embedding** where 1:1 or 1:few relationships exist
- **Reference pattern** for 1:many relationships
- **Aggregation pipelines** for complex analytics

### Collections Structure
```
pingtopass_db/
├── users                 # User accounts and authentication
├── exams                 # Exam definitions and metadata
├── objectives           # Exam objectives/topics
├── questions            # Question bank (optimized for speed)
├── study_sessions       # Study progress tracking
├── test_sessions        # Test attempts and scores
├── user_progress        # Denormalized progress data
├── question_analytics   # Question performance metrics
└── ai_generations       # AI-generated content tracking
```

## 2. Core Collections Schema

### 2.1 Questions Collection (Performance Critical)
```javascript
{
  "_id": ObjectId("..."),
  "exam_id": "507f1f77bcf86cd799439011",      // Indexed
  "objective_id": "507f1f77bcf86cd799439012",  // Indexed
  "vendor_id": "comptia",                      // Indexed
  
  // Question content
  "text": "Which TCP port does HTTPS use by default?",
  "type": "multiple_choice",                   // multiple_choice, multi_select, true_false
  "difficulty": 2,                              // 1-5 scale, indexed
  
  // Answers array with embedded correct indicator
  "answers": [
    {
      "id": "a1",
      "text": "Port 80",
      "is_correct": false
    },
    {
      "id": "a2", 
      "text": "Port 443",
      "is_correct": true
    },
    {
      "id": "a3",
      "text": "Port 8080", 
      "is_correct": false
    },
    {
      "id": "a4",
      "text": "Port 22",
      "is_correct": false
    }
  ],
  
  // Explanation and metadata
  "explanation": "HTTPS uses port 443 by default for secure HTTP traffic...",
  "reference": "CompTIA Network+ N10-008 Objective 1.5",
  "tags": ["networking", "ports", "security", "protocols"],  // Indexed for filtering
  
  // Performance tracking
  "statistics": {
    "attempts": 15234,
    "correct_count": 11426,
    "success_rate": 0.75,
    "avg_time_seconds": 45,
    "last_updated": ISODate("2024-01-15T10:00:00Z")
  },
  
  // Quality control
  "status": "active",                          // active, review, retired - Indexed
  "created_by": "user_id",
  "created_at": ISODate("2024-01-01T10:00:00Z"),
  "updated_at": ISODate("2024-01-15T10:00:00Z"),
  "version": 2,
  
  // AI generation tracking
  "ai_generated": false,
  "ai_model": null,
  "generation_prompt": null
}

// Compound Indexes for Performance
db.questions.createIndex({ "exam_id": 1, "objective_id": 1, "difficulty": 1 })  // Primary query pattern
db.questions.createIndex({ "exam_id": 1, "status": 1 })                         // Active questions by exam
db.questions.createIndex({ "tags": 1 })                                         // Tag-based filtering
db.questions.createIndex({ "vendor_id": 1, "exam_id": 1 })                     // Vendor navigation
db.questions.createIndex({ "statistics.success_rate": 1 })                     // Analytics queries
db.questions.createIndex({ "created_at": -1 })                                 // Recent questions
```

### 2.2 Users Collection
```javascript
{
  "_id": ObjectId("..."),
  "email": "user@example.com",                // Unique index
  "username": "john_doe",                     // Unique index
  
  // OAuth integration
  "auth_provider": "google",
  "provider_id": "google_oauth_id",
  "profile": {
    "name": "John Doe",
    "picture": "https://...",
    "bio": "IT Professional studying for certifications",
    "location": "San Francisco, CA",
    "company": "Tech Corp"
  },
  
  // Subscription and access
  "subscription": {
    "tier": "premium",                        // free, premium, enterprise
    "valid_until": ISODate("2024-12-31T23:59:59Z"),
    "auto_renew": true,
    "payment_method": "stripe_pm_..."
  },
  
  // Preferences
  "preferences": {
    "study_reminder": true,
    "reminder_time": "19:00",
    "timezone": "America/Los_Angeles",
    "theme": "dark",
    "question_timer": true,
    "show_explanations": "always"             // always, after_answer, after_test
  },
  
  // Gamification
  "achievements": {
    "level": 12,
    "xp": 4580,
    "streak_days": 15,
    "badges": ["early_bird", "perfectionist", "speed_demon"],
    "total_questions_answered": 2456,
    "total_study_time_minutes": 8934
  },
  
  // Activity tracking
  "last_activity": ISODate("2024-01-20T15:30:00Z"),
  "created_at": ISODate("2023-06-15T10:00:00Z"),
  "email_verified": true,
  "is_active": true
}

// Indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "auth_provider": 1, "provider_id": 1 })
db.users.createIndex({ "last_activity": -1 })
```

### 2.3 Study Sessions Collection
```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),                 // Indexed
  "exam_id": ObjectId("..."),                 // Indexed
  
  // Session configuration
  "mode": "practice",                         // practice, review, speed_drill
  "objectives": ["obj_id_1", "obj_id_2"],
  "difficulty_filter": null,                  // null or [1,2,3]
  
  // Progress tracking
  "questions_answered": [
    {
      "question_id": ObjectId("..."),
      "objective_id": "obj_id_1",
      "answered_at": ISODate("2024-01-20T10:15:00Z"),
      "is_correct": true,
      "user_answer": "a2",
      "time_spent_seconds": 35,
      "confidence_level": 4                   // 1-5 scale
    }
    // ... more answers
  ],
  
  // Aggregate metrics
  "metrics": {
    "total_questions": 45,
    "correct_answers": 38,
    "accuracy": 0.844,
    "avg_time_per_question": 42,
    "objectives_mastery": {
      "obj_id_1": 0.85,
      "obj_id_2": 0.78
    }
  },
  
  // Session state
  "status": "active",                         // active, paused, completed
  "started_at": ISODate("2024-01-20T10:00:00Z"),
  "last_activity": ISODate("2024-01-20T10:45:00Z"),
  "completed_at": null,
  "duration_minutes": 45
}

// Indexes
db.study_sessions.createIndex({ "user_id": 1, "exam_id": 1, "status": 1 })
db.study_sessions.createIndex({ "user_id": 1, "started_at": -1 })
db.study_sessions.createIndex({ "status": 1, "last_activity": 1 })  // For cleanup jobs
```

### 2.4 Test Sessions Collection
```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "exam_id": ObjectId("..."),
  
  // Test configuration
  "test_config": {
    "question_count": 65,
    "time_limit_minutes": 90,
    "passing_score": 0.65,
    "question_distribution": {               // Questions per objective
      "obj_1": 10,
      "obj_2": 15,
      "obj_3": 20,
      "obj_4": 20
    }
  },
  
  // Question selection (store for review)
  "questions": [
    {
      "question_id": ObjectId("..."),
      "objective_id": "obj_1",
      "order": 1
    }
    // ... 65 questions total
  ],
  
  // User answers
  "answers": {
    "q_id_1": {
      "selected": "a2",
      "is_correct": true,
      "time_spent": 45,
      "flagged": false,
      "changed_answer": false
    }
    // ... answers keyed by question_id for O(1) lookup
  },
  
  // Results
  "results": {
    "score": 0.723,
    "passed": true,
    "correct_count": 47,
    "total_questions": 65,
    "time_taken_minutes": 67,
    "objectives_breakdown": {
      "obj_1": { "correct": 8, "total": 10, "percentage": 0.80 },
      "obj_2": { "correct": 10, "total": 15, "percentage": 0.67 },
      "obj_3": { "correct": 15, "total": 20, "percentage": 0.75 },
      "obj_4": { "correct": 14, "total": 20, "percentage": 0.70 }
    }
  },
  
  // Test state
  "status": "completed",                      // in_progress, completed, abandoned
  "started_at": ISODate("2024-01-20T14:00:00Z"),
  "completed_at": ISODate("2024-01-20T15:07:00Z"),
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}

// Indexes
db.test_sessions.createIndex({ "user_id": 1, "exam_id": 1, "started_at": -1 })
db.test_sessions.createIndex({ "status": 1, "started_at": -1 })
db.test_sessions.createIndex({ "results.score": -1 })  // Leaderboard queries
```

### 2.5 User Progress Collection (Denormalized for Dashboard)
```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),                 // Unique index
  "exam_id": ObjectId("..."),
  
  // Overall progress
  "overall": {
    "total_questions_seen": 856,
    "unique_questions_seen": 412,
    "total_correct": 698,
    "overall_accuracy": 0.815,
    "estimated_readiness": 0.78,              // ML-calculated readiness score
    "predicted_score": 0.72,
    "study_time_hours": 45.5,
    "last_studied": ISODate("2024-01-20T15:30:00Z")
  },
  
  // Per-objective breakdown
  "objectives": {
    "obj_1": {
      "name": "Network Fundamentals",
      "questions_answered": 145,
      "correct_answers": 126,
      "accuracy": 0.869,
      "mastery_level": 0.85,                  // Spaced repetition algorithm
      "weak_topics": ["subnetting", "OSI model"],
      "last_reviewed": ISODate("2024-01-19T10:00:00Z"),
      "review_due": ISODate("2024-01-25T10:00:00Z")  // Spaced repetition schedule
    }
    // ... other objectives
  },
  
  // Historical performance
  "history": {
    "daily_stats": [                          // Last 30 days
      {
        "date": ISODate("2024-01-20T00:00:00Z"),
        "questions_answered": 45,
        "correct": 38,
        "study_time_minutes": 67,
        "objectives_covered": ["obj_1", "obj_2"]
      }
      // ... 30 entries
    ],
    "test_scores": [                          // Last 10 tests
      {
        "date": ISODate("2024-01-20T14:00:00Z"),
        "score": 0.723,
        "passed": true
      }
      // ... up to 10 entries
    ]
  },
  
  // Recommendations (AI-generated)
  "recommendations": {
    "focus_objectives": ["obj_2", "obj_3"],
    "suggested_difficulty": 3,
    "daily_question_target": 50,
    "estimated_ready_date": ISODate("2024-02-15T00:00:00Z"),
    "weak_areas": [
      {
        "topic": "Subnetting",
        "accuracy": 0.62,
        "priority": "high",
        "suggested_questions": [ObjectId("..."), ObjectId("...")]
      }
    ]
  },
  
  "updated_at": ISODate("2024-01-20T15:30:00Z")
}

// Indexes
db.user_progress.createIndex({ "user_id": 1, "exam_id": 1 }, { unique: true })
db.user_progress.createIndex({ "overall.estimated_readiness": -1 })
db.user_progress.createIndex({ "updated_at": -1 })
```

## 3. Aggregation Pipelines for Analytics

### 3.1 Get User Dashboard Data (Single Query)
```javascript
db.user_progress.aggregate([
  { $match: { user_id: ObjectId("..."), exam_id: ObjectId("...") } },
  
  // Join with recent study sessions
  { $lookup: {
    from: "study_sessions",
    let: { userId: "$user_id", examId: "$exam_id" },
    pipeline: [
      { $match: {
        $expr: {
          $and: [
            { $eq: ["$user_id", "$$userId"] },
            { $eq: ["$exam_id", "$$examId"] },
            { $gte: ["$started_at", new Date(Date.now() - 7*24*60*60*1000)] }  // Last 7 days
          ]
        }
      }},
      { $limit: 5 },
      { $project: {
        started_at: 1,
        metrics: 1,
        duration_minutes: 1
      }}
    ],
    as: "recent_sessions"
  }},
  
  // Join with recent test scores
  { $lookup: {
    from: "test_sessions",
    let: { userId: "$user_id", examId: "$exam_id" },
    pipeline: [
      { $match: {
        $expr: {
          $and: [
            { $eq: ["$user_id", "$$userId"] },
            { $eq: ["$exam_id", "$$examId"] },
            { $eq: ["$status", "completed"] }
          ]
        }
      }},
      { $sort: { completed_at: -1 } },
      { $limit: 3 },
      { $project: {
        completed_at: 1,
        "results.score": 1,
        "results.passed": 1
      }}
    ],
    as: "recent_tests"
  }},
  
  // Calculate streak
  { $lookup: {
    from: "study_sessions",
    let: { userId: "$user_id" },
    pipeline: [
      { $match: {
        $expr: {
          $and: [
            { $eq: ["$user_id", "$$userId"] },
            { $gte: ["$started_at", new Date(Date.now() - 30*24*60*60*1000)] }
          ]
        }
      }},
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$started_at" } },
        studied: { $sum: 1 }
      }},
      { $sort: { _id: -1 } }
    ],
    as: "study_days"
  }},
  
  // Add calculated fields
  { $addFields: {
    current_streak: { 
      $size: { 
        $filter: {
          input: "$study_days",
          as: "day",
          cond: { /* Calculate consecutive days logic */ }
        }
      }
    },
    improvement_rate: {
      $cond: {
        if: { $gte: [{ $size: "$recent_tests" }, 2] },
        then: {
          $subtract: [
            { $arrayElemAt: ["$recent_tests.results.score", 0] },
            { $arrayElemAt: ["$recent_tests.results.score", 1] }
          ]
        },
        else: 0
      }
    }
  }}
])
```

### 3.2 Question Performance Analytics
```javascript
db.questions.aggregate([
  { $match: { exam_id: ObjectId("...") } },
  
  // Group by objective
  { $group: {
    _id: "$objective_id",
    total_questions: { $sum: 1 },
    avg_success_rate: { $avg: "$statistics.success_rate" },
    avg_time: { $avg: "$statistics.avg_time_seconds" },
    total_attempts: { $sum: "$statistics.attempts" },
    difficulty_distribution: {
      $push: {
        difficulty: "$difficulty",
        success_rate: "$statistics.success_rate"
      }
    }
  }},
  
  // Calculate difficulty balance
  { $addFields: {
    difficulty_counts: {
      $reduce: {
        input: "$difficulty_distribution",
        initialValue: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        in: {
          $mergeObjects: [
            "$$value",
            { $literal: { /* Increment logic */ } }
          ]
        }
      }
    }
  }},
  
  // Join with objectives for names
  { $lookup: {
    from: "objectives",
    localField: "_id",
    foreignField: "_id",
    as: "objective_info"
  }},
  
  { $unwind: "$objective_info" },
  
  // Final projection
  { $project: {
    objective_name: "$objective_info.name",
    total_questions: 1,
    avg_success_rate: 1,
    avg_time: 1,
    total_attempts: 1,
    difficulty_balance: "$difficulty_counts",
    needs_more_questions: {
      $cond: {
        if: { $lt: ["$total_questions", 50] },
        then: true,
        else: false
      }
    }
  }}
])
```

## 4. Optimization Strategies

### 4.1 Query Optimization Patterns
```javascript
// FAST: Using compound index
db.questions.find({
  exam_id: ObjectId("..."),
  objective_id: { $in: ["obj1", "obj2"] },
  difficulty: { $lte: 3 },
  status: "active"
})
.limit(65)
.hint({ exam_id: 1, objective_id: 1, difficulty: 1 })

// SLOW: Without proper indexing
db.questions.find({
  $or: [
    { exam_id: ObjectId("...") },
    { tags: "networking" }
  ],
  explanation: /port/i  // Regex on non-indexed field
})
```

### 4.2 Caching Strategy
```javascript
// Frequently accessed data to cache:
{
  // User dashboard data - Cache for 5 minutes
  "cache:dashboard:{user_id}:{exam_id}": {
    ttl: 300,
    data: { /* Aggregated dashboard data */ }
  },
  
  // Question pools by exam/objective - Cache for 10 minutes
  "cache:questions:{exam_id}:{objective_ids_hash}": {
    ttl: 600,
    data: [ /* Array of questions */ ]
  },
  
  // User's recent answers - Cache for 1 hour
  "cache:recent:{user_id}": {
    ttl: 3600,
    data: [ /* Recent question IDs */ ]
  },
  
  // Exam metadata - Cache for 1 hour
  "cache:exam:{exam_id}": {
    ttl: 3600,
    data: { /* Exam details with objectives */ }
  }
}
```

### 4.3 Bulk Operations
```javascript
// Bulk insert questions
db.questions.bulkWrite([
  { insertOne: { document: { /* question 1 */ } } },
  { insertOne: { document: { /* question 2 */ } } },
  // ... up to 1000 operations
], { ordered: false })

// Bulk update statistics after test
db.questions.bulkWrite(
  testQuestions.map(q => ({
    updateOne: {
      filter: { _id: q.question_id },
      update: {
        $inc: {
          "statistics.attempts": 1,
          "statistics.correct_count": q.is_correct ? 1 : 0
        }
      }
    }
  }))
)
```

## 5. Data Migration Patterns

### 5.1 From Relational to MongoDB
```javascript
// Transform normalized relational data
// SQL Tables: exams, objectives, questions, answers
// To MongoDB embedded documents

// Migration script
async function migrateQuestions() {
  const questions = await sql.query(`
    SELECT q.*, 
           GROUP_CONCAT(a.id, ':', a.text, ':', a.is_correct) as answers
    FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id
    GROUP BY q.id
  `);
  
  const documents = questions.map(q => ({
    _id: new ObjectId(),
    exam_id: q.exam_id.toString(),
    objective_id: q.objective_id.toString(),
    text: q.text,
    answers: q.answers.split(',').map(a => {
      const [id, text, is_correct] = a.split(':');
      return { id, text, is_correct: is_correct === '1' };
    }),
    // ... other fields
  }));
  
  await db.questions.insertMany(documents);
}
```

## 6. Performance Benchmarks

### Target Query Performance
| Query Type | Target Time | Actual (Indexed) |
|------------|------------|------------------|
| Single question by ID | <10ms | 3-5ms |
| 65 questions for test | <100ms | 45-70ms |
| User dashboard aggregate | <200ms | 120-150ms |
| Objective analytics | <300ms | 180-220ms |
| Search by tags | <50ms | 20-35ms |

### Index Impact
```javascript
// Before indexing
db.questions.find({ exam_id: "...", objective_id: "..." }).explain("executionStats")
// executionTimeMillis: 450ms, docsExamined: 15000

// After compound index
db.questions.find({ exam_id: "...", objective_id: "..." }).explain("executionStats")
// executionTimeMillis: 12ms, docsExamined: 65
```

This schema design ensures optimal performance for the PingToPass platform with sub-100ms question delivery times through strategic indexing, denormalization, and caching strategies.