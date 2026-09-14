import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Layers,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Compass,
} from "lucide-react";
import { AuthApiError } from "../../services/authService";
import {
  getCurrentAttempt,
  getAssessmentRecommendations,
  type RecommendationResult,
} from "../../services/assessmentService";

export default function TeacherLearning() {
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const attempt = await getCurrentAttempt();
        if (!attempt?.id) {
          if (!cancelled) setLoading(false);
          return;
        }

        const result = await getAssessmentRecommendations(attempt.id);
        if (!cancelled) setRecommendations(result);
      } catch (reason) {
        if (!cancelled) {
          const message =
            reason instanceof AuthApiError
              ? reason.message
              : "Unable to load your learning recommendations.";
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
  }, []);

  const items = recommendations?.recommendations ?? [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
            Personalized Upskilling
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Your Personalized Learning
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Based on your assessment evidence, these learning opportunities can help strengthen your priority development areas.
        </p>
      </div>

      {/* SYNTHETIC CATALOG DISCLOSURE BANNER */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-blue-950 text-xs shadow-xs">
        <Info className="h-5 w-5 text-[#0c3b6e] shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <strong className="font-bold text-sm text-[#0c3b6e]">
            Provisional Catalog Disclosure:
          </strong>
          <p className="text-gray-700">
            Learning opportunities shown here are provisional PPOAF demonstration content. They are being used to demonstrate personalized learning recommendations and should not be treated as an official PPOAF course catalog.
          </p>
        </div>
      </div>

      {/* Section 1: Recommended For You (Step 5 Engine) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#0c3b6e]">
            <Sparkles className="h-5 w-5 text-[#b81c1c]" />
            <h2 className="text-base font-bold">1. Recommended For You</h2>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {recommendations?.catalogVersion || "Step 5 Catalog Engine"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Loading personalised learning recommendations…
          </div>
        ) : null}

        {/* Human Review Required Banner */}
        {recommendations?.reviewRequired ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs shadow-xs">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">Human Review Notice:</strong>{" "}
              {recommendations.reviewReason ||
                "The assessment includes a human-review signal. Suggestions remain provisional and developmental."}
            </div>
          </div>
        ) : null}

        {!loading && !recommendations && !error ? (
          <div className="bg-[#faf8f5] p-8 rounded-xl border border-[#ede8e1] text-center space-y-3">
            <BookOpen className="h-10 w-10 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800">
              No Recommendations Available Yet
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
              Your personalised learning recommendations will appear here after completing your teacher competency assessment.
            </p>
            <div className="pt-2">
              <Link
                to="/teacher/assessment"
                className="inline-flex items-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs"
              >
                <FileCheck className="h-4 w-4" />
                <span>Start Assessment</span>
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-2">
            <p><strong>Note:</strong> {error}</p>
            <p className="text-[11px] text-gray-600">
              Complete your teacher competency assessment to unlock your custom learning path.
            </p>
          </div>
        ) : null}

        {!loading && recommendations?.status === "insufficient_evidence" ? (
          <div className="bg-[#faf8f5] p-6 rounded-xl border border-[#ede8e1] text-center space-y-2 text-xs">
            <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
            <h4 className="font-bold text-gray-800 text-sm">
              Insufficient Assessment Evidence
            </h4>
            <p className="text-gray-600 max-w-md mx-auto">
              Your gap diagnosis requires a minimum threshold of valid evidence before personalized upskilling opportunities can be recommended.
            </p>
          </div>
        ) : null}

        {!loading && recommendations?.status === "no_diagnosed_gaps" ? (
          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 text-center space-y-2 text-xs">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-sm">
              No Critical Development Gaps Diagnosed
            </h4>
            <p className="text-emerald-700 max-w-md mx-auto">
              No specific priority development needs were identified for your attempt. You are demonstrating strong competence across the evaluated areas.
            </p>
          </div>
        ) : null}

        {!loading && recommendations?.status === "no_matches" ? (
          <div className="bg-[#faf8f5] p-6 rounded-xl border border-[#ede8e1] text-center space-y-2 text-xs">
            <BookOpen className="h-6 w-6 text-gray-400 mx-auto" />
            <h4 className="font-bold text-gray-800 text-sm">
              No Exact Catalog Matches Found
            </h4>
            <p className="text-gray-600 max-w-md mx-auto">
              No synthetic learning opportunities matched your specific gap profile and prerequisite constraints.
            </p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="space-y-6">
            <p className="text-xs text-gray-600">
              Top recommended learning opportunities matched by the rule-based engine for your priority development gaps:
            </p>
            <div className="grid grid-cols-1 gap-6">
              {items.slice(0, 3).map((item) => (
                <div
                  key={item.courseId}
                  className="p-6 bg-[#faf8f5] rounded-xl border border-[#ede8e1] space-y-4 shadow-2xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-[#0c3b6e] text-white px-2 py-0.5 rounded">
                          {item.courseId}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          {item.level}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          {item.modality.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0c3b6e] pt-1">
                        {item.title}
                      </h3>
                    </div>
                    <div className="text-right text-[11px] text-gray-500 space-y-0.5 font-mono">
                      <div>Duration: {item.estimatedDuration}</div>
                      <div>Bandwidth: {item.bandwidth.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="bg-white p-4 rounded-lg border border-[#ede8e1] space-y-2 text-xs">
                    <div className="font-bold text-[#0c3b6e]">
                      Why This Was Recommended:
                    </div>
                    <p className="text-gray-600 leading-relaxed">{item.reason}</p>

                    {item.matchFactors && item.matchFactors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {item.matchFactors.map((factor, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium"
                          >
                            ✓ {factor}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {item.prerequisites && item.prerequisites.length > 0 ? (
                    <div className="text-[11px] text-gray-500 space-y-1">
                      <strong className="text-gray-700">Prerequisites:</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {item.prerequisites.map((prereq, i) => (
                          <li key={i}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Alternatives */}
                  {item.alternatives && item.alternatives.length > 0 ? (
                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        Alternative Options for this Gap:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.alternatives.map((alt) => (
                          <div
                            key={alt.courseId}
                            className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#0c3b6e]">
                                {alt.courseId}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {alt.level}
                              </span>
                            </div>
                            <p className="font-medium text-gray-800 line-clamp-1">
                              {alt.title}
                            </p>
                            <p className="text-[10px] text-gray-500 line-clamp-2">
                              {alt.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Action Link to Growth Plan */}
                  <div className="pt-2 flex justify-end">
                    <Link
                      to="/teacher/growth-plan"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c3b6e] hover:underline"
                    >
                      <Compass className="h-4 w-4" />
                      <span>Add to Growth Plan</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {recommendations?.limitations && recommendations.limitations.length > 0 ? (
          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Catalog Limitations:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {recommendations.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Section 2: Explore Courses (Framework Area Structure) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#0c3b6e]">
            <Layers className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold">2. Explore Course Catalogues</h2>
          </div>
          <span className="text-xs bg-blue-50 text-[#0c3b6e] px-2.5 py-0.5 rounded font-semibold">
            Catalog Structure
          </span>
        </div>
        <p className="text-xs text-gray-600">
          Curated learning pathways aligned with the PPOAF Teacher Competency Framework domains:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-[#ede8e1] bg-[#faf8f5] space-y-2">
            <h3 className="text-xs font-bold text-[#0c3b6e]">Pedagogy & Classroom Practices</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Foundational and advanced instructional techniques, learning design, and differentiated instruction.
            </p>
            <span className="text-[10px] text-gray-400 block pt-1">Modules in development</span>
          </div>

          <div className="p-5 rounded-xl border border-[#ede8e1] bg-[#faf8f5] space-y-2">
            <h3 className="text-xs font-bold text-[#0c3b6e]">Leadership & Culture Design</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Constructive classroom routines, behaviour systems, and relational learner empathy.
            </p>
            <span className="text-[10px] text-gray-400 block pt-1">Modules in development</span>
          </div>

          <div className="p-5 rounded-xl border border-[#ede8e1] bg-[#faf8f5] space-y-2">
            <h3 className="text-xs font-bold text-[#0c3b6e]">Future Skills & Digital Literacy</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Purposeful digital integration, problem solving, and resource optimization in diverse settings.
            </p>
            <span className="text-[10px] text-gray-400 block pt-1">Modules in development</span>
          </div>
        </div>
      </div>

      {/* Section 3: Your Learning Progress */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#0c3b6e]">
            <Clock className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold">3. Your Learning Progress</h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">0 Active Modules</span>
        </div>

        <div className="p-6 bg-[#faf8f5] rounded-xl border border-[#ede8e1] text-center text-xs text-gray-600">
          No courses currently enrolled. Complete your diagnostic assessment to generate your personalized learning plan.
        </div>
      </div>
    </div>
  );
}
