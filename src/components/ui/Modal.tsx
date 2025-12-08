import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Loka modal með Escape lykli (close modal with Escape key)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus trap - halda fókus innan modal (trap focus within modal)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Vista núverandi virkt element (save currently active element)
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Finna öll focusable elements innan modal (find all focusable elements)
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    // Setja fókus á fyrsta element (focus first element)
    firstElement?.focus();

    // Handle Tab key fyrir focus trap (handle Tab for focus trap)
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modalRef.current.addEventListener("keydown", handleTab as EventListener);
    const currentModal = modalRef.current;

    return () => {
      currentModal?.removeEventListener("keydown", handleTab as EventListener);
      // Endurheimta fókus (restore focus)
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Koma í veg fyrir scrolling þegar modal er opið (prevent scrolling when modal is open)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Haus (header) */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2
            id="modal-title"
            className="font-sans text-xl font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 -mr-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Loka"
          >
            <X size={20} />
          </button>
        </div>

        {/* Efni (content) */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
