import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import Layout from "@/components/layout/Layout";
import ChapterView from "@/components/reader/ChapterView";
import SectionView from "@/components/reader/SectionView";
import HomePage from "@/components/reader/HomePage";
import GlossaryPage from "@/components/reader/GlossaryPage";
import FlashcardsPage from "@/components/reader/FlashcardsPage";

function App() {
  // Virkja þema hook til að beita þema við upphaf (activate theme hook)
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="ordabok" element={<GlossaryPage />} />
          <Route path="minniskort" element={<FlashcardsPage />} />
          <Route path="kafli/:chapterSlug" element={<ChapterView />} />
          <Route
            path="kafli/:chapterSlug/:sectionSlug"
            element={<SectionView />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
