import type { AssessmentAttempt, AssessmentResponseRecord } from './assessmentService'

export function restoreAssessment(attempt: AssessmentAttempt, responses: AssessmentResponseRecord[]) {
  const selectedIds = new Set(attempt.questions.map(question => question.itemId))
  const answers: Record<string, AssessmentResponseRecord> = {}
  for (const response of responses) {
    if (response.attemptId === attempt.id && selectedIds.has(response.itemId)) answers[response.itemId] = response
  }
  // currentItemIndex counts responses; it is not a persisted navigation cursor.
  const firstUnanswered = attempt.questions.findIndex(question => !answers[question.itemId])
  return { answers, currentIndex: firstUnanswered < 0 ? Math.max(0, attempt.questions.length - 1) : firstUnanswered }
}

export function draftKey(attempt: AssessmentAttempt) {
  return `ppoaf.assessment.draft.${attempt.teacherId}.${attempt.id}`
}
