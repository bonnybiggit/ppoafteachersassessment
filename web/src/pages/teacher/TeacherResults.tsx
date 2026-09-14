import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  FileCheck,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Compass,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AuthApiError } from "../../services/authService";
import {
  getAssessmentScore,
  getAssessmentGaps,
  getCurrentAttempt,
  type AttemptScoringResult,
  type GapDiagnosisResult,
} from "../../services/assessmentService";

export default function TeacherResults() {
  const location = useLocation();
  const [scoring, setScoring] = useState<AttemptScoringResult | null>(
    location.state?.scoring ?? null,
  );
  const [diagnosis, setDiagnosis] = useState<GapDiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        let attemptId = location.state?.attempt?.id;

        if (!attemptId) {
          try {
            const current = await getCurrentAttempt();
            attemptId = current.id;
          } catch {
            // No current attempt found
          }
        }

        if (!attemptId) {
          if (!cancelled) setLoading(false);
          return;
        }

        const [scoringResult, gapsResult] = await Promise.all([
          scoring ? Promise.resolve(scoring) : getAssessmentScore(attemptId),
          getAssessmentGaps(attemptId).catch(() => null),
        ]);

        if (cancelled) return;
        setScoring(scoringResult);
        setDiagnosis(gapsResult);
      } catch (reason) {
        if (!cancelled) {
          const message =
            reason instanceof AuthApiError
              ? reason.message
              : "Unable to load your results report. Please try again.";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [location.state, scoring]);

  const overallScore = scoring?.overallCompetencyScore ?? null;
  const overallClassification = scoring?.overallClassification ?? "Pending";
  const priorityGaps = diagnosis?.priorityGaps ?? [];
  const reviewRequired = Boolean(diagnosis?.reviewRequired || scoring?.domains.some((d) => d.criticalItemFlagged));

  // Determine top 3 strengths from scored domains
  const topStrengths = scoring?.domains
    ? [...scoring.domains]
        .filter((d) => d.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 3)
    : [];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. RESULTS HEADER */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
                Developmental Report
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                Provisional Assessment
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
              Your Teaching Strengths & Growth Areas
            </h1>
          </div>
          <Link
            to="/teacher/learning"
            className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shrink-0 shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-[#b81c1c]" />
            <span>Explore Recommendations</span>
          </Link>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
          Your assessment results are designed to help you understand your current teaching strengths and identify practical areas for professional growth. This evaluation is focused purely on support and continuous development—it is not an employment appraisal or pass/fail ranking.
        </p>
      </div>

      {/* NO ATTEMPT / NOT COMPLETED STATE */}
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

      {/* LOADING STATE */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-[#ede8e1] shadow-xs text-center text-sm text-gray-600">
          Loading your competency profile and diagnostic gaps…
        </div>
      ) : null}

      {scoring ? (
        <>
          {/* CRITICAL REVIEW NOTICE */}
          {reviewRequired ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-900 shadow-xs">
              <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed">
                <h4 className="font-bold text-sm text-amber-950">
                  Human Review Recommended
                </h4>
                <p>
                  Some assessment responses require additional professional review before certain conclusions are made. This notice is for editorial review purposes only and does not change or lower your competency scores.
                </p>
              </div>
            </div>
          ) : null}

          {/* 2. OVERALL DEVELOPMENT SNAPSHOT */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-bold text-[#0c3b6e] uppercase tracking-wider">
                Development Snapshot
              </span>
              <span className="text-xs bg-blue-50 text-[#0c3b6e] px-2.5 py-0.5 rounded font-mono font-medium">
                Version: {scoring.scoringVersion}
              </span>
            </div>

            {overallScore !== null ? (
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Overall Competency Score</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-extrabold text-[#0c3b6e]">
                      {overallScore}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wider text-[#b81c1c] bg-red-50 px-2.5 py-1 rounded">
                      {overallClassification} Band
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1 sm:text-right">
                  <div>Assessment Status: <span className="font-semibold text-emerald-700">Completed & Evaluated</span></div>
                  <div>Scoring Standard: <span className="font-semibold text-gray-800">9-Domain Weighted Model</span></div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <strong className="font-bold">Overall Result Pending:</strong>
                <p>
                  Your overall competency result is not available yet because some domains do not have enough valid responses to meet the 9-item threshold. Domain-specific scores are displayed below.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* 3. NINE-DOMAIN OVERVIEW */}
            <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-[#0c3b6e] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#0c3b6e]" />
                  <span>Nine-Domain Competency Overview</span>
                </h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded font-mono">
                  {scoring.domains.length} Domains
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoring.domains.map((domain) => (
                  <div
                    key={domain.domain}
                    className="p-4 bg-[#faf8f5] rounded-xl border border-[#ede8e1] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-800 leading-snug">
                        {domain.domain}
                      </h4>
                      <span className="text-xs font-extrabold text-[#0c3b6e] font-mono shrink-0">
                        {domain.score !== null ? `${domain.score}/100` : "--"}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0c3b6e] rounded-full transition-all"
                        style={{ width: `${domain.score ?? 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                      <span className="font-semibold uppercase tracking-wider text-[#b81c1c]">
                        {domain.classification}
                      </span>
                      <span>Confidence: {domain.confidenceLevel}</span>
                    </div>

                    {domain.validItemCount < domain.expectedItemCount ? (
                      <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        {domain.validItemCount} of {domain.expectedItemCount} items recorded
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. STRENGTHS & DEVELOPMENT FOCUS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <h3 className="text-base font-bold">Your Demonstrated Strengths</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Based on your assessment evidence, you demonstrate strong capability in these areas:
                </p>
                <div className="space-y-3">
                  {topStrengths.map((domain, idx) => (
                    <div
                      key={domain.domain}
                      className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-950">
                        <span>{idx + 1}. {domain.domain}</span>
                        <span className="font-mono text-emerald-800">{domain.score}/100</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Level: <span className="font-semibold">{domain.classification}</span> • Confidence: {domain.confidenceLevel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas for Growth */}
              <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <TrendingUp className="h-5 w-5 text-[#b81c1c] shrink-0" />
                  <h3 className="text-base font-bold">Opportunities for Growth</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Targeting these priority domains will offer the highest return for your professional upskilling:
                </p>
                <div className="space-y-3">
                  {scoring.domains
                    .filter((d) => d.score !== null)
                    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
                    .slice(0, 3)
                    .map((domain, idx) => (
                      <div
                        key={domain.domain}
                        className="p-3.5 rounded-xl border border-red-100 bg-red-50/60 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-red-950">
                          <span>{idx + 1}. {domain.domain}</span>
                          <span className="font-mono text-red-800">{domain.score}/100</span>
                        </div>
                        <p className="text-[11px] text-red-800">
                          Emerging capability • Level: <span className="font-semibold">{domain.classification}</span>
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 5. PRIORITY DEVELOPMENT GAPS (STEP 4) */}
            <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-[#0c3b6e]">
                  <Target className="h-5 w-5 text-[#b81c1c]" />
                  <h3 className="text-base font-bold">
                    Priority Development Gap Diagnosis
                  </h3>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium ${
                    diagnosis?.status === "available"
                      ? "bg-blue-50 text-[#0c3b6e]"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {diagnosis?.status === "available"
                    ? `Step 4 Diagnosis Engine v${diagnosis.version || "1"}`
                    : "Insufficient Evidence"}
                </span>
              </div>

              <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#ede8e1] text-xs text-gray-700 leading-relaxed">
                <strong className="text-[#0c3b6e] font-bold">Understanding Gap Diagnoses:</strong> A development gap is an explanation of multi-evidence response patterns (e.g., knowledge vs. scenario judgement contrasts). It highlights actionable learning needs rather than defining teacher quality.
              </div>

              {diagnosis?.status === "insufficient_evidence" ? (
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 text-center space-y-2 text-xs text-amber-900">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
                  <h4 className="font-bold text-sm">Insufficient Evidence for Gap Diagnosis</h4>
                  <p className="max-w-md mx-auto">
                    A minimum of 9 valid items per domain is required to generate a reliable gap diagnosis. Unanswered questions are not treated as zero scores or false gaps.
                  </p>
                </div>
              ) : null}

              {priorityGaps.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {priorityGaps.slice(0, 3).map((gap, index) => {
                      const priorityColor =
                        gap.priority === "high"
                          ? "bg-red-50 text-[#b81c1c] border-red-200"
                          : gap.priority === "medium"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-[#0c3b6e] border-blue-200";

                      return (
                        <div
                          key={`${gap.domainId}-${gap.type}-${index}`}
                          className="p-5 bg-[#faf8f5] rounded-xl border border-[#ede8e1] space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColor}`}
                              >
                                {gap.priority} Priority
                              </span>
                              <h4 className="text-xs font-bold text-[#0c3b6e]">
                                {gap.label}
                              </h4>
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono">
                              Diagnostic Confidence: {gap.confidence}
                            </span>
                          </div>

                          <div className="text-xs space-y-1">
                            <p className="text-gray-800">
                              <strong className="text-[#0c3b6e]">Domain:</strong>{" "}
                              {gap.domain} ({gap.domainId})
                            </p>
                            {gap.subcompetency ? (
                              <p className="text-gray-700">
                                <strong className="text-[#0c3b6e]">
                                  Subcompetency Area:
                                </strong>{" "}
                                {gap.subcompetency}
                              </p>
                            ) : null}
                          </div>

                          <p className="text-xs text-gray-600 leading-relaxed bg-white p-3.5 rounded-lg border border-[#ede8e1]">
                            {gap.rationale}
                          </p>

                          {gap.contextualFactors && gap.contextualFactors.length > 0 ? (
                            <div className="text-[11px] text-gray-500 space-y-1">
                              <strong className="text-gray-700">Contextual Factors:</strong>
                              <ul className="list-disc list-inside space-y-0.5">
                                {gap.contextualFactors.map((factor, idx) => (
                                  <li key={idx}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : diagnosis?.status === "available" ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  No priority development gaps were diagnosed for this attempt. Your overall performance reflects strong alignment across the evaluated evidence types.
                </div>
              ) : null}

              {diagnosis?.limitations && diagnosis.limitations.length > 0 ? (
                <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Diagnostic Disclaimers:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {diagnosis.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* 7. WHAT TO DO NEXT (CALL TO ACTION GRID) */}
            <div className="bg-gradient-to-br from-[#0c3b6e] to-[#082a50] text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-bold text-white">Your Next Steps</h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Turn your assessment feedback into practical classroom growth through your custom upskilling pathway.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  to="/teacher/learning"
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-all space-y-2 block"
                >
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-5 w-5 text-blue-200" />
                    <ArrowRight className="h-4 w-4 text-blue-200" />
                  </div>
                  <h4 className="text-xs font-bold text-white">1. Explore Learning</h4>
                  <p className="text-[11px] text-blue-100 leading-snug">
                    Access micro-learning modules matched to your gap diagnosis.
                  </p>
                </Link>

                <Link
                  to="/teacher/growth-plan"
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-all space-y-2 block"
                >
                  <div className="flex items-center justify-between">
                    <Compass className="h-5 w-5 text-blue-200" />
                    <ArrowRight className="h-4 w-4 text-blue-200" />
                  </div>
                  <h4 className="text-xs font-bold text-white">2. Create Growth Plan</h4>
                  <p className="text-[11px] text-blue-100 leading-snug">
                    Set up classroom actions and practice goals for your priority gaps.
                  </p>
                </Link>

                <Link
                  to="/teacher/reassessment"
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-all space-y-2 block"
                >
                  <div className="flex items-center justify-between">
                    <RotateCcw className="h-5 w-5 text-blue-200" />
                    <ArrowRight className="h-4 w-4 text-blue-200" />
                  </div>
                  <h4 className="text-xs font-bold text-white">3. Reassess Growth</h4>
                  <p className="text-[11px] text-blue-100 leading-snug">
                    Track long-term progress by retaking assessment cycles over time.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
