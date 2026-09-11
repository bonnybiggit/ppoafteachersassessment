import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import ppoafLogo from "../../assets/ppoaf-logo.jpeg";
import { AuthApiError } from "../../services/authService";
import {
  getAssessmentScore,
  saveAssessmentResponse,
  submitAssessmentAttempt,
  type AssessmentAttempt,
} from "../../services/assessmentService";

export default function AssessmentQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(
    location.state?.attempt ?? null,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const questions = attempt?.questions ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const progressPercent =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    if (!attempt) {
      const loadCurrent = async () => {
        try {
          const current = await import("../../services/assessmentService").then(
            (mod) => mod.getCurrentAttempt(),
          );
          setAttempt(current);
        } catch (reason) {
          const message =
            reason instanceof AuthApiError
              ? reason.message
              : "Unable to resume your assessment. Please try again.";
          setError(message);
        }
      };
      void loadCurrent();
    }
  }, [attempt]);

  useEffect(() => {
    if (currentQuestion) {
      setSelectedOption(null);
    }
  }, [currentQuestion]);

  const questionLabel = useMemo(() => {
    if (!currentQuestion) return "Question";
    return `Question ${currentQuestion.questionOrder} of ${questions.length}`;
  }, [currentQuestion, questions.length]);

  const handleSaveAndContinue = async () => {
    if (!attempt || !currentQuestion || !selectedOption || saving) return;

    setSaving(true);
    setError("");

    try {
      await saveAssessmentResponse(
        attempt.id,
        currentQuestion.itemId,
        selectedOption,
        selectedOption,
      );

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((value) => value + 1);
      } else {
        const submittedAttempt = await submitAssessmentAttempt(attempt.id);
        const scoring = await getAssessmentScore(submittedAttempt.id);
        navigate("/teacher/results", {
          state: { attempt: submittedAttempt, scoring },
        });
      }
    } catch (reason) {
      const message =
        reason instanceof AuthApiError
          ? reason.message
          : "Unable to save your response. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
    } else {
      navigate("/teacher/assessment");
    }
  };

  const isLastQuestion = currentIndex >= questions.length - 1;

  if (!currentQuestion) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs text-center space-y-3">
          <h2 className="text-xl font-bold text-[#0c3b6e]">
            Loading assessment…
          </h2>
          {error ? (
            <p className="text-xs text-red-700">{error}</p>
          ) : (
            <p className="text-sm text-gray-600">
              Checking for your in-progress assessment.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-4 rounded-xl border border-[#ede8e1] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src={ppoafLogo}
            alt="PPOAF Logo"
            className="h-8 w-8 object-contain rounded-full"
          />
          <div>
            <h1 className="text-xs font-bold text-[#0c3b6e]">
              Teacher Competency Assessment
            </h1>
            <p className="text-[10px] text-gray-500">
              {currentQuestion.domain}
            </p>
          </div>
        </div>
        <Link
          to="/teacher"
          className="text-xs font-medium text-gray-500 hover:text-[#0c3b6e]"
        >
          Save & Exit
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-xs text-[#0c3b6e]">
        <Info className="h-4 w-4 shrink-0" />
        <p>
          <strong>Live pilot assessment:</strong> This assessment is driven by
          the backend item bank and will score against the teacher competency
          model after submission.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0c3b6e]">{questionLabel}</span>
            <span className="text-gray-500 font-mono">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0c3b6e] rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
            {currentQuestion.evidenceType}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed">
            {currentQuestion.prompt}
          </h2>
        </div>

        <div className="space-y-3 pt-2">
          {currentQuestion.options.map((opt) => (
            <label
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                selectedOption === opt.id
                  ? "border-[#0c3b6e] bg-blue-50/60 shadow-xs"
                  : "border-[#ede8e1] bg-white hover:border-gray-300 hover:bg-[#faf8f5]"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${selectedOption === opt.id ? "bg-[#0c3b6e] text-white" : "border border-gray-300 text-gray-600 bg-white"}`}
              >
                {opt.id}
              </div>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                {opt.label}
              </p>
            </label>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handlePrevious}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentIndex > 0 ? "Previous" : "Back"}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={!selectedOption || saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#0c3b6e] text-white hover:bg-[#082a50] transition-colors shadow-xs disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <span>
              {isLastQuestion
                ? saving
                  ? "Submitting…"
                  : "Finish Assessment"
                : saving
                  ? "Saving…"
                  : "Next Question"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
