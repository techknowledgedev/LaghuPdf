import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings, ThemeMode, Language } from "@pdftwist/shared";
import { DEFAULT_SETTINGS } from "@pdftwist/shared";

interface SettingsState extends AppSettings {
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setMaxFileSizeMb: (mb: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setMaxFileSizeMb: (maxFileSizeMb) => set({ maxFileSizeMb }),
    }),
    { name: "pdftwist-settings" }
  )
);
