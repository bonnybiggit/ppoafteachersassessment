import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Target,
  BookOpen,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  RotateCcw,
  FileCheck,
  Info,
} from "lucide-react";
import {
  getCurrentAttempt,
  getAssessmentGaps,
  getAssessmentRecommendations,
  type GapDiagnosisResult,
  type RecommendationResult,
} from "../../services/assessmentService";

const planStages = [
  {
    title: "1. Current Focus",
    description: "Targeted competency gap identified from diagnostic assessment.",
    icon: Target,
    detail: "Diagnostic insight",
  },
  {
    title: "2. Learning Actions",
    description: "Selected micro-modules and professional reading.",
    icon: BookOpen,
    detail: "Upskilling module",
  },
  {
    title: "3. Classroom Practice",
    description: "Practical classroom application challenges and routine adjustments.",
    icon: CheckSquare,
    detail: "Action in class",
  },
  {
    title: "4. Self-Reflection",
    description: "Structured reflection on student outcomes and pedagogical adjustments.",
    icon: MessageSquare,
    detail: "Reflection log",
  },
  {
    title: "5. Progress Verification",
    description: "Milestone tracking and competency readiness.",
    icon: TrendingUp,
    detail: "Milestone check",
  },
  {
    title: "6. Reassessment Cycle",
    description: "Targeted reassessment of the competency domain.",
    icon: RotateCcw,
    detail: "Longitudinal cycle",
  },
];

interface PlanItemState {
  targetPeriod: string;
  progress: "Not Started" | "In Progress" | "Completed";
}

