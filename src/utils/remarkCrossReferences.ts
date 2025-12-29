import { visit } from "unist-util-visit";
import type { Root, Text, Link } from "mdast";

// =============================================================================
// TYPES
// =============================================================================

interface CrossReferenceNode extends Link {
  data?: {
    hName?: string;
    hProperties?: {
      className?: string;
      "data-ref-type"?: string;
      "data-ref-id"?: string;
    };
  };
}

// =============================================================================
// REFERENCE PATTERN
// =============================================================================

/**
 * Pattern to match cross-references: [ref:type:id]
 * Examples:
 *   [ref:eq:1.1]
 *   [ref:fig:2.3]
 *   [ref:sec:01-intro/1-1-section]
 *   [ref:tbl:periodic-table]
 *   [ref:def:atom]
 */
const REFERENCE_PATTERN = /\[ref:(sec|eq|fig|tbl|def):([^\]]+)\]/g;

// =============================================================================
// REMARK PLUGIN
// =============================================================================

/**
 * Remark plugin to transform cross-reference syntax into links
 *
 * Transforms: [ref:eq:1.1]
 * Into: A link node with data attributes for the CrossReference component
 */
export function remarkCrossReferences() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const text = node.value;
      const matches = [...text.matchAll(REFERENCE_PATTERN)];

      if (matches.length === 0) return;

      // Build new nodes from the text with references
      const newNodes: (Text | CrossReferenceNode)[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const [fullMatch, refType, refId] = match;
        const matchIndex = match.index!;

        // Add text before the reference
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: "text",
            value: text.slice(lastIndex, matchIndex),
          });
        }

        // Create a link node for the reference
        const refNode: CrossReferenceNode = {
          type: "link",
          url: `#ref:${refType}:${refId}`,
          children: [
            {
              type: "text",
              value: fullMatch, // Placeholder, will be replaced by component
            },
          ],
          data: {
            hName: "a",
            hProperties: {
              className: "cross-reference",
              "data-ref-type": refType,
              "data-ref-id": refId,
            },
          },
        };

        newNodes.push(refNode);
        lastIndex = matchIndex + fullMatch.length;
      }

      // Add remaining text after last reference
      if (lastIndex < text.length) {
        newNodes.push({
          type: "text",
          value: text.slice(lastIndex),
        });
      }

      // Replace the original text node with new nodes
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}

// =============================================================================
// HELPER TO EXTRACT REFERENCES FROM CONTENT
// =============================================================================

export interface ExtractedReference {
  type: "sec" | "eq" | "fig" | "tbl" | "def";
  id: string;
  fullMatch: string;
}

/**
 * Extract all cross-references from markdown content
 * Useful for pre-processing and validation
 */
export function extractReferences(content: string): ExtractedReference[] {
  const references: ExtractedReference[] = [];
  const matches = content.matchAll(REFERENCE_PATTERN);

  for (const match of matches) {
    references.push({
      type: match[1] as ExtractedReference["type"],
      id: match[2],
      fullMatch: match[0],
    });
  }

  return references;
}

// =============================================================================
// LABEL ANCHORS PATTERN
// =============================================================================

/**
 * Pattern to match label anchors: {#type:id}
 * These are placed after equations, figures, tables to make them referenceable
 * Examples:
 *   $$E = mc^2$$ {#eq:energy}
 *   ![Diagram](path.png) {#fig:diagram}
 */
export const LABEL_ANCHOR_PATTERN = /\{#(eq|fig|tbl|def):([^}]+)\}/g;

/**
 * Extract all label anchors from content
 */
export function extractLabelAnchors(content: string): ExtractedReference[] {
  const anchors: ExtractedReference[] = [];
  const matches = content.matchAll(LABEL_ANCHOR_PATTERN);

  for (const match of matches) {
    anchors.push({
      type: match[1] as ExtractedReference["type"],
      id: match[2],
      fullMatch: match[0],
    });
  }

  return anchors;
}

// =============================================================================
// CROSS-REFERENCE LINK UTILITIES
// =============================================================================

export type ReferenceType = "sec" | "eq" | "fig" | "tbl" | "def";

/**
 * Check if an href is a cross-reference link
 * Format: #ref:type:id
 */
export function isCrossReferenceHref(href: string | undefined): boolean {
  return !!href?.startsWith("#ref:");
}

/**
 * Parse cross-reference data from href
 */
export function parseCrossReferenceHref(href: string): {
  type: ReferenceType;
  id: string;
} | null {
  const match = href.match(/^#ref:(sec|eq|fig|tbl|def):(.+)$/);
  if (!match) return null;
  return {
    type: match[1] as ReferenceType,
    id: match[2],
  };
}
