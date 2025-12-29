import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useReferenceStore,
  getReferenceUrl,
  type ReferenceType,
  type ReferenceItem,
} from "@/stores/referenceStore";

// =============================================================================
// TYPES
// =============================================================================

interface CrossReferenceProps {
  refType: ReferenceType;
  refId: string;
  children?: React.ReactNode;
}

interface PreviewPosition {
  top: number;
  left: number;
  placement: "above" | "below";
}

// =============================================================================
// ICONS
// =============================================================================

const RefIcons: Record<ReferenceType, string> = {
  sec: "§",
  eq: "∫",
  fig: "🖼",
  tbl: "⊞",
  def: "📖",
};

// =============================================================================
// PREVIEW COMPONENT
// =============================================================================

interface ReferencePreviewProps {
  reference: ReferenceItem;
  position: PreviewPosition;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function ReferencePreview({
  reference,
  position,
  onMouseEnter,
  onMouseLeave,
}: ReferencePreviewProps) {
  const { bookSlug } = useParams<{ bookSlug: string }>();
  const url = bookSlug ? getReferenceUrl(bookSlug, reference) : "#";

  return (
    <div
      className="reference-preview fixed z-50 max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="tooltip"
    >
      {/* Arrow pointer */}
      <div
        className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-[var(--border-color)] bg-[var(--bg-primary)] ${
          position.placement === "below"
            ? "-top-1.5 border-l border-t"
            : "-bottom-1.5 border-b border-r"
        }`}
      />

      {/* Header with type icon and label */}
      <div className="mb-2 flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
        <span className="text-lg" aria-hidden="true">
          {RefIcons[reference.type]}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">
          {reference.label}
        </span>
      </div>

      {/* Title if available */}
      {reference.title && (
        <p className="mb-2 text-sm text-[var(--text-primary)]">
          {reference.title}
        </p>
      )}

      {/* Preview content if available */}
      {reference.preview && (
        <p className="mb-2 font-mono text-xs text-[var(--text-secondary)]">
          {reference.preview}
        </p>
      )}

      {/* Link to source */}
      <Link
        to={url}
        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent-color)] hover:underline"
      >
        Sjá nánar →
      </Link>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CrossReference({
  refType,
  refId,
  children,
}: CrossReferenceProps) {
  const { bookSlug } = useParams<{ bookSlug: string }>();
  const getReference = useReferenceStore((state) => state.getReference);

  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition>({
    top: 0,
    left: 0,
    placement: "below",
  });

  const linkRef = useRef<HTMLAnchorElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get reference data from store
  const reference = getReference(refType, refId);

  // Calculate preview position
  const calculatePosition = useCallback(() => {
    if (!linkRef.current) return;

    const rect = linkRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const previewHeight = 150; // Approximate height

    // Determine if preview should appear above or below
    const spaceBelow = viewportHeight - rect.bottom;
    const placement: "above" | "below" =
      spaceBelow < previewHeight && rect.top > previewHeight ? "above" : "below";

    setPreviewPosition({
      top: placement === "below" ? rect.bottom + 8 : rect.top - previewHeight - 8,
      left: rect.left + rect.width / 2,
      placement,
    });
  }, []);

  // Show preview with delay
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    calculatePosition();
    setShowPreview(true);
  }, [calculatePosition]);

  // Hide preview with delay (allows moving to preview)
  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 150);
  }, []);

  // Keep preview visible when hovering over it
  const handlePreviewMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // If reference not found, show placeholder
  if (!reference) {
    return (
      <span
        className="cross-reference cross-reference--unresolved cursor-help text-[var(--text-secondary)]"
        title={`Tilvísun finnst ekki: ${refType}:${refId}`}
      >
        [{refType}:{refId}]
      </span>
    );
  }

  const url = bookSlug ? getReferenceUrl(bookSlug, reference) : "#";

  return (
    <>
      <Link
        ref={linkRef}
        to={url}
        className="cross-reference inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-describedby={showPreview ? `ref-preview-${refType}-${refId}` : undefined}
      >
        <span className="text-sm" aria-hidden="true">
          {RefIcons[refType]}
        </span>
        {children || reference.label}
      </Link>

      {showPreview && (
        <ReferencePreview
          reference={reference}
          position={previewPosition}
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </>
  );
}
