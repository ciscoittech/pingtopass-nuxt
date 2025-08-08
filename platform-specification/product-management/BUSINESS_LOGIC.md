# Business Logic & Rules

## Core Scoring Algorithms

### **Test Scoring System**

#### **Weighted Objective Scoring**
The scoring algorithm implements weighted scoring based on official exam blueprints:

```python
def calculate_exam_score(user_answers, questions, exam_blueprint):
    """
    Calculate weighted exam score based on objective performance
    
    Args:
        user_answers: Dict of {question_id: selected_answer}
        questions: List of Question objects with objectives
        exam_blueprint: Dict of {objective_id: weight_percentage}
    
    Returns:
        dict: {
            'total_score': float,
            'passing_score': 65.0,
            'passed': bool,
            'objective_scores': dict,
            'percentile_rank': float
        }
    """
    
    objective_performance = {}
    
    # Calculate performance by objective
    for objective_id, weight in exam_blueprint.items():
        objective_questions = [q for q in questions if q.objective_id == objective_id]
        correct_answers = sum(1 for q in objective_questions 
                            if user_answers.get(q.id) == q.correct_answer)
        total_questions = len(objective_questions)
        
        if total_questions > 0:
            objective_score = (correct_answers / total_questions) * 100
            objective_performance[objective_id] = {
                'score': objective_score,
                'weight': weight,
                'questions_correct': correct_answers,
                'questions_total': total_questions
            }
    
    # Calculate weighted total score
    weighted_score = sum(
        (perf['score'] * perf['weight'] / 100) 
        for perf in objective_performance.values()
    )
    
    return {
        'total_score': round(weighted_score, 1),
        'passing_score': 65.0,
        'passed': weighted_score >= 65.0,
        'objective_scores': objective_performance,
        'percentile_rank': calculate_percentile_rank(weighted_score)
    }
```

**Business Rules:**
- Passing score: 65% (industry standard for most certifications)
- Objective weights follow official exam blueprints
- Minimum questions per objective: 3 (for statistical validity)
- Score precision: 1 decimal place
- Percentile ranking updated daily

---

### **Study Session Scoring**

#### **Mastery Calculation**
```python
def calculate_mastery_level(user_performance, objective_id):
    """
    Calculate mastery level for specific objective based on performance history
    
    Mastery Levels:
    - 0-30%: Beginner (Red)
    - 31-60%: Developing (Yellow) 
    - 61-80%: Proficient (Blue)
    - 81-95%: Advanced (Green)
    - 96-100%: Expert (Gold)
    
    Args:
        user_performance: Recent question attempts for objective
        objective_id: Target objective ID
        
    Returns:
        dict: {
            'mastery_percentage': float,
            'mastery_level': str,
            'confidence_interval': tuple,
            'questions_needed': int
        }
    """
    
    recent_attempts = user_performance.filter(
        objective_id=objective_id,
        created_at__gte=datetime.now() - timedelta(days=30)
    ).order_by('-created_at')[:50]  # Last 50 attempts or 30 days
    
    if len(recent_attempts) < 5:
        return {
            'mastery_percentage': 0,
            'mastery_level': 'Insufficient Data',
            'confidence_interval': (0, 0),
            'questions_needed': 5 - len(recent_attempts)
        }
    
    # Apply recency weighting (more recent = higher weight)
    weighted_scores = []
    for i, attempt in enumerate(recent_attempts):
        weight = math.exp(-i * 0.1)  # Exponential decay
        weighted_scores.append(attempt.is_correct * weight)
    
    mastery_percentage = (sum(weighted_scores) / sum(math.exp(-i * 0.1) 
                         for i in range(len(recent_attempts)))) * 100
    
    # Calculate confidence interval
    n = len(recent_attempts)
    confidence_margin = 1.96 * math.sqrt((mastery_percentage * (100 - mastery_percentage)) / n)
    
    return {
        'mastery_percentage': round(mastery_percentage, 1),
        'mastery_level': get_mastery_level(mastery_percentage),
        'confidence_interval': (
            max(0, mastery_percentage - confidence_margin),
            min(100, mastery_percentage + confidence_margin)
        ),
        'questions_needed': max(0, 20 - n)  # Minimum 20 for reliable estimate
    }

def get_mastery_level(percentage):
    if percentage >= 96: return 'Expert'
    elif percentage >= 81: return 'Advanced' 
    elif percentage >= 61: return 'Proficient'
    elif percentage >= 31: return 'Developing'
    else: return 'Beginner'
```

