import { createHash } from 'node:crypto'
import { AssessmentAttempt } from '../models/AssessmentAttempt'
import { AssessmentItem, type IAssessmentItem } from '../models/AssessmentItem'
import { AssessmentResponse } from '../models/AssessmentResponse'
import { Teacher } from '../models/Teacher'
import { AssessmentError } from './assessmentService'
import { itemScoreFromResponse, SCORING_VERSION } from './assessmentScoring'
import { diagnoseGaps, teacherSafeGapDiagnosis, type ContextSignal, type GapContext, type GapItemEvidence } from './gapDiagnosis'
import { GAP_DIAGNOSIS_VERSION, GAP_RULES } from './gapDiagnosisRules'

function stable(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

// The existing selectedResponse supports structured evidence. Consume only
// explicitly reported booleans when present; plain choice IDs supply NO context.
// No context is inferred from a scenario's wording, item tags, age, gender,
// income, school location/type, or device ownership. This does not add fields to
// the save-response API or populate any profile/question records.
export function reportedContext(selectedResponse: unknown): ContextSignal[] {
  if (!selectedResponse || typeof selectedResponse !== 'object' || Array.isArray(selectedResponse)) return []
  const context = (selectedResponse as Record<string, unknown>).context
  if (!context || typeof context !== 'object' || Array.isArray(context)) return []
  const record = context as Record<string, unknown>
  const mapping: Record<string, ContextSignal> = {
    limitedOpportunity: 'limited_opportunity', resourceAccessBarrier: 'resource_access_barrier',
    complexTeachingContext: 'complex_context', lowSelfEfficacy: 'low_self_efficacy',
  }
  return Object.keys(mapping).filter(key => record[key] === true).map(key => mapping[key])
}

export async function getGapDiagnosisForTeacher(teacherId: string, attemptId: unknown) {
  if (typeof attemptId !== 'string' || !/^[a-f\d]{24}$/i.test(attemptId)) {
    throw new AssessmentError(400, 'attemptId must be a valid ObjectId.')
  }
  const attempt = await AssessmentAttempt.findOne({ _id: attemptId.toLowerCase(), teacherId })
  if (!attempt) throw new AssessmentError(404, 'Assessment attempt not found.')
  if (attempt.status !== 'completed') throw new AssessmentError(409, 'Assessment attempt must be submitted before gap diagnosis.')
  if (!attempt.scoring) throw new AssessmentError(409, 'A persisted scoring result is required before gap diagnosis.')
  const scoring = attempt.toObject().scoring!
  if (scoring.scoringVersion !== SCORING_VERSION) throw new AssessmentError(409, 'The scoring version must be updated before gap diagnosis.')

  const [items, responses, profile] = await Promise.all([
    AssessmentItem.find({ _id: { $in: attempt.selectedItemIds } })
      .select('_id itemId primaryDomain subcompetency evidenceType responseKey reverseKeyed').lean(),
    AssessmentResponse.find({ teacherId, attemptId: attempt._id }).select('itemId selectedResponse').lean(),
    Teacher.findById(teacherId).select('classSize cpdExperience digitalTeachingExperience selfEfficacyResilience').lean(),
  ])
  const itemMap = new Map(items.map(item => [item._id.toString(), item]))
  if (attempt.selectedItemIds.some(id => !itemMap.has(id.toString()))) {
    throw new AssessmentError(409, 'An assigned question is unavailable. Please contact assessment support.')
  }
  const responseMap = new Map(responses.map(response => [response.itemId.toString(), response]))
  const evidence: GapItemEvidence[] = attempt.selectedItemIds.map(id => {
    const item = itemMap.get(id.toString())!
    const response = responseMap.get(id.toString()) ?? null
    return {
      domain: item.primaryDomain, subcompetency: item.subcompetency, evidenceType: item.evidenceType,
      score: itemScoreFromResponse(item as IAssessmentItem, response),
      contextualSignals: item.evidenceType === 'behaviour frequency' || item.evidenceType === 'performance evidence'
        ? reportedContext(response?.selectedResponse) : [],
    }
  })
  const context: GapContext = {
    classSize: profile?.classSize, cpdExperience: profile?.cpdExperience,
    digitalTeachingExperience: profile?.digitalTeachingExperience, selfEfficacyResilience: profile?.selfEfficacyResilience,
  }
  const sourceFingerprint = createHash('sha256').update(stable({ version: GAP_DIAGNOSIS_VERSION,
    rules: GAP_RULES, scoring, evidence, context })).digest('hex')
  if (attempt.gapDiagnosis?.sourceFingerprint === sourceFingerprint && attempt.gapDiagnosis.result.version === GAP_DIAGNOSIS_VERSION) {
    return teacherSafeGapDiagnosis(attempt.gapDiagnosis.result)
  }
  const result = diagnoseGaps(scoring, evidence, context)
  // Replace one versioned field. Scoring and all assessment/teacher/item data
  // remain untouched. A concurrent rescore invalidates this snapshot.
  const updated = await AssessmentAttempt.findOneAndUpdate({
    _id: attempt._id, teacherId, status: 'completed',
    'scoring.scoredAt': scoring.scoredAt, 'scoring.scoringVersion': scoring.scoringVersion,
  }, { $set: { gapDiagnosis: { sourceFingerprint, result } } }, { new: true, runValidators: true })
  if (!updated) throw new AssessmentError(409, 'Assessment scoring changed; please retry gap diagnosis.')
  return teacherSafeGapDiagnosis(result)
}
