/**
 * Application routes definition.
 * Route paths are defined here for reference and future use.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  admin: '/admin',
  teacher: {
    dashboard: '/teacher',
    profile: '/teacher/profile',
    assessment: '/teacher/assessment',
    questions: '/teacher/assessment/questions',
    results: '/teacher/results',
    learning: '/teacher/learning',
    growthPlan: '/teacher/growth-plan',
    reassessment: '/teacher/reassessment',
  },
} as const
