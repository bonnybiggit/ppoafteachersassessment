import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  FileCheck,
  TrendingUp,
  Info,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { AuthApiError } from "../../services/authService";
import type { AttemptScoringResult } from "../../services/assessmentService";

const domainPlaceholders = [
  "Human-Centred Teaching & Empathy",
  "Communication & Influence",
  "Classroom Leadership & Behaviour Design",
  "Adaptive Teaching & Problem Solving",
  "Practical Pedagogy & Learning Design",
  "Resourcefulness & Entrepreneurial Thinking",
  "Digital & Future Skills",
  "Personal Effectiveness & Professional Identity",
  "Community Engagement",
];

export default function TeacherResults() {
  const location = useLocation();
  const [scoring, setScoring] = useState<AttemptScoringResult | null>(
    location.state?.scoring ?? null,
  );
  const [loading, setLoading] = useState(!scoring);
  const [error, setError] = useState("");

  useEffect(() => {
    if (scoring || !location.state?.attempt?.id) return;

    const load = async () => {
      try {
        const { getAssessmentScore } =
          await import("../../services/assessmentService");
        const result = await getAssessmentScore(location.state.attempt.id);
        setScoring(result);
      } catch (reason) {
        const message =
          reason instanceof AuthApiError
            ? reason.message
            : "Unable to load your score report. Please try again.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [location.state, scoring]);

  const overallScore = scoring?.overallCompetencyScore ?? null;
  const overallClassification = scoring?.overallClassification ?? "Pending";

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Your Assessment Results & Competency Profile
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Review your developmental evaluation breakdown across the 9 PPOAF
          teacher competency domains.
        </p>
      </div>

      {!scoring && !loading ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#ede8e1] shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0c3b6e] flex items-center justify-center mx-auto mb-2">
            <Award className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0c3b6e]">
            {error
              ? "Unable to Load Results"
              : "Complete Your Assessment to Unlock Your Results"}
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            {error ||
              "Your multidimensional competency scores, strengths, priority development gaps, and personalised recommendations will be calculated after you finish the assessment."}
          </p>
          <div className="pt-2">
            <Link
              to="/teacher/assessment"
              className="inline-flex items-center gap-2 bg-[#0c3b6e] text-white px-6 py-3 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs"
            >
              <FileCheck className="h-4 w-4" />
              <span>Go to Assessment</span>
            </Link>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-[#ede8e1] shadow-xs text-center text-sm text-gray-600">
          Loading your competency profile…
        </div>
      ) : null}

      {scoring ? (
        <>
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  Overall score
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-[#0c3b6e]">
                    {overallScore ?? "--"}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#b81c1c]">
                    {overallClassification}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                Scoring version: {scoring.scoringVersion}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0c3b6e]">
                Competency Profile
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded font-mono">
                {scoring.domains.length} domains
              </span>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4">
              <h4 className="text-sm font-bold text-[#0c3b6e] flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0c3b6e]" />
                <span>Domain scores</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {scoring.domains.map((domain) => (
                  <div
                    key={domain.domain}
                    className="p-3 bg-[#faf8f5] rounded-lg border border-[#ede8e1] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700">
                        {domain.domain}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {domain.score ?? "--"} / 100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0c3b6e] rounded-full"
                        style={{ width: `${domain.score ?? 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {domain.classification}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h4 className="text-sm font-bold">Strengths</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-600">
                  {scoring.domains
                    .filter((domain) => domain.score !== null)
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .slice(0, 3)
                    .map((domain) => (
                      <li
                        key={domain.domain}
                        className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2"
                      >
                        <span className="font-semibold text-emerald-800">
                          {domain.domain}
                        </span>{" "}
                        — {domain.score ?? "--"} / 100
                      </li>
                    ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <TrendingUp className="h-5 w-5 text-[#b81c1c]" />
                  <h4 className="text-sm font-bold">Development focus</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-600">
                  {scoring.domains
                    .filter((domain) => domain.score !== null)
                    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
                    .slice(0, 3)
                    .map((domain) => (
                      <li
                        key={domain.domain}
                        className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2"
                      >
                        <span className="font-semibold text-red-800">
                          {domain.domain}
                        </span>{" "}
                        — {domain.score ?? "--"} / 100
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <Info className="h-5 w-5 text-[#0c3b6e]" />
                  <h4 className="text-sm font-bold">
                    Understanding your results
                  </h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  The backend model classifies each domain and the overall score
                  into competency bands based on the validated PPOAF scoring
                  logic.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <Award className="h-5 w-5 text-[#0c3b6e]" />
                  <h4 className="text-sm font-bold">Assessment summary</h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {
                    scoring.domains.filter((domain) => domain.score !== null)
                      .length
                  }{" "}
                  of {domainPlaceholders.length} domains included in the
                  weighted score profile.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
