import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck,
  User,
  Heart,
  MessageCircle,
  Layout,
  Lightbulb,
  BookOpen,
  Wrench,
  Cpu,
  Star,
  Building2,
  ArrowRight,
  Sparkles,
  Target,
  Award,
  Compass,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getCurrentAttempt,
  getAssessmentScore,
  getAssessmentGaps,
  getAssessmentRecommendations,
  type AssessmentAttempt,
  type AttemptScoringResult,
  type GapDiagnosisResult,
  type RecommendationResult,
} from "../../services/assessmentService";

const competencies = [
  { name: "Human-Centred Teaching & Empathy", icon: Heart },
  { name: "Communication & Influence", icon: MessageCircle },
  { name: "Classroom Leadership & Behaviour Design", icon: Layout },
  { name: "Adaptive Teaching & Problem Solving", icon: Lightbulb },
  { name: "Practical Pedagogy & Learning Design", icon: BookOpen },
  { name: "Resourcefulness & Entrepreneurial Thinking", icon: Wrench },
  { name: "Digital & Future Skills", icon: Cpu },
  { name: "Personal Effectiveness & Professional Identity", icon: Star },
  { name: "Community Engagement", icon: Building2 },
];

const growthStages = [
  { stage: "01", title: "Assessment", status: "Baseline Evaluation" },
  { stage: "02", title: "Understand", status: "Gap Diagnosis" },
  { stage: "03", title: "Learn", status: "Personalized Upskilling" },
  { stage: "04", title: "Practice", status: "Classroom Application" },
  { stage: "05", title: "Reassess", status: "Longitudinal Growth" },
];

