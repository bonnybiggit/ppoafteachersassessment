const { ASSESSMENT_DOMAINS } = require('../../dist/models/AssessmentItem')
const scoring = require('../../dist/services/assessmentScoring')
const { diagnoseGaps } = require('../../dist/services/gapDiagnosis')
const TYPES = scoring.EVIDENCE_TYPES
const [SJT, BF, KA, RJ, PE] = TYPES
const counts = [4, 3, 2, 2, 1]
function domain(overrides = {}, index = 0) {
  const evidenceTypeScores = Object.fromEntries(TYPES.map(type => [type, 80]))
  Object.assign(evidenceTypeScores, overrides.evidenceTypeScores)
  const present = TYPES.filter(type => typeof evidenceTypeScores[type] === 'number')
  const score = scoring.calculateEvidenceWeightedScore(evidenceTypeScores, present)
  return { domain: ASSESSMENT_DOMAINS[index], domainWeight: scoring.DOMAIN_WEIGHTS[ASSESSMENT_DOMAINS[index]],
    score, classification: scoring.classifyCompetencyScore(score), validItemCount: 12, expectedItemCount: 12,
    completionRate: 1, confidenceLevel: 'High', qualityFlags: [], nearCutScore: scoring.nearCutScore(score),
    criticalItemFlagged: false, criticalItemIds: [], ...overrides, evidenceTypeScores }
}
function scoringFixture(first = domain()) {
  return { status: 'scored', scoredAt: new Date('2026-09-01T00:00:00Z'), scoringVersion: scoring.SCORING_VERSION,
    overallCompetencyScore: 80, overallClassification: 'Advanced',
    domains: ASSESSMENT_DOMAINS.map((_, index) => index === ASSESSMENT_DOMAINS.indexOf(first.domain) ? first : domain({}, index)) }
}
function evidenceFor(source, signals = []) {
  return source.domains.flatMap(domain => TYPES.flatMap((evidenceType, t) => Array.from({ length: counts[t] }, (_, i) => ({
    domain: domain.domain, subcompetency: `fixture-area-${i}`, evidenceType,
    score: domain.evidenceTypeScores[evidenceType], contextualSignals: evidenceType === PE ? signals : [],
  }))))
}
function diagnosisFixture(overrides = {}, index = 0) {
  const source = scoringFixture(domain({ evidenceTypeScores: { [KA]: 20 }, ...overrides }, index))
  return diagnoseGaps(source, evidenceFor(source))
}
module.exports = { domain, scoringFixture, evidenceFor, diagnosisFixture, TYPES, SJT, BF, KA, RJ, PE, counts }
