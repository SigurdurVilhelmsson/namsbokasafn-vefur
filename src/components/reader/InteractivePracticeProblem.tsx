import { useState, useEffect, useId, useMemo } from "react";
import {
  Check,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Lightbulb,
  Info,
  ChevronRight,
} from "lucide-react";
import { useQuizStore } from "@/stores/quizStore";
import { useParams } from "react-router-dom";

interface InteractivePracticeProblemProps {
  children: React.ReactNode;
  problemId?: string;
}

export default function InteractivePracticeProblem({
  children,
  problemId,
}: InteractivePracticeProblemProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selfAssessment, setSelfAssessment] = useState<
    "correct" | "incorrect" | null
  >(null);
  const { chapterSlug = "", sectionSlug = "" } = useParams<{
    chapterSlug: string;
    sectionSlug: string;
  }>();

  const {
    markPracticeProblemViewed,
    markPracticeProblemCompleted,
    getPracticeProblemProgress,
  } = useQuizStore();

  // Generate a stable ID for this problem using React's useId hook
  const generatedId = useId();
  const stableId = problemId || `${chapterSlug}-${sectionSlug}-${generatedId}`;

  // Extract problem, answer, explanation, and hints from children (memoized for stable references)
  const { contentParts, answerContent, explanationContent, hints } = useMemo(() => {
    const childArray = Array.isArray(children) ? children : [children];
    const parts: React.ReactNode[] = [];
    let answer: React.ReactNode = null;
    let explanation: React.ReactNode = null;
    const hintsList: React.ReactNode[] = [];

    // Process only direct children, not nested practice problems
    childArray.forEach((child) => {
      if (child && typeof child === "object" && "props" in child) {
        // Skip nested practice-problem containers
        if (child.props?.className === "practice-problem-container") {
          return;
        }

        if (child.props?.className === "practice-answer-container") {
          answer = child.props.children;
        } else if (child.props?.className === "practice-explanation-container") {
          explanation = child.props.children;
        } else if (child.props?.className === "practice-hint-container") {
          hintsList.push(child.props.children);
        } else {
          parts.push(child);
        }
      }
    });

    return { contentParts: parts, answerContent: answer, explanationContent: explanation, hints: hintsList };
  }, [children]);

  // Track how many hints have been revealed
  const [revealedHints, setRevealedHints] = useState(0);

  // Track problem viewing
  useEffect(() => {
    if (chapterSlug && sectionSlug) {
      // Get text content from React nodes for tracking
      const problemText = extractText(contentParts);
      const answerText = extractText(answerContent);
      markPracticeProblemViewed(
        stableId,
        chapterSlug,
        sectionSlug,
        problemText,
        answerText,
      );
    }
  }, [
    stableId,
    chapterSlug,
    sectionSlug,
    markPracticeProblemViewed,
    contentParts,
    answerContent,
  ]);

  const progress = getPracticeProblemProgress(stableId);

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleHideAnswer = () => {
    setShowAnswer(false);
    setSelfAssessment(null);
  };

  const handleSelfAssessment = (result: "correct" | "incorrect") => {
    setSelfAssessment(result);
    if (result === "correct") {
      markPracticeProblemCompleted(stableId);
    }
  };

  const handleReset = () => {
    setShowAnswer(false);
    setSelfAssessment(null);
    setRevealedHints(0);
  };

  const handleRevealHint = () => {
    if (revealedHints < hints.length) {
      setRevealedHints((prev) => prev + 1);
    }
  };

  return (
    <div
      className={`practice-problem ${progress?.isCompleted ? "completed" : ""}`}
    >
      {/* Header */}
      <div className="practice-problem-header">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h4>Æfingadæmi</h4>
        </div>
        {progress?.isCompleted && (
          <div className="flex items-center gap-1 text-emerald-600 text-sm">
            <CheckCircle2 size={16} />
            <span>Lokið</span>
          </div>
        )}
      </div>

      {/* Problem content */}
      <div className="practice-problem-content">{contentParts}</div>

      {/* Hints section - shown before answer */}
      {hints.length > 0 && !showAnswer && (
        <div className="practice-hints-section mt-4">
          {/* Revealed hints */}
          {revealedHints > 0 && (
            <div className="mb-3 space-y-2">
              {hints.slice(0, revealedHints).map((hint, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20"
                >
                  <Lightbulb
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                  />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <span className="font-medium">
                      Vísbending {index + 1}:
                    </span>{" "}
                    {hint}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Button to reveal more hints */}
          {revealedHints < hints.length && (
            <button
              onClick={handleRevealHint}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              <Lightbulb size={16} />
              <span>
                Sýna vísbendingu ({revealedHints + 1}/{hints.length})
              </span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* Answer section */}
      {answerContent && (
        <div className="practice-answer-section">
          {!showAnswer ? (
            /* Show answer button */
            <button
              onClick={handleShowAnswer}
              className="practice-answer-toggle"
              aria-expanded={showAnswer}
            >
              <Eye size={18} />
              <span>Sýna svar</span>
            </button>
          ) : (
            <div className="space-y-4">
              {/* Answer content */}
              <div className="practice-answer-content">{answerContent}</div>

              {/* Explanation section - shown after answer */}
              {explanationContent && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
                  <div className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-blue-700 dark:text-blue-400">
                    <Info size={18} />
                    Útskýring
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    {explanationContent}
                  </div>
                </div>
              )}

              {/* Self-assessment section */}
              {selfAssessment === null ? (
                <div className="practice-self-assessment">
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Hvernig gekk?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSelfAssessment("correct")}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-2 font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                    >
                      <Check size={18} />
                      Rétt hjá mér
                    </button>
                    <button
                      onClick={() => handleSelfAssessment("incorrect")}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 font-medium text-red-700 transition-all hover:bg-red-100 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <X size={18} />
                      Þarf að æfa meira
                    </button>
                  </div>
                </div>
              ) : (
                /* Feedback after self-assessment */
                <div
                  className={`practice-feedback ${selfAssessment === "correct" ? "correct" : "incorrect"}`}
                >
                  {selfAssessment === "correct" ? (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={20} />
                      <span>Vel gert! Þú hefur lokið þessu dæmi.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <RotateCcw size={20} />
                      <span>
                        Ekki hafa áhyggjur - æfing skapar meistara! Reyndu aftur
                        síðar.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleHideAnswer}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-primary)]"
                >
                  <EyeOff size={16} />
                  Fela svar
                </button>
                {selfAssessment && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-primary)]"
                  >
                    <RotateCcw size={16} />
                    Reyna aftur
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to extract text from React nodes (for tracking purposes)
function extractText(node: React.ReactNode): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(element.props.children);
  }
  return "";
}