export default function TeacherDashboard() {
  const { teacher } = useAuth();
  const teacherFirstName = teacher?.firstName || "Teacher";

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [scoring, setScoring] = useState<AttemptScoringResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<GapDiagnosisResult | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAttempt = async () => {
      try {
        const current = await getCurrentAttempt();
        if (cancelled) return;
        setAttempt(current);

        if (current.status === "completed" || current.status === "submitted") {
          const [scoreRes, gapRes, recRes] = await Promise.all([
            getAssessmentScore(current.id).catch(() => null),
            getAssessmentGaps(current.id).catch(() => null),
            getAssessmentRecommendations(current.id).catch(() => null),
          ]);
          if (cancelled) return;
          setScoring(scoreRes);
          setDiagnosis(gapRes);
          setRecommendations(recRes);
        }
      } catch {
        /* No active attempt or unauthenticated */
      }
    };

    void loadAttempt();
    return () => {
      cancelled = true;
    };
  }, []);

  const progressPercent =
    attempt && attempt.totalItems > 0
      ? Math.round((attempt.currentItemIndex / attempt.totalItems) * 100)
      : 0;

  const topPriorityGap = diagnosis?.priorityGaps?.[0] ?? null;
  const topRec = recommendations?.recommendations?.[0] ?? null;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#b81c1c]">
              Teacher Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
            Welcome back, {teacherFirstName}
          </h1>
          <p className="text-sm text-gray-600 max-w-xl leading-relaxed">
            Your professional growth journey starts with understanding where you are today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/teacher/assessment"
            className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs"
          >
            <FileCheck className="h-4 w-4" />
            <span>
              {attempt?.status === "in_progress"
                ? "Continue Assessment"
                : attempt?.status === "completed" || attempt?.status === "submitted"
                  ? "View Assessment"
                  : "Start Assessment"}
            </span>
          </Link>
          <Link
            to="/teacher/profile"
            className="inline-flex items-center justify-center gap-2 border border-[#ede8e1] bg-white text-gray-700 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            <User className="h-4 w-4 text-gray-500" />
            <span>View My Profile</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Assessment Status Banner */}
      <div className="bg-gradient-to-br from-[#0c3b6e] to-[#082a50] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Status:{" "}
                {attempt?.status === "completed" || attempt?.status === "submitted"
                  ? "Assessment Completed"
                  : attempt?.status === "in_progress"
                    ? "In Progress"
                    : "Not Started"}
              </span>
              <span className="text-blue-200 text-xs font-mono">
                {attempt?.status === "completed" || attempt?.status === "submitted"
                  ? "100% Evaluated"
                  : `${progressPercent}% Complete`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {attempt?.status === "completed" || attempt?.status === "submitted"
                ? "Your Competency Evaluation Results Are Ready"
                : "Your Teacher Competency Assessment"}
            </h2>
            <p className="text-sm text-blue-100 leading-relaxed">
              {attempt?.status === "completed" || attempt?.status === "submitted"
                ? "Review your multidimensional competency scores, diagnostic gap insights, and personalized upskilling opportunities."
                : "Complete your assessment to understand your competency strengths and identify practical areas for professional growth across all 9 PPOAF domains."}
            </p>
          </div>
          <div className="shrink-0">
            {attempt?.status === "completed" || attempt?.status === "submitted" ? (
              <Link
                to="/teacher/results"
                className="inline-flex items-center justify-center gap-2 bg-[#b81c1c] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#8f1515] transition-colors shadow-sm"
              >
                <Award className="h-4 w-4" />
                <span>View Full Results</span>
              </Link>
            ) : (
              <Link
                to={
                  attempt?.status === "in_progress"
                    ? "/teacher/assessment/questions"
                    : "/teacher/assessment"
                }
                className="inline-flex items-center justify-center gap-2 bg-[#b81c1c] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#8f1515] transition-colors shadow-sm"
              >
                <span>
                  {attempt?.status === "in_progress" ? "Resume Assessment" : "Begin Assessment"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Progress Bar Visual */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-2">
            <span>Assessment Progress</span>
            <span className="font-mono">
              {attempt?.status === "completed" || attempt?.status === "submitted"
                ? "9 of 9 Domains Complete"
                : `${attempt?.currentItemIndex ?? 0} of ${attempt?.totalItems ?? 108} Items Answered`}
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#b81c1c] rounded-full transition-all"
              style={{
                width:
                  attempt?.status === "completed" || attempt?.status === "submitted"
                    ? "100%"
                    : `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Competency Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0c3b6e]">Your Competency Areas</h2>
            <p className="text-xs text-gray-500">
              The 9 PPOAF developmental domains. Scores are generated upon assessment completion.
            </p>
          </div>
          {scoring ? (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              Overall: {scoring.overallCompetencyScore ?? "--"}/100 ({scoring.overallClassification})
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {competencies.map((comp, idx) => {
            const Icon = comp.icon;
            const domainScore = scoring?.domains?.find((d) => d.domain === comp.name);

            return (
              <div
                key={comp.name}
                className="bg-white p-4 rounded-xl border border-[#ede8e1] flex items-center justify-between hover:border-[#0c3b6e]/30 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0c3b6e] flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      0{idx + 1}
                    </span>
                    <h3 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-1">
                      {comp.name}
                    </h3>
                  </div>
                </div>
                {domainScore && domainScore.score !== null ? (
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-[#0c3b6e] font-mono block">
                      {domainScore.score}/100
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-[#b81c1c]">
                      {domainScore.classification}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded shrink-0">
                    Not assessed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Growth Journey & Intelligence Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Your Growth Journey */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#0c3b6e]">Your Growth Journey</h2>
            <p className="text-xs text-gray-500">
              Structured developmental pathway from baseline assessment to continuous reassessment.
            </p>
          </div>

          <div className="relative pl-6 border-l-2 border-[#ede8e1] space-y-6">
            {growthStages.map((stage, i) => {
              const isCurrent =
                (i === 0 && (!attempt || attempt.status === "in_progress")) ||
                (i === 1 && (attempt?.status === "completed" || attempt?.status === "submitted"));

              return (
                <div key={stage.stage} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                      isCurrent
                        ? "border-[#0c3b6e] bg-[#0c3b6e]"
                        : "border-gray-300 bg-white"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0c3b6e]">{stage.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          isCurrent
                            ? "bg-blue-50 text-[#0c3b6e] font-semibold"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {stage.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {i === 0
                        ? "Complete your 9-domain baseline competency assessment."
                        : i === 1
                          ? "Review diagnostic gap insights and multi-evidence contrasts."
                          : "Apply upskilling modules and practical classroom actions."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intelligence Highlights & Quick Links */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Gap Insight */}
          {topPriorityGap ? (
            <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <Target className="h-4 w-4 text-[#b81c1c]" />
                  <h2 className="text-sm font-bold">Top Priority Gap</h2>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
                  {topPriorityGap.priority} Priority
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-900">{topPriorityGap.label}</h3>
                <p className="text-[11px] text-gray-600 font-medium">{topPriorityGap.domain}</p>
              </div>
              <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed bg-[#faf8f5] p-2.5 rounded border border-[#ede8e1]">
                {topPriorityGap.rationale}
              </p>
              <Link
                to="/teacher/results"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0c3b6e] hover:underline pt-1"
              >
                <span>View Gap Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}

          {/* Recommended Learning */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0c3b6e]">Recommended Learning</h2>
              <Sparkles className="h-4 w-4 text-[#b81c1c]" />
            </div>

            {topRec ? (
              <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#ede8e1] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] bg-[#0c3b6e] text-white px-2 py-0.5 rounded">
                    {topRec.courseId}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">
                    {topRec.level}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 leading-snug">{topRec.title}</h3>
                <p className="text-[11px] text-gray-600 line-clamp-2">{topRec.reason}</p>
                <div className="pt-2">
                  <Link
                    to="/teacher/learning"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c3b6e] hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Explore Learning Hub</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-[#faf8f5] p-5 rounded-xl border border-[#ede8e1] text-center space-y-3">
                <BookOpen className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Your personalised learning recommendations will appear after your assessment.
                </p>
                <Link
                  to="/teacher/learning"
                  className="inline-flex items-center justify-center text-xs font-semibold text-gray-600 hover:text-[#0c3b6e] bg-white border border-[#ede8e1] px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Explore Learning Hub
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-[#0c3b6e]">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/teacher/growth-plan"
                className="p-3 bg-[#faf8f5] hover:bg-gray-100 rounded-xl border border-[#ede8e1] flex flex-col gap-1 text-left transition-colors"
              >
                <Compass className="h-4 w-4 text-[#0c3b6e]" />
                <span className="text-xs font-bold text-gray-800">Growth Plan</span>
                <span className="text-[10px] text-gray-500">Track actions</span>
              </Link>
              <Link
                to="/teacher/reassessment"
                className="p-3 bg-[#faf8f5] hover:bg-gray-100 rounded-xl border border-[#ede8e1] flex flex-col gap-1 text-left transition-colors"
              >
                <RotateCcw className="h-4 w-4 text-[#b81c1c]" />
                <span className="text-xs font-bold text-gray-800">Reassessment</span>
                <span className="text-[10px] text-gray-500">Cycle info</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