---

### **Adaptive Question Selection**

#### **Difficulty Progression Algorithm**
```python
def select_next_question(user_id, session_id, objective_id=None):
    """
    Select optimal next question based on user performance and learning theory
    
    Algorithm considers:
    1. Current mastery level
    2. Recent performance trends  
    3. Spaced repetition intervals
    4. Question difficulty distribution
    5. Objective coverage requirements
    
    Returns:
        Question: Optimal question for user's current state
    """
    
    user_profile = get_user_performance_profile(user_id)
    session_context = get_session_context(session_id)
    
    # Determine target difficulty based on performance
    recent_accuracy = calculate_recent_accuracy(user_id, lookback_questions=10)
    
    if recent_accuracy > 0.85:
        target_difficulty = min(5, user_profile.current_difficulty + 0.5)
    elif recent_accuracy < 0.65:
        target_difficulty = max(1, user_profile.current_difficulty - 0.5)
    else:
        target_difficulty = user_profile.current_difficulty
    
    # Apply spaced repetition for previously incorrect questions
    due_review_questions = get_due_review_questions(user_id)
    if due_review_questions and random.random() < 0.3:  # 30% chance for review
        return select_review_question(due_review_questions, target_difficulty)
    
    # Select new question with appropriate difficulty
    available_questions = get_available_questions(
        user_id=user_id,
        objective_id=objective_id,
        min_difficulty=target_difficulty - 0.5,
        max_difficulty=target_difficulty + 0.5,
        exclude_recent=50  # Don't repeat recent questions
    )
    
    if not available_questions:
        # Fallback to any difficulty if no suitable questions
        available_questions = get_available_questions(
            user_id=user_id, 
            objective_id=objective_id,
            exclude_recent=50
        )
    
    # Weight questions by learning value
    question_weights = []
    for question in available_questions:
        weight = calculate_learning_value(question, user_profile)
        question_weights.append(weight)
    
    # Select question using weighted random selection
    return weighted_random_choice(available_questions, question_weights)

def calculate_learning_value(question, user_profile):
    """Calculate learning value of question for user"""
    
    base_value = 1.0
    
    # Boost questions in weak areas
    objective_mastery = user_profile.objective_mastery.get(question.objective_id, 0)
    if objective_mastery < 60:
        base_value *= 1.5
    
    # Boost questions with good discrimination (separate strong/weak students)
    if question.discrimination_index > 0.3:
        base_value *= 1.2
    
    # Reduce value for questions user has seen recently
    days_since_seen = (datetime.now() - question.last_seen_date).days
    recency_factor = min(1.0, days_since_seen / 7)  # Full value after 7 days
    
    return base_value * recency_factor
```

---

### **Spaced Repetition System**

