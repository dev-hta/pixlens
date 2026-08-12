import { AppProvider, useApp } from "./store";
import { Viewfinder } from "./components/Viewfinder";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import { ReviewView } from "./components/ReviewView";
import { AdjustSheet } from "./components/AdjustSheet";

function Shell() {
  const { screen, showAdjust } = useApp();
  return (
    <div className="app-shell">
      {/* ambient accent glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

      {(screen === "viewfinder" || screen === "processing") && <Viewfinder />}
      {screen === "review" && <ReviewView />}
      {screen === "processing" && <ProcessingOverlay />}

      {showAdjust && screen === "review" && <AdjustSheet />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
