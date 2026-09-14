import { Teacher } from '../models/Teacher'
import AssessmentAttempt from '../models/AssessmentAttempt'
import AssessmentItem from '../models/AssessmentItem'
import { loadCourseCatalog } from './courseCatalog'

export async function getAdminOverview() {
  const [totalTeachers, activity, syntheticBankItems] = await Promise.all([
    Teacher.countDocuments({}),
    AssessmentAttempt.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AssessmentItem.countDocuments({ version: { $regex: '^\\s*synthetic', $options: 'i' } }),
  ])
  const totalAttempts = activity.reduce((sum, row) => sum + row.count, 0)
  const completedAttempts = activity.find(row => row._id === 'completed')?.count ?? 0
  const inProgressAttempts = activity.find(row => row._id === 'in_progress')?.count ?? 0
  let activeLearningOpportunities: number | null = null
  try { activeLearningOpportunities = loadCourseCatalog().courses.filter(course => course.active).length } catch { /* Unavailable is not zero. */ }
  return { totalTeachers, totalAttempts, completedAttempts, inProgressAttempts,
    completionRate: totalAttempts ? Math.round(completedAttempts / totalAttempts * 1000) / 10 : null,
    syntheticBankItems, activeLearningOpportunities }
}
