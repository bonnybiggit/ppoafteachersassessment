import { ASSESSMENT_DOMAINS, type IAssessmentItem } from '../models/AssessmentItem'

// MVP configuration only; neither a calibrated length nor an adaptive algorithm.
export const DEFAULT_ASSESSMENT_LENGTH = 30
export const MVP_ASSESSMENT_VERSION = 'mvp-assembly-0.1'

type Candidate = Pick<IAssessmentItem, 'itemId' | 'primaryDomain' | 'isActive'> & {
  _id: { toString(): string }
}

export function assembleAssessment<T extends Candidate>(
  candidates: readonly T[],
  questionCount = DEFAULT_ASSESSMENT_LENGTH,
): T[] {
  if (!Number.isSafeInteger(questionCount) || questionCount < 1) {
    throw new RangeError('Assessment length must be a positive integer.')
  }
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
  const sorted = candidates.filter(item => item.isActive && ASSESSMENT_DOMAINS.includes(item.primaryDomain))
    .slice().sort((a, b) => compare(a.itemId, b.itemId) || compare(a._id.toString(), b._id.toString()))
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  const unique = sorted.filter(item => {
    const id = item._id.toString()
    if (seenIds.has(id) || seenNames.has(item.itemId)) return false
    seenIds.add(id)
    seenNames.add(item.itemId)
    return true
  })
  const groups = ASSESSMENT_DOMAINS.map(domain => unique.filter(item => item.primaryDomain === domain))
  const selected: T[] = []
  for (let round = 0; selected.length < questionCount; round++) {
    let found = false
    for (const group of groups) {
      if (group[round]) {
        selected.push(group[round])
        found = true
        if (selected.length === questionCount) return selected
      }
    }
    if (!found) return selected
  }
  return selected
}