#### **Review Schedule Algorithm**
```python
def calculate_next_review_date(question_attempt, user_performance_history):
    """
    Calculate when question should be reviewed again using modified SM-2 algorithm
    
    Intervals:
    - Correct on first try: 4 days
    - Correct on retry: 2 days  
    - Incorrect: 1 day
    - Each subsequent correct answer increases interval
    
    Args:
        question_attempt: Latest attempt record
        user_performance_history: Previous attempts for this question
        
    Returns:
        datetime: Next review date
    """
    
    base_intervals = {
        1: 1,    # 1 day for incorrect
        2: 2,    # 2 days for correct retry
        3: 4,    # 4 days for first correct
        4: 8,    # 8 days
        5: 16,   # 16 days
        6: 32    # 32 days (max)
    }
    
    attempts = sorted(user_performance_history, key=lambda x: x.created_at)
    
    if not question_attempt.is_correct:
        # Reset interval for incorrect answer
        interval_days = 1
        easiness_factor = max(1.3, attempts[-1].easiness_factor - 0.2)
    else:
        # Calculate interval based on performance history
        correct_streak = calculate_correct_streak(attempts)
        interval_level = min(correct_streak + 2, 6)  # Cap at level 6
        
        previous_easiness = attempts[-1].easiness_factor if attempts else 2.5
        
        # Adjust easiness factor based on response quality
        quality = question_attempt.response_quality  # 1-5 scale
        easiness_factor = previous_easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        easiness_factor = max(1.3, easiness_factor)
        
        interval_days = base_intervals[interval_level] * easiness_factor
    
    # Add some randomization to prevent bunching
    randomization_factor = random.uniform(0.9, 1.1)
    interval_days *= randomization_factor
    
    next_review = datetime.now() + timedelta(days=int(interval_days))
    
    # Update question metadata
    update_question_metadata(question_attempt.question_id, {
        'easiness_factor': easiness_factor,
        'next_review_date': next_review,
        'interval_days': interval_days
    })
    
    return next_review

def calculate_correct_streak(attempts):
    """Calculate current streak of correct answers"""
    streak = 0
    for attempt in reversed(attempts):
        if attempt.is_correct:
            streak += 1
        else:
            break
    return streak
```

---

## User Progress Tracking Rules

### **Study Streak Calculation**
```python
def calculate_study_streak(user_id):
    """
    Calculate consecutive days of study activity
    
    Rules:
    - Minimum 5 questions answered per day to count
    - Must be consecutive calendar days
    - Streak broken by gap >24 hours without activity
    - Timezone aware calculations
    
    Returns:
        dict: {
            'current_streak': int,
            'longest_streak': int,
            'last_activity_date': date,
            'streak_frozen': bool  # Premium feature
        }
    """
    
    user_timezone = get_user_timezone(user_id)
    today = datetime.now(user_timezone).date()
    
    # Get daily activity for last 365 days
    daily_activities = get_daily_question_counts(
        user_id=user_id,
        start_date=today - timedelta(days=365),
        end_date=today,
        timezone=user_timezone
    )
    
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    # Calculate streaks working backwards from today
    for date in reversed(sorted(daily_activities.keys())):
        questions_answered = daily_activities.get(date, 0)
        
        if questions_answered >= 5:  # Minimum threshold
            temp_streak += 1
            if date == today or (today - date).days == current_streak:
                current_streak = temp_streak
        else:
            longest_streak = max(longest_streak, temp_streak)
            temp_streak = 0
    
    longest_streak = max(longest_streak, temp_streak)
    
    return {
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'last_activity_date': max(daily_activities.keys()) if daily_activities else None,
        'streak_frozen': check_streak_freeze_status(user_id)
    }

def check_streak_freeze_status(user_id):
    """Check if user has active streak freeze (premium feature)"""
    user = get_user(user_id)
    return (user.subscription_tier in ['premium', 'enterprise'] and 
            user.streak_freezes_remaining > 0)
```

---

### **XP and Leveling System**

