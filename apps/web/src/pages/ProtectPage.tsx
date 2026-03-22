import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Unlock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { protectPdf, unlockPdf } from "@/lib/pdf-client";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";

type Mode = "protect" | "unlock";

export default function ProtectPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("protect");
  const [file, setFile] = useState<File | null>(null);
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUserPw, setShowUserPw] = useState(false);
  const [showOwnerPw, setShowOwnerPw] = useState(false);
  const [showUnlockPw, setShowUnlockPw] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setResult(null);
    setError(null);
  }, []);

  const handleProtect = async () => {
    if (!file || !userPassword) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      const buf = await file.arrayBuffer();
      setProgress(50);
      const output = await protectPdf(buf, {
        userPassword,
        ownerPassword: ownerPassword || userPassword,
      });
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(file.name, "_protected"),
        size: blob.size,
      });
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to protect PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    setError(null);

    try {
      const buf = await file.arrayBuffer();
      setProgress(50);
      const output = await unlockPdf(buf, unlockPassword);
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(file.name, "_unlocked"),
        size: blob.size,
      });
      setProgress(100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("password") || msg.includes("decrypt")) {
        setError("Incorrect password. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setUserPassword("");
    setOwnerPassword("");
    setUnlockPassword("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Password Protect / Unlock</h1>
          <p className="text-sm text-slate-400">Encrypt or decrypt PDFs — processed in your browser</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1">
        {([
          { key: "protect" as Mode, label: "Protect", icon: Lock },
          { key: "unlock" as Mode, label: "Unlock", icon: Unlock },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setMode(key); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === key
                ? "bg-emerald-500/30 text-emerald-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {!result && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : (
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => setFile(null)} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
            </div>
          )}

          {file && mode === "protect" && (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  User Password (required to open)
                </label>
                <div className="relative">
                  <input
                    type={showUserPw ? "text" : "password"}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    onClick={() => setShowUserPw(!showUserPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showUserPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Owner Password (optional, for editing permissions)
                </label>
                <div className="relative">
                  <input
                    type={showOwnerPw ? "text" : "password"}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Leave empty to use same as user password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    onClick={() => setShowOwnerPw(!showOwnerPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showOwnerPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                The user password is required to open the PDF. The owner password controls
                editing/printing permissions. Both are encrypted with 128-bit AES.
              </p>
            </div>
          )}

          {file && mode === "unlock" && (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  PDF Password
                </label>
                <div className="relative">
                  <input
                    type={showUnlockPw ? "text" : "password"}
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Enter the password to unlock"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    onClick={() => setShowUnlockPw(!showUnlockPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showUnlockPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Enter the password used to encrypt this PDF. The output will be an
                unprotected copy with no password requirement.
              </p>
            </div>
          )}

          {processing && <ProgressBar value={progress} label={mode === "protect" ? "Encrypting..." : "Decrypting..."} />}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            onClick={mode === "protect" ? handleProtect : handleUnlock}
            disabled={!file || processing || (mode === "protect" && !userPassword)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {processing
              ? mode === "protect" ? "Encrypting..." : "Decrypting..."
              : mode === "protect" ? "Protect PDF" : "Unlock PDF"}
          </button>
        </>
      )}

      {result && (
        <OutputCard
          url={result.url}
          filename={result.name}
          outputSizeBytes={result.size}
          inputSizeBytes={file?.size}
          onReset={reset}
        />
      )}
    </div>
  );
}
