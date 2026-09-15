import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import ppoafLogo from "../../assets/ppoaf-logo.jpeg";
import { AuthApiError } from "../../services/authService";
import {
  getAssessmentScore, getCurrentAttempt, getAssessmentResponses,
  saveAssessmentResponse, submitAssessmentAttempt,
  type AssessmentAttempt, type AssessmentResponseRecord,
} from "../../services/assessmentService";
import { draftKey, restoreAssessment } from "../../services/assessmentResume";
import { normalizeAssessmentPrompt } from "../../utils/normalizeAssessmentPrompt";

export default function AssessmentQuestions() {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, AssessmentResponseRecord>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [error, setError] = useState("");
  const questions = attempt?.questions ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const savedAnswer = currentQuestion ? answers[currentQuestion.itemId] : undefined;
  const response = savedAnswer?.selectedResponse ?? (currentQuestion ? drafts[currentQuestion.itemId] : null);
  const isConstructed = currentQuestion?.responseFormat === 'constructed_response';
  const isSelectable = currentQuestion && ['single_choice', 'frequency_scale', 'evidence_level'].includes(currentQuestion.responseFormat);
  const responseValid = typeof response === 'string' && (isConstructed
    ? response.trim().length > 0
    : Boolean(isSelectable && currentQuestion?.options.some(option => option.id === response)));
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    let cancelled = false;
    const loadCurrent = async () => {
      try {
        const current = await getCurrentAttempt();
        const responses = await getAssessmentResponses(current.id);
        if (cancelled) return;
        const restored = restoreAssessment(current, responses);
        const restoredDrafts: Record<string, string> = {};
        try {
          const stored = JSON.parse(sessionStorage.getItem(draftKey(current)) ?? "{}");
          for (const question of current.questions) {
            if (!restored.answers[question.itemId] && typeof stored?.[question.itemId] === "string" &&
              (question.responseFormat === 'constructed_response' || question.options.some(option => option.id === stored[question.itemId]))) {
              restoredDrafts[question.itemId] = stored[question.itemId];
            }
          }
        } catch { /* Backend answers remain available if tab storage is unavailable. */ }
        setAnswers(restored.answers);
        setDrafts(restoredDrafts);
        setCurrentIndex(restored.currentIndex);
        setAttempt(current);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof AuthApiError ? reason.message : "Unable to resume your assessment. Please try again.");
      }
    };
    void loadCurrent();
    return () => { cancelled = true; };
  }, []);

  const updateResponse = (value: string) => {
    if (!attempt || !currentQuestion || savedAnswer || saveLock.current) return;
    const next = { ...drafts, [currentQuestion.itemId]: value };
    setDrafts(next);
    try { sessionStorage.setItem(draftKey(attempt), JSON.stringify(next)); }
    catch { setError("This browser cannot retain an unsaved response. Save before refreshing."); }
  };

  const questionLabel = useMemo(() => currentQuestion
    ? "Question " + currentQuestion.questionOrder + " of " + questions.length : "Question", [currentQuestion, questions.length]);

  const handleSaveAndContinue = async (exit = false) => {
    if (!attempt || !currentQuestion || saveLock.current) return;
    if (!savedAnswer && !responseValid) {
      if (exit) navigate("/teacher");
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      if (!savedAnswer) {
        let saved: AssessmentResponseRecord;
        try {
          saved = await saveAssessmentResponse(attempt.id, currentQuestion.itemId, response, response);
        } catch (reason) {
          // Reconcile a request that committed before its response was lost.
          // Never overwrite an immutable answer or blindly repost on navigation.
          const responses = await getAssessmentResponses(attempt.id);
          const existing = responses.find(response => response.attemptId === attempt.id && response.itemId === currentQuestion.itemId);
          if (!existing) throw reason;
          saved = existing;
        }
        setAnswers(value => ({ ...value, [currentQuestion.itemId]: saved }));
        const next = { ...drafts };
        delete next[currentQuestion.itemId];
        setDrafts(next);
        try { sessionStorage.setItem(draftKey(attempt), JSON.stringify(next)); }
        catch { /* Server response is authoritative. */ }
      }
      if (exit) {
        navigate("/teacher");
      } else if (currentIndex < questions.length - 1) {
        setCurrentIndex(value => value + 1);
      } else {
        const submittedAttempt = await submitAssessmentAttempt(attempt.id);
        const scoring = await getAssessmentScore(submittedAttempt.id);
        navigate("/teacher/results", { state: { attempt: submittedAttempt, scoring } });
      }
    } catch (reason) {
      setError(reason instanceof AuthApiError ? reason.message : "Unable to save your response. Please try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (saveLock.current) return;
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
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveAndContinue(true)}
          className="text-xs font-medium text-gray-500 hover:text-[#0c3b6e]"
        >
          Save & Exit
        </button>
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
            {normalizeAssessmentPrompt(currentQuestion.prompt, currentQuestion.options)}
          </h2>
        </div>

        <div className="space-y-3 pt-2">
          {isConstructed ? (
            <div className="space-y-2">
              <label htmlFor="written-response" className="block text-sm font-semibold text-gray-900">Your written response</label>
              <p id="written-response-help" className="text-xs text-gray-500">Write your response to the task below. No upload is required.</p>
              <textarea
                id="written-response"
                aria-describedby="written-response-help"
                rows={12}
                value={typeof response === 'string' ? response : ''}
                onChange={event => updateResponse(event.target.value)}
                readOnly={Boolean(savedAnswer)}
                disabled={saving}
                placeholder="Write your response here…"
                className="w-full min-w-0 resize-y rounded-xl border border-[#ede8e1] p-4 text-sm leading-relaxed text-gray-800 focus:border-[#0c3b6e] focus:outline-none focus:ring-2 focus:ring-blue-100 read-only:bg-gray-50"
              />
            </div>
          ) : isSelectable ? currentQuestion.options.map((opt) => (
            <button
              type="button"
              disabled={saving || Boolean(savedAnswer)}
              aria-pressed={response === opt.id}
              key={opt.id}
              onClick={() => updateResponse(opt.id)}
              className={`flex w-full text-left items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                response === opt.id
                  ? "border-[#0c3b6e] bg-blue-50/60 shadow-xs"
                  : "border-[#ede8e1] bg-white hover:border-gray-300 hover:bg-[#faf8f5]"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${response === opt.id ? "bg-[#0c3b6e] text-white" : "border border-gray-300 text-gray-600 bg-white"}`}
              >
                {opt.id}
              </div>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                {opt.label}
              </p>
            </button>
          )) : <p role="alert" className="text-sm text-red-700">This question's response format is unavailable. Please contact assessment support.</p>}
        </div>

        <p className="text-xs text-gray-500" role="status">
          {savedAnswer ? "Answer saved. Saved answers cannot be changed." : response
            ? `${isConstructed ? 'Draft' : 'Selection'} retained in this tab. Choose ${isLastQuestion ? "Finish Assessment" : "Next Question"} or Save & Exit to save it.`
            : ""}
        </p>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentIndex > 0 ? "Previous" : "Back"}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSaveAndContinue()}
            disabled={(!savedAnswer && !responseValid) || saving}
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
