# Official 450-question import (Step 11A)

Source: `docs/Adjusted questions for the Teacher website.docx`.
Assessment version: `ppoaf-original-450.v1`; mode: `official`.

The checked-in `data/ppoaf-original-450.v1.manifest.json` is the review artifact.
It records the DOCX SHA-256, a SHA-256 of `JSON.stringify(items)` in manifest order,
all 450 prompts, document order, original domain/section headings, source numbers,
and one-based XML paragraph locations. Paragraph boundaries and Word line breaks
become LF characters; blank layout paragraphs are omitted. Original spelling,
punctuation, and reverse-indicator annotations remain in the prompts.
Both literal numbers (including D1 Q34 without a dot) and Word numbering definitions
are read. Section B retains the complete scenario and proposed response statement.
No answer keys or scores are inferred.

Each domain has 30 Section A and 20 Section B questions. Reverse identities:
D1: 5,14,23; D2: 5,13,22; D3–D9: 5,10,15,22.

Run from `server` (Node dependencies installed; Windows PowerShell or `pwsh` required):

```sh
npm run build
node dist/scripts/importOfficialAssessmentItems.js --manifest
npm run test:official-import
node dist/scripts/importOfficialAssessmentItems.js --dry-run
node dist/scripts/importOfficialAssessmentItems.js --write
```

The equivalent source runner is `npm run import:official-items -- <flag>`.
`--manifest` is offline and only regenerates the local review file. Review changes
before importing. Database modes independently re-extract the DOCX and require
an exact match with the manifest before connecting. `--dry-run` performs reads only.
There is no default write mode. Database configuration uses the existing server `.env`.

OfficialAssessmentItem is an import-only schema over the existing `assessmentitems`
collection. This avoids changing legacy schema requirements or defaulting invented
metadata. IDs are version-qualified; every new item has `isActive: false`. Neither
the active default assembler nor the synthetic-version pilot query selects them.
The importer does not publish a version, start attempts, or alter application behavior.

Writes require a MongoDB deployment supporting transactions. If the full unique
`itemId` index already declared by the legacy model is absent, the importer checks
for duplicate/missing IDs and provisions it. No indexes are dropped or rebuilt.
Index creation precedes the data transaction and remains if a later import fails.
An import transaction checks existing
records, inserts missing items, and verifies all 450 before committing. An exact rerun
performs no inserts. Conflicts, unexpected official records, or duplicate IDs abort;
there are no update/delete operations. Concurrent imports are protected by the unique
index; a duplicate-key failure can be safely rerun. Synthetic items and attempt,
response, scoring, diagnosis and recommendation collections are never written.

The focused tests are offline: source extraction/checksums, schema round-trip, counts,
identities, manifest rejection, and an insert-only in-memory store for reruns, partial
imports, conflicts and mixed synthetic/official bank preservation. They do not claim
to emulate MongoDB transaction or concurrency behavior.
