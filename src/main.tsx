import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./styles/globals.css";

// Register service worker for offline support
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update prompt to user
    if (confirm("Ný útgáfa er tiltæk. Viltu endurhlaða síðuna?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready for offline use");
  },
  onRegistered(registration) {
    console.log("Service worker registered:", registration);
  },
  onRegisterError(error) {
    console.error("Service worker registration failed:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
