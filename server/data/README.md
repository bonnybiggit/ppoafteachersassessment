# Synthetic assessment item banks

`human-centred-teaching-empathy.synthetic.v0.1.json` contains 50 provisional
development/test items, HC-001 through HC-050. These are **not official PPOAF
questions**. `communication-influence.synthetic.v0.1.json` contains the next
50 provisional items, CI-001 through CI-050, for Communication & Influence.
Expert review, cognitive testing, psychometric validation, and
possible replacement are required before substantive assessment use.

Each file is an array of AssessmentItem-compatible objects. Neither is a seed
runner and importing the JSON does not write to MongoDB. All items have
`isActive: false`; versions are `synthetic-hc-0.1` and `synthetic-ci-0.1` respectively.

Schema conventions:

- Question text is stored in `prompt`, the existing schema field. Prompts include
  response instructions and options so question delivery need not expose keys.
- Numeric difficulty codes are provisional design judgements: 1 = easy,
  2 = moderate, 3 = hard. These are not calibrated difficulty estimates.
- `discrimination: 0` is a uniform uncalibrated placeholder, not an empirical
  estimate or evidence of zero discrimination. It must not weight responses.
- The flexible `responseKey` stores format, keyed option or ordered option IDs,
  rationale, and synthetic provenance. No scoring algorithm is included.
- Frequency items use Never / Rarely / Sometimes / Often / Almost always.
  Their reference period is the last four teaching weeks. `NA` means no relevant
  opportunity or insufficient observation and is excluded from the ordering;
  it must not be treated as a low-competency answer.
- Frequency and evidence-level orderings run from weaker to stronger practice.
  Reverse-keyed frequency items reverse that ordering, not the displayed scale.
- Performance items request a structured report about observable evidence, not
  an upload or disclosure of pupil information. Self-reports do not independently
  verify practice. Do not supply pupil names or identifying details.
- `profileTags` describe relevant contexts only; they must not determine scores.
- All critical flags are false. These items explore ordinary support and
  professional judgement rather than testing responses to immediate serious harm.

Evidence distribution in each bank: 18 situational judgement, 11 behaviour frequency,
8 knowledge/application, 7 reflective judgement, 6 performance evidence.

Validate offline from `server/` after building:

```sh
node tests/assessmentItems.validate.cjs
```

The validator uses in-memory Mongoose validation only, without a connection or
database writes. `createdAt` and `updatedAt` are left for Mongoose timestamps.

Domain 2 focuses on explanation, instructional clarity, active listening,
questioning, checking understanding, constructive feedback, communication
adaptation, caregiver and colleague communication, difficult conversations,
respectful influence, learner engagement, non-verbal communication, professional
communication, and motivation through communication. It does not assess general
behaviour management or repeat Domain 1's emotional-support focus.

The validator checks both banks and screens cross-domain question stems for
exact duplicates and lexical overlap, excluding repeated response instructions.
It also reports keyed-option positions and how often the keyed answer is uniquely
longest in Domain 2. These are editorial checks only: low text similarity and
balanced options do not establish construct distinctness or psychometric quality.
Shared skills such as listening and feedback still require expert boundary review.
