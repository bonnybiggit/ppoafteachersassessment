import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RotateCcw,
  FileCheck,
  BookOpen,
  Compass,
  Info,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  getCurrentAttempt,
  getAssessmentScore,
  type AttemptScoringResult,
} from "../../services/assessmentService";

export default function Reassessment() {
  const [scoring, setScoring] = useState<AttemptScoringResult | null>(null);
  const [attemptDate, setAttemptDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const attempt = await getCurrentAttempt();
        if (attempt?.id) {
          if (attempt.completedAt || attempt.submittedAt) {
            setAttemptDate(attempt.completedAt || attempt.submittedAt || null);
          }
          const scoreResult = await getAssessmentScore(attempt.id).catch(() => null);
          if (!cancelled) setScoring(scoreResult);
        }
      } catch {
        /* Handle load failure silently */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
            Longitudinal Progress
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Reassess Your Growth
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Return to your competency assessment after completing learning and classroom practice to measure your professional growth over time.
        </p>
      </div>

      {/* Baseline Status Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3 text-[#0c3b6e]">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#0c3b6e]">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">The Continuous Upskilling Cycle</h2>
              <p className="text-xs text-gray-500">
                Measuring longitudinal growth over time, not one-off evaluation
              </p>
            </div>
          </div>
          <span className="text-xs bg-blue-50 text-[#0c3b6e] px-2.5 py-0.5 rounded font-mono font-medium">
            {scoring ? "Baseline Recorded" : "Baseline Needed"}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-2xl">
          The PPOAF framework encourages teachers to complete developmental cycles (Assessment → Upskilling → Classroom Practice → Reflection) before taking targeted or full reassessments. This provides tangible evidence of your competency evolution.
        </p>

        {loading ? (
          <div className="text-xs text-gray-500">Checking assessment cycle state…</div>
        ) : scoring ? (
          <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#ede8e1] space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#0c3b6e] font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Baseline Assessment Complete</span>
              </div>
              {attemptDate ? (
                <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[11px]">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(attemptDate).toLocaleDateString()}</span>
                </div>
              ) : null}
            </div>
            <p className="text-gray-600">
              Overall Baseline Score: <strong className="text-[#0c3b6e]">{scoring.overallCompetencyScore ?? "--"} / 100</strong> ({scoring.overallClassification} Band).
            </p>
          </div>
        ) : (
          <div className="pt-2">
            <Link
              to="/teacher/assessment"
              className="inline-flex items-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs"
            >
              <FileCheck className="h-4 w-4" />
              <span>Complete Initial Assessment</span>
            </Link>
          </div>
        )}
      </div>

      {/* Informational Readiness Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-3 text-xs text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 text-[#0c3b6e] font-bold text-sm">
          <Info className="h-5 w-5 text-[#0c3b6e]" />
          <h3>Reassessment Cycle Guidance</h3>
        </div>
        <p className="leading-relaxed text-gray-700">
          Reassessment is recommended after 4 to 8 weeks of dedicated classroom practice and learning module application. Taking a reassessment too quickly may not reflect meaningful pedagogical habit changes.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            to="/teacher/learning"
            className="inline-flex items-center gap-1.5 bg-[#0c3b6e] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#082a50] transition-colors"
          >
            <BookOpen className="h-4 w-4 text-[#b81c1c]" />
            <span>Continue Upskilling</span>
          </Link>
          <Link
            to="/teacher/growth-plan"
            className="inline-flex items-center gap-1.5 bg-white border border-[#ede8e1] text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            <Compass className="h-4 w-4 text-gray-500" />
            <span>View Growth Plan</span>
          </Link>
        </div>
      </div>

      {/* Reassessment Timeline Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#ede8e1] space-y-3 shadow-2xs">
          <div className="text-xs font-bold font-mono text-[#b81c1c]">PHASE 1</div>
          <h3 className="text-sm font-bold text-[#0c3b6e]">Initial Baseline</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Complete the full 9-domain diagnostic to map baseline competencies and identify priority gaps.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#ede8e1] space-y-3 shadow-2xs">
          <div className="text-xs font-bold font-mono text-[#b81c1c]">PHASE 2</div>
          <h3 className="text-sm font-bold text-[#0c3b6e]">Targeted Upskilling</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Apply personalised courses and classroom strategies focused on identified development priorities.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#ede8e1] space-y-3 shadow-2xs">
          <div className="text-xs font-bold font-mono text-[#b81c1c]">PHASE 3</div>
          <h3 className="text-sm font-bold text-[#0c3b6e]">Reassessment & Growth</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Retake competency evaluations to observe demonstrable improvements and update your professional profile.
          </p>
        </div>
      </div>
    </div>
  );
}
