import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Displays a banner when the user is offline
 * Automatically hides when back online
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-amber-600"
      role="alert"
      aria-live="polite"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>Þú ert ekki tengd/ur netinu. Aðeins vistuð efni eru tiltæk.</span>
    </div>
  );
}
