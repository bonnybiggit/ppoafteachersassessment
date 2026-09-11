import { AuthApiError } from './authService'
import { tokenStorage } from './tokenStorage'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '')
const apiUrl = `${apiBaseUrl}/api/assessment`

export interface AssessmentQuestionOption {
  id: string
  label: string
}

export interface AssessmentQuestion {
  itemId: string
  bankItemId: string
  prompt: string
  domain: string
  subcompetency: string
  evidenceType: string
  options: AssessmentQuestionOption[]
  questionOrder: number
}

export interface AssessmentAttempt {
  id: string
  teacherId: string
  status: 'in_progress' | 'submitted' | 'completed' | string
  startedAt: string
  completedAt?: string
  submittedAt?: string
  currentItemIndex: number
  totalItems: number
  mode: string
  assessmentVersion: string
  selectedItemIds: string[]
  consentConfirmed: boolean
  questions: AssessmentQuestion[]
}

export interface AssessmentResponseRecord {
  id: string
  attemptId: string
  itemId: string
  selectedResponse: unknown
  responseValue?: unknown
  responseDuration?: number
  answeredAt: string
}

export interface DomainScoringResult {
  domain: string
  domainWeight: number
  score: number | null
  classification: string
  validItemCount: number
  expectedItemCount: number
  completionRate: number
  evidenceTypeScores: Record<string, number | null>
  evidenceTypesPresent: string[]
  evidenceTypesMissing: string[]
  confidenceLevel: 'High' | 'Medium' | 'Low'
  qualityFlags: string[]
  nearCutScore: boolean
  criticalItemFlagged: boolean
}

export interface AttemptScoringResult {
  attemptId: string
  scoringVersion: string
  overallCompetencyScore: number | null
  overallClassification: string
  domains: DomainScoringResult[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStorage.read()
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(20000),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload || typeof payload !== 'object' || Array.isArray(payload) || payload.success === false) {
    const message = payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : 'The assessment service is temporarily unavailable. Please try again.'
    throw new AuthApiError(response.status || 500, message)
  }

  return payload as T
}

export async function startAssessmentAttempt(input: { consentConfirmed: boolean; mode: string }): Promise<AssessmentAttempt> {
  const data = await request<{ success: true; attempt: AssessmentAttempt }>('/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return data.attempt
}

export async function getCurrentAttempt(): Promise<AssessmentAttempt> {
  const data = await request<{ success: true; attempt: AssessmentAttempt }>('/attempts/current')
  return data.attempt
}

export async function saveAssessmentResponse(
  attemptId: string,
  itemId: string,
  selectedResponse: unknown,
  responseValue?: unknown,
  responseDuration?: number,
  answeredAt?: string,
): Promise<AssessmentResponseRecord> {
  const data = await request<{ success: true; response: AssessmentResponseRecord }>(`/attempts/${attemptId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId,
      selectedResponse,
      responseValue: responseValue ?? selectedResponse,
      responseDuration,
      answeredAt: answeredAt ?? new Date().toISOString(),
    }),
  })
  return data.response
}

export async function submitAssessmentAttempt(attemptId: string): Promise<AssessmentAttempt> {
  const data = await request<{ success: true; attempt: AssessmentAttempt }>(`/attempts/${attemptId}/submit`, {
    method: 'POST',
  })
  return data.attempt
}

export async function getAssessmentScore(attemptId: string): Promise<AttemptScoringResult> {
  const data = await request<{ success: true; scoring: AttemptScoringResult }>(`/attempts/${attemptId}/score`)
  return data.scoring
}
