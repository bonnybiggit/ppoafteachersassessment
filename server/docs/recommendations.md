# Step 5: explainable recommendation MVP

This layer consumes Step 4's diagnosed needs. It does not score teachers, invent
gaps, enroll teachers, call an LMS, or generate a learning plan. All 27 catalog
opportunities are synthetic and provisional; none is represented as a real
partner course. No psychometric validity or learning-outcome claim is made.

## Sources and boundaries

The task supplies the recommendation formula and the seven dimension names. No
additional operational framework definitions were found in the repository's
source or README files. The following definitions are therefore **PROVISIONAL —
REQUIRE PILOT VALIDATION**, rather than claims of established framework validity.

Domain IDs D1–D9 follow `ASSESSMENT_DOMAINS` order. Catalog subcompetencies use
existing assessment-bank metadata verbatim. Catalog secondary domains are
explicit; no other relationship between domains is inferred. All scoring and
gap-diagnosis algorithms remain unchanged.

## Formula and operational definitions

`R = .30N + .20M + .15P + .10C + .10A + .10E + .05D − penalties`

Components are 0–100. `recommendationRules.ts` centralizes the weights, component
constants, development levels, evidence-focus mapping, penalties, and limits.

| Dimension | Provisional operational definition |
| --- | --- |
| N: need match | 35% domain match + 25% gap-type match + 30% subcompetency match + 10% evidence-focus overlap. Primary domain 100; explicitly secondary 70. Exact gap type is required. Exact subcompetency 100; explicitly broad coverage 40. A course naming different specific subcompetencies is excluded. Evidence overlap is the proportion of the gap's configured evidence focuses covered by the catalog. |
| M: modality/context fit | Average of explicitly preferred-modality fit and explicit connectivity fit, when available. Preferred modality 100, mismatch 20. With limited connectivity: offline 100, low bandwidth 90, blended 60, standard online 20. No signals: neutral 50. |
| P: practical applicability | The catalog author's provisional 0–100 activity-design rating: foundation examples 60, guided application 100, reflective refinement 75. This is course metadata, never an assessment score. |
| C: course/context fit | Average available grade, subject, and large-class fits. Exact grade/subject 100, universal coverage 70, explicit mismatch 20. A reported class size of at least 50 gets 100 for a course with large-class support, otherwise neutral 50. Missing context is neutral, not evidence of poor fit. |
| A: accessibility | Percentage of explicitly requested accessibility features supported; without stated requirements, percentage of the four catalog features present: captions, transcript, downloadable materials, mobile friendliness. No disability is inferred. Connectivity is handled separately under M and eligibility. |
| E: exposure/readiness fit | Average applicable signals: exposure/readiness/confidence needs favor guided (100) or introductory (90) opportunities over independent (40). Explicit none/basic digital experience favors beginner-friendly (100 vs 40). No CPD favors introductory/guided (100 vs 40). Moderate openness/developing self-efficacy favors guided support (100 vs neutral 50). No signals: neutral 50. These affect opportunity suitability only. |
| D: development-level fit | Emerging→foundation, Basic→developing, Competent→intermediate, Advanced/Transformational→advanced. Distance of 0/1/2/3 levels gives 100/70/30/0. A course more than one level above the diagnosed need is excluded. Persisted competency classification is consumed, never recalculated. |

The final recommendation score is bounded to 0–100, retained to four decimal
places internally and displayed to two. These are provisional opportunity ranks,
not competency measurements. Human-review flags do not change this formula.

## Eligibility, penalties, and prior learning

Inactive courses, unrelated domains, mismatched gap types, mismatched explicitly
named subcompetencies, excessive upward level jumps, explicitly completed courses,
unsupported explicit language preferences, and online courses for a strictly
offline context are excluded. Missing domain evidence never becomes a gap or a
normal recommendation.

Mandatory prerequisites must be verified; unknown is distinguished from clearly
unmet in the audit. Optional unmet prerequisites deduct 15; optional unverified
prerequisites deduct 5. A digital-experience prerequisite uses only the actual
stored none/basic/intermediate/advanced value. Course-completion prerequisites
require explicit course-completion records; CPD attendance does not satisfy them.