export default function GrowthPlan() {
  const [diagnosis, setDiagnosis] = useState<GapDiagnosisResult | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [planState, setPlanState] = useState<Record<string, PlanItemState>>({});

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const attempt = await getCurrentAttempt();
        if (!attempt?.id) {
          if (!cancelled) setLoading(false);
          return;
        }

        const [gapsResult, recsResult] = await Promise.all([
          getAssessmentGaps(attempt.id).catch(() => null),
          getAssessmentRecommendations(attempt.id).catch(() => null),
        ]);

        if (cancelled) return;
        setDiagnosis(gapsResult);
        setRecommendations(recsResult);

        // Load frontend session plan state if available
        try {
          const stored = sessionStorage.getItem(`growth_plan_${attempt.id}`);
          if (stored) {
            setPlanState(JSON.parse(stored));
          }
        } catch {
          /* Session storage fallback */
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

  const updateItemState = (gapKey: string, update: Partial<PlanItemState>) => {
    setPlanState((prev) => {
      const current = prev[gapKey] ?? { targetPeriod: "Next 2 Weeks", progress: "Not Started" };
      const next = { ...prev, [gapKey]: { ...current, ...update } };
      try {
        sessionStorage.setItem("ppoaf_growth_plan_state", JSON.stringify(next));
      } catch {
        /* Session storage fallback */
      }
      return next;
    });
  };

  const priorityGaps = diagnosis?.priorityGaps ?? [];
  const recList = recommendations?.recommendations ?? [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
            Developmental Pathway
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          My Professional Growth Plan
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          A structured, iterative framework enabling teachers to turn diagnostic insights into practical classroom action steps.
        </p>
      </div>

      {/* Persistence Transparency Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-950">
        <Info className="h-4 w-4 text-[#0c3b6e] shrink-0" />
        <p>
          <strong>Session Plan:</strong> Growth plan actions are saved in your current active browser session for lightweight planning and classroom practice tracking.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-[#ede8e1] shadow-xs text-center text-xs text-gray-500">
          Loading your personalized growth plan…
        </div>
      ) : null}

      {/* ACTIVE GROWTH PLAN SECTION */}
      {!loading && priorityGaps.length > 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-[#0c3b6e]">
              <Compass className="h-5 w-5 text-[#b81c1c]" />
              <h2 className="text-base font-bold">Priority Action Plan</h2>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded font-mono font-medium">
              {priorityGaps.length} Target Priority Areas
            </span>
          </div>

          <p className="text-xs text-gray-600">
            For each priority gap diagnosed from your assessment evidence, follow the suggested upskilling and classroom practice steps below:
          </p>

          <div className="grid grid-cols-1 gap-6">
            {priorityGaps.slice(0, 3).map((gap, index) => {
              const gapKey = `${gap.domainId}-${gap.type}`;
              const state = planState[gapKey] ?? {
                targetPeriod: "Next 2 Weeks",
                progress: "Not Started",
              };
              const matchedRec = recList.find(
                (r) => r.domainId === gap.domainId || r.gapType === gap.type
              );

              return (
                <div
                  key={gapKey}
                  className="p-6 bg-[#faf8f5] rounded-xl border border-[#ede8e1] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          Priority 0{index + 1} • {gap.priority}
                        </span>
                        <span className="text-xs font-bold text-[#0c3b6e]">
                          {gap.domain} ({gap.domainId})
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 pt-1">
                        {gap.label} {gap.subcompetency ? `— ${gap.subcompetency}` : ""}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-gray-500">Progress:</label>
                      <select
                        value={state.progress}
                        onChange={(e) =>
                          updateItemState(gapKey, {
                            progress: e.target.value as PlanItemState["progress"],
                          })
                        }
                        className="text-xs bg-white border border-[#ede8e1] rounded-lg px-2.5 py-1 text-gray-800 font-semibold focus:outline-none focus:border-[#0c3b6e]"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="bg-white p-4 rounded-lg border border-[#ede8e1] space-y-2 text-xs">
                      <div className="font-bold text-[#0c3b6e]">1. Why It Matters:</div>
                      <p className="text-gray-600 leading-relaxed">{gap.rationale}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-[#ede8e1] space-y-2 text-xs">
                      <div className="font-bold text-[#0c3b6e]">2. Recommended Learning:</div>
                      {matchedRec ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-800">{matchedRec.title}</p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            {matchedRec.courseId} • {matchedRec.estimatedDuration}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Explore general catalog modules for this domain.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-[#ede8e1] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0c3b6e]">3. Recommended Classroom Action:</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-gray-500">Target Period:</span>
                        <select
                          value={state.targetPeriod}
                          onChange={(e) =>
                            updateItemState(gapKey, { targetPeriod: e.target.value })
                          }
                          className="bg-[#faf8f5] border border-[#ede8e1] rounded px-2 py-0.5 text-gray-700 font-medium"
                        >
                          <option value="Next 2 Weeks">Next 2 Weeks</option>
                          <option value="Next Month">Next Month</option>
                          <option value="This Term">This Term</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      Complete the recommended upskilling activity and try one related classroom teaching adjustment in your daily lesson delivery.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* EMPTY STATE BANNER */}
      {!loading && priorityGaps.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#b81c1c]" />
              <h2 className="text-base font-bold text-[#0c3b6e]">
                {diagnosis?.status === "available"
                  ? "No Priority Gaps Diagnosed"
                  : "Growth Plan Pending Assessment"}
              </h2>
            </div>
            <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
              {diagnosis?.status === "available"
                ? "Your assessment results reflect strong performance across all domains. You can explore general course catalogs or revisit your plan after future reassessments."
                : "Your personalised growth plan will be generated automatically based on your diagnostic assessment results."}
            </p>
          </div>
          <Link
            to="/teacher/assessment"
            className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shrink-0 shadow-xs"
          >
            <FileCheck className="h-4 w-4" />
            <span>Begin Assessment</span>
          </Link>
        </div>
      ) : null}

      {/* Growth Plan Framework Architecture */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#0c3b6e]">
          PPOAF Growth Plan Framework Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.title}
                className="bg-white p-6 rounded-xl border border-[#ede8e1] space-y-3 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0c3b6e] flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1">
                    {stage.title}
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-[10px] bg-[#faf8f5] text-gray-500 px-2 py-1 rounded border border-[#ede8e1] font-mono block text-center">
                    {stage.detail}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
