import { Schema } from 'mongoose'
import type { GapType } from './GapDiagnosis'

export const COURSE_LEVELS = ['foundation', 'developing', 'intermediate', 'advanced'] as const
export type CourseLevel = typeof COURSE_LEVELS[number]
export type Modality = 'self_paced' | 'workshop' | 'guided_practice' | 'peer_reflection'
export type Bandwidth = 'offline' | 'low_bandwidth' | 'standard_online' | 'blended'
export type AccessibilityFeature = 'captions' | 'transcript' | 'downloadable_materials' | 'mobile_friendly'
export interface CoursePrerequisite { kind: 'course' | 'digital_experience'; value: string; mandatory: boolean }
export interface LearningOpportunity {
  courseId: string; title: string; description: string
  domains: string[]; secondaryDomains: string[]; subcompetencies: Record<string, string[]>
  gapTypes: GapType[]; evidenceFocus: string[]; level: CourseLevel
  durationMinutes: number; modality: Modality; bandwidth: Bandwidth
  prerequisites: CoursePrerequisite[]; language: string[]; gradeRelevance: string[]; subjectRelevance: string[]
  accessibility: Record<AccessibilityFeature, boolean>
  priorLearningEquivalence: string[]; practicalApplicability: number
  largeClassSupport: boolean; lowResourceSupport: boolean; beginnerFriendly: boolean
  readinessSupport: 'introductory' | 'guided' | 'independent'
  active: boolean; version: string
}
export interface CourseCatalog { version: string; status: 'synthetic_provisional'; disclaimer: string; courses: LearningOpportunity[] }
export interface RecommendationComponents {
  needMatch: number; modalityFit: number; practicalApplicability: number; contextFit: number
  accessibility: number; exposureReadiness: number; developmentFit: number
}
export interface RecommendationAudit {
  courseId: string; domainId: string; gapType: GapType; subcompetency: string | null
  components: RecommendationComponents | null; score: number | null
  subcompetencyMatch: number; gapTypeMatch: number
  penalties: { ruleId: string; amount: number; reason: string }[]
  ruleIds: string[]; exclusionReasons: string[]
}
export interface LearningSuggestion {
  courseId: string; title: string; description: string; score: number
  confidence: 'High' | 'Medium' | 'Low'; reason: string; matchFactors: string[]; limitations: string[]
  estimatedDuration: string; modality: Modality; bandwidth: Bandwidth; level: CourseLevel
  prerequisites: string[]; domainId: string; gapType: GapType; subcompetency: string | null
}
export interface ImmediateRecommendation extends LearningSuggestion { alternatives: LearningSuggestion[] }
export interface RecommendationResult {
  version: string; catalogVersion: string
  status: 'available' | 'no_matches' | 'insufficient_evidence' | 'no_diagnosed_gaps'
  recommendations: ImmediateRecommendation[]; reviewRequired: boolean; reviewReason: string | null; limitations: string[]
}
export interface StoredRecommendations { sourceFingerprint: string; result: RecommendationResult; audit: RecommendationAudit[] }

// All internal audit details stay on the attempt; the service projects a safe
// response explicitly. No new collection or external enrollment is created.
export const storedRecommendationsSchema = new Schema({
  sourceFingerprint: { type: String, required: true },
  result: { type: Schema.Types.Mixed, required: true },
  audit: { type: [Schema.Types.Mixed], default: [] },
}, { _id: false })
