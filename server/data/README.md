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

`practical-pedagogy-learning-design.synthetic.v0.1.json` adds 50 provisional
Domain 5 items for Practical Pedagogy & Learning Design (domain weight: 15%,
descriptive only; no scoring or assembly changes). IDs are `D5-PL-SJT-001`
through `D5-PL-PE-050`, with evidence-type codes and sequential numbering.
Its requested version is `synthetic.v0.1`. These are **provisional synthetic
development/test items, not official PPOAF questions and not psychometrically
validated**. Subcompetency names are internal descriptions derived from the
domain construct, not claims about an unavailable official bank.

`resourcefulness-entrepreneurial-thinking.synthetic.v0.1.json` adds 50 provisional
Domain 6 items for Resourcefulness & Entrepreneurial Thinking (domain weight: 10%,
descriptive only). IDs run from `D6-RE-SJT-001` through `D6-RE-PE-050` with
sequential numbering and version `synthetic.v0.1`. These are **provisional
synthetic development/test items, not official PPOAF questions and not
psychometrically validated**. This brings the six-domain development bank to
300 items. D1–D5 item files are unchanged by the D6 addition.

`digital-future-skills.synthetic.v0.1.json` adds 50 provisional Domain 7 items
for Digital & Future Skills (domain weight: 10%, descriptive only). IDs run from
`D7-DF-SJT-001` through `D7-DF-PE-050`, numbered sequentially, with version
`synthetic.v0.1`. These are **provisional synthetic development/test questions,
not official PPOAF questions and not psychometrically validated**. The seven
banks at that stage contain 350 items. D1–D6 item files are unchanged by the D7 addition.

`personal-effectiveness-professional-identity.synthetic.v0.1.json` adds 50
provisional Domain 8 items for Personal Effectiveness & Professional Identity
(domain weight: 10%, descriptive only). IDs run from `D8-PE-SJT-001` through
`D8-PE-PE-050`, numbered sequentially, with version `synthetic.v0.1`. These are
**provisional synthetic development/test questions, not official PPOAF questions
and not psychometrically validated**. The eight banks now contain 400 items.
D1–D7 item files are unchanged by the D8 addition.

The D1–D4 files are arrays of AssessmentItem-compatible objects. None is a seed
runner and importing the JSON does not write to MongoDB. All items have
`isActive: false`; versions follow `synthetic-<domain prefix>-0.1`, with lowercase
prefixes `hc`, `ci`, `cb`, and `ap`.

D5–D8 follow the requested snake_case export fields (`item_id`,
`primary_domain: "D5"`, `"D6"`, `"D7"` or `"D8"`, `response_key`, `course_tags`, etc.), with
`is_active: false` on every item. Their flexible response-key contents retain the
earlier camelCase conventions. The validator maps export fields and the domain
name **in memory only** for the existing Mongoose schema check. These files are
not direct model imports; no production loader or model has been changed.

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
- D1–D4 performance items request a structured report about observable evidence, not
  an upload or disclosure of pupil information. Self-reports do not independently
  verify practice. Do not supply pupil names or identifying details.
- D5 performance items instead require concrete text artifacts: a lesson plan,
  sequence, formative checkpoint, feedback cycle, resource set, or differentiated
  comparison task. Four task-specific criteria each have anchored 0/1/2 levels
  (maximum 8). Missing submissions are unscored; missing criteria in a submitted
  artifact receive 0. A written design does not verify classroom implementation.
- D6 performance tasks require a repurposed aid specification, a resource-value
  comparison, a mobilisation brief, a user-informed prototype process, a reuse
  plan and a small innovation trial. Each has four task-specific 0/1/2 criteria
  (maximum 8). Text-only hypothetical designs are sufficient for full design
  credit. Invented trial results must be labelled illustrative; design scores do
  not establish implementation or actual learning impact. Neither an impressive
  artifact nor money raised earns points. No purchase or outreach is required.
- D7 performance tasks require a digital activity storyboard, fictional resource
  evaluation, digital checkpoint mock-up, technology-failure decision sequence,
  AI-draft verification log and collaborative file workflow. Each has four
  task-specific 0/1/2 criteria (maximum 8). Text-only simulations can earn full
  design credit without devices, internet, subscriptions or AI accounts. They do
  not establish operational fluency or classroom implementation. All examples
  use invented data; no uploads, live-system changes or contact are requested.
