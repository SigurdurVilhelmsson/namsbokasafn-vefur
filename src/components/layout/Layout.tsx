import { Outlet } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { fontSize, fontFamily } = useSettingsStore();

  return (
    <div
      className={`min-h-screen font-size-${fontSize} ${
        fontFamily === "sans" ? "font-sans" : "font-serif"
      }`}
    >
      <Header />

      <div className="flex">
        <Sidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
