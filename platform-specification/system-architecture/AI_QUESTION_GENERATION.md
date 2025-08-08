# AI Question Generation System - MVP Architecture

## 1. System Overview

### Purpose
Generate high-quality certification exam questions using AI models (primarily Qwen via OpenRouter) to supplement the question bank without manual content creation.

### MVP Scope (Single User)
- Generate 10-50 questions per request
- Use cost-effective models (Qwen2.5-72B preferred)
- Simple approval workflow
- Basic quality validation
- Minimal infrastructure (no queue system needed initially)

### Cost Targets
- **Per Question**: <$0.002 using Qwen2.5-72B
- **Monthly Budget**: $10-20 (5,000-10,000 questions)
- **Fallback Models**: Gemini Flash (free tier), Claude Haiku

## 2. AI Service Architecture

### 2.1 Core AI Service Implementation
```python
# app/services/ai_question_service.py
from typing import List, Dict, Optional
import json
import asyncio
from datetime import datetime
from openai import AsyncOpenAI
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient

class AIQuestionGenerator:
    """MVP AI Question Generation Service"""
    
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        
        # OpenRouter client (compatible with OpenAI SDK)
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "https://pingtopass.com",
                "X-Title": "PingToPass Question Generator"
            }
        )
        
        # Model configuration (Qwen for cost-effectiveness)
        self.models = {
            "primary": "qwen/qwen-2.5-72b-instruct",  # $0.35/1M tokens
            "fallback": "google/gemini-flash-1.5-8b",  # Free tier
            "premium": "anthropic/claude-3-haiku"      # $0.25/1M tokens
        }
        
        # Cost tracking
        self.cost_tracker = {
            "daily_spend": 0.0,
            "monthly_spend": 0.0,
            "questions_generated": 0
        }
    
    async def generate_questions(
        self,
        exam_id: str,
        objective_id: str,
        topic: str,
        count: int = 10,
        difficulty: int = 3,
        reference_questions: List[Dict] = None
    ) -> Dict:
        """
        Generate questions for a specific objective
        MVP: Direct generation without queue
        """
        
        # Get exam and objective details
        exam = await self.db.exams.find_one({"_id": exam_id})
        objective = await self.db.objectives.find_one({"_id": objective_id})
        
        # Build generation prompt
        prompt = self._build_generation_prompt(
            exam,
            objective,
            topic,
            count,
            difficulty,
            reference_questions
        )
        
        # Generate with primary model
        try:
            questions = await self._generate_with_model(
                prompt,
                self.models["primary"],
                count
            )
        except Exception as e:
            # Fallback to free model if primary fails
            print(f"Primary model failed: {e}, using fallback")
            questions = await self._generate_with_model(
                prompt,
                self.models["fallback"],
                count
            )
        
        # Validate and store
        validated_questions = await self._validate_questions(questions)
        
        # Save to database with pending status
        generation_batch = {
            "exam_id": exam_id,
            "objective_id": objective_id,
            "topic": topic,
            "model_used": self.models["primary"],
            "questions": validated_questions,
            "status": "pending_review",
            "generated_at": datetime.utcnow(),
            "cost_estimate": self._estimate_cost(prompt, len(validated_questions))
        }
        
        result = await self.db.ai_generations.insert_one(generation_batch)
        
        # Update cost tracking
        await self._update_cost_tracking(generation_batch["cost_estimate"])
        
        return {
            "batch_id": str(result.inserted_id),
            "questions_generated": len(validated_questions),
            "status": "pending_review",
            "estimated_cost": generation_batch["cost_estimate"]
        }
    
    def _build_generation_prompt(
        self,
        exam: Dict,
        objective: Dict,
        topic: str,
        count: int,
        difficulty: int,
        reference_questions: List[Dict] = None
    ) -> str:
        """Build optimized prompt for Qwen model"""
        
        # Difficulty descriptions
        difficulty_map = {
            1: "Basic recall - simple factual questions",
            2: "Understanding - comprehension questions",
            3: "Application - practical scenario questions",
            4: "Analysis - troubleshooting and comparison",
            5: "Expert - complex multi-concept questions"
        }
        
        prompt = f"""You are an expert {exam['vendor']} certification instructor creating practice questions.

EXAM: {exam['name']}
OBJECTIVE: {objective['name']} ({objective['code']})
TOPIC: {topic}
DIFFICULTY: Level {difficulty} - {difficulty_map[difficulty]}

Generate exactly {count} multiple-choice questions following these requirements:

QUESTION REQUIREMENTS:
1. Each question must be directly relevant to the objective
2. Difficulty level {difficulty} complexity
3. Clear, unambiguous wording
4. Exactly 4 answer options (A, B, C, D)
5. Only ONE correct answer
6. Plausible distractors (wrong answers that seem reasonable)
7. Include brief explanation for the correct answer

FORMAT YOUR RESPONSE AS A JSON ARRAY:
[
  {{
    "text": "Question text here?",
    "answers": [
      {{"id": "a", "text": "First option", "is_correct": false}},
      {{"id": "b", "text": "Second option", "is_correct": true}},
      {{"id": "c", "text": "Third option", "is_correct": false}},
      {{"id": "d", "text": "Fourth option", "is_correct": false}}
    ],
    "explanation": "Brief explanation why B is correct...",
    "difficulty": {difficulty},
    "topic_tags": ["{topic}", "subtopic1", "subtopic2"]
  }}
]

"""
        
        # Add reference questions if provided (for style matching)
        if reference_questions and len(reference_questions) > 0:
            prompt += "\nREFERENCE STYLE (match this question format):\n"
            prompt += json.dumps(reference_questions[0], indent=2)
        
        prompt += "\n\nGenerate the questions now as a valid JSON array:"
        
        return prompt
    
    async def _generate_with_model(
        self,
        prompt: str,
        model: str,
        count: int
    ) -> List[Dict]:
        """Generate questions using specified model"""
        
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a certification exam expert. Generate questions in valid JSON format only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,  # Some creativity but not too random
                max_tokens=count * 300,  # ~300 tokens per question
                response_format={"type": "json_object"} if "gpt" in model else None
            )
            
            # Parse response
            content = response.choices[0].message.content
            
            # Extract JSON from response
            if content.startswith("```json"):
                content = content[7:-3]  # Remove markdown code blocks
            elif content.startswith("```"):
                content = content[3:-3]
            
            questions = json.loads(content)
            
            # Ensure it's a list
            if isinstance(questions, dict) and "questions" in questions:
                questions = questions["questions"]
            
            return questions
            
        except Exception as e:
            print(f"Generation error with {model}: {e}")
            raise
    
    async def _validate_questions(self, questions: List[Dict]) -> List[Dict]:
        """Validate generated questions meet requirements"""
        
        validated = []
        
        for q in questions:
            try:
                # Check required fields
                assert "text" in q and len(q["text"]) > 10
                assert "answers" in q and len(q["answers"]) == 4
                assert "explanation" in q and len(q["explanation"]) > 10
                
                # Validate answers
                correct_count = sum(1 for a in q["answers"] if a.get("is_correct", False))
                assert correct_count == 1, "Must have exactly one correct answer"
                
                # Ensure answer IDs
                for i, answer in enumerate(q["answers"]):
                    if "id" not in answer:
                        answer["id"] = ["a", "b", "c", "d"][i]
                
                # Add metadata
                q["ai_generated"] = True
                q["validation_status"] = "passed"
                q["created_at"] = datetime.utcnow()
                
                validated.append(q)
                
            except AssertionError as e:
                print(f"Question validation failed: {e}")
                continue
        
        return validated
    
    def _estimate_cost(self, prompt: str, question_count: int) -> float:
        """Estimate generation cost"""
        
        # Rough token estimation
        prompt_tokens = len(prompt) / 4  # ~4 chars per token
        response_tokens = question_count * 300  # ~300 tokens per question
        total_tokens = prompt_tokens + response_tokens
        
        # Qwen pricing: $0.35 per 1M tokens
        cost = (total_tokens / 1_000_000) * 0.35
        
        return round(cost, 4)
    
    async def _update_cost_tracking(self, cost: float):
        """Track AI generation costs"""
        
        self.cost_tracker["daily_spend"] += cost
        self.cost_tracker["monthly_spend"] += cost
        self.cost_tracker["questions_generated"] += 1
        
        # Store in database for persistent tracking
        await self.db.ai_cost_tracking.update_one(
            {"date": datetime.utcnow().date().isoformat()},
            {
                "$inc": {
                    "daily_spend": cost,
                    "questions_generated": 1
                }
            },
            upsert=True
        )
```

### 2.2 Question Approval Workflow
```python
# app/services/ai_approval_service.py

class AIQuestionApprovalService:
    """Simple approval workflow for generated questions"""
    
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
    
    async def get_pending_questions(self, limit: int = 50) -> List[Dict]:
        """Get questions pending approval"""
        
        generations = await self.db.ai_generations.find(
            {"status": "pending_review"}
        ).sort("generated_at", -1).limit(limit).to_list(None)
        
        # Flatten all questions with batch info
        pending = []
        for gen in generations:
            for q in gen["questions"]:
                q["batch_id"] = str(gen["_id"])
                q["generated_at"] = gen["generated_at"]
                q["model_used"] = gen["model_used"]
                pending.append(q)
        
        return pending
    
    async def approve_question(
        self,
        batch_id: str,
        question_text: str,
        modifications: Dict = None
    ) -> bool:
        """Approve a generated question and add to main question bank"""
        
        # Get the generation batch
        batch = await self.db.ai_generations.find_one({"_id": ObjectId(batch_id)})
        
        # Find the specific question
        question = None
        for q in batch["questions"]:
            if q["text"] == question_text:
                question = q
                break
        
        if not question:
            return False
        
        # Apply any modifications
        if modifications:
            question.update(modifications)
        
        # Add to main question collection
        question_doc = {
            "exam_id": batch["exam_id"],
            "objective_id": batch["objective_id"],
            "text": question["text"],
            "answers": question["answers"],
            "explanation": question["explanation"],
            "difficulty": question.get("difficulty", 3),
            "tags": question.get("topic_tags", []),
            "ai_generated": True,
            "ai_model": batch["model_used"],
            "status": "active",
            "created_at": datetime.utcnow(),
            "statistics": {
                "attempts": 0,
                "correct_count": 0,
                "success_rate": 0.0
            }
        }
        
        await self.db.questions.insert_one(question_doc)
        
        # Mark as approved in generation batch
        await self.db.ai_generations.update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": {f"questions.$[elem].approved": True}},
            array_filters=[{"elem.text": question_text}]
        )
        
        return True
    
    async def reject_question(
        self,
        batch_id: str,
        question_text: str,
        reason: str
    ) -> bool:
        """Reject a generated question"""
        
        await self.db.ai_generations.update_one(
            {"_id": ObjectId(batch_id)},
            {
                "$set": {
                    f"questions.$[elem].rejected": True,
                    f"questions.$[elem].rejection_reason": reason
                }
            },
            array_filters=[{"elem.text": question_text}]
        )
        
        return True
    
    async def bulk_approve_batch(self, batch_id: str) -> int:
        """Approve all questions in a batch"""
        
        batch = await self.db.ai_generations.find_one({"_id": ObjectId(batch_id)})
        
        approved_count = 0
        for question in batch["questions"]:
            if not question.get("approved") and not question.get("rejected"):
                await self.approve_question(batch_id, question["text"])
                approved_count += 1
        
        # Update batch status
        await self.db.ai_generations.update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": {"status": "approved", "approved_at": datetime.utcnow()}}
        )
        
        return approved_count
```

## 3. API Endpoints for AI Generation

### 3.1 Generation Endpoints
```python
# app/api/v1/ai_questions.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional

router = APIRouter(prefix="/api/v1/ai", tags=["AI Generation"])

@router.post("/questions/generate")
async def generate_questions(
    request: GenerateQuestionsRequest,
    current_user: CurrentUser,
    db: Database,
    background_tasks: BackgroundTasks
):
    """
    Generate AI questions - MVP version without queue
    Single user, so direct generation is fine
    """
    
    # Check daily/monthly limits (MVP: simple limits)
    usage = await db.ai_cost_tracking.find_one({
        "date": datetime.utcnow().date().isoformat()
    })
    
    if usage and usage.get("daily_spend", 0) > 1.0:  # $1 daily limit
        raise HTTPException(
            status_code=429,
            detail="Daily AI generation limit reached ($1.00)"
        )
    
    # Get reference questions for style matching
    reference_questions = None
    if request.use_reference_style:
        reference_questions = await db.questions.find(
            {
                "exam_id": request.exam_id,
                "objective_id": request.objective_id
            }
        ).limit(3).to_list(None)
    
    # Generate questions
    generator = AIQuestionGenerator(db)
    result = await generator.generate_questions(
        exam_id=request.exam_id,
        objective_id=request.objective_id,
        topic=request.topic,
        count=request.count,
        difficulty=request.difficulty,
        reference_questions=reference_questions
    )
    
    return {
        "success": True,
        "data": result
    }

@router.get("/questions/pending")
async def get_pending_questions(
    limit: int = 50,
    current_user: CurrentUser,
    db: Database
):
    """Get AI-generated questions pending approval"""
    
    approval_service = AIQuestionApprovalService(db)
    pending = await approval_service.get_pending_questions(limit)
    
    return {
        "success": True,
        "data": {
            "questions": pending,
            "total": len(pending)
        }
    }

@router.post("/questions/{batch_id}/approve")
async def approve_question(
    batch_id: str,
    request: ApproveQuestionRequest,
    current_user: CurrentUser,
    db: Database
):
    """Approve an AI-generated question"""
    
    approval_service = AIQuestionApprovalService(db)
    success = await approval_service.approve_question(
        batch_id,
        request.question_text,
        request.modifications
    )
    
    return {
        "success": success,
        "message": "Question approved and added to question bank"
    }

@router.post("/questions/{batch_id}/approve-all")
async def bulk_approve_batch(
    batch_id: str,
    current_user: CurrentUser,
    db: Database
):
    """Approve all questions in a batch"""
    
    approval_service = AIQuestionApprovalService(db)
    count = await approval_service.bulk_approve_batch(batch_id)
    
    return {
        "success": True,
        "data": {
            "approved_count": count
        }
    }

@router.get("/usage/stats")
async def get_ai_usage_stats(
    current_user: CurrentUser,
    db: Database
):
    """Get AI generation usage and cost statistics"""
    
    # Get current month stats
    current_month = datetime.utcnow().strftime("%Y-%m")
    
    monthly_stats = await db.ai_cost_tracking.aggregate([
        {
            "$match": {
                "date": {"$regex": f"^{current_month}"}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_spend": {"$sum": "$daily_spend"},
                "total_questions": {"$sum": "$questions_generated"},
                "days_used": {"$sum": 1}
            }
        }
    ]).to_list(1)
    
    stats = monthly_stats[0] if monthly_stats else {
        "total_spend": 0,
        "total_questions": 0,
        "days_used": 0
    }
    
    # Add cost per question
    if stats["total_questions"] > 0:
        stats["cost_per_question"] = stats["total_spend"] / stats["total_questions"]
    else:
        stats["cost_per_question"] = 0
    
    # Add budget remaining
    stats["monthly_budget"] = 20.00  # $20 monthly budget
    stats["budget_remaining"] = stats["monthly_budget"] - stats["total_spend"]
    stats["budget_percentage_used"] = (stats["total_spend"] / stats["monthly_budget"]) * 100
    
    return {
        "success": True,
        "data": stats
    }
```

## 4. Frontend Integration (Admin Panel)

### 4.1 AI Generation Interface
```html
<!-- templates/admin/ai_generation.html -->
<div class="container-fluid">
    <div class="card">
        <div class="card-header bg-primary text-white">
            <h4>AI Question Generation</h4>
        </div>
        <div class="card-body">
            <!-- Generation Form -->
            <form id="generateForm" hx-post="/api/v1/ai/questions/generate" 
                  hx-trigger="submit" hx-target="#results">
                
                <!-- Exam Selection -->
                <div class="mb-3">
                    <label>Select Exam</label>
                    <select name="exam_id" class="form-select" required>
                        <option value="">Choose exam...</option>
                        <!-- Populated via HTMX -->
                    </select>
                </div>
                
                <!-- Objective Selection -->
                <div class="mb-3">
                    <label>Select Objective</label>
                    <select name="objective_id" class="form-select" required>
                        <option value="">Choose objective...</option>
                    </select>
                </div>
                
                <!-- Topic -->
                <div class="mb-3">
                    <label>Topic Focus</label>
                    <input type="text" name="topic" class="form-control" 
                           placeholder="e.g., Subnetting, VLANs, Security">
                </div>
                
                <!-- Generation Settings -->
                <div class="row">
                    <div class="col-md-4">
                        <label>Number of Questions</label>
                        <input type="number" name="count" value="10" min="1" max="50" 
                               class="form-control">
                    </div>
                    <div class="col-md-4">
                        <label>Difficulty Level</label>
                        <select name="difficulty" class="form-select">
                            <option value="1">1 - Basic</option>
                            <option value="2">2 - Understanding</option>
                            <option value="3" selected>3 - Application</option>
                            <option value="4">4 - Analysis</option>
                            <option value="5">5 - Expert</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label>Model</label>
                        <select name="model" class="form-select">
                            <option value="qwen">Qwen 2.5 ($0.002/q)</option>
                            <option value="gemini">Gemini (Free)</option>
                            <option value="claude">Claude Haiku ($0.003/q)</option>
                        </select>
                    </div>
                </div>
                
                <!-- Cost Estimate -->
                <div class="alert alert-info mt-3">
                    <i class="ti ti-calculator"></i>
                    Estimated Cost: <span id="costEstimate">$0.02</span>
                    <small class="text-muted">(10 questions × $0.002)</small>
                </div>
                
                <!-- Submit -->
                <button type="submit" class="btn btn-primary">
                    <i class="ti ti-sparkles"></i> Generate Questions
                </button>
            </form>
            
            <!-- Results -->
            <div id="results" class="mt-4"></div>
        </div>
    </div>
    
    <!-- Approval Queue -->
    <div class="card mt-4">
        <div class="card-header">
            <h4>Pending Approval Queue</h4>
        </div>
        <div class="card-body">
            <div hx-get="/api/v1/ai/questions/pending" 
                 hx-trigger="load, every 30s"
                 hx-target="#pendingQuestions">
                <div id="pendingQuestions">
                    <!-- Questions loaded here -->
                </div>
            </div>
        </div>
    </div>
    
    <!-- Usage Stats -->
    <div class="card mt-4">
        <div class="card-header">
            <h4>AI Usage Statistics</h4>
        </div>
        <div class="card-body" hx-get="/api/v1/ai/usage/stats" 
             hx-trigger="load, every 60s">
            <!-- Stats loaded here -->
        </div>
    </div>
</div>

<script>
// Update cost estimate
document.querySelector('[name="count"]').addEventListener('input', function() {
    const count = parseInt(this.value) || 0;
    const model = document.querySelector('[name="model"]').value;
    const costs = {
        'qwen': 0.002,
        'gemini': 0,
        'claude': 0.003
    };
    const cost = count * costs[model];
    document.getElementById('costEstimate').textContent = `$${cost.toFixed(3)}`;
});
</script>
```

## 5. Quality Control & Improvements

### 5.1 Question Quality Validator
```python
class QuestionQualityValidator:
    """Validate AI-generated questions meet quality standards"""
    
    def __init__(self):
        self.quality_checks = [
            self._check_length,
            self._check_grammar,
            self._check_answer_distribution,
            self._check_explanation_quality,
            self._check_distractor_quality
        ]
    
    async def validate_question(self, question: Dict) -> Dict:
        """Run all quality checks on a question"""
        
        results = {
            "passed": True,
            "score": 100,
            "issues": []
        }
        
        for check in self.quality_checks:
            check_result = check(question)
            if not check_result["passed"]:
                results["passed"] = False
                results["score"] -= check_result["penalty"]
                results["issues"].append(check_result["issue"])
        
        return results
    
    def _check_length(self, question: Dict) -> Dict:
        """Check question and answer lengths"""
        
        text_len = len(question["text"])
        
        if text_len < 20:
            return {
                "passed": False,
                "penalty": 20,
                "issue": "Question too short (< 20 chars)"
            }
        
        if text_len > 500:
            return {
                "passed": False,
                "penalty": 10,
                "issue": "Question too long (> 500 chars)"
            }
        
        # Check answer lengths
        for answer in question["answers"]:
            if len(answer["text"]) < 2:
                return {
                    "passed": False,
                    "penalty": 15,
                    "issue": f"Answer too short: {answer['text']}"
                }
        
        return {"passed": True}
    
    def _check_answer_distribution(self, question: Dict) -> Dict:
        """Ensure exactly one correct answer"""
        
        correct_count = sum(1 for a in question["answers"] if a["is_correct"])
        
        if correct_count != 1:
            return {
                "passed": False,
                "penalty": 50,
                "issue": f"Must have exactly 1 correct answer, found {correct_count}"
            }
        
        return {"passed": True}
    
    def _check_distractor_quality(self, question: Dict) -> Dict:
        """Check that wrong answers are plausible"""
        
        # Simple check: distractors shouldn't be obviously wrong
        obvious_wrong = ["None of the above", "All of the above", "Error", "N/A"]
        
        for answer in question["answers"]:
            if not answer["is_correct"]:
                if answer["text"] in obvious_wrong:
                    return {
                        "passed": False,
                        "penalty": 10,
                        "issue": f"Poor distractor: {answer['text']}"
                    }
        
        return {"passed": True}
```

## 6. Monitoring & Analytics

### 6.1 AI Generation Dashboard
```python
@router.get("/ai/dashboard")
async def get_ai_dashboard(db: Database):
    """Analytics dashboard for AI generation"""
    
    # Get generation statistics
    stats = await db.ai_generations.aggregate([
        {
            "$group": {
                "_id": "$model_used",
                "total_generated": {"$sum": {"$size": "$questions"}},
                "total_approved": {
                    "$sum": {
                        "$size": {
                            "$filter": {
                                "input": "$questions",
                                "cond": {"$eq": ["$$this.approved", True]}
                            }
                        }
                    }
                },
                "avg_cost": {"$avg": "$cost_estimate"}
            }
        }
    ]).to_list(None)
    
    # Get quality metrics
    quality_stats = await db.questions.aggregate([
        {
            "$match": {"ai_generated": True}
        },
        {
            "$group": {
                "_id": "$ai_model",
                "avg_success_rate": {"$avg": "$statistics.success_rate"},
                "total_attempts": {"$sum": "$statistics.attempts"},
                "count": {"$sum": 1}
            }
        }
    ]).to_list(None)
    
    return {
        "generation_stats": stats,
        "quality_stats": quality_stats,
        "models_available": ["qwen/qwen-2.5-72b", "gemini/flash-1.5", "claude/haiku"],
        "monthly_budget": 20.00,
        "features": {
            "batch_generation": True,
            "auto_approval": False,  # MVP: Manual approval for quality
            "style_matching": True,
            "cost_optimization": True
        }
    }
```

## 7. Cost Optimization Strategies

### 7.1 Smart Model Selection
```python
class CostOptimizedGenerator:
    """Select most cost-effective model based on requirements"""
    
    def select_model(self, requirements: Dict) -> str:
        """Choose model based on requirements and budget"""
        
        difficulty = requirements.get("difficulty", 3)
        count = requirements.get("count", 10)
        quality_needed = requirements.get("quality", "standard")
        
        # Use free tier for basic questions
        if difficulty <= 2 and quality_needed == "basic":
            return "google/gemini-flash-1.5-8b"  # Free
        
        # Use Qwen for most cases (best cost/quality ratio)
        if difficulty <= 4:
            return "qwen/qwen-2.5-72b-instruct"  # $0.35/1M tokens
        
        # Use Claude for complex questions requiring reasoning
        if difficulty == 5 or quality_needed == "premium":
            return "anthropic/claude-3-haiku"  # $0.25/1M tokens
        
        return "qwen/qwen-2.5-72b-instruct"  # Default
```

## 8. Database Schema for AI Generation

### 8.1 AI Collections
```javascript
// ai_generations collection
{
  "_id": ObjectId("..."),
  "exam_id": "exam_123",
  "objective_id": "obj_456",
  "topic": "Network Security",
  "model_used": "qwen/qwen-2.5-72b-instruct",
  "prompt_tokens": 450,
  "completion_tokens": 3200,
  "cost_estimate": 0.0234,
  "questions": [
    {
      "text": "Which protocol provides encrypted communication?",
      "answers": [...],
      "explanation": "...",
      "difficulty": 3,
      "topic_tags": ["security", "protocols"],
      "approved": false,
      "rejected": false,
      "quality_score": 85,
      "validation_issues": []
    }
  ],
  "status": "pending_review",  // pending_review, approved, rejected, partial
  "generated_at": ISODate("2024-01-20T10:00:00Z"),
  "reviewed_at": null,
  "reviewed_by": null
}

// ai_cost_tracking collection
{
  "_id": ObjectId("..."),
  "date": "2024-01-20",
  "daily_spend": 1.45,
  "questions_generated": 145,
  "models_used": {
    "qwen/qwen-2.5-72b": 120,
    "google/gemini-flash": 25
  },
  "hourly_breakdown": [
    {"hour": 10, "spend": 0.23, "count": 20},
    {"hour": 14, "spend": 0.45, "count": 45}
  ]
}
```

This AI Question Generation system is optimized for MVP single-user operation with:
- Cost-effective model selection (Qwen as primary)
- Simple approval workflow
- Budget tracking ($20/month limit)
- Quality validation
- Direct generation without complex queuing
- Easy scaling path for future multi-user needs