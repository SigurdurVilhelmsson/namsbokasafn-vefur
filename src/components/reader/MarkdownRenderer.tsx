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
// MARKDOWN COMPONENTS
// =============================================================================

const markdownComponents = {
  // Custom handler for directive containers
  div: CustomDiv,

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
