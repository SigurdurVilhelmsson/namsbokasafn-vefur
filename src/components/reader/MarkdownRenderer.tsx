import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeKatex from "rehype-katex";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import type { Node, Data } from "unist";
import InteractivePracticeProblem from "./InteractivePracticeProblem";

// Import mhchem for chemical notation
import "katex/dist/contrib/mhchem.js";

// =============================================================================
// TYPES
// =============================================================================

interface MarkdownRendererProps {
  content: string;
}

interface DirectiveNode extends Node {
  name?: string;
  attributes?: Record<string, string | null | undefined> | null;
  data?: Data & { hName?: string; hProperties?: Record<string, unknown> };
}

// =============================================================================
// DIRECTIVE CONFIGURATION
// =============================================================================

/** Configuration for each directive type */
const DIRECTIVE_CONFIG: Record<
  string,
  { className: string; additionalProps?: (attrs: Record<string, string | null | undefined>) => Record<string, unknown> }
> = {
  "practice-problem": {
    className: "practice-problem-container",
    additionalProps: (attrs) => ({ "data-problem-id": attrs.id || undefined }),
  },
  answer: {
    className: "practice-answer-container",
  },
  explanation: {
    className: "practice-explanation-container",
  },
  hint: {
    className: "practice-hint-container",
  },
  note: {
    className: "directive-note",
  },
  warning: {
    className: "directive-warning",
  },
  example: {
    className: "directive-example",
  },
};

// =============================================================================
// REMARK PLUGIN
// =============================================================================

/**
 * Custom remark plugin to handle markdown directives
 */
function remarkCustomDirectives() {
  return (tree: Root) => {
    visit(tree, (node: DirectiveNode) => {
      if (node.type !== "containerDirective" || !node.name) return;

      const config = DIRECTIVE_CONFIG[node.name];
      if (!config) return;

      const data = node.data || (node.data = {});
      data.hName = "div";

      const attributes = node.attributes || {};
      const additionalProps = config.additionalProps?.(attributes) || {};

      data.hProperties = {
        className: config.className,
        ...additionalProps,
      };
    });
  };
}

// =============================================================================
// ICON COMPONENTS
// =============================================================================

interface IconProps {
  className?: string;
}

function InfoIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function LightbulbIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

// =============================================================================
// CONTENT BLOCK COMPONENT
// =============================================================================

interface ContentBlockProps {
  type: "note" | "warning" | "example";
  children: React.ReactNode;
}

/** Titles for each block type (Icelandic) */
const BLOCK_TITLES: Record<ContentBlockProps["type"], string> = {
  note: "Athugið",
  warning: "Viðvörun",
  example: "Dæmi",
};

/** Icon components for each block type */
const BLOCK_ICONS: Record<ContentBlockProps["type"], React.ComponentType<IconProps>> = {
  note: InfoIcon,
  warning: WarningIcon,
  example: LightbulbIcon,
};

function ContentBlock({ type, children }: ContentBlockProps) {
  const Icon = BLOCK_ICONS[type];
  const title = BLOCK_TITLES[type];

  return (
    <div className={`content-block ${type}`}>
      <div className="content-block-icon flex-shrink-0">
        <Icon />
      </div>
      <div>
        <h4 className="content-block-title">{title}</h4>
        <div>{children}</div>
      </div>
    </div>
  );
}

// =============================================================================
// CUSTOM COMPONENT HANDLERS
// =============================================================================

/**
 * Check if a paragraph is a figure caption
 */
function isFigureCaption(children: React.ReactNode): boolean {
  const childArray = React.Children.toArray(children);
  const firstChild = childArray[0];

  if (!firstChild || !React.isValidElement(firstChild)) return false;

  if (firstChild.type !== "strong" && firstChild.type !== "b") return false;

  const strongContent = (firstChild.props as { children?: React.ReactNode }).children;

  return (
    typeof strongContent === "string" &&
    (strongContent.startsWith("Mynd") || strongContent.startsWith("Figure"))
  );
}

/**
 * Custom div handler for directive containers
 */
function CustomDiv({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  "data-problem-id"?: string;
}) {
  // Practice problem container
  if (className === "practice-problem-container") {
    const problemId = props["data-problem-id"];
    return (
      <InteractivePracticeProblem problemId={problemId}>
        {children}
      </InteractivePracticeProblem>
    );
  }

  // Content blocks (note, warning, example)
  if (className === "directive-note") {
    return <ContentBlock type="note">{children}</ContentBlock>;
  }

  if (className === "directive-warning") {
    return <ContentBlock type="warning">{children}</ContentBlock>;
  }

  if (className === "directive-example") {
    return <ContentBlock type="example">{children}</ContentBlock>;
  }

  // Default div
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

// =============================================================================
// HEADING COMPONENTS (Shift levels: h1→h2, h2→h3, etc.)
// =============================================================================

/**
 * Custom heading components that shift heading levels.
 * Content h1 becomes h2, h2 becomes h3, etc.
 * This ensures proper heading hierarchy when content is inside a page with its own h1.
 */
interface HeadingProps {
  children?: React.ReactNode;
  id?: string;
  className?: string;
}

// Individual shifted heading components
function H1Shifted({ children, ...props }: HeadingProps) {
  return <h2 {...props}>{children}</h2>;
}

function H2Shifted({ children, ...props }: HeadingProps) {
  return <h3 {...props}>{children}</h3>;
}

function H3Shifted({ children, ...props }: HeadingProps) {
  return <h4 {...props}>{children}</h4>;
}

function H4Shifted({ children, ...props }: HeadingProps) {
  return <h5 {...props}>{children}</h5>;
}

function H5Shifted({ children, ...props }: HeadingProps) {
  return <h6 {...props}>{children}</h6>;
}

function H6Shifted({ children, ...props }: HeadingProps) {
  // h6 stays h6 (can't go lower)
  return <h6 {...props}>{children}</h6>;
}

// =============================================================================
// EQUATION WRAPPER COMPONENT
// =============================================================================

interface EquationWrapperProps {
  children: React.ReactNode;
  isBlock: boolean;
}

/**
 * Convert LaTeX to readable Icelandic description for screen readers
 */
function latexToSpeech(latex: string): string {
  if (!latex) return "Stærðfræðijafna";

  const readable = latex
    // Fractions
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) deilt með ($2)")
    // Subscripts and superscripts
    .replace(/_\{([^}]+)\}/g, " undirskrift $1")
    .replace(/\^2/g, " í öðru veldi")
    .replace(/\^3/g, " í þriðja veldi")
    .replace(/\^\{([^}]+)\}/g, " í $1 veldi")
    // Common symbols
    .replace(/\\pm/g, " plús eða mínus ")
    .replace(/\\times/g, " sinnum ")
    .replace(/\\div/g, " deilt með ")
    .replace(/\\sqrt\{([^}]+)\}/g, "kvaðratrótin af $1")
    .replace(/\\sum/g, "summa")
    .replace(/\\int/g, "heildi")
    .replace(/\\infty/g, "óendanleiki")
    .replace(/\\pi/g, "pí")
    .replace(/\\alpha/g, "alfa")
    .replace(/\\beta/g, "beta")
    .replace(/\\gamma/g, "gamma")
    .replace(/\\delta/g, "delta")
    .replace(/\\theta/g, "theta")
    .replace(/\\lambda/g, "lambda")
    .replace(/\\mu/g, "mý")
    .replace(/\\sigma/g, "sigma")
    .replace(/\\rho/g, "ró")
    // Chemical notation
    .replace(/\\ce\{([^}]+)\}/g, "efnajafna: $1")
    // Clean up remaining LaTeX commands
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return readable ? `Stærðfræðijafna: ${readable}` : "Stærðfræðijafna";
}

function EquationWrapper({ children, isBlock }: EquationWrapperProps) {
  const [copied, setCopied] = React.useState(false);
  const [showZoom, setShowZoom] = React.useState(false);
  const [ariaLabel, setAriaLabel] = React.useState("Stærðfræðijafna");
  const equationRef = React.useRef<HTMLDivElement>(null);

  // Update aria-label after render when ref is available
  React.useEffect(() => {
    if (equationRef.current) {
      const annotation = equationRef.current.querySelector(
        'annotation[encoding="application/x-tex"]'
      );
      const latex = annotation?.textContent || "";
      setAriaLabel(latexToSpeech(latex));
    }
  }, [children]);

  // Extract LaTeX source from KaTeX rendered content
  const getLatexSource = (): string => {
    if (!equationRef.current) return "";
    const annotation = equationRef.current.querySelector(
      'annotation[encoding="application/x-tex"]'
    );
    return annotation?.textContent || "";
  };

  const handleCopy = async () => {
    const latex = getLatexSource();
    if (latex) {
      try {
        await navigator.clipboard.writeText(latex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = latex;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!isBlock) {
    // Inline equations - add role="math" for accessibility
    return (
      <span
        ref={equationRef}
        role="math"
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }

  return (
    <>
      <div
        className="equation-wrapper group relative my-4"
        role="math"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        <div ref={equationRef} className="overflow-x-auto py-2">
          {children}
        </div>
        <div className="equation-actions absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleCopy}
            className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            title="Afrita LaTeX"
            aria-label="Afrita LaTeX jöfnu"
          >
            {copied ? "✓ Afritað" : "Afrita"}
          </button>
          <button
            onClick={() => setShowZoom(true)}
            className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            title="Stækka"
            aria-label="Stækka jöfnu"
          >
            ⊕
          </button>
        </div>
      </div>

      {/* Zoom Modal */}
      {showZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Stækkuð jafna"
        >
          <div
            className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-xl bg-[var(--bg-primary)] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl">{children}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleCopy}
                className="rounded bg-[var(--accent-color)] px-4 py-2 text-sm text-white hover:bg-[var(--accent-hover)]"
              >
                {copied ? "✓ Afritað" : "Afrita LaTeX"}
              </button>
              <button
                onClick={() => setShowZoom(false)}
                className="rounded bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--border-color)]"
              >
                Loka
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// MARKDOWN COMPONENTS
// =============================================================================

const markdownComponents = {
  // Shifted heading components (h1 in content → h2 in DOM, etc.)
  h1: H1Shifted,
  h2: H2Shifted,
  h3: H3Shifted,
  h4: H4Shifted,
  h5: H5Shifted,
  h6: H6Shifted,

  // Math equations with wrapper
  span: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    // KaTeX inline math has class "katex"
    if (className?.includes("katex")) {
      return (
        <EquationWrapper isBlock={false}>
          <span className={className} {...props}>
            {children}
          </span>
        </EquationWrapper>
      );
    }
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  },

  // KaTeX block math - wrap with equation wrapper
  div: (props: { className?: string; children?: React.ReactNode }) => {
    const { className, children, ...rest } = props;
    // KaTeX display math has class "math-display" or contains katex-display
    if (className?.includes("math-display") || className?.includes("katex-display")) {
      return (
        <EquationWrapper isBlock={true}>
          <div className={className} {...rest}>
            {children}
          </div>
        </EquationWrapper>
      );
    }
    // Fall back to CustomDiv for directives
    return <CustomDiv className={className} {...rest}>{children}</CustomDiv>;
  },

  // Images - no automatic figcaption from alt text
  img: ({
    src,
    alt,
    ...props
  }: {
    src?: string;
    alt?: string;
  }) => (
    <figure className="my-6">
      <img
        src={src}
        alt={alt || ""}
        className="mx-auto rounded-lg shadow-md"
        loading="lazy"
        {...props}
      />
    </figure>
  ),

  // Paragraphs - detect figure captions
  p: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  }) => {
    if (isFigureCaption(children)) {
      return (
        <p className="figure-caption" {...props}>
          {children}
        </p>
      );
    }
    return <p {...props}>{children}</p>;
  },

  // Tables
  table: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),

  // Blockquotes
  blockquote: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  }) => (
    <blockquote
      className="my-6 border-l-4 border-[var(--accent-color)] pl-4 italic text-[var(--text-secondary)]"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Code blocks
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
        <code className={`font-mono text-sm ${className || ""}`} {...props}>
          {children}
        </code>
      </pre>
    );
  },

  // Links
  a: ({
    href,
    children,
    ...props
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
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
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="reading-content">
      <ReactMarkdown
        remarkPlugins={[
          remarkMath,
          remarkGfm,
          remarkDirective,
          remarkCustomDirectives,
        ]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              strict: false,
              trust: true,
              throwOnError: false,
            },
          ],
        ]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
