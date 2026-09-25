import { ASSESSMENT_DOMAINS, type IAssessmentItem } from '../models/AssessmentItem'
import { OFFICIAL_VERSION } from './officialAssessmentImport'

export { OFFICIAL_VERSION }

export const OFFICIAL_ASSESSMENT_MODE = 'official' as const

export type AssessmentAssemblyMode = typeof OFFICIAL_ASSESSMENT_MODE

type Candidate = Pick<IAssessmentItem, 'itemId' | 'primaryDomain' | 'isActive' | 'subcompetency' | 'evidenceType' | 'socialDesirabilityRisk' | 'difficulty' | 'criticalFlag' | 'version' | 'prompt'> & {
  _id: { toString(): string }
  assessmentVersion?: string
  mode?: string
  domainNumber?: number
  section?: 'A' | 'B'
  sourceQuestionNumber?: number
  documentOrder?: number
}

function dedupeByBankId<T extends Candidate>(items: readonly T[]): T[] {
  const seenIds = new Set<string>()
  const seenItemIds = new Set<string>()
  return items.filter(item => {
    const id = item._id.toString()
    if (seenIds.has(id) || seenItemIds.has(item.itemId)) return false
    seenIds.add(id)
    seenItemIds.add(item.itemId)
    return true
  })
}

function selectOfficialAssessment<T extends Candidate>(candidates: readonly T[]): T[] {
  const selected = dedupeByBankId(candidates.filter(item =>
    item.version === OFFICIAL_VERSION && item.assessmentVersion === OFFICIAL_VERSION &&
    item.mode === OFFICIAL_ASSESSMENT_MODE && item.isActive === false))
    .slice().sort((a, b) => (a.documentOrder ?? Number.MAX_SAFE_INTEGER) - (b.documentOrder ?? Number.MAX_SAFE_INTEGER))

  if (selected.length !== 450) throw new RangeError('Official assessment requires exactly 450 imported items.')
  for (const [index, item] of selected.entries()) {
    const expectedDomainNumber = Math.floor(index / 50) + 1
    const expectedQuestionNumber = index % 50 + 1
    if (item.documentOrder !== index + 1 || item.domainNumber !== expectedDomainNumber ||
      item.primaryDomain !== ASSESSMENT_DOMAINS[expectedDomainNumber - 1] ||
      item.sourceQuestionNumber !== expectedQuestionNumber || item.section !== (expectedQuestionNumber <= 30 ? 'A' : 'B')) {
      throw new RangeError(`Official manifest order is invalid at position ${index + 1}.`)
    }
  }
  return selected
}

export function assembleAssessment<T extends Candidate>(
  candidates: readonly T[],
  questionCount = 450,
  options: { assessmentMode?: AssessmentAssemblyMode } = {},
): T[] {
  if (options.assessmentMode !== undefined && options.assessmentMode !== OFFICIAL_ASSESSMENT_MODE) {
    throw new RangeError('Only the official assessment is supported.')
  }
  if (questionCount !== 450) throw new RangeError('Official assessment requires exactly 450 items.')
  return selectOfficialAssessment(candidates)
}