#### **Experience Points Calculation**
```python
def award_experience_points(user_id, activity_type, context=None):
    """
    Award XP based on activity type and performance
    
    XP Rewards:
    - Correct answer (first try): 10 XP
    - Correct answer (retry): 5 XP
    - Study session completion: 25 XP
    - Test completion: 100 XP  
    - Perfect test (100%): 200 XP bonus
    - Daily streak milestone: 50 XP
    - Weekly goal achievement: 100 XP
    - First mastery of objective: 150 XP
    
    Args:
        user_id: User identifier
        activity_type: Type of activity completed
        context: Additional context (scores, streaks, etc.)
        
    Returns:
        dict: XP awarded and new level info
    """
    
    xp_rewards = {
        'correct_answer_first': 10,
        'correct_answer_retry': 5,
        'study_session_complete': 25,
        'test_complete': 100,
        'perfect_test_bonus': 200,
        'streak_milestone': 50,
        'weekly_goal': 100,
        'objective_mastery': 150,
        'certification_ready': 500
    }
    
    base_xp = xp_rewards.get(activity_type, 0)
    
    # Apply multipliers based on context
    multiplier = 1.0
    
    if activity_type == 'test_complete' and context:
        # Bonus XP for high test scores
        score = context.get('score', 0)
        if score >= 95: multiplier = 2.0
        elif score >= 85: multiplier = 1.5
        elif score >= 75: multiplier = 1.2
    
    if activity_type == 'study_session_complete' and context:
        # Bonus for longer sessions
        questions_answered = context.get('questions_answered', 0)
        if questions_answered >= 50: multiplier = 1.5
        elif questions_answered >= 25: multiplier = 1.2
    
    # Premium users get 20% XP bonus
    user = get_user(user_id)
    if user.subscription_tier in ['premium', 'enterprise']:
        multiplier *= 1.2
    
    total_xp = int(base_xp * multiplier)
    
    # Update user XP and check for level up
    user.total_xp += total_xp
    new_level = calculate_user_level(user.total_xp)
    level_up = new_level > user.current_level
    
    if level_up:
        user.current_level = new_level
        send_level_up_notification(user_id, new_level)
        unlock_level_rewards(user_id, new_level)
    
    user.save()
    
    return {
        'xp_awarded': total_xp,
        'total_xp': user.total_xp,
        'current_level': user.current_level,
        'level_up': level_up,
        'xp_to_next_level': calculate_xp_to_next_level(user.total_xp)
    }

def calculate_user_level(total_xp):
    """Calculate user level based on total XP using exponential curve"""
    # Level formula: XP = 100 * level^1.5
    # Inverted: level = (XP / 100)^(2/3)
    
    if total_xp < 100:
        return 1
    
    level = int((total_xp / 100) ** (2/3))
    return max(1, level)

def calculate_xp_to_next_level(total_xp):
    """Calculate XP needed for next level"""
    current_level = calculate_user_level(total_xp)
    next_level_xp = int(100 * (current_level + 1) ** 1.5)
    return next_level_xp - total_xp
```

---

### **Certification Readiness Assessment**

