import Modal from "./Modal";
import { useSettingsStore, FontSize, FontFamily } from "@/stores/settingsStore";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { fontSize, setFontSize, fontFamily, setFontFamily } =
    useSettingsStore();

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: "small", label: "Lítið" },
    { value: "medium", label: "Miðlungs" },
    { value: "large", label: "Stórt" },
    { value: "xlarge", label: "Mjög stórt" },
  ];

  const fontFamilies: { value: FontFamily; label: string }[] = [
    { value: "serif", label: "Serif (lestur)" },
    { value: "sans", label: "Sans-serif (nútímalegt)" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stillingar">
      <div className="space-y-6">
        {/* Leturstærð (font size) */}
        <div>
          <h3 className="mb-3 font-sans text-lg font-semibold">Leturstærð</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fontSizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className={`rounded-lg border-2 px-4 py-3 text-center transition-all ${
                  fontSize === size.value
                    ? "border-[var(--accent-color)] bg-[var(--accent-color)]/10 font-semibold"
                    : "border-[var(--border-color)] hover:border-[var(--accent-color)]/50"
                }`}
              >
                <div className={`font-size-${size.value}`}>{size.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Leturgerð (font family) */}
        <div>
          <h3 className="mb-3 font-sans text-lg font-semibold">Leturgerð</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fontFamilies.map((family) => (
              <button
                key={family.value}
                onClick={() => setFontFamily(family.value)}
                className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                  fontFamily === family.value
                    ? "border-[var(--accent-color)] bg-[var(--accent-color)]/10 font-semibold"
                    : "border-[var(--border-color)] hover:border-[var(--accent-color)]/50"
                }`}
              >
                <div
                  className={
                    family.value === "serif" ? "font-serif" : "font-sans"
                  }
                >
                  {family.label}
                </div>
                <div
                  className={`mt-1 text-sm text-[var(--text-secondary)] ${family.value === "serif" ? "font-serif" : "font-sans"}`}
                >
                  Dæmi: Efnafræði
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sýnishorn (preview) */}
        <div>
          <h3 className="mb-3 font-sans text-lg font-semibold">Forskoðun</h3>
          <div
            className={`rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 font-size-${fontSize} ${fontFamily === "serif" ? "font-serif" : "font-sans"}`}
          >
            <p className="mb-2">
              Efnafræði er vísindin um efni og breytingar þess. Hún fjallar um
              uppbyggingu, eiginleika og hegðun efna, svo og orkubreytingar sem
              fylgja efnahvörfum.
            </p>
            <p className="text-[var(--text-secondary)]">
              Þetta er sýnishorn af textanum með núverandi stillingum.
            </p>
          </div>
        </div>

        {/* Upplýsingar (info) */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            💡 <strong>Ábending:</strong> Stillingar eru vistaðar sjálfkrafa í
            vafranum þínum og verða vistaðar á milli heimsókna.
          </p>
        </div>
      </div>
    </Modal>
  );
}
