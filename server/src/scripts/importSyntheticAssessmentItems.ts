import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { AssessmentItem, ASSESSMENT_DOMAINS, EVIDENCE_TYPES } from '../models/AssessmentItem'
import { connectDatabase, disconnectDatabase } from '../config/database'

const SOURCE_FILES = [
  'human-centred-teaching-empathy.synthetic.v0.1.json',
  'communication-influence.synthetic.v0.1.json',
  'classroom-leadership-behaviour-design.synthetic.v0.1.json',
  'adaptive-teaching-problem-solving.synthetic.v0.1.json',
  'practical-pedagogy-learning-design.synthetic.v0.1.json',
  'resourcefulness-entrepreneurial-thinking.synthetic.v0.1.json',
  'digital-future-skills.synthetic.v0.1.json',
  'personal-effectiveness-professional-identity.synthetic.v0.1.json',
  'community-engagement.synthetic.v0.1.json',
] as const

const EXPECTED_TOTAL_ITEMS = 450
const EXPECTED_DOMAIN_COUNT = 50
const EXPECTED_EVIDENCE_COUNTS = {
  'situational judgement': 18,
  'behaviour frequency': 11,
  'knowledge/application': 8,
  'reflective judgement': 7,
  'performance evidence': 6,
} as const
const EXPECTED_DOMAIN_EVIDENCE_COUNT = 9

const DOMAIN_NAME_SET = new Set<string>(ASSESSMENT_DOMAINS)
const DOMAIN_NAME_MAP: Record<string, string> = {
  D5: 'Practical Pedagogy & Learning Design',
  D6: 'Resourcefulness & Entrepreneurial Thinking',
  D7: 'Digital & Future Skills',
  D8: 'Personal Effectiveness & Professional Identity',
  D9: 'Community Engagement',
}
const EVIDENCE_NAME_SET = new Set<string>(EVIDENCE_TYPES)

const DATA_DIR = path.resolve(__dirname, '../../data')

class PreflightValidationError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new PreflightValidationError(message)
  }
}

function toCamelCaseRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = key
      .replace(/^_+/, '')
      .replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())
    result[normalizedKey] = value
  }
  return result
}

function normalizeBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  throw new PreflightValidationError(`Invalid boolean for ${fieldName}: ${String(value)}`)
}

function normalizeItem(raw: Record<string, unknown>, sourceName: string): Record<string, unknown> {
  const record = toCamelCaseRecord(raw)

  const itemId = String(record.itemId ?? record.item_id ?? '').trim()
  const prompt = String(record.prompt ?? '').trim()
  const rawPrimaryDomain = String(record.primaryDomain ?? record.primary_domain ?? '').trim()
  const primaryDomain = DOMAIN_NAME_MAP[rawPrimaryDomain] ?? rawPrimaryDomain
  const subcompetency = String(record.subcompetency ?? '').trim()
  const evidenceType = String(record.evidenceType ?? record.evidence_type ?? '').trim()
  const difficulty = Number(record.difficulty)
  const discrimination = Number(record.discrimination)
  const profileTags = Array.isArray(record.profileTags) ? record.profileTags.map(tag => String(tag).trim()) : Array.isArray(record.profile_tags) ? record.profile_tags.map(tag => String(tag).trim()) : []
  const reverseKeyed = normalizeBoolean(record.reverseKeyed ?? record.reverse_keyed, `${itemId || sourceName}: reverseKeyed`)
  const responseKey = record.responseKey ?? record.response_key
  const socialDesirabilityRisk = typeof record.socialDesirabilityRisk === 'string'
    ? record.socialDesirabilityRisk.trim()
    : typeof record.social_desirability_risk === 'string'
      ? record.social_desirability_risk.trim()
      : undefined
  const criticalFlag = normalizeBoolean(record.criticalFlag ?? record.critical_flag, `${itemId || sourceName}: criticalFlag`)
  const courseTags = Array.isArray(record.courseTags) ? record.courseTags.map(tag => String(tag).trim()) : Array.isArray(record.course_tags) ? record.course_tags.map(tag => String(tag).trim()) : []
  const version = String(record.version ?? '').trim()
  const isActive = normalizeBoolean(record.isActive ?? record.is_active, `${itemId || sourceName}: isActive`)

  assert(itemId, `${sourceName}: missing itemId`)
  assert(prompt, `${itemId}: missing prompt`)
  assert(DOMAIN_NAME_SET.has(primaryDomain), `${itemId}: unsupported primaryDomain '${rawPrimaryDomain}' mapped to '${primaryDomain}'`)
  assert(subcompetency, `${itemId}: missing subcompetency`)
  assert(EVIDENCE_NAME_SET.has(evidenceType), `${itemId}: unsupported evidenceType '${evidenceType}'`)
  assert(Number.isInteger(difficulty) && [1, 2, 3].includes(difficulty), `${itemId}: difficulty must be 1, 2 or 3`)
  assert(Number.isFinite(discrimination) && discrimination === 0, `${itemId}: discrimination must be 0 for this provisional bank`)
  assert(Array.isArray(profileTags), `${itemId}: profileTags must be an array`)
  assert(responseKey && typeof responseKey === 'object', `${itemId}: responseKey missing or invalid`)
  assert(['low', 'medium', 'high'].includes(String(socialDesirabilityRisk ?? '')), `${itemId}: socialDesirabilityRisk missing or invalid`)
  assert(Array.isArray(courseTags) && courseTags.length > 0, `${itemId}: courseTags missing or empty`)
  assert(version, `${itemId}: version missing`)
  assert(isActive === false, `${itemId}: imported item must remain inactive`)

  return {
    itemId,
    prompt,
    primaryDomain,
    subcompetency,
    evidenceType,
    difficulty,
    discrimination,
    profileTags,
    reverseKeyed,
    responseKey,
    socialDesirabilityRisk,
    criticalFlag,
    courseTags,
    version,
    isActive,
  }
}

