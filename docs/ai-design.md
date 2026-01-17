# Gemini AI Design & Integration

## AI Design Philosophy

**KRISIS is not an AI chatbot.** KRISIS is a **decision intelligence platform** that uses constrained AI to provide structured signals for human judgment.

### Core Constraints

KRISIS does **NOT**:
- Predict outcomes
- Make decisions
- Chat conversationally
- Improvise or speculate
- Rewrite resumes automatically
- Guarantee results

KRISIS **ONLY**:
- Evaluates alignment
- Scores matches (0-100)
- Identifies gaps
- Suggests concrete next actions
- Provides structured feedback

---

## AI Integration Architecture

### Use Cases

1. **Resume-Job Fit Analysis** - Score alignment between candidate profile and role requirements
2. **Cover Letter Generation** - Create tailored draft cover letters
3. **Interview Preparation** - Generate practice questions based on role
4. **Company Research** - Extract insights from job descriptions

### Technical Integration

#### Gemini API Configuration

```typescript
// AI Service Configuration
const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash', // Cost-effective for structured tasks
  maxTokens: 2048,
  temperature: 0.7,
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
};
```

#### Rate Limiting Strategy

```typescript
// Rate limiter for Gemini API calls
import { RateLimiterMemory } from 'rate-limiter-flexible';

const geminiRateLimiter = new RateLimiterMemory({
  points: 60, // 60 requests per minute
  duration: 60,
  blockDuration: 60 // Block for 1 minute if exceeded
});

async function callGeminiAPI(userId: string, prompt: string) {
  try {
    await geminiRateLimiter.consume(userId, 1);

    const result = await model.generateContent(prompt);
    return result.response.text();

  } catch (error) {
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw new Error('Too many AI requests. Please try again in 1 minute.');
    }
    throw error;
  }
}
```

---

## Prompt Engineering

### Canonical Analysis Prompt

This is the **only MVP prompt**. No variations allowed.

```
SYSTEM: You are an assistant that evaluates job applications. You must return VALID JSON ONLY. Do not include explanations, markdown, or commentary. Do not speculate beyond the provided information.

USER: Evaluate the following job application.

Context:
- The applicant has already applied for this role.
- Your task is to assess alignment and suggest improvements.
- Do NOT guarantee outcomes.

Job Application:
Company: {{company}}
Role: {{role}}
Status: {{status}}

Resume Content (if available): {{resumeText | "Not provided"}}

Return a JSON object with EXACTLY the following structure:

{
  "fitScore": number (0–100),
  "matchingSkills": string[] (3–5 items),
  "gaps": string[] (2–3 items),
  "nextSteps": string[] (2–4 items)
}

Rules:
- fitScore must be an integer.
- matchingSkills must reference observable skills only.
- gaps must be actionable and realistic.
- nextSteps must be concrete actions the applicant can take.
- If information is insufficient, infer conservatively.
- Do not hallucinate company-specific details.
```

### Prompt Design Principles

1. **SYSTEM instructions constrain behavior** - Clear boundaries prevent hallucination
2. **JSON-only requirement** - Enables programmatic validation
3. **Conservative inference rule** - Reduces speculation
4. **No free text** - Prevents UX chaos and inconsistent responses

---

## Server-Side Enforcement

### Schema Validation

```typescript
function validateAIResponse(data: any): boolean {
  return (
    Number.isInteger(data.fitScore) &&
    data.fitScore >= 0 &&
    data.fitScore <= 100 &&
    Array.isArray(data.matchingSkills) &&
    data.matchingSkills.length >= 3 &&
    data.matchingSkills.length <= 5 &&
    Array.isArray(data.gaps) &&
    data.gaps.length >= 2 &&
    data.gaps.length <= 3 &&
    Array.isArray(data.nextSteps) &&
    data.nextSteps.length >= 2 &&
    data.nextSteps.length <= 4 &&
    // Validate string content
    data.matchingSkills.every(s => typeof s === 'string' && s.length > 0) &&
    data.gaps.every(s => typeof s === 'string' && s.length > 0) &&
    data.nextSteps.every(s => typeof s === 'string' && s.length > 0)
  );
}
```

### Retry Logic (Strict)

```typescript
const MAX_RETRIES = 2;

async function generateAnalysis(applicationData: ApplicationData): Promise<AnalysisResult> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const prompt = buildAnalysisPrompt(applicationData);
    const result = await callGeminiAPI(applicationData.userId, prompt);

    try {
      const parsed = JSON.parse(result);
      if (validateAIResponse(parsed)) {
        return parsed;
      }
    } catch (_) {
      // JSON parse failed
    }

    if (attempt === MAX_RETRIES) {
      throw new Error("AI_VALIDATION_FAILED");
    }
  }
}
```

**Key Rules**:
- Maximum 2 retries
- No infinite loops
- No silent degradation
- Validation failures are terminal

---

## Failure Handling Strategy

### Gemini Timeout/API Error

**Backend Response**:
- Log error with correlation ID
- Do not write partial data
- Return controlled failure state

**Frontend UX**:
> "We couldn't analyze this application right now. Please try again later."

### Schema Violation (Hallucination)

**Backend Response**:
- Discard invalid response
- Log validation failure
- Increment error metrics

**Frontend UX**:
> "Analysis failed due to formatting issues. Please retry."

### Rate Limit Exceeded

**Backend Response**:
- Enforce per-user quota
- Reject early with clear error

**Frontend UX**:
> "You've reached your analysis limit for now. Please try again later."

---

## Cost & Trust Controls

### Per-User Quota System