- D8 performance tasks require a follow-through record, timed workload plan,
  reflective record, professional development plan, feedback-to-action record
  and professional habit improvement trial. Each has four task-specific 0/1/2
  criteria (maximum 8). Hypothetical plans and clearly labelled invented records
  can earn full design credit; they do not establish actual improvement or
  follow-through. No confidential disclosure, paid resources, software or extra
  personal working hours are required. Writing style and positive self-description
  do not earn credit independently of evidence and feasible actions.
- D5–D8 choice keys provide provisional 1/0 option scores; frequency keys provide
  provisional 0–4 orderings with `NA: null`. Frequency self-reports alone never
  prove competence. These rubrics are metadata for development review only and
  have not been connected to assessment scoring or empirically calibrated.
- `profileTags` describe relevant contexts only; they must not determine scores.
- D1–D6 critical flags are false. D7 flags four specific privacy/safeguarding
  scenarios: `D7-DF-SJT-004` (image permission), `D7-DF-SJT-016` (unsuitable content
  exposure), `D7-DF-SJT-018` (learner data in an unapproved AI service), and
  `D7-DF-KA-033` (restricted learner-work sharing). Each explains the concern in
  `response_key.criticalFlagReason`. Flags are editorial review metadata, not
  automatic failure, classification rules or scoring overrides. The other D7
  items concern routine design and evaluation decisions and have false flags.
- D8 flags three ethical scenarios: `D8-PE-SJT-013` (conflict of interest),
  `D8-PE-SJT-017` (false confirmation of checking), and `D8-PE-KA-035`
  (unauthorised disclosure of confidential information). Each has an explained
  `response_key.criticalFlagReason`, with no automatic failure or scoring override.
  Routine boundary and workload decisions remain false; they are not presented
  as safeguarding incidents or punitive judgements about the teacher.

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
No items for Domain 9 are included.

Domain 5 covers lesson planning and objectives (5 items), sequencing (5),
learner-centred delivery (4), active learning and participation (4), questioning
and checking understanding (4), formative assessment (5), feedback (5), alignment
(5), planned differentiation (4), resource design (5), and lesson reflection (4).
Its focus is the design of objectives, learning tasks, practice and assessment.
Feedback items examine revision and transfer cycles rather than message wording
(D2); participation items examine individual learning in tasks rather than
behaviour routines (D3). Differentiation and resources concern planned supports
and representations, rather than diagnosing or resolving disruptions (D4).
These related constructs still require expert boundary review. Profile tags are
empty and no demographic or resource-ownership variable contributes to a key.

Domain 6 uses these internal working subcompetencies (not official labels):
improvisation with available resources (5), initiative and proactive action (4),
low-cost teaching innovation (5), resource mobilisation (5), creative problem
solving (4), design thinking (5), opportunity identification (4), effective use of
community/local resources (4), sustainable use and reuse of materials (5),
small-scale innovation and experimentation (4), and scaling or adapting successful
low-cost practices (5).

D6 assesses functional repurposing, initiative, resource value, legitimate
mobilisation and testing of resource innovations. Trials include preparation,
upkeep and usability as well as learning evidence, rather than focusing only on
diagnosing a learning difficulty (D4) or sequencing lesson instruction (D5).
Local contributions are assessed for fit and accountable use, not general
community engagement (D9). Existing-stock use, well-equipped schools and
resource-constrained situations are included without linking resources to rural
or urban location. A purchased resource can be the strongest choice; no-cost or
unusual designs are not inherently better. The naira values in D6-RE-KA-031 are
invented exercise data, not current prices.

All D6 profile tags are empty. Every key explicitly separates resource access
from resourcefulness and competence classification. Frequency items are
opportunity-based self-reports with NA unscored and two reverse-keyed items.
Performance rubrics accept hypothetical designs without requiring ownership,
internet, implementation opportunities or donations. Mobilisation uses school
approval, voluntary contributions and accountable records; personal teacher
funding, pupil fundraising, conflicts of interest and pupil commercial
exploitation are not expected or rewarded. Critical flags remain false because
these scenarios assess ordinary resource decisions, not acute safeguarding or
ethics incidents. Content review is still provisional and requires expert review.

