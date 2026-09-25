import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { mongo } from 'mongoose'
import { ASSESSMENT_DOMAINS } from '../models/AssessmentItem'

export const OFFICIAL_VERSION = 'ppoaf-original-450.v1'
export const SOURCE_PATH = 'docs/Adjusted questions for the Teacher website.docx'
export const ROOT = path.resolve(__dirname, '../../..')
export const MANIFEST_PATH = path.join(ROOT, 'server/data/ppoaf-original-450.v1.manifest.json')
export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex')

export interface OfficialItem {
  itemId: string
  version: string
  assessmentVersion: string
  mode: 'official'
  isActive: false
  primaryDomain: string
  domainNumber: number
  section: 'A' | 'B'
  sourceQuestionNumber: number
  documentOrder: number
  prompt: string
  reverseKeyed: boolean
  provenance: {
    sourcePath: string
    sourceSha256: string
    domainHeading: string
    sectionHeading: string
    numberParagraph: number
    textParagraphs: number[]
  }
}
export interface OfficialManifest {
  assessmentVersion: string
  mode: 'official'
  sourcePath: string
  sourceSha256: string
  itemsSha256: string
  items: OfficialItem[]
}
interface Paragraph { paragraph: number; text: string; number: number | null }

export function extractOfficialManifest(): OfficialManifest {
  const sourceSha256 = sha256(fs.readFileSync(path.join(ROOT, SOURCE_PATH)))
  const paragraphs: Paragraph[] = JSON.parse(execFileSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh', [
    '-NoProfile', '-NonInteractive', '-File', path.join(ROOT, 'server/src/scripts/readOfficialDocx.ps1'),
    '-Source', path.join(ROOT, SOURCE_PATH),
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).replace(/^\uFEFF/, ''))
  const items: OfficialItem[] = []
  let domainNumber = 0, domainHeading = '', sectionHeading = ''
  let section: 'A' | 'B' | undefined
  let current: OfficialItem | undefined
  const finish = () => { if (current) { items.push(current); current = undefined } }
  for (const p of paragraphs) {
    const domain = /^DOMAIN (\d+):/.exec(p.text)
    if (domain) {
      finish(); domainNumber = Number(domain[1]); domainHeading = p.text; section = undefined
      continue
    }
    const heading = /^SECTION ([AB]):/.exec(p.text)
    if (heading) { finish(); section = heading[1] as 'A' | 'B'; sectionHeading = p.text; continue }
    if (!section) continue
    const literal = /^(\d+)\.?$/.exec(p.text)
    const number = literal ? Number(literal[1]) : p.number
    if (number !== null) {
      finish()
      if (p.text && !literal) throw new Error(`Unexpected numbered text at paragraph ${p.paragraph}`)
      current = {
        itemId: `${OFFICIAL_VERSION}:D${domainNumber}:Q${String(number).padStart(2, '0')}`,
        version: OFFICIAL_VERSION, assessmentVersion: OFFICIAL_VERSION, mode: 'official', isActive: false,
        primaryDomain: ASSESSMENT_DOMAINS[domainNumber - 1], domainNumber, section,
        sourceQuestionNumber: number, documentOrder: items.length + 1, prompt: '', reverseKeyed: false,
        provenance: { sourcePath: SOURCE_PATH, sourceSha256, domainHeading, sectionHeading,
          numberParagraph: p.paragraph, textParagraphs: [] },
      }
    } else if (current && p.text.length) {
      current.prompt += (current.prompt ? '\n' : '') + p.text
      current.provenance.textParagraphs.push(p.paragraph)
      current.reverseKeyed = current.prompt.includes('(Reverse Indicator)')
    }
  }
  finish()
  const manifest: OfficialManifest = { assessmentVersion: OFFICIAL_VERSION, mode: 'official', sourcePath: SOURCE_PATH,
    sourceSha256, itemsSha256: sha256(JSON.stringify(items)), items }
  validateOfficialManifest(manifest)
  return manifest
}

// Source-reviewed identities, independent of marker detection in extraction.
export const REVERSE_NUMBERS: readonly (readonly number[])[] = [
  [5, 14, 23], [5, 13, 22], [5, 10, 15, 22], [5, 10, 15, 22],
  [5, 10, 15, 22], [5, 10, 15, 22], [5, 10, 15, 22], [5, 10, 15, 22], [5, 10, 15, 22],
]