```typescript
// Quota enforcement
const USER_QUOTAS = {
  weeklyAnalyses: 50,  // AI analysis calls per week
  monthlyGenerations: 100  // Content generations per month
};

async function checkQuota(userId: string, action: string): Promise<boolean> {
  const quota = await getUserQuota(userId, action);
  return quota.remaining > 0;
}
```

### Caching Strategy

**Cache Key Generation**:
```typescript
function generateCacheKey(application: ApplicationData): string {
  return crypto.createHash('sha256')
    .update(`${application.company}-${application.role}-${application.resumeHash}`)
    .digest('hex');
}
```

**Cache Lookup**:
- Same company + role + resume = reuse analysis
- Reduces API calls and costs
- Prevents inconsistent results

### Intent-Based Triggering

```typescript
// Only analyze when explicitly requested
interface ApplicationData {
  // ... other fields
  requestAnalysis?: boolean;  // Must be true to trigger AI
}

if (!application.requestAnalysis) {
  return; // No AI call
}
```

This prevents:
- Accidental Gemini calls
- Background processing costs
- Unnecessary quota consumption

---

## AI Output Quality Assurance

### Validation Metrics

**Track These Metrics**:
- Success rate (valid JSON responses)
- Average analysis time
- Validation failure rate
- Retry count distribution
- Per-user usage patterns

### Quality Monitoring

```typescript
// Log analysis quality metrics
await logAnalyticsEvent('ai_analysis_quality', {
  userId,
  applicationId,
  fitScore,
  matchingSkillsCount: analysis.matchingSkills.length,
  gapsCount: analysis.gaps.length,
  nextStepsCount: analysis.nextSteps.length,
  processingTimeMs: Date.now() - startTime,
  retryCount: attempt - 1
});
```

### A/B Testing Framework (Future)

Prepare for prompt optimization:
- Version prompts with unique IDs
- Track performance by prompt version
- Gradual rollout of improvements

---

## Security Considerations

### Input Sanitization

**User Input Validation**:
```typescript
function sanitizeApplicationData(data: ApplicationData): ApplicationData {
  return {
    company: data.company?.substring(0, 100) || '',
    role: data.role?.substring(0, 100) || '',
    status: ['Applied', 'Interview', 'Rejected', 'Offer'].includes(data.status)
      ? data.status
      : 'Applied',
    resumeText: data.resumeText?.substring(0, 10000) || '' // Limit size
  };
}
```

### Output Sanitization

**AI Response Cleaning**:
```typescript
function sanitizeAIOutput(analysis: AnalysisResult): AnalysisResult {
  return {
    fitScore: Math.max(0, Math.min(100, analysis.fitScore)),
    matchingSkills: analysis.matchingSkills.slice(0, 5).map(s => s.substring(0, 200)),
    gaps: analysis.gaps.slice(0, 3).map(s => s.substring(0, 200)),
    nextSteps: analysis.nextSteps.slice(0, 4).map(s => s.substring(0, 200))
  };
}
```

### Privacy Protection

- No PII in prompts
- No user data in logs (except correlation IDs)
- Encrypted storage of API keys
- Audit logging of AI usage

---

## Performance Optimization

### Response Time Targets

- **AI Analysis**: < 10 seconds (p95)
- **Cache Hit**: < 100ms
- **Quota Check**: < 50ms

### Batch Processing (Future)

```typescript
// Group similar analyses
async function batchAnalyze(applications: ApplicationData[]): Promise<AnalysisResult[]> {
  const batches = groupBySimilarity(applications);

  const results = await Promise.all(
    batches.map(batch => analyzeBatch(batch))
  );

  return results.flat();
}
```

### Streaming Responses (Future)

For long-form content generation:
```typescript
const result = await model.generateContentStream(prompt);
for await (const chunk of result.stream) {
  // Process chunks as they arrive
}
```

---

## Monitoring & Observability

### Key AI Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Success Rate | > 95% | < 90% |
| Average Latency | < 8s | > 15s |
| Validation Failures | < 2% | > 5% |
| Cost per Analysis | < $0.01 | > $0.05 |

### Error Tracking

```typescript
// Structured error logging
logger.error('AI analysis failed', {
  userId,
  applicationId,
  error: error.message,
  errorType: error.name,
  attemptNumber: attempt,
  promptVersion: '1.0',
  severity: 'ERROR',
  labels: { component: 'ai-service', critical: false }
});
```

### Usage Analytics

Track:
- Most requested analysis types
- User engagement with AI features
- Conversion from free to paid usage
- Feature usage patterns

---

## Future AI Enhancements

### Planned Improvements

1. **Multi-Modal Analysis** - Include resume PDFs
2. **Contextual Learning** - User feedback loop
3. **Specialized Models** - Fine-tuned for job matching
4. **Batch Processing** - Analyze multiple applications
5. **Real-time Validation** - Instant feedback

### Model Evolution Strategy

- Start with general-purpose Gemini
- A/B test specialized prompts
- Consider fine-tuning for domain-specific accuracy
- Maintain backward compatibility

---

## AI Ethics & Transparency

### User Communication

**Always include disclaimers**:
> "AI analysis is for informational purposes only and does not guarantee hiring outcomes."

### Bias Mitigation

- Diverse training data consideration
- Regular bias audits
- User feedback mechanisms
- Transparent scoring methodology

### Data Privacy

- No training on user data without consent
- Clear data usage policies
- Right to delete AI-generated content
- GDPR compliance for AI features

---

This AI design ensures KRISIS provides reliable, cost-effective, and trustworthy AI assistance while maintaining strict boundaries around automation and prediction.