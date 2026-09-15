import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminTeachers from './pages/AdminTeachers'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './layouts/AdminLayout'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import { AdminArea } from './context/AdminAuthContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedTeacherRoute from './components/ProtectedTeacherRoute'

// Teacher Experience
import TeacherLayout from './layouts/TeacherLayout'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherProfile from './pages/teacher/TeacherProfile'
import AssessmentIntro from './pages/teacher/AssessmentIntro'
import AssessmentQuestions from './pages/teacher/AssessmentQuestions'
import TeacherResults from './pages/teacher/TeacherResults'
import TeacherLearning from './pages/teacher/TeacherLearning'
import GrowthPlan from './pages/teacher/GrowthPlan'
import Reassessment from './pages/teacher/Reassessment'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminArea />}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<ProtectedAdminRoute />}>
            <Route element={<AdminLayout />}><Route index element={<AdminDashboard />} /><Route path="teachers" element={<AdminTeachers />} /></Route>
          </Route>
        </Route>

        {/* Teacher Portal Experience (Nested in TeacherLayout) */}
        <Route element={<ProtectedTeacherRoute />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="assessment" element={<AssessmentIntro />} />
          <Route path="assessment/questions" element={<AssessmentQuestions />} />
          <Route path="results" element={<TeacherResults />} />
          <Route path="learning" element={<TeacherLearning />} />
          <Route path="growth-plan" element={<GrowthPlan />} />
          <Route path="reassessment" element={<Reassessment />} />
        </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