function deepStableMatch(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

async function loadAndValidateSources(): Promise<Record<string, unknown>[]> {
  const filePaths = await Promise.all(SOURCE_FILES.map(async (fileName) => {
    const fullPath = path.join(DATA_DIR, fileName)
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      throw new PreflightValidationError(`Missing required source file: ${fileName}`)
    }
  }))

  assert(filePaths.length === SOURCE_FILES.length, 'Expected exactly 9 source files')

  const allItems: Record<string, unknown>[] = []
  const domainCounts: Record<string, number> = Object.fromEntries(ASSESSMENT_DOMAINS.map(domain => [domain, 0]))
  const evidenceCounts: Record<string, number> = Object.fromEntries(EVIDENCE_TYPES.map(type => [type, 0]))
  const domainEvidenceCounts: Record<string, Record<string, number>> = Object.fromEntries(
    ASSESSMENT_DOMAINS.map(domain => [domain, Object.fromEntries(EVIDENCE_TYPES.map(type => [type, 0]))]),
  )
  const seenIds = new Set<string>()

  for (const filePath of filePaths) {
    const rawJson = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(rawJson) as unknown
    assert(Array.isArray(parsed), `Source file is not an array: ${path.basename(filePath)}`)

    for (const [index, rawItem] of parsed.entries()) {
      assert(rawItem && typeof rawItem === 'object', `${path.basename(filePath)} item ${index}: invalid item object`)
      const normalized = normalizeItem(rawItem as Record<string, unknown>, path.basename(filePath))
      const itemId = String(normalized.itemId)
      assert(!seenIds.has(itemId), `Duplicate itemId detected: ${itemId}`)
      seenIds.add(itemId)

      domainCounts[String(normalized.primaryDomain)] += 1
      evidenceCounts[String(normalized.evidenceType)] += 1
      domainEvidenceCounts[String(normalized.primaryDomain)][String(normalized.evidenceType)] += 1
      allItems.push(normalized)
    }
  }

  assert(allItems.length === EXPECTED_TOTAL_ITEMS, `Expected 450 items; found ${allItems.length}`)
  for (const domain of ASSESSMENT_DOMAINS) {
    assert(domainCounts[domain] === EXPECTED_DOMAIN_COUNT, `Domain ${domain} count mismatch: ${domainCounts[domain]} !== ${EXPECTED_DOMAIN_COUNT}`)
    for (const [type, expected] of Object.entries(EXPECTED_EVIDENCE_COUNTS)) {
      assert(domainEvidenceCounts[domain][type] === expected, `Domain ${domain} evidence mismatch for ${type}: ${domainEvidenceCounts[domain][type]} !== ${expected}`)
    }
  }
  for (const [type, expected] of Object.entries(EXPECTED_EVIDENCE_COUNTS)) {
    assert(evidenceCounts[type] === expected * EXPECTED_DOMAIN_EVIDENCE_COUNT, `Global evidence count mismatch for ${type}: ${evidenceCounts[type]} !== ${expected * EXPECTED_DOMAIN_EVIDENCE_COUNT}`)
  }

  return allItems
}

