import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ASSESSMENT_DOMAINS, EVIDENCE_TYPES } from '../models/AssessmentItem'
import { GAP_TAXONOMY } from '../models/GapDiagnosis'
import { COURSE_LEVELS, type CourseCatalog } from '../models/Recommendation'

export function validateCourseCatalog(value: unknown): asserts value is CourseCatalog {
  const fail = () => { throw new Error('Invalid synthetic learning catalog.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const catalog = value as CourseCatalog
  if (catalog.status !== 'synthetic_provisional' || !catalog.version || typeof catalog.disclaimer !== 'string' ||
    !Array.isArray(catalog.courses)) return fail()
  const ids = new Set<string>()
  const domains = new Set(ASSESSMENT_DOMAINS.map((_, index) => `D${index + 1}`))
  const strings = (input: unknown): input is string[] => Array.isArray(input) && input.every(entry => typeof entry === 'string' && entry.trim().length > 0)
  for (const course of catalog.courses) {
    if (!course || typeof course !== 'object' || typeof course.courseId !== 'string' || !/^PPOAF-D[1-9]-\d{3}$/.test(course.courseId) || ids.has(course.courseId)) return fail()
    ids.add(course.courseId)
    if (!course.title || !course.description || course.version !== catalog.version || typeof course.active !== 'boolean' ||
      !strings(course.domains) || !course.domains.length || !strings(course.secondaryDomains) ||
      [...course.domains, ...course.secondaryDomains].some(domain => !domains.has(domain)) ||
      !strings(course.gapTypes) || !course.gapTypes.length || course.gapTypes.some(type => !Object.hasOwn(GAP_TAXONOMY, type)) ||
      !strings(course.evidenceFocus) || !course.evidenceFocus.length || course.evidenceFocus.some(type => !(EVIDENCE_TYPES as readonly string[]).includes(type)) ||
      !COURSE_LEVELS.includes(course.level) || !['offline', 'low_bandwidth', 'standard_online', 'blended'].includes(course.bandwidth) ||
      !['self_paced', 'workshop', 'guided_practice', 'peer_reflection'].includes(course.modality) ||
      !['introductory', 'guided', 'independent'].includes(course.readinessSupport) ||
      !Number.isSafeInteger(course.durationMinutes) || course.durationMinutes <= 0 ||
      !Number.isFinite(course.practicalApplicability) || course.practicalApplicability < 0 || course.practicalApplicability > 100) return fail()
    if (!course.subcompetencies || typeof course.subcompetencies !== 'object' || Array.isArray(course.subcompetencies) ||
      Object.entries(course.subcompetencies).some(([domain, names]) => ![...course.domains, ...course.secondaryDomains].includes(domain) || !strings(names))) return fail()
    if (![course.language, course.gradeRelevance, course.subjectRelevance, course.priorLearningEquivalence].every(strings) ||
      !course.language.length || !course.gradeRelevance.length || !course.subjectRelevance.length ||
      ![course.largeClassSupport, course.lowResourceSupport, course.beginnerFriendly].every(flag => typeof flag === 'boolean') ||
      !course.accessibility || !['captions', 'transcript', 'downloadable_materials', 'mobile_friendly'].every(key =>
        typeof course.accessibility[key as keyof typeof course.accessibility] === 'boolean') || !Array.isArray(course.prerequisites) ||
      course.prerequisites.some(requirement => !['course', 'digital_experience'].includes(requirement.kind) ||
        typeof requirement.value !== 'string' || !requirement.value || typeof requirement.mandatory !== 'boolean' ||
        (requirement.kind === 'digital_experience' && !['basic', 'intermediate', 'advanced'].includes(requirement.value)))) return fail()
  }
  for (const course of catalog.courses) {
    if (course.priorLearningEquivalence.some(id => !ids.has(id)) || course.prerequisites.some(requirement =>
      requirement.kind === 'course' && (!ids.has(requirement.value) || requirement.value === course.courseId))) return fail()
  }
}

export function loadCourseCatalog(): CourseCatalog {
  const catalog: unknown = JSON.parse(readFileSync(path.resolve(__dirname, '../../data/courseCatalog.synthetic.v0.1.json'), 'utf8'))
  validateCourseCatalog(catalog)
  return catalog
}