#### **Readiness Algorithm**
```python
def calculate_certification_readiness(user_id, exam_id):
    """
    Calculate user's readiness to take actual certification exam
    
    Factors considered:
    1. Objective mastery levels (minimum 70% each)
    2. Practice test scores (average >75%)
    3. Question volume (minimum 500 answered)
    4. Recent performance trend (improving/stable)
    5. Weak area coverage (no gaps >30%)
    
    Returns:
        dict: {
            'readiness_percentage': float,
            'ready_to_test': bool,
            'confidence_level': str,
            'recommendations': list,
            'estimated_pass_probability': float
        }
    """
    
    exam = get_exam(exam_id)
    user_performance = get_user_exam_performance(user_id, exam_id)
    
    # Factor 1: Objective mastery (40% weight)
    objective_scores = []
    for objective in exam.objectives:
        mastery = calculate_mastery_level(user_performance, objective.id)
        objective_scores.append(mastery['mastery_percentage'])
    
    avg_mastery = sum(objective_scores) / len(objective_scores)
    mastery_score = min(100, avg_mastery * 1.2)  # Slight boost for comprehensive coverage
    
    # Factor 2: Practice test performance (35% weight)  
    recent_tests = get_recent_test_scores(user_id, exam_id, limit=5)
    if len(recent_tests) >= 3:
        avg_test_score = sum(recent_tests) / len(recent_tests)
        test_score = avg_test_score
    else:
        test_score = 0  # Insufficient data
    
    # Factor 3: Question volume (10% weight)
    questions_answered = count_questions_answered(user_id, exam_id)
    volume_score = min(100, (questions_answered / 500) * 100)
    
    # Factor 4: Performance trend (10% weight)
    trend_score = calculate_performance_trend(user_id, exam_id)
    
    # Factor 5: Weak area coverage (5% weight)
    weak_areas = [score for score in objective_scores if score < 70]
    coverage_score = max(0, 100 - (len(weak_areas) / len(objective_scores)) * 100)
    
    # Calculate weighted readiness score
    readiness_percentage = (
        mastery_score * 0.40 +
        test_score * 0.35 +
        volume_score * 0.10 +
        trend_score * 0.10 +
        coverage_score * 0.05
    )
    
    # Generate recommendations
    recommendations = []
    if avg_mastery < 80:
        recommendations.append("Focus on weak objectives: " + 
                             ", ".join([obj.name for obj, score in zip(exam.objectives, objective_scores) 
                                      if score < 70]))
    
    if len(recent_tests) < 5:
        recommendations.append(f"Take {5 - len(recent_tests)} more practice tests")
    
    if questions_answered < 500:
        recommendations.append(f"Answer {500 - questions_answered} more practice questions")
    
    # Determine confidence level and readiness
    if readiness_percentage >= 85:
        confidence_level = "High"
        ready_to_test = True
    elif readiness_percentage >= 70:
        confidence_level = "Medium"
        ready_to_test = True if len(recommendations) <= 1 else False
    else:
        confidence_level = "Low"
        ready_to_test = False
    
    # Estimate pass probability using logistic regression model
    pass_probability = calculate_pass_probability(readiness_percentage, user_performance)
    
    return {
        'readiness_percentage': round(readiness_percentage, 1),
        'ready_to_test': ready_to_test,
        'confidence_level': confidence_level,
        'recommendations': recommendations,
        'estimated_pass_probability': round(pass_probability, 2)
    }

def calculate_pass_probability(readiness_score, performance_data):
    """Estimate pass probability using trained model"""
    
    # Simplified logistic regression model (would use trained coefficients in production)
    # Based on historical data: readiness_score, avg_test_score, study_days, question_count
    
    features = [
        readiness_score / 100,
        performance_data['avg_test_score'] / 100,
        min(performance_data['study_days'] / 90, 1),  # Cap at 90 days
        min(performance_data['questions_answered'] / 1000, 1)  # Cap at 1000
    ]
    
    # Model coefficients (trained on historical data)
    coefficients = [2.1, 1.8, 0.5, 0.3]
    intercept = -1.2
    
    linear_combination = intercept + sum(f * c for f, c in zip(features, coefficients))
    probability = 1 / (1 + math.exp(-linear_combination))
    
    return probability
```

---

## Session Management Rules

### **Session Timeout & State Persistence**
```python
def manage_session_state(session_id, activity_type):
    """
    Manage study/test session state and timeouts
    
    Rules:
    - Study sessions: 2 hour timeout with auto-save
    - Test sessions: No timeout, but warn at 30 minutes remaining
    - Auto-save every 30 seconds during active use
    - Resume from last question on session recovery
    
    Args:
        session_id: Session identifier
        activity_type: 'study' or 'test'
    """
    
    session = get_session(session_id)
    now = datetime.now()
    
    if activity_type == 'study':
        # Study session timeout: 2 hours
        timeout_duration = timedelta(hours=2)
        
        if now - session.last_activity > timeout_duration:
            # Auto-complete session and save progress
            complete_study_session(session_id, auto_completed=True)
            return {'status': 'timeout', 'message': 'Session auto-completed due to inactivity'}
    
    elif activity_type == 'test':
        # Test session: enforce time limit but no inactivity timeout
        time_limit = timedelta(minutes=session.exam.time_limit_minutes)
        elapsed_time = now - session.start_time
        
        if elapsed_time > time_limit:
            # Auto-submit test
            submit_test_session(session_id, auto_submitted=True)
            return {'status': 'timeout', 'message': 'Test auto-submitted due to time limit'}
        
        # Warn at 30 minutes remaining
        remaining_time = time_limit - elapsed_time
        if remaining_time.total_seconds() <= 1800:  # 30 minutes
            return {'status': 'warning', 'time_remaining': remaining_time.total_seconds()}
    
    # Update last activity timestamp
    session.last_activity = now
    session.save()
    
    return {'status': 'active'}

def auto_save_session_progress(session_id):
    """Auto-save session progress every 30 seconds"""
    
    session = get_session(session_id)
    
    save_data = {
        'current_question_index': session.current_question_index,
        'answered_questions': session.answered_questions,
        'flagged_questions': session.flagged_questions,
        'time_spent_per_question': session.time_tracking,
        'last_save_timestamp': datetime.now()
    }
    
    # Save to both database and Redis for redundancy
    save_session_to_database(session_id, save_data)
    cache_session_state(session_id, save_data)
```

