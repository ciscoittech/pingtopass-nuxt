# AI Integration Architecture - LangChain with OpenRouter

## 1. Overview

### Purpose
Edge-optimized AI integration for question generation using LangChain with OpenRouter and Qwen3 models, designed for Cloudflare Workers with cost optimization.

### Strategy
- **Pre-generation**: Generate 500 questions per exam upfront (admin task)
- **Budget**: $30/month total ($20 for questions)
- **Models**: Qwen-2.5-72B for quality, Qwen-2.5-32B for volume
- **Edge-first**: Minimal dependencies for Cloudflare Workers

## 2. LangChain Integration

### 2.1 Configuration
```typescript
// server/utils/ai/config.ts
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

export interface AIConfig {
  model: string
  temperature: number
  maxTokens: number
  topP: number
}

// Model configurations optimized for question generation
export const MODEL_CONFIGS = {
  'qwen-72b': {
    model: 'qwen/qwen-2.5-72b-instruct',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    costPer1kTokens: 0.00035
  },
  'qwen-32b': {
    model: 'qwen/qwen-2.5-32b-instruct',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    costPer1kTokens: 0.00018
  },
  'qwen-7b': {
    model: 'qwen/qwen-2.5-7b-instruct',
    temperature: 0.7,
    maxTokens: 1500,
    topP: 0.9,
    costPer1kTokens: 0.00007
  }
} as const

// Initialize LangChain with OpenRouter
export function createAIClient(modelKey: keyof typeof MODEL_CONFIGS = 'qwen-32b') {
  const config = MODEL_CONFIGS[modelKey]
  
  return new ChatOpenAI({
    modelName: config.model,
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL || 'https://pingtopass.com',
        'X-Title': 'PingToPass AI'
      }
    },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    topP: config.topP,
    streaming: false // Disable for edge runtime
  })
}
```

### 2.2 Structured Output Parser
```typescript
// server/utils/ai/parsers.ts
import { z } from 'zod'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { OutputFixingParser } from 'langchain/output_parsers'

// Question schema with validation
const QuestionSchema = z.object({
  text: z.string().min(20).max(500),
  type: z.enum(['multiple_choice', 'multi_select', 'true_false']),
  difficulty: z.number().int().min(1).max(5),
  answers: z.array(z.object({
    id: z.string(),
    text: z.string().min(1).max(200),
    is_correct: z.boolean()
  })).min(2).max(6),
  explanation: z.string().min(50).max(1000),
  reference: z.string().optional(),
  tags: z.array(z.string()).optional()
})

const QuestionsArraySchema = z.array(QuestionSchema)

// Create parser with auto-fixing for malformed responses
export function createQuestionParser() {
  const baseParser = StructuredOutputParser.fromZodSchema(QuestionsArraySchema)
  
  // Wrap with output fixing parser for robustness
  const model = createAIClient('qwen-7b') // Use smaller model for fixing
  return OutputFixingParser.fromLLM(model, baseParser)
}

// Parse and validate questions
export async function parseQuestions(output: string): Promise<any[]> {
  const parser = createQuestionParser()
  
  try {
    return await parser.parse(output)
  } catch (error) {
    console.error('Failed to parse AI output:', error)
    // Attempt manual extraction as fallback
    return extractQuestionsManually(output)
  }
}

// Fallback parser for edge cases
function extractQuestionsManually(text: string): any[] {
  // Simple regex-based extraction
  const questions = []
  const questionBlocks = text.split(/Question \d+:/i)
  
  for (const block of questionBlocks.slice(1)) {
    try {
      // Extract components
      const textMatch = block.match(/Text: (.+?)(?=Type:|$)/s)
      const typeMatch = block.match(/Type: (.+?)(?=Difficulty:|$)/s)
      // ... extract other fields
      
      if (textMatch) {
        questions.push({
          text: textMatch[1].trim(),
          type: 'multiple_choice',
          difficulty: 3,
          // ... default values
        })
      }
    } catch {
      continue
    }
  }
  
  return questions
}
```

## 3. Question Generation Pipeline

