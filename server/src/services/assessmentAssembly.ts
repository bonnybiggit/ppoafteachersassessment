import { ASSESSMENT_DOMAINS, type IAssessmentItem } from '../models/AssessmentItem'
import { PILOT_ASSESSMENT_BLUEPRINT, PILOT_ASSESSMENT_MODE, PILOT_EVIDENCE_ORDER } from './pilotAssessmentBlueprint'

export { PILOT_ASSESSMENT_MODE }

// MVP configuration only; neither a calibrated length nor an adaptive algorithm.
export const DEFAULT_ASSESSMENT_LENGTH = 30
export const MVP_ASSESSMENT_VERSION = 'mvp-assembly-0.1'
export const DEFAULT_ASSESSMENT_MODE = 'default' as const

export type AssessmentAssemblyMode = typeof DEFAULT_ASSESSMENT_MODE | typeof PILOT_ASSESSMENT_MODE

type Candidate = Pick<IAssessmentItem, 'itemId' | 'primaryDomain' | 'isActive' | 'subcompetency' | 'evidenceType' | 'socialDesirabilityRisk' | 'difficulty' | 'criticalFlag' | 'version' | 'prompt'> & {
  _id: { toString(): string }
}

type AssembleOptions = {
  assessmentMode?: AssessmentAssemblyMode
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function isValidPilotCandidate(item: Candidate): boolean {
  if (!item || !ASSESSMENT_DOMAINS.includes(item.primaryDomain as typeof ASSESSMENT_DOMAINS[number])) return false
  if (typeof item.itemId !== 'string' || item.itemId.trim().length === 0) return false
  if (typeof item.prompt !== 'string' || item.prompt.trim().length === 0) return false
  if (typeof item.subcompetency !== 'string' || item.subcompetency.trim().length === 0) return false
  if (!PILOT_EVIDENCE_ORDER.includes(item.evidenceType as typeof PILOT_EVIDENCE_ORDER[number])) return false
  const version = String(item.version ?? '').trim().toLowerCase()
  return version.startsWith('synthetic')
}

function socialRiskScore(value: string | undefined): number {
  switch (value?.toLowerCase()) {
    case 'low': return 0
    case 'medium': return 1
    case 'high': return 2
    default: return 3
  }
}

function itemDifficultyScore(value: number | undefined): number {
  if (!Number.isFinite(value)) return Number.MAX_SAFE_INTEGER
  return Math.abs(Number(value))
}

function subcompetencyKey(item: Candidate): string {
  return String(item.subcompetency ?? '').trim().toLowerCase()
}

function rankingKey(item: Candidate, usedSubcompetencies: Set<string>): [number, number, number, number, string] {
  const validMetadata = item.prompt && item.subcompetency && item.version && item.evidenceType && item.primaryDomain ? 0 : 1
  const duplicateSubcompetency = usedSubcompetencies.has(subcompetencyKey(item)) ? 1 : 0
  const risk = socialRiskScore(item.socialDesirabilityRisk)
  const difficulty = itemDifficultyScore(item.difficulty)
  return [validMetadata, duplicateSubcompetency, risk, difficulty, item.itemId]
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

function selectPilotAssessment<T extends Candidate>(candidates: readonly T[]): T[] {
  const valid = dedupeByBankId(candidates.filter(isValidPilotCandidate))
  const byDomain = new Map<
    typeof ASSESSMENT_DOMAINS[number],
    T[]
  >(
    ASSESSMENT_DOMAINS.map(domain => [domain, valid.filter(item => item.primaryDomain === domain)]),
  )

  const selected: T[] = []
  const usedItemIds = new Set<string>()
  const usedSubcompetencies = new Map<typeof ASSESSMENT_DOMAINS[number], Set<string>>(
    ASSESSMENT_DOMAINS.map(domain => [domain, new Set<string>()]),
  )

  for (const domain of ASSESSMENT_DOMAINS) {
    const domainItems = (byDomain.get(domain) ?? []).slice().sort((a, b) => {
      const evidenceOrder = (item: T) => {
        const index = PILOT_EVIDENCE_ORDER.indexOf(item.evidenceType as typeof PILOT_EVIDENCE_ORDER[number])
        return index >= 0 ? index : Number.MAX_SAFE_INTEGER
      }
      const keyA = rankingKey(a, usedSubcompetencies.get(domain) ?? new Set())
      const keyB = rankingKey(b, usedSubcompetencies.get(domain) ?? new Set())
      const evidenceDelta = evidenceOrder(a) - evidenceOrder(b)
      if (evidenceDelta !== 0) return evidenceDelta
      for (let i = 0; i < keyA.length; i++) {
        const diff = keyA[i] < keyB[i] ? -1 : keyA[i] > keyB[i] ? 1 : 0
        if (diff !== 0) return diff
      }
      return compare(a.itemId, b.itemId)
    })

    const quotas = PILOT_ASSESSMENT_BLUEPRINT.domains[domain].evidenceTypeQuotas
    for (const evidenceType of PILOT_EVIDENCE_ORDER) {
      const count = quotas[evidenceType] ?? 0
      if (count === 0) continue
      const matches = domainItems.filter(item => item.evidenceType === evidenceType && !usedItemIds.has(item.itemId))
      if (matches.length < count) {
        throw new RangeError(`Insufficient eligible pilot items for ${domain} (${evidenceType}).`)
      }
      const chosen = matches
        .slice()
        .sort((a, b) => {
          const keyA = rankingKey(a, usedSubcompetencies.get(domain) ?? new Set())
          const keyB = rankingKey(b, usedSubcompetencies.get(domain) ?? new Set())
          for (let i = 0; i < keyA.length; i++) {
            const diff = keyA[i] < keyB[i] ? -1 : keyA[i] > keyB[i] ? 1 : 0
            if (diff !== 0) return diff
          }
          return compare(a.itemId, b.itemId)
        })
        .slice(0, count)
      for (const item of chosen) {
        selected.push(item)
        usedItemIds.add(item.itemId)
        usedSubcompetencies.get(domain)?.add(subcompetencyKey(item))
      }
    }
  }

  if (selected.length !== PILOT_ASSESSMENT_BLUEPRINT.totalItems) {
    throw new RangeError(`Pilot blueprint requires ${PILOT_ASSESSMENT_BLUEPRINT.totalItems} items, but only ${selected.length} were selected.`)
  }

  const final = selected.slice().sort((a, b) => {
    const domainDelta = ASSESSMENT_DOMAINS.indexOf(a.primaryDomain) - ASSESSMENT_DOMAINS.indexOf(b.primaryDomain)
    if (domainDelta !== 0) return domainDelta
    const evidenceDelta = PILOT_EVIDENCE_ORDER.indexOf(a.evidenceType as typeof PILOT_EVIDENCE_ORDER[number]) - PILOT_EVIDENCE_ORDER.indexOf(b.evidenceType as typeof PILOT_EVIDENCE_ORDER[number])
    if (evidenceDelta !== 0) return evidenceDelta
    return compare(a.itemId, b.itemId)
  })
  return final
}

export function assembleAssessment<T extends Candidate>(
  candidates: readonly T[],
  questionCount = DEFAULT_ASSESSMENT_LENGTH,
  options: AssembleOptions = {},
): T[] {
  const assessmentMode = options.assessmentMode ?? DEFAULT_ASSESSMENT_MODE

  if (!Number.isSafeInteger(questionCount) || questionCount < 1) {
    throw new RangeError('Assessment length must be a positive integer.')
  }

  if (assessmentMode === PILOT_ASSESSMENT_MODE) {
    const selected = selectPilotAssessment(candidates)
    if (questionCount !== selected.length) {
      throw new RangeError(`Pilot assessment requires exactly ${PILOT_ASSESSMENT_BLUEPRINT.totalItems} items.`)
    }
    return selected
  }

  const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
  const sorted = candidates.filter(item => item.isActive && ASSESSMENT_DOMAINS.includes(item.primaryDomain as typeof ASSESSMENT_DOMAINS[number]))
    .slice().sort((a, b) => compareText(a.itemId, b.itemId) || compareText(a._id.toString(), b._id.toString()))
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