---

### **Question Distribution Rules**

#### **Test Generation Algorithm**
```python
def generate_test_questions(exam_id, question_count=65):
    """
    Generate test questions following official exam blueprint distribution
    
    Rules:
    - Follow exact objective weight percentages
    - Ensure difficulty distribution (20% easy, 60% medium, 20% hard)
    - No duplicate questions per test
    - Randomize question and answer order
    - Include performance-validated questions only
    
    Args:
        exam_id: Target exam identifier
        question_count: Total questions needed
        
    Returns:
        list: Selected questions with metadata
    """
    
    exam = get_exam(exam_id)
    blueprint = exam.objective_weights  # {objective_id: percentage}
    
    selected_questions = []
    
    for objective_id, weight_percentage in blueprint.items():
        # Calculate questions needed for this objective
        objective_question_count = max(1, round(question_count * weight_percentage / 100))
        
        # Get difficulty distribution for this objective
        easy_count = max(1, round(objective_question_count * 0.2))
        hard_count = max(1, round(objective_question_count * 0.2))
        medium_count = objective_question_count - easy_count - hard_count
        
        # Select questions by difficulty
        difficulty_requirements = [
            ('easy', easy_count, 1, 2),
            ('medium', medium_count, 2.5, 3.5),
            ('hard', hard_count, 4, 5)
        ]
        
        for difficulty_name, count, min_diff, max_diff in difficulty_requirements:
            questions = get_questions_by_criteria(
                objective_id=objective_id,
                min_difficulty=min_diff,
                max_difficulty=max_diff,
                min_performance_score=0.7,  # Only well-performing questions
                exclude_ids=[q.id for q in selected_questions],
                limit=count * 2  # Get extra for random selection
            )
            
            if len(questions) >= count:
                # Randomly select required count
                selected = random.sample(questions, count)
                selected_questions.extend(selected)
            else:
                # Use all available and log shortfall
                selected_questions.extend(questions)
                log_question_shortfall(objective_id, difficulty_name, 
                                     count - len(questions))
    
    # Randomize question order
    random.shuffle(selected_questions)
    
    # Randomize answer options for each question
    for question in selected_questions:
        question.randomized_options = randomize_answer_options(question.options)
    
    return selected_questions

def randomize_answer_options(original_options):
    """Randomize answer option order while maintaining correct answer tracking"""
    
    options = original_options.copy()
    correct_answer = None
    
    # Find correct answer before shuffling
    for i, option in enumerate(options):
        if option['is_correct']:
            correct_answer = option
            break
    
    # Shuffle options
    random.shuffle(options)
    
    # Update answer labels (A, B, C, D, E)
    labels = ['A', 'B', 'C', 'D', 'E']
    for i, option in enumerate(options):
        option['label'] = labels[i]
        if option == correct_answer:
            correct_answer_label = labels[i]
    
    return {
        'options': options,
        'correct_answer': correct_answer_label
    }
```

---

## Subscription & Payment Rules

