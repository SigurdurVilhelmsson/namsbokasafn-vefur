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
      <div className="space-y-8">
        {/* Leturstærð (font size) - Button group */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-900">
            Leturstærð
          </label>
          <div className="flex gap-2">
            {fontSizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  fontSize === size.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leturgerð (font family) - Radio cards */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-900">
            Leturgerð
          </label>
          <div className="space-y-2">
            {fontFamilies.map((family) => (
              <label
                key={family.value}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                  fontFamily === family.value
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="font"
                  checked={fontFamily === family.value}
                  onChange={() => setFontFamily(family.value)}
                  className="h-4 w-4 shrink-0 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span
                    className={`text-gray-900 ${family.value === "serif" ? "font-serif font-medium" : "font-sans font-medium"}`}
                  >
                    {family.label}
                  </span>
                  <p
                    className={`mt-0.5 text-sm text-gray-500 ${family.value === "serif" ? "font-serif" : "font-sans"}`}
                  >
                    Dæmi: Efnafræði
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Forskoðun (preview) */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-900">
            Forskoðun
          </label>
          <div
            className={`rounded-xl border border-gray-200 bg-gray-50 p-5 font-size-${fontSize} ${fontFamily === "serif" ? "font-serif" : "font-sans"}`}
          >
            <p
              className="leading-relaxed text-gray-700"
              style={{ fontSize: "var(--font-size-base)" }}
            >
              Efnafræði er vísindin um efni og breytingar þess. Hún fjallar um
              uppbyggingu, eiginleika og hegðun efna, svo og orkubreytingar sem
              fylgja efnahvörfum.
            </p>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Stillingar eru vistaðar sjálfkrafa í vafranum þínum
          </p>
        </div>
      </div>
    </Modal>
  );
}