Domain 7 covers 15 internal working areas: basic digital teaching competence;
tool selection; digital lesson preparation; digital communication/collaboration;
information literacy; online resource evaluation; safe/responsible use; digital
learner engagement; blended learning; digital assessment/feedback; technology
failure; appropriate AI/emerging technology use; digital creativity;
technology-enabled problem solving; and learning new tools. These labels are
not claimed to come from the unavailable official bank.

D7 tests digital mechanisms and decisions: local files versus web links,
editable sources and exports, media access, version control, source provenance,
automated marking/attempt records, spreadsheet integrity, permission-limited
sharing, offline delivery and AI verification. Related teaching situations remain
focused on these mechanisms rather than generic lesson design or resourcefulness.
Technology is not always preferable, and expensive tools receive no inherent
credit. AI is optional and its output requires independent review. The online
resources and AI reference in performance tasks are explicitly fictional, with
no external access required to answer them. Misleading claims appear as material
to critique, not factual teaching guidance.

Every D7 key contains explicit access-fairness and digital-safety guidance.
Profile tags are empty; no device ownership, connectivity, electricity, teacher
demographic or paid software variable determines correctness. Frequency items
retain the earlier Never/Rarely/Sometimes/Often/Almost always scale, with NA
unscored and two reverse-keyed behaviours. No opportunity or non-use of AI must
not be treated as low competence. The rubrics assess reasoning and the supplied
artifact, not visual polish, purchasing power or real learner disclosures.

Domain 8 covers 18 internal working areas: self-management; reliability and
follow-through; professional responsibility; time/workload management;
accountability; reflective practice; self-awareness; professional confidence and
self-efficacy; resilience/recovery; continuous professional development; openness
to feedback; professional identity; ethical judgement; professional boundaries;
commitment to improvement; competing professional responsibilities; standards
under pressure; and recognising limits/seeking appropriate support. These are
not claimed as official PPOAF subcompetency labels.

D8 focuses on the teacher's own commitments, decisions, professional habits and
growth. Handover and correction scenarios assess ownership and closure rather
than message wording (D2); reflection and trials assess professional processes
rather than instructional adaptations or lesson design (D4/D5). Confidentiality
concerns the limits of professional disclosure, with no platform-specific demand
(D7). Workload plans preserve essential standards while negotiating optional scope.
The ninety-minute planning task contains 105 minutes of candidate work, so a
feasible response must defer some work; the overrun scenario requires a revision.

Every D8 key states developmental and profile-fairness rules. Professional
identity is not employer loyalty; certificates, extreme confidence and excessive
hours are not proof of effectiveness. Resilience includes recovery, limits and
appropriate support, never tolerating unsafe, abusive or exploitative conditions.
Feedback can be challenged with evidence while specific valid observations are
acted on. Frequency responses retain the prior scale with NA unscored and two
reverse-keyed behaviours. Profile tags are empty. These self-reports are not
independent evidence of competence. Ethics and identity items are explicitly
marked high social-desirability risk; balanced keys cannot remove that limitation.

The validator checks all eight banks and screens cross-domain question stems for
exact duplicates and lexical overlap, excluding repeated response instructions.
It also reports keyed-option positions and how often the keyed answer is uniquely
longest in Domains 2–8, as well as within-D5–D8 lexical overlap,
requested export fields, sequence codes, provisional status and artifact rubric
integrity. D6–D8 also check balanced answer positions and explicit access/profile
fairness metadata; D6 checks mobilisation metadata and D7 checks optional AI use,
simulation access and the four explained critical flags. D8 checks developmental
framing, sustainable resilience, hypothetical artifact access and its three
explained ethical flags. Those assertions supplement content
review; they cannot automatically establish the ethical quality of every scenario.
These are editorial checks only: low text similarity and
balanced options do not establish construct distinctness or psychometric quality.
Shared skills such as listening and feedback still require expert boundary review.