Recorded equivalent prior learning deducts 20 unless the diagnosis indicates an
Emerging/Basic foundational need. Frequent CPD deducts 10 for foundation content
only when the need is not foundational. Neither rule claims mastery.

## Current profile limitations

The production adapter reads only class size, grade/class, subject, CPD experience,
digital teaching experience, openness, and self-efficacy from the existing Teacher
model. Protected demographics, income, school type/location, and arbitrary raw
profile values do not enter ranking or its cache key.

The evaluator supports optional explicit connectivity, language, modality,
accessibility requirements, and completed-course IDs for future profile
integration and synthetic testing. **The current Teacher schema does not store
these fields, so the endpoint leaves them unknown.** No schema, frontend form,
or inferred substitute was added. The current endpoint cannot claim that a
teacher has limited connectivity or completed an equivalent course. A catalog
opportunity's offline/downloadable or low-resource design can still be described
factually. A resource-access gap is not silently treated as a connectivity report.

## Ranking, confidence, and explanations

Only eligible domain gaps from the diagnosis are used. When Step 4 supplies
priority gaps, use those selected needs. Rank by recommendation score, need match,
subcompetency match, gap-type match, context fit, then stable course ID. Domain ID
and gap type break a remaining tie for the same course matched to multiple needs.
Choose a course's best matching need once, then return at most three courses.
Up to two unselected, relevant alternatives may be supplied per recommendation;
alternatives match the same domain and gap type and are never duplicated among
primary recommendations or alternatives.

Recommendation confidence is separate from competency and gap confidence. The
synthetic MVP caps it at Medium: the gap and competency confidence must both be
above Low, N must be at least 70, and there must be no prerequisite/prior-learning
penalties. Otherwise it is Low. This is an operational flag, not a statistical
confidence estimate.

Explanations use fixed templates populated with actual gap and catalog metadata.
Penalties are explained as limitations. A critical review signal is preserved
with a developmental human-review explanation, never a punitive label.

## Endpoint, dependency order, and persistence

`GET /api/assessment/attempts/:attemptId/recommendations`

The route follows the existing attempts-based API convention. It requires a valid
JWT, an active teacher, ownership, completed/submitted status, persisted scoring,
and an existing versioned gap diagnosis. Missing prerequisites return 409;
malformed attempt IDs return 400 and other-teacher/missing attempts return 404.

The service uses the existing gap service to validate its cache before consuming
the diagnosis. Unchanged inputs do not rewrite scoring or diagnosis. The existing
gap service may refresh its own stale cache after source changes; recommendation
logic never modifies the diagnosis algorithm or computes its own gaps.

`AssessmentAttempt.recommendations` stores one envelope containing a source
fingerprint, teacher-safe result, and internal audit. The fingerprint includes
the diagnosis and its fingerprint, explicit context, catalog content/version,
recommendation version and rule configuration. A rerun with unchanged inputs
returns the same payload without another write. Changed inputs replace this
single field. Snapshot checks and conditional writes reject concurrent scoring
or diagnosis changes instead of caching a result against the wrong source.

The audit records component scores, matched need, penalties, rule IDs, and
exclusion reasons. The normal API explicitly projects allowed fields, including
cached results and alternatives. It excludes audit, weights, component scores,
thresholds, answer keys, raw scoring metadata, database identifiers, and secrets.
No separate collection, admin endpoint, or enrollment integration is added.

## Verification

`node tests/recommendationEngine.test.cjs` covers catalog validity, need matching,
the exact formula, ties/counts, context/accessibility, prerequisites, prior
learning, insufficient evidence, review/confidence, safe projection, protected
demographic invariance, and real Express/JWT/services with in-memory persistence.
`node tests/gapDiagnosis.test.cjs` completes the previously missing Step 4 rule
and endpoint regression coverage without altering its implementation.

All new tests use synthetic fixtures and no database connection. The pre-existing
Atlas integration test must be pointed at an isolated test replica set, never
production. No deployment or GitHub push is part of this step.
