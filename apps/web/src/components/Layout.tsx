import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileArchive,
  GitMerge,
  Scissors,
  LayoutGrid,
  RefreshCw,
  Settings,
  Home,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "nav.home", icon: Home, end: true },
  { to: "/compress", label: "nav.compress", icon: FileArchive },
  { to: "/merge", label: "nav.merge", icon: GitMerge },
  { to: "/split", label: "nav.split", icon: Scissors },
  { to: "/page-tools", label: "nav.pageTools", icon: LayoutGrid },
  { to: "/convert", label: "nav.convert", icon: RefreshCw },
];

export default function Layout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="glass sticky top-0 z-50 border-b border-indigo-500/20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-gradient">PdfTwist</span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )
                }
              >
                <Icon size={14} />
                {t(label)}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full"
              title={t("privacy.tooltip")}
            >
              <Shield size={11} />
              {t("privacy.badge")}
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "p-2 rounded-lg transition-all",
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )
              }
            >
              <Settings size={18} />
            </NavLink>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto border-t border-white/5 px-2 pb-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "text-indigo-300"
                    : "text-slate-400 hover:text-slate-200"
                )
              }
            >
              <Icon size={16} />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 text-center py-4 text-xs text-slate-500">
        PdfTwist — Open Source PDF Tools •{" "}
        <a
          href="https://github.com/techknowledgedev/pdftwist"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300"
        >
          GitHub
        </a>{" "}
        • MIT License
      </footer>
    </div>
  );
}
