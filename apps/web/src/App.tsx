import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import Toaster from "@/components/Toaster";
import Home from "@/pages/Home";
import CompressPage from "@/pages/CompressPage";
import MergePage from "@/pages/MergePage";
import SplitPage from "@/pages/SplitPage";
import PageToolsPage from "@/pages/PageToolsPage";
import ConvertPage from "@/pages/ConvertPage";
import ProtectPage from "@/pages/ProtectPage";
import WatermarkPage from "@/pages/WatermarkPage";
import PageNumbersPage from "@/pages/PageNumbersPage";
import MetadataPage from "@/pages/MetadataPage";
import AnnotatePage from "@/pages/AnnotatePage";
import RedactPage from "@/pages/RedactPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
  }, [theme]);

  return (
    <ErrorBoundary>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="compress" element={<CompressPage />} />
            <Route path="merge" element={<MergePage />} />
            <Route path="split" element={<SplitPage />} />
            <Route path="page-tools" element={<PageToolsPage />} />
            <Route path="convert" element={<ConvertPage />} />
            <Route path="protect" element={<ProtectPage />} />
            <Route path="watermark" element={<WatermarkPage />} />
            <Route path="page-numbers" element={<PageNumbersPage />} />
            <Route path="metadata" element={<MetadataPage />} />
            <Route path="annotate" element={<AnnotatePage />} />
            <Route path="redact" element={<RedactPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
