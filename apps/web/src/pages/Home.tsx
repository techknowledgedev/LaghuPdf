import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileArchive,
  GitMerge,
  Scissors,
  LayoutGrid,
  ImageDown,
  ImagePlus,
  ShieldCheck,
  Stamp,
  Hash,
  FileText,
  Shield,
  Zap,
  Globe,
  Lock,
} from "lucide-react";

const tools = [
  {
    to: "/compress",
    icon: FileArchive,
    label: "tools.compress.title",
    desc: "tools.compress.desc",
    gradient: "from-violet-500 to-indigo-500",
    bg: "bg-violet-500/10 hover:bg-violet-500/20",
    border: "border-violet-500/20 hover:border-violet-400/40",
  },
  {
    to: "/merge",
    icon: GitMerge,
    label: "tools.merge.title",
    desc: "tools.merge.desc",
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    border: "border-blue-500/20 hover:border-blue-400/40",
  },
  {
    to: "/split",
    icon: Scissors,
    label: "tools.split.title",
    desc: "tools.split.desc",
    gradient: "from-pink-500 to-rose-500",
    bg: "bg-pink-500/10 hover:bg-pink-500/20",
    border: "border-pink-500/20 hover:border-pink-400/40",
  },
  {
    to: "/page-tools",
    icon: LayoutGrid,
    label: "tools.pageTools.title",
    desc: "tools.pageTools.desc",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/20 hover:border-amber-400/40",
  },
  {
    to: "/convert?mode=pdf-to-image",
    icon: ImageDown,
    label: "tools.pdfToImage.title",
    desc: "tools.pdfToImage.desc",
    gradient: "from-teal-500 to-emerald-500",
    bg: "bg-teal-500/10 hover:bg-teal-500/20",
    border: "border-teal-500/20 hover:border-teal-400/40",
  },
  {
    to: "/convert?mode=image-to-pdf",
    icon: ImagePlus,
    label: "tools.imageToPdf.title",
    desc: "tools.imageToPdf.desc",
    gradient: "from-fuchsia-500 to-purple-500",
    bg: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20",
    border: "border-fuchsia-500/20 hover:border-fuchsia-400/40",
  },
  {
    to: "/protect",
    icon: ShieldCheck,
    label: "tools.protect.title",
    desc: "tools.protect.desc",
    gradient: "from-emerald-500 to-green-500",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    border: "border-emerald-500/20 hover:border-emerald-400/40",
  },
  {
    to: "/watermark",
    icon: Stamp,
    label: "tools.watermark.title",
    desc: "tools.watermark.desc",
    gradient: "from-orange-500 to-red-500",
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
    border: "border-orange-500/20 hover:border-orange-400/40",
  },
  {
    to: "/page-numbers",
    icon: Hash,
    label: "tools.pageNumbers.title",
    desc: "tools.pageNumbers.desc",
    gradient: "from-sky-500 to-blue-500",
    bg: "bg-sky-500/10 hover:bg-sky-500/20",
    border: "border-sky-500/20 hover:border-sky-400/40",
  },
  {
    to: "/metadata",
    icon: FileText,
    label: "tools.metadata.title",
    desc: "tools.metadata.desc",
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    border: "border-purple-500/20 hover:border-purple-400/40",
  },
];

const features = [
  {
    icon: Shield,
    title: "Privacy-first",
    desc: "Browser operations run 100% locally. Server files auto-deleted in 30 minutes.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Zap,
    title: "Instant processing",
    desc: "Merge, split, and rotate PDFs directly in your browser — no upload needed.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    icon: Globe,
    title: "Self-hostable",
    desc: "Deploy on your own server with a single Docker Compose command.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Lock,
    title: "Open source",
    desc: "MIT licensed. Inspect, fork, and contribute on GitHub.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full mb-2">
          <Shield size={11} />
          Privacy-first PDF tools
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gradient leading-tight">
          {t("home.hero")}
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto">
          {t("home.subhero")}
        </p>
      </section>

      {/* Tool grid */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">
          {t("home.tools")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(({ to, icon: Icon, label, desc, gradient, bg, border }) => (
            <Link
              key={to}
              to={to}
              className={`group relative flex flex-col gap-3 p-5 rounded-2xl border ${bg} ${border} transition-all duration-200`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
              >
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {t(label)}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">{t(desc)}</p>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-slate-400 text-lg">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="glass rounded-2xl p-5 space-y-3"
            >
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="font-semibold text-slate-100">{title}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