### **Subscription Tiers**
```python
SUBSCRIPTION_TIERS = {
    'free': {
        'name': 'Free',
        'price_monthly': 0,
        'features': {
            'questions_per_day': 25,
            'practice_tests_per_month': 2,
            'detailed_analytics': False,
            'ai_study_plan': False,
            'offline_access': False,
            'priority_support': False,
            'streak_freeze': False,
            'custom_study_sets': False
        }
    },
    'premium': {
        'name': 'Premium',
        'price_monthly': 29.99,
        'price_yearly': 299.99,  # 2 months free
        'features': {
            'questions_per_day': float('inf'),
            'practice_tests_per_month': float('inf'),
            'detailed_analytics': True,
            'ai_study_plan': True,
            'offline_access': True,
            'priority_support': True,
            'streak_freeze': True,
            'custom_study_sets': True,
            'xp_multiplier': 1.2
        }
    },
    'enterprise': {
        'name': 'Enterprise',
        'price_per_user_monthly': 19.99,
        'minimum_users': 10,
        'features': {
            'all_premium_features': True,
            'admin_dashboard': True,
            'team_analytics': True,
            'sso_integration': True,
            'white_label': True,
            'api_access': True,
            'dedicated_support': True,
            'custom_content': True
        }
    }
}

def check_feature_access(user_id, feature_name):
    """Check if user has access to specific feature"""
    
    user = get_user(user_id)
    tier_features = SUBSCRIPTION_TIERS[user.subscription_tier]['features']
    
    # Check daily/monthly limits
    if feature_name == 'questions_per_day':
        daily_usage = get_daily_question_count(user_id)
        limit = tier_features.get('questions_per_day', 0)
        return daily_usage < limit if limit != float('inf') else True
    
    elif feature_name == 'practice_tests_per_month':
        monthly_usage = get_monthly_test_count(user_id)
        limit = tier_features.get('practice_tests_per_month', 0)
        return monthly_usage < limit if limit != float('inf') else True
    
    # Boolean features
    return tier_features.get(feature_name, False)
```

---

## Performance Optimization Rules

### **Caching Strategy**
```python
CACHE_SETTINGS = {
    'question_pools': {
        'ttl': 3600,  # 1 hour
        'key_pattern': 'questions:exam:{exam_id}:objective:{obj_id}'
    },
    'user_progress': {
        'ttl': 300,   # 5 minutes
        'key_pattern': 'progress:user:{user_id}'
    },
    'exam_metadata': {
        'ttl': 86400,  # 24 hours
        'key_pattern': 'exam:meta:{exam_id}'
    },
    'leaderboards': {
        'ttl': 1800,   # 30 minutes
        'key_pattern': 'leaderboard:{type}:{period}'
    }
}

def cache_invalidation_rules():
    """Define when to invalidate specific caches"""
    
    rules = {
        'user_answer_submitted': [
            'progress:user:{user_id}',
            'leaderboard:*'
        ],
        'question_updated': [
            'questions:exam:*',
            'exam:meta:{exam_id}'
        ],
        'user_subscription_changed': [
            'progress:user:{user_id}',
            'features:user:{user_id}'
        ]
    }
    
    return rules
```

### **Database Query Optimization**
```sql
-- Indexes for performance-critical queries

-- User progress queries
CREATE INDEX idx_user_answers_user_created ON user_answers(user_id, created_at DESC);
CREATE INDEX idx_user_answers_question_user ON user_answers(question_id, user_id);

-- Question selection queries  
CREATE INDEX idx_questions_exam_objective ON questions(exam_id, objective_id);
CREATE INDEX idx_questions_difficulty_performance ON questions(difficulty_level, performance_score);

-- Session management
CREATE INDEX idx_sessions_user_active ON study_sessions(user_id, is_active, created_at DESC);
CREATE INDEX idx_test_sessions_user_status ON test_sessions(user_id, status, created_at DESC);

-- Analytics queries
CREATE INDEX idx_user_stats_user_date ON user_daily_stats(user_id, date DESC);
CREATE INDEX idx_question_performance_question ON question_performance(question_id, created_at DESC);
```

This comprehensive business logic specification provides the foundation for implementing PingToPass as a robust, scalable IT certification platform with intelligent learning algorithms and fair assessment methods.