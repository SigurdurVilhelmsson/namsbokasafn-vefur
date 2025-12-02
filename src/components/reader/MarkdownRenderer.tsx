import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { useState } from "react";

// Import mhchem for chemical notation
import "katex/dist/contrib/mhchem.js";

interface MarkdownRendererProps {
  content: string;
}

// Collapsible answer component for practice problems
function PracticeProblem({ children }: { children: React.ReactNode }) {
  const [showAnswer, setShowAnswer] = useState(false);

  // Extract problem and answer from children
  const childArray = Array.isArray(children) ? children : [children];
  const contentParts: React.ReactNode[] = [];
  let answerContent: React.ReactNode = null;

  childArray.forEach((child) => {
    if (
      child &&
      typeof child === "object" &&
      "props" in child &&
      child.props?.children
    ) {
      const text = child.props.children;
      const textStr = Array.isArray(text) ? text.join("") : String(text);

      if (textStr.includes(":::answer")) {
        // This is the answer block
        answerContent = child.props.children;
      } else if (!textStr.startsWith(":::practice-problem")) {
        // This is problem content
        contentParts.push(child);
      }
    }
  });

  return (
    <div className="practice-problem">
      <div className="practice-problem-header">
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

      <div className="practice-problem-content">{contentParts}</div>

      {answerContent && (
        <div className="practice-answer-section">
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="practice-answer-toggle"
          >
            <span>{showAnswer ? "Fela svar" : "Sýna svar"}</span>
            <svg
              className={`h-5 w-5 transition-transform ${showAnswer ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showAnswer && (
            <div className="practice-answer-content">{answerContent}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="reading-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Sérsniðnir þættir fyrir mismunandi markdown element (custom components)

          // Myndir (images)
          img: ({ src, alt, ...props }) => (
            <figure className="my-6">
              <img
                src={src}
                alt={alt || ""}
                className="mx-auto rounded-lg shadow-md"
                loading="lazy"
                {...props}
              />
              {alt && (
                <figcaption className="mt-2 text-center text-sm text-[var(--text-secondary)]">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),

          // Töflur (tables)
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),

          // Tilvitnanir (blockquotes) - notað fyrir athugasemdir og viðvaranir
          blockquote: ({ children, ...props }) => {
            // Athuga hvort þetta sé sérstök athugasemd eða viðvörun
            const firstChild = Array.isArray(children) ? children[0] : children;
            const text =
              typeof firstChild === "string"
                ? firstChild
                : firstChild &&
                    typeof firstChild === "object" &&
                    "props" in firstChild
                  ? firstChild.props?.children
                  : "";

            const isNote =
              typeof text === "string" && text.startsWith(":::note");
            const isWarning =
              typeof text === "string" && text.startsWith(":::warning");
            const isExample =
              typeof text === "string" && text.startsWith(":::example");
            const isPracticeProblem =
              typeof text === "string" &&
              text.startsWith(":::practice-problem");

            if (isPracticeProblem) {
              return <PracticeProblem>{children}</PracticeProblem>;
            }

            if (isNote) {
              return (
                <div className="content-block note">
                  <div className="content-block-icon flex-shrink-0">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="content-block-title">Athugið</h4>
                    <div>{children}</div>
                  </div>
                </div>
              );
            }

            if (isWarning) {
              return (
                <div className="content-block warning">
                  <div className="content-block-icon flex-shrink-0">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="content-block-title">Viðvörun</h4>
                    <div>{children}</div>
                  </div>
                </div>
              );
            }

            if (isExample) {
              return (
                <div className="content-block example">
                  <div className="content-block-icon flex-shrink-0">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="content-block-title">Dæmi</h4>
                    <div>{children}</div>
                  </div>
                </div>
              );
            }

            return (
              <blockquote
                className="my-6 border-l-4 border-[var(--accent-color)] pl-4 italic text-[var(--text-secondary)]"
                {...props}
              >
                {children}
              </blockquote>
            );
          },

          // Kóði (code)
          code: ({
            children,
            className,
            ...props
          }: {
            children?: React.ReactNode;
            className?: string;
          }) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return (
                <code
                  className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-6 overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-4">
                <code
                  className={`font-mono text-sm ${className || ""}`}
                  {...props}
                >
                  {children}
                </code>
              </pre>
            );
          },

          // Tenglar (links)
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="text-[var(--accent-color)] underline transition-colors hover:text-[var(--accent-hover)]"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
