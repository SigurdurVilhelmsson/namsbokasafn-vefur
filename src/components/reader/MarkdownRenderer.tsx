import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

interface MarkdownRendererProps {
  content: string;
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

            if (isNote) {
              return (
                <div className="content-block note my-6">
                  <div className="mb-2 font-sans font-semibold">📝 Athugið</div>
                  <div>{children}</div>
                </div>
              );
            }

            if (isWarning) {
              return (
                <div className="content-block warning my-6">
                  <div className="mb-2 font-sans font-semibold">
                    ⚠️ Viðvörun
                  </div>
                  <div>{children}</div>
                </div>
              );
            }

            if (isExample) {
              return (
                <div className="content-block example my-6">
                  <div className="mb-2 font-sans font-semibold">💡 Dæmi</div>
                  <div>{children}</div>
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