### 3.1 Prompt Templates
```typescript
// server/utils/ai/prompts.ts
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

// System prompt for consistent behavior
export const SYSTEM_PROMPT = `You are an expert IT certification exam question writer with deep knowledge of {vendor} certifications.
Your questions are technically accurate, clear, and aligned with official exam objectives.
You follow these principles:
- Questions test practical knowledge and real-world scenarios
- Distractors (wrong answers) are plausible but clearly incorrect
- Explanations educate and reinforce concepts
- Difficulty accurately reflects the complexity level requested`

// Question generation template
export const QUESTION_GENERATION_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', `Generate {count} exam questions for the following certification objective:

Exam: {examName} ({examCode})
Vendor: {vendor}
Objective: {objectiveName}
Description: {objectiveDescription}
Topics: {topics}

Requirements:
- Question Type Distribution: {typeDistribution}
- Difficulty Distribution: {difficultyDistribution}
- Each question must have 4 answer options (or True/False)
- Include detailed explanations that teach the concept
- Reference the specific exam objective
- Ensure technical accuracy for {examCode} exam level

Output the questions in the following JSON format:
{formatInstructions}

Generate diverse questions covering different aspects of the objective.`]
])

// Review and enhancement prompt
export const ENHANCE_QUESTION_PROMPT = PromptTemplate.fromTemplate(`
Review and enhance this exam question for clarity and accuracy:

Original Question:
{originalQuestion}

Enhancement Requirements:
- Ensure technical accuracy
- Improve clarity without changing the core concept
- Enhance the explanation with more detail
- Verify all answer options are appropriate
- Add relevant tags for categorization

Return the enhanced question in the same JSON format.
`)
```

### 3.2 Generation Service
```typescript
// server/utils/ai/generator.ts
import { createAIClient } from './config'
import { QUESTION_GENERATION_PROMPT } from './prompts'
import { parseQuestions } from './parsers'
import { query } from '../db'

export interface GenerationParams {
  examId: number
  objectiveId: number
  count: number
  typeDistribution?: {
    multiple_choice: number
    multi_select: number
    true_false: number
  }
  difficultyDistribution?: {
    1: number // Easy
    2: number
    3: number // Medium
    4: number
    5: number // Hard
  }
}

export async function generateQuestions(params: GenerationParams) {
  // Get exam and objective details
  const [exam] = await query(`
    SELECT e.*, o.name as objective_name, o.description as objective_description
    FROM exams e
    JOIN objectives o ON o.exam_id = e.id
    WHERE e.id = ? AND o.id = ?
  `, [params.examId, params.objectiveId])
  
  if (!exam) throw new Error('Exam or objective not found')
  
  // Prepare distributions
  const typeDistribution = params.typeDistribution || {
    multiple_choice: 0.8,
    multi_select: 0.15,
    true_false: 0.05
  }
  
  const difficultyDistribution = params.difficultyDistribution || {
    1: 0.1,
    2: 0.25,
    3: 0.3,
    4: 0.25,
    5: 0.1
  }
  
  // Format instructions for structured output
  const parser = createQuestionParser()
  const formatInstructions = parser.getFormatInstructions()
  
  // Generate prompt
  const prompt = await QUESTION_GENERATION_PROMPT.format({
    count: params.count,
    examName: exam.name,
    examCode: exam.code,
    vendor: exam.vendor_id,
    objectiveName: exam.objective_name,
    objectiveDescription: exam.objective_description,
    topics: exam.objective_description, // Could enhance with topic extraction
    typeDistribution: JSON.stringify(typeDistribution),
    difficultyDistribution: JSON.stringify(difficultyDistribution),
    formatInstructions
  })
  
  // Call AI model
  const model = createAIClient('qwen-72b') // Use best model for generation
  const response = await model.invoke(prompt)
  
  // Parse response
  const questions = await parseQuestions(response.content as string)
  
  // Store in database
  const stored = await storeGeneratedQuestions(questions, params)
  
  // Log generation for cost tracking
  await logGeneration({
    examId: params.examId,
    objectiveId: params.objectiveId,
    model: 'qwen-72b',
    questionsGenerated: questions.length,
    tokensUsed: response.usage?.total_tokens || 0
  })
  
  return {
    generated: questions.length,
    questions: stored,
    cost: calculateCost(response.usage?.total_tokens || 0, 'qwen-72b')
  }
}

async function storeGeneratedQuestions(questions: any[], params: GenerationParams) {
  const stored = []
  
  for (const q of questions) {
    const result = await query(`
      INSERT INTO questions 
      (exam_id, objective_id, text, type, difficulty, answers, explanation, 
       reference, tags, ai_generated, ai_model, review_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'qwen-72b', 'pending')
      RETURNING id, text
    `, [
      params.examId,
      params.objectiveId,
      q.text,
      q.type,
      q.difficulty,
      JSON.stringify(q.answers),
      q.explanation,
      q.reference || null,
      JSON.stringify(q.tags || [])
    ])
    
    stored.push(result[0])
  }
  
  return stored
}
```

## 4. Batch Generation Strategy

### 4.1 Pre-Generation Pipeline
```typescript
// server/utils/ai/batch-generator.ts
export async function preGenerateExamQuestions(
  examId: number,
  targetPerObjective: number = 50
) {
  // Get all objectives
  const objectives = await query(
    'SELECT * FROM objectives WHERE exam_id = ? AND is_active = 1',
    [examId]
  )
  
  const results = {
    totalGenerated: 0,
    totalCost: 0,
    byObjective: {} as Record<number, any>
  }
  
  for (const objective of objectives) {
    // Check existing count
    const [{ count }] = await query(
      'SELECT COUNT(*) as count FROM questions WHERE objective_id = ? AND is_active = 1',
      [objective.id]
    )
    
    const needed = Math.max(0, targetPerObjective - count)
    if (needed === 0) continue
    
    console.log(`Generating ${needed} questions for objective ${objective.name}`)
    
    // Generate in batches to avoid timeout
    const batchSize = 10
    let generated = 0
    
    while (generated < needed) {
      const toGenerate = Math.min(batchSize, needed - generated)
      
      try {
        const result = await generateQuestions({
          examId,
          objectiveId: objective.id,
          count: toGenerate,
          // Vary difficulty for diversity
          difficultyDistribution: getDifficultyDistribution(objective.weight)
        })
        
        generated += result.generated
        results.totalGenerated += result.generated
        results.totalCost += result.cost
        
        results.byObjective[objective.id] = {
          name: objective.name,
          generated: generated,
          cost: result.cost
        }
        
        // Rate limiting - OpenRouter allows 200 req/min
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`Failed to generate for objective ${objective.id}:`, error)
        break
      }
    }
  }
  
  return results
}

// Adjust difficulty based on objective weight
function getDifficultyDistribution(weight: number) {
  if (weight > 0.3) {
    // Important objectives get more medium/hard questions
    return { 1: 0.05, 2: 0.2, 3: 0.35, 4: 0.3, 5: 0.1 }
  } else if (weight > 0.2) {
    // Standard distribution
    return { 1: 0.1, 2: 0.25, 3: 0.3, 4: 0.25, 5: 0.1 }
  } else {
    // Less important objectives get easier questions
    return { 1: 0.15, 2: 0.3, 3: 0.3, 4: 0.2, 5: 0.05 }
  }
}
```

### 4.2 Admin Interface
```typescript
// server/api/admin/ai/generate.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)
  
  const { exam_id, objective_id, count, mode } = await readBody(event)
  
  // Check monthly budget
  const monthlyUsage = await getMonthlyAIUsage()
  if (monthlyUsage.cost > 20) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Monthly AI budget exceeded'
    })
  }
  
  if (mode === 'batch') {
    // Queue for background processing
    const jobId = await queueBatchGeneration(exam_id, count || 50)
    
    return {
      success: true,
      data: {
        jobId,
        message: 'Batch generation queued',
        estimatedCost: estimateGenerationCost(count || 50)
      }
    }
  } else {
    // Generate immediately for single objective
    const result = await generateQuestions({
      examId: exam_id,
      objectiveId: objective_id,
      count: count || 10
    })
    
    return {
      success: true,
      data: result
    }
  }
})
```

## 5. Quality Control

### 5.1 Auto-Review Pipeline
```typescript
// server/utils/ai/reviewer.ts
export async function autoReviewQuestion(questionId: number) {
  const [question] = await query(
    'SELECT * FROM questions WHERE id = ?',
    [questionId]
  )
  
  if (!question) throw new Error('Question not found')
  
  // Quality checks
  const checks = {
    hasValidStructure: validateQuestionStructure(question),
    hasCorrectAnswer: validateHasCorrectAnswer(question),
    hasUniqueAnswers: validateUniqueAnswers(question),
    hasProperExplanation: question.explanation?.length > 50,
    difficultyAppropriate: await validateDifficulty(question)
  }
  
  const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length
  
  // Auto-approve high quality questions
  if (score >= 0.9) {
    await query(
      'UPDATE questions SET review_status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', questionId]
    )
    return { status: 'approved', score }
  }
  
  // Flag for manual review
  if (score < 0.6) {
    await query(
      'UPDATE questions SET review_status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['needs_revision', questionId]
    )
    return { status: 'needs_revision', score, issues: checks }
  }
  
  return { status: 'pending', score }
}

function validateQuestionStructure(question: any): boolean {
  const answers = JSON.parse(question.answers)
  return (
    question.text?.length > 20 &&
    answers.length >= 2 &&
    answers.every((a: any) => a.text && a.id)
  )
}

function validateHasCorrectAnswer(question: any): boolean {
  const answers = JSON.parse(question.answers)
  const correctCount = answers.filter((a: any) => a.is_correct).length
  
  if (question.type === 'multi_select') {
    return correctCount >= 1 && correctCount < answers.length
  }
  return correctCount === 1
}

function validateUniqueAnswers(question: any): boolean {
  const answers = JSON.parse(question.answers)
  const texts = answers.map((a: any) => a.text.toLowerCase().trim())
  return new Set(texts).size === texts.length
}

async function validateDifficulty(question: any): Promise<boolean> {
  // Could use AI to validate difficulty matches content
  // For now, simple heuristic
  const textLength = question.text.length
  const answerCount = JSON.parse(question.answers).length
  
  if (question.difficulty <= 2) {
    return textLength < 200 && answerCount <= 4
  } else if (question.difficulty >= 4) {
    return textLength > 100 || answerCount > 4
  }
  return true
}
```

## 6. Cost Management

### 6.1 Usage Tracking
```typescript
// server/utils/ai/cost-tracker.ts
const COST_PER_1K_TOKENS = {
  'qwen-72b': 0.00035,
  'qwen-32b': 0.00018,
  'qwen-7b': 0.00007
}

export async function logGeneration(params: {
  examId: number
  objectiveId: number
  model: string
  questionsGenerated: number
  tokensUsed: number
}) {
  const cost = calculateCost(params.tokensUsed, params.model)
  
  await query(`
    INSERT INTO ai_generation_log 
    (purpose, model, prompt_tokens, completion_tokens, total_tokens, 
     cost_cents, exam_id, objective_id, success)
    VALUES ('question_generation', ?, 0, 0, ?, ?, ?, ?, 1)
  `, [
    params.model,
    params.tokensUsed,
    Math.round(cost * 100),
    params.examId,
    params.objectiveId
  ])
}

export function calculateCost(tokens: number, model: string): number {
  const rate = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS] || 0.0002
  return (tokens / 1000) * rate
}

export async function getMonthlyAIUsage(): Promise<{
  tokens: number
  cost: number
  byModel: Record<string, { tokens: number; cost: number }>
}> {
  const rows = await query(`
    SELECT model, SUM(total_tokens) as tokens, SUM(cost_cents) as cost_cents
    FROM ai_generation_log
    WHERE created_at > datetime('now', '-30 days')
    GROUP BY model
  `)
  
  const byModel: Record<string, any> = {}
  let totalTokens = 0
  let totalCost = 0
  
  for (const row of rows) {
    byModel[row.model] = {
      tokens: row.tokens,
      cost: row.cost_cents / 100
    }
    totalTokens += row.tokens
    totalCost += row.cost_cents / 100
  }
  
  return {
    tokens: totalTokens,
    cost: totalCost,
    byModel
  }
}

export function estimateGenerationCost(questionCount: number, model = 'qwen-32b'): number {
  // Estimate ~500 tokens per question (prompt + response)
  const estimatedTokens = questionCount * 500
  return calculateCost(estimatedTokens, model)
}
```

### 6.2 Budget Enforcement
```typescript
// server/middleware/ai-budget.ts
export async function enforceAIBudget(event: any) {
  // Check if this is an AI endpoint
  if (!event.node.req.url?.includes('/api/admin/ai/')) {
    return
  }
  
  const usage = await getMonthlyAIUsage()
  const MONTHLY_BUDGET = 20 // $20 for AI
  
  if (usage.cost >= MONTHLY_BUDGET) {
    throw createError({
      statusCode: 429,
      statusMessage: `Monthly AI budget of $${MONTHLY_BUDGET} exceeded. Current usage: $${usage.cost.toFixed(2)}`
    })
  }
  
  // Warn if approaching limit
  if (usage.cost >= MONTHLY_BUDGET * 0.8) {
    console.warn(`AI budget warning: ${(usage.cost / MONTHLY_BUDGET * 100).toFixed(0)}% used`)
  }
}
```

## 7. Edge Deployment Optimizations

### 7.1 Minimal Dependencies
```typescript
// server/utils/ai/edge-client.ts
// Lightweight client for Cloudflare Workers
export class EdgeAIClient {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async generateQuestions(prompt: string, model = 'qwen/qwen-2.5-32b-instruct') {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pingtopass.com',
        'X-Title': 'PingToPass'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert exam question writer.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    })
    
    if (!response.ok) {
      throw new Error(`AI request failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    }
  }
}
```

### 7.2 Caching Generated Questions
```typescript
// Cache AI responses to reduce repeated calls
export async function getCachedOrGenerate(
  cacheKey: string,
  generateFn: () => Promise<any>,
  ttl = 86400 // 24 hours
) {
  // Check KV cache
  const cached = await env.KV.get(cacheKey, 'json')
  if (cached) return cached
  
  // Generate new
  const result = await generateFn()
  
  // Cache result
  await env.KV.put(cacheKey, JSON.stringify(result), {
    expirationTtl: ttl
  })
  
  return result
}
```

## 8. Admin Dashboard

### 8.1 Generation Status
```typescript
// server/api/admin/ai/status.get.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)
  
  const [usage, pending, quality] = await Promise.all([
    getMonthlyAIUsage(),
    query('SELECT COUNT(*) as count FROM questions WHERE review_status = "pending"'),
    query(`
      SELECT 
        AVG(CAST(total_attempts AS REAL) / NULLIF(correct_attempts, 0)) as avg_difficulty,
        COUNT(*) as total_questions,
        SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM questions 
      WHERE ai_generated = 1
    `)
  ])
  
  return {
    success: true,
    data: {
      usage: {
        ...usage,
        budgetRemaining: 20 - usage.cost,
        percentUsed: (usage.cost / 20) * 100
      },
      pending: pending[0].count,
      quality: quality[0],
      models: Object.keys(MODEL_CONFIGS).map(key => ({
        name: key,
        model: MODEL_CONFIGS[key as keyof typeof MODEL_CONFIGS].model,
        costPer1k: MODEL_CONFIGS[key as keyof typeof MODEL_CONFIGS].costPer1kTokens
      }))
    }
  }
})
```

This AI architecture provides:
- **LangChain integration** with structured output parsing
- **OpenRouter support** with Qwen models
- **Cost management** with budget tracking
- **Quality control** with auto-review
- **Edge optimization** for Cloudflare Workers
- **Batch generation** for pre-generating questions
- **Admin tools** for monitoring and control