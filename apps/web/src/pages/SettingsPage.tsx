import { useTranslation } from "react-i18next";
import { Settings, Moon, Sun, Monitor, Globe, HardDrive, type LucideProps } from "lucide-react";
import { type ForwardRefExoticComponent, type RefAttributes } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import type { ThemeMode, Language } from "@pdftwist/shared";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const themes: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const languages: { value: Language; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
  { value: "es", label: "Spanish", native: "Español" },
  { value: "fr", label: "French", native: "Français" },
  { value: "de", label: "German", native: "Deutsch" },
  { value: "zh", label: "Chinese", native: "中文" },
  { value: "ja", label: "Japanese", native: "日本語" },
  { value: "pt", label: "Portuguese", native: "Português" },
  { value: "ar", label: "Arabic", native: "العربية" },
  { value: "ru", label: "Russian", native: "Русский" },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, language, maxFileSizeMb, setTheme, setLanguage, setMaxFileSizeMb } =
    useSettingsStore();

  const handleLanguage = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      </div>

      {/* Theme */}
      <section className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Monitor size={16} className="text-slate-400" />
          <h2 className="font-semibold">{t("settings.theme")}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 py-3 rounded-xl border transition-all ${
                theme === value
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-white/10 hover:border-white/20 text-slate-400"
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-slate-400" />
          <h2 className="font-semibold">{t("settings.language")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {languages.map(({ value, label, native }) => (
            <button
              key={value}
              onClick={() => handleLanguage(value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                language === value
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <span className={`text-sm font-medium ${language === value ? "text-indigo-300" : "text-slate-300"}`}>
                {native}
              </span>
              <span className="text-xs text-slate-500 ml-auto">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          More languages coming soon. Want to contribute translations?{" "}
          <a
            href="https://github.com/techknowledgedev/pdftwist"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            See GitHub →
          </a>
        </p>
      </section>

      {/* File limits */}
      <section className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={16} className="text-slate-400" />
          <h2 className="font-semibold">{t("settings.maxFileSize")}</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={maxFileSizeMb}
            onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="font-mono text-sm w-16 text-right text-indigo-300">
            {maxFileSizeMb} MB
          </span>
        </div>
      </section>

      {/* About */}
      <section className="glass rounded-2xl p-5 text-sm text-slate-400 space-y-2">
        <p className="font-semibold text-slate-200">PdfTwist v0.1.0</p>
        <p>Open-source PDF editor. MIT License.</p>
        <p>
          <a
            href="https://github.com/techknowledgedev/pdftwist"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            GitHub
          </a>
          {" · "}
          <a
            href="https://github.com/techknowledgedev/pdftwist/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Report an issue
          </a>
        </p>
        <p className="text-xs text-slate-500">
          Zero telemetry. Your files never leave your browser unless you use
          server-side tools (compression). Server files are auto-deleted within
          30 minutes.
        </p>
      </section>
    </div>
  );
}