export function validateOfficialManifest(manifest: OfficialManifest): void {
  const fail = (message: string): never => { throw new Error(`Invalid official manifest: ${message}`) }
  if (manifest.assessmentVersion !== OFFICIAL_VERSION || manifest.mode !== 'official') fail('version/mode')
  if (manifest.sourcePath !== SOURCE_PATH || !/^[a-f0-9]{64}$/.test(manifest.sourceSha256)) fail('source')
  if (manifest.items.length !== 450 || new Set(manifest.items.map(i => i.itemId)).size !== 450) fail('450 unique items required')
  if (new Set(manifest.items.map(i => i.prompt)).size !== 450) fail('duplicate question wording')
  if (manifest.itemsSha256 !== sha256(JSON.stringify(manifest.items))) fail('items checksum')
  for (const [index, item] of manifest.items.entries()) {
    const d = Math.floor(index / 50) + 1, n = index % 50 + 1
    if (item.domainNumber !== d || item.sourceQuestionNumber !== n || item.documentOrder !== index + 1 ||
      item.primaryDomain !== ASSESSMENT_DOMAINS[d - 1] || item.section !== (n <= 30 ? 'A' : 'B')) fail(`order/domain/section at ${index}`)
    if (item.itemId !== `${OFFICIAL_VERSION}:D${d}:Q${String(n).padStart(2, '0')}` ||
      item.version !== OFFICIAL_VERSION || item.assessmentVersion !== OFFICIAL_VERSION || item.mode !== 'official' || item.isActive !== false) fail('item identity')
    if (!item.prompt.trim() || item.provenance.sourceSha256 !== manifest.sourceSha256 ||
      item.provenance.sourcePath !== SOURCE_PATH || !item.provenance.textParagraphs.length) fail('text/provenance')
    if (item.reverseKeyed !== item.prompt.includes('(Reverse Indicator)') ||
      item.reverseKeyed !== REVERSE_NUMBERS[d - 1].includes(n)) fail(`reverse identity D${d}/Q${n}`)
    for (const forbidden of ['responseKey', 'subcompetency', 'difficulty', 'discrimination', 'profileTags', 'criticalFlag', 'courseTags', 'socialDesirabilityRisk']) {
      if (forbidden in item) fail(`invented metadata: ${forbidden}`)
    }
  }
  if (manifest.items.filter(i => i.reverseKeyed).length !== 34) fail('34 reverse indicators required')
}

export function planOfficialImport(manifest: OfficialManifest, existing: Record<string, unknown>[]): OfficialItem[] {
  validateOfficialManifest(manifest)
  const byId = new Map<string, Record<string, unknown>>()
  for (const record of existing) {
    const id = String(record.itemId)
    if (byId.has(id)) throw new Error(`Duplicate database item: ${id}`)
    byId.set(id, record)
  }
  const planned: OfficialItem[] = []
  for (const item of manifest.items) {
    const record = byId.get(item.itemId)
    if (!record) { planned.push(item); continue }
    const { _id, __v, createdAt, updatedAt, ...content } = record
    if (!isDeepStrictEqual(content, item)) throw new Error(`Existing item conflict: ${item.itemId}; refusing to overwrite`)
  }
  const expected = new Set(manifest.items.map(i => i.itemId))
  if (existing.some(record => !expected.has(String(record.itemId)))) throw new Error('Unexpected records in official version')
  return planned
}

export const officialImportFilter = () => ({ $or: [
  { version: OFFICIAL_VERSION }, { assessmentVersion: OFFICIAL_VERSION },
  { itemId: { $regex: '^ppoaf-original-450\\.v1:' } },
] })

export interface OfficialImportStore {
  read(): Promise<Record<string, unknown>[]>
  insert(items: OfficialItem[]): Promise<void>
}

export async function ensureOfficialImportIndex(collection: mongo.Collection): Promise<void> {
  const indexes = await collection.indexes()
  if (indexes.some(index => index.unique && Object.keys(index.key).length === 1 && index.key.itemId === 1 &&
    !index.partialFilterExpression && !index.sparse)) return
  const duplicates = await collection.aggregate([
    { $group: { _id: '$itemId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 1 },
  ]).toArray()
  const missing = await collection.countDocuments({ $or: [{ itemId: { $exists: false } }, { itemId: null }, { itemId: '' }] })
  if (duplicates.length || missing) throw new Error('Cannot provision unique itemId index: existing IDs are duplicate or missing')
  // This index is already declared by AssessmentItem. Never drop/rebuild other indexes.
  await collection.createIndex({ itemId: 1 }, { unique: true, name: 'itemId_1' })
}

// Caller owns the transaction. The store deliberately exposes no update/delete operations.
export async function importOfficialItems(manifest: OfficialManifest, store: OfficialImportStore, dryRun: boolean) {
  validateOfficialManifest(manifest)
  const inserts = planOfficialImport(manifest, await store.read())
  if (!dryRun) {
    if (inserts.length) await store.insert(inserts)
    if (planOfficialImport(manifest, await store.read()).length) throw new Error('Post-import verification failed')
  }
  return { total: 450, inserted: dryRun ? 0 : inserts.length, planned: inserts.length,
    skipped: 450 - inserts.length, dryRun }
}
