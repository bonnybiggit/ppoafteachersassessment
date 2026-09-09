# Synthetic assessment item banks

`human-centred-teaching-empathy.synthetic.v0.1.json` contains 50 provisional
development/test items, HC-001 through HC-050. These are **not official PPOAF
questions**. `communication-influence.synthetic.v0.1.json` contains the next
50 provisional items, CI-001 through CI-050, for Communication & Influence.
Expert review, cognitive testing, psychometric validation, and
possible replacement are required before substantive assessment use.

`classroom-leadership-behaviour-design.synthetic.v0.1.json` adds 50 provisional
Domain 3 items, CB-001 through CB-050, with version `synthetic-cb-0.1`.
These are synthetic development/test items, not official or validated PPOAF questions.
They follow the same evidence distribution and metadata conventions below.

`adaptive-teaching-problem-solving.synthetic.v0.1.json` adds 50 provisional
Domain 4 items, AP-001 through AP-050, with version `synthetic-ap-0.1`.
These are synthetic development/test items, not official PPOAF questions and not
psychometrically validated.

Each file is an array of AssessmentItem-compatible objects. None is a seed
runner and importing the JSON does not write to MongoDB. All items have
`isActive: false`; versions follow `synthetic-<domain prefix>-0.1`, with lowercase
prefixes `hc`, `ci`, `cb`, and `ap`.

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

Domain 3 focuses on expectations, routines, positive behaviour support, proactive
behaviour design, fairness, accountability, reinforcement, transitions,
de-escalation, restorative practice, climate, pupil participation, teacher
modelling, repeated behaviour response, and classroom leadership. Shared contexts
are assessed through behaviour procedures and follow-through rather than empathy,
instructional explanation, or general communication. All Domain 3 critical flags
are false because its scenarios concern ordinary classroom behaviour rather than
serious harm.

Domain 4 follows recognise, diagnose, adapt, test, and review. Its subcompetencies
cover problem identification, learning-barrier diagnosis, adaptive instruction,
responsive decision-making, flexible teaching, evidence-informed adaptation,
problem prioritisation, solution generation, testing alternatives, monitoring
adaptation, resource-constrained problem solving, reflective problem solving,
escalation/referral awareness, decision-making under uncertainty, and continuous
adjustment. Shared contexts such as support review and referral are assessed
through learning evidence and instructional trials. These differ from Domain 1's
learner-perspective focus, Domain 2's communication focus, and Domain 3's behaviour
procedures. Similarity screening is supplemented by editorial review of these
boundaries, but expert construct review remains necessary. All Domain 4 critical
flags are false: its items concern ordinary learning problems, not serious harm.
No items for Domains 5–9 are included.

The validator checks all four banks and screens cross-domain question stems for
exact duplicates and lexical overlap, excluding repeated response instructions.
It also reports keyed-option positions and how often the keyed answer is uniquely
longest in Domains 2–4. These are editorial checks only: low text similarity and
balanced options do not establish construct distinctness or psychometric quality.
Shared skills such as listening and feedback still require expert boundary review.
