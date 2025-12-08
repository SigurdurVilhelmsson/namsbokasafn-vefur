import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import Layout from "@/components/layout/Layout";
import HomePage from "@/components/reader/HomePage";

// Lazy load route components for code splitting
const ChapterView = lazy(() => import("@/components/reader/ChapterView"));
const SectionView = lazy(() => import("@/components/reader/SectionView"));
const GlossaryPage = lazy(() => import("@/components/reader/GlossaryPage"));
const FlashcardsPage = lazy(() => import("@/components/reader/FlashcardsPage"));
const PracticeProgressPage = lazy(
  () => import("@/components/reader/PracticeProgressPage"),
);

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-color)] border-t-transparent" />
    </div>
  );
}

function App() {
  // Virkja þema hook til að beita þema við upphaf (activate theme hook)
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route
            path="ordabok"
            element={
              <Suspense fallback={<PageLoader />}>
                <GlossaryPage />
              </Suspense>
            }
          />
          <Route
            path="minniskort"
            element={
              <Suspense fallback={<PageLoader />}>
                <FlashcardsPage />
              </Suspense>
            }
          />
          <Route
            path="aefingar"
            element={
              <Suspense fallback={<PageLoader />}>
                <PracticeProgressPage />
              </Suspense>
            }
          />
          <Route
            path="kafli/:chapterSlug"
            element={
              <Suspense fallback={<PageLoader />}>
                <ChapterView />
              </Suspense>
            }
          />
          <Route
            path="kafli/:chapterSlug/:sectionSlug"
            element={
              <Suspense fallback={<PageLoader />}>
                <SectionView />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