async function checkExistingItemStates(itemIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const existing = await AssessmentItem.find({ itemId: { $in: itemIds } }, { itemId: 1, prompt: 1, primaryDomain: 1, subcompetency: 1, evidenceType: 1, difficulty: 1, discrimination: 1, profileTags: 1, reverseKeyed: 1, responseKey: 1, socialDesirabilityRisk: 1, criticalFlag: 1, courseTags: 1, version: 1, isActive: 1 }).lean()
  return new Map(existing.map((doc) => [String(doc.itemId), doc as Record<string, unknown>]))
}

async function runImport(dryRun: boolean): Promise<void> {
  const normalizedItems = await loadAndValidateSources()
  const itemIds = normalizedItems.map(item => String(item.itemId))

  await connectDatabase()

  const existingByItemId = await checkExistingItemStates(itemIds)

  let inserted = 0
  let skipped = 0
  let conflicts = 0
  const plannedInserts: Record<string, unknown>[] = []

  for (const item of normalizedItems) {
    const itemId = String(item.itemId)
    const existingRecord = existingByItemId.get(itemId)

    if (existingRecord) {
      const normalizedExisting = {
        itemId: existingRecord.itemId,
        prompt: existingRecord.prompt,
        primaryDomain: existingRecord.primaryDomain,
        subcompetency: existingRecord.subcompetency,
        evidenceType: existingRecord.evidenceType,
        difficulty: existingRecord.difficulty,
        discrimination: existingRecord.discrimination,
        profileTags: existingRecord.profileTags,
        reverseKeyed: existingRecord.reverseKeyed,
        responseKey: existingRecord.responseKey,
        socialDesirabilityRisk: existingRecord.socialDesirabilityRisk,
        criticalFlag: existingRecord.criticalFlag,
        courseTags: existingRecord.courseTags,
        version: existingRecord.version,
        isActive: existingRecord.isActive,
      }
      const same = deepStableMatch(normalizedExisting, item)

      if (same) {
        skipped += 1
        continue
      }

      conflicts += 1
      console.error(`Conflict detected for ${itemId}: existing Mongo record differs from source JSON. Import halted.`)
      throw new Error(`Conflict for ${itemId}; refusing to overwrite existing assessment item without explicit safe update process.`)
    }

    plannedInserts.push(item)
    inserted += 1
  }

  if (dryRun) {
    console.log('DRY RUN: no writes performed.')
    console.log(`Planned insert count: ${inserted}`)
    console.log(`Existing/skipped count: ${skipped}`)
    console.log(`Conflict count: ${conflicts}`)
    console.log(`Target collection: ${AssessmentItem.collection.name}`)
    return
  }

  if (conflicts > 0) {
    throw new Error('Import aborted due to conflicts.')
  }

  if (plannedInserts.length > 0) {
    await AssessmentItem.insertMany(plannedInserts, { ordered: true })
  }

  const finalTotal = await AssessmentItem.countDocuments({ itemId: { $in: itemIds } })
  const domainDistribution = await AssessmentItem.aggregate([
    { $match: { itemId: { $in: itemIds } } },
    { $group: { _id: '$primaryDomain', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  const evidenceDistribution = await AssessmentItem.aggregate([
    { $match: { itemId: { $in: itemIds } } },
    { $group: { _id: '$evidenceType', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  const inactiveCount = await AssessmentItem.countDocuments({ itemId: { $in: itemIds }, isActive: false })
  const duplicateCount = await AssessmentItem.aggregate([
    { $match: { itemId: { $in: itemIds } } },
    { $group: { _id: '$itemId', total: { $sum: 1 } } },
    { $match: { total: { $gt: 1 } } },
  ])

  console.log('✅ Import summary')
  console.log(`Insertion count: ${inserted}`)
  console.log(`Already existing/skipped count: ${skipped}`)
  console.log(`Conflict count: ${conflicts}`)
  console.log(`Verified total in MongoDB: ${finalTotal}`)
  console.log('Domain distribution:', domainDistribution)
  console.log('Evidence distribution:', evidenceDistribution)
  console.log(`Inactive synthetic items: ${inactiveCount}`)
  console.log(`Duplicate item IDs found: ${duplicateCount.length}`)
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  try {
    await runImport(dryRun)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Import failed:', message)
    process.exitCode = 1
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase()
    }
  }
}

void main()
