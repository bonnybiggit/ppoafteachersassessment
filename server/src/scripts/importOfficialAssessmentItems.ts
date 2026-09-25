import 'dotenv/config'
import fs from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/database'
import { OfficialAssessmentItem } from '../models/OfficialAssessmentItem'
import { ensureOfficialImportIndex, extractOfficialManifest, importOfficialItems, MANIFEST_PATH, officialImportFilter, planOfficialImport,
  validateOfficialManifest, type OfficialManifest } from '../services/officialAssessmentImport'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length !== 1 || !['--manifest', '--dry-run', '--write'].includes(args[0])) {
    throw new Error('Choose exactly one: --manifest (offline), --dry-run (read only), --write (insert only)')
  }
  const extracted = extractOfficialManifest()
  if (args[0] === '--manifest') {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(extracted, null, 2) + '\n', 'utf8')
    console.log(`Manifest: 450 questions, 9 domains, 34 reverse indicators; SHA-256 ${extracted.itemsSha256}`)
    return
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as OfficialManifest
  validateOfficialManifest(manifest)
  if (!isDeepStrictEqual(manifest, extracted)) throw new Error('Manifest differs from DOCX extraction; review before import')
  for (const item of manifest.items) await new OfficialAssessmentItem(item).validate()
  await connectDatabase()
  const dryRun = args[0] === '--dry-run'
  if (dryRun) {
    const result = await importOfficialItems(manifest, {
      read: async () => OfficialAssessmentItem.collection.find(officialImportFilter()).toArray(),
      insert: async () => { throw new Error('Dry run must not write') },
    }, true)
    console.log(JSON.stringify(result))
    return
  }
  planOfficialImport(manifest, await OfficialAssessmentItem.collection.find(officialImportFilter()).toArray())
  await ensureOfficialImportIndex(OfficialAssessmentItem.collection)
  const result = await mongoose.connection.transaction(async session => importOfficialItems(manifest, {
    read: async () => OfficialAssessmentItem.collection.find(officialImportFilter(), { session }).toArray(),
    insert: async items => { await OfficialAssessmentItem.insertMany(items, { session, ordered: true }) },
  }, false))
  console.log(JSON.stringify(result))
}

void main().catch(error => {
  // Do not print connection strings, source question payloads, or driver internals.
  console.error(error instanceof Error ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '<redacted MongoDB URI>') : 'Official import failed')
  process.exitCode = 1
}).finally(async () => { if (mongoose.connection.readyState !== 0) await disconnectDatabase() })
