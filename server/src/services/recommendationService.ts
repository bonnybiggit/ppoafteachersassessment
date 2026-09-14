import { createHash } from 'node:crypto'
import { AssessmentAttempt } from '../models/AssessmentAttempt'
import { Teacher } from '../models/Teacher'
import { AssessmentError } from './assessmentService'
import { getGapDiagnosisForTeacher } from './gapDiagnosisService'
import { teacherSafeGapDiagnosis } from './gapDiagnosis'
import { loadCourseCatalog } from './courseCatalog'
import { generateRecommendations, recommendationContext, teacherSafeRecommendations } from './recommendationEngine'
import { RECOMMENDATION_RULES, RECOMMENDATION_VERSION, RECOMMENDATION_WEIGHTS } from './recommendationRules'

function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key =>
    `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

export async function getRecommendationsForTeacher(teacherId: string, attemptId: unknown) {
  if (typeof attemptId !== 'string' || !/^[a-f\d]{24}$/i.test(attemptId)) {
    throw new AssessmentError(400, 'attemptId must be a valid ObjectId.')
  }
  const filter = { _id: attemptId.toLowerCase(), teacherId }
  const existing = await AssessmentAttempt.findOne(filter)
  if (!existing) throw new AssessmentError(404, 'Assessment attempt not found.')
  if (existing.status !== 'completed' || !existing.scoring || !existing.gapDiagnosis) {
    throw new AssessmentError(409, 'A submitted, scored, gap-diagnosed attempt is required before recommendations.')
  }
  const scoringSnapshot = canonical(existing.toObject().scoring)
  // Preserve the existing dependency order. The gap service validates its own
  // cache against current scoring/evidence; recommendation logic never diagnoses
  // a gap or changes the scoring/diagnosis algorithms.
  const diagnosis = await getGapDiagnosisForTeacher(teacherId, attemptId)
  const attempt = await AssessmentAttempt.findOne(filter)
  if (!attempt?.gapDiagnosis || !attempt.scoring || attempt.status !== 'completed') {
    throw new AssessmentError(409, 'Assessment diagnosis changed; please retry recommendations.')
  }
  if (scoringSnapshot !== canonical(attempt.toObject().scoring) ||
    canonical(diagnosis) !== canonical(teacherSafeGapDiagnosis(attempt.gapDiagnosis.result))) {
    throw new AssessmentError(409, 'Assessment diagnosis changed; please retry recommendations.')
  }
  const profile = await Teacher.findById(teacherId).select(
    'classSize gradeOrClass subject cpdExperience digitalTeachingExperience adaptabilityOpenness selfEfficacyResilience',
  ).lean()
  // No connectivity/completed-course preferences exist in the current Teacher
  // schema. Leave them unknown; do not infer from CPD, school type, or location.
  const context = recommendationContext({
    classSize: profile?.classSize, gradeOrClass: profile?.gradeOrClass, subject: profile?.subject,
    cpdExperience: profile?.cpdExperience, digitalTeachingExperience: profile?.digitalTeachingExperience,
    adaptabilityOpenness: profile?.adaptabilityOpenness, selfEfficacyResilience: profile?.selfEfficacyResilience,
  })
  const catalog = loadCourseCatalog()
  const sourceFingerprint = createHash('sha256').update(canonical({ version: RECOMMENDATION_VERSION,
    rules: RECOMMENDATION_RULES, weights: RECOMMENDATION_WEIGHTS,
    diagnosis, diagnosisFingerprint: attempt.gapDiagnosis.sourceFingerprint, context,
    catalog: { ...catalog, courses: [...catalog.courses].sort((a, b) => a.courseId < b.courseId ? -1 : a.courseId > b.courseId ? 1 : 0) },
  })).digest('hex')
  if (attempt.recommendations?.sourceFingerprint === sourceFingerprint && attempt.recommendations.result.version === RECOMMENDATION_VERSION) {
    return teacherSafeRecommendations(attempt.recommendations.result)
  }
  const generated = generateRecommendations(diagnosis, catalog, context)
  const updated = await AssessmentAttempt.findOneAndUpdate({ ...filter, status: 'completed',
    'scoring.scoredAt': attempt.scoring.scoredAt,
    'gapDiagnosis.sourceFingerprint': attempt.gapDiagnosis.sourceFingerprint,
  }, { $set: { recommendations: { sourceFingerprint, ...generated } } }, { new: true, runValidators: true })
  if (!updated) throw new AssessmentError(409, 'Assessment diagnosis changed; please retry recommendations.')
  return teacherSafeRecommendations(generated.result)
}
