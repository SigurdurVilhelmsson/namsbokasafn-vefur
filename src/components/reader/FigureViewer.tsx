import { useState, useCallback, useEffect, useRef } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface FigureData {
  src: string;
  alt: string;
  caption?: string;
  figureNumber?: number;
  chapterNumber?: number;
}

interface FigureViewerProps {
  src: string;
  alt: string;
  caption?: string;
  figureNumber?: number;
  chapterNumber?: number;
  className?: string;
}

interface LightboxProps {
  figure: FigureData;
  figures?: FigureData[];
  currentIndex?: number;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

// =============================================================================
// LIGHTBOX COMPONENT
// =============================================================================

function Lightbox({
  figure,
  figures = [],
  currentIndex = 0,
  onClose,
  onNavigate,
}: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasPrev = figures.length > 0 && currentIndex > 0;
  const hasNext = figures.length > 0 && currentIndex < figures.length - 1;

  // Zoom handlers - declared before useEffect that uses them
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 0.5);
      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrev && onNavigate) {
            onNavigate(currentIndex - 1);
          }
          break;
        case "ArrowRight":
          if (hasNext && onNavigate) {
            onNavigate(currentIndex + 1);
          }
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleResetZoom();
          break;
        case "i":
          setShowInfo((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hasPrev, hasNext, currentIndex, onNavigate, handleZoomIn, handleZoomOut, handleResetZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => {
      const newZoom = Math.max(0.5, Math.min(4, prev + delta));
      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = figure.src;
    link.download = figure.alt || "figure";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [figure]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`Mynd: ${figure.alt}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Figure number */}
          {figure.figureNumber && (
            <span className="rounded bg-white/10 px-2 py-1 text-sm font-medium text-white">
              {figure.chapterNumber
                ? `Mynd ${figure.chapterNumber}.${figure.figureNumber}`
                : `Mynd ${figure.figureNumber}`}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minnka"
            title="Minnka (-)"
          >
            <ZoomOut size={20} />
          </button>
          <span className="min-w-[60px] text-center text-sm text-white/70">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Stækka"
            title="Stækka (+)"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleResetZoom}
            className="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Endurstilla"
            title="Endurstilla (0)"
          >
            <RotateCcw size={20} />
          </button>

          <div className="mx-2 h-6 w-px bg-white/20" />

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className={`rounded p-2 transition-colors ${
              showInfo
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            aria-label="Sýna upplýsingar"
            title="Upplýsingar (I)"
          >
            <Info size={20} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sækja mynd"
            title="Sækja"
          >
            <Download size={20} />
          </button>

          <div className="mx-2 h-6 w-px bg-white/20" />

          {/* Close */}
          <button
            onClick={onClose}
            className="rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Loka"
            title="Loka (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {/* Navigation buttons */}
        {hasPrev && (
          <button
            onClick={() => onNavigate?.(currentIndex - 1)}
            className="absolute left-4 z-10 rounded-full bg-black/50 p-3 text-white/70 transition-colors hover:bg-black/70 hover:text-white"
            aria-label="Fyrri mynd"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => onNavigate?.(currentIndex + 1)}
            className="absolute right-4 z-10 rounded-full bg-black/50 p-3 text-white/70 transition-colors hover:bg-black/70 hover:text-white"
            aria-label="Næsta mynd"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Image */}
        <img
          ref={imageRef}
          src={figure.src}
          alt={figure.alt}
          className="max-h-full max-w-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Caption/info bar */}
      {showInfo && (figure.caption || figure.alt) && (
        <div className="border-t border-white/10 bg-black/50 px-4 py-3">
          <p className="text-center text-sm text-white/90">
            {figure.caption || figure.alt}
          </p>
        </div>
      )}

      {/* Image counter for galleries */}
      {figures.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white/70">
          {currentIndex + 1} / {figures.length}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FIGURE VIEWER COMPONENT
// =============================================================================

export default function FigureViewer({
  src,
  alt,
  caption,
  figureNumber,
  chapterNumber,
  className = "",
}: FigureViewerProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleOpenLightbox = useCallback(() => {
    setIsLightboxOpen(true);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    // Restore body scroll
    document.body.style.overflow = "";
  }, []);

  const figureLabel = figureNumber
    ? chapterNumber
      ? `Mynd ${chapterNumber}.${figureNumber}`
      : `Mynd ${figureNumber}`
    : null;

  return (
    <>
      <figure
        className={`group relative my-6 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] ${className}`}
      >
        {/* Image container */}
        <div className="relative">
          {/* Loading state */}
          {!imageLoaded && !imageError && (
            <div className="flex h-48 items-center justify-center bg-[var(--bg-tertiary)]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-color)] border-t-transparent" />
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              <span className="text-2xl">🖼️</span>
              <span className="text-sm">Ekki tókst að hlaða mynd</span>
            </div>
          )}

          {/* Image */}
          <img
            src={src}
            alt={alt}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full cursor-zoom-in object-contain transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            } ${imageError ? "hidden" : ""}`}
            onClick={handleOpenLightbox}
          />

          {/* Zoom button overlay */}
          {imageLoaded && !imageError && (
            <button
              onClick={handleOpenLightbox}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Opna í fullri stærð"
            >
              <Maximize2 size={16} />
              <span className="hidden sm:inline">Stækka</span>
            </button>
          )}
        </div>

        {/* Caption */}
        {(figureLabel || caption) && (
          <figcaption className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3">
            {figureLabel && (
              <span className="mr-2 font-sans font-semibold text-[var(--accent-color)]">
                {figureLabel}:
              </span>
            )}
            <span className="text-sm text-[var(--text-secondary)]">
              {caption || alt}
            </span>
          </figcaption>
        )}
      </figure>

      {/* Lightbox */}
      {isLightboxOpen && (
        <Lightbox
          figure={{ src, alt, caption, figureNumber, chapterNumber }}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Lightbox };
export type { LightboxProps };
