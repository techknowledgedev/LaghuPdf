import { useState, useCallback } from "react";
import { FileText, Save } from "lucide-react";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import OutputCard from "@/components/OutputCard";
import { getPdfMetadata, setPdfMetadata, type PdfMetadata } from "@/lib/pdf-client";
import { formatBytes, arrayBufferToBlob, generateOutputName } from "@/lib/utils";
import { useToast } from "@/store/toastStore";

export default function MetadataPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  // Metadata fields
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [creator, setCreator] = useState("");

  // Read-only fields
  const [producer, setProducer] = useState("");
  const [creationDate, setCreationDate] = useState("");
  const [modificationDate, setModificationDate] = useState("");
  const [pageCount, setPageCount] = useState(0);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const buf = await f.arrayBuffer();
      setFileBuffer(buf);
      const meta = await getPdfMetadata(buf);
      setTitle(meta.title ?? "");
      setAuthor(meta.author ?? "");
      setSubject(meta.subject ?? "");
      setKeywords(meta.keywords ?? "");
      setCreator(meta.creator ?? "");
      setProducer(meta.producer ?? "");
      setCreationDate(meta.creationDate ?? "");
      setModificationDate(meta.modificationDate ?? "");
      setPageCount(meta.pageCount);
    } catch (err) {
      const msg = "Failed to read PDF metadata.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!fileBuffer) return;
    setProcessing(true);
    setProgress(30);
    setError(null);

    try {
      const output = await setPdfMetadata(fileBuffer, {
        title: title || undefined,
        author: author || undefined,
        subject: subject || undefined,
        keywords: keywords || undefined,
        creator: creator || undefined,
      });
      setProgress(90);
      const blob = arrayBufferToBlob(output.buffer as ArrayBuffer);
      const url = URL.createObjectURL(blob);
      setResult({
        url,
        name: generateOutputName(file!.name, "_metadata"),
        size: blob.size,
      });
      setProgress(100);
      toast.success("Metadata saved successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update metadata.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const fields: { label: string; value: string; onChange: (v: string) => void; placeholder: string }[] = [
    { label: "Title", value: title, onChange: setTitle, placeholder: "Document title" },
    { label: "Author", value: author, onChange: setAuthor, placeholder: "Author name" },
    { label: "Subject", value: subject, onChange: setSubject, placeholder: "Document subject" },
    { label: "Keywords", value: keywords, onChange: setKeywords, placeholder: "Comma-separated keywords" },
    { label: "Creator", value: creator, onChange: setCreator, placeholder: "Application that created the PDF" },
  ];

  const readOnlyFields = [
    { label: "Producer", value: producer },
    { label: "Creation Date", value: creationDate ? new Date(creationDate).toLocaleString() : "" },
    { label: "Modification Date", value: modificationDate ? new Date(modificationDate).toLocaleString() : "" },
    { label: "Pages", value: pageCount ? String(pageCount) : "" },
  ].filter((f) => f.value);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Metadata Editor</h1>
          <p className="text-sm text-slate-400">View and edit PDF document properties — in your browser</p>
        </div>
      </div>

      {!result && (
        <>
          {!file ? (
            <DropZone onFiles={onFiles} />
          ) : loading ? (
            <div className="text-center py-16 text-slate-400">Reading metadata...</div>
          ) : (
            <>
              <div className="glass rounded-2xl p-4 flex items-center gap-3">
                <FileText size={20} className="text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)} • {pageCount} pages</p>
                </div>
                <button onClick={() => { setFile(null); setFileBuffer(null); }} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
              </div>

              {/* Editable fields */}
              <div className="glass rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-300">Editable Properties</h2>
                {fields.map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <label className="text-xs text-slate-400 block mb-1">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>

              {/* Read-only fields */}
              {readOnlyFields.length > 0 && (
                <div className="glass rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-300">Read-Only Properties</h2>
                  {readOnlyFields.map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="text-xs font-mono text-slate-300">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {processing && <ProgressBar value={progress} label="Saving metadata..." />}
          {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

          {file && !loading && (
            <button
              onClick={handleSave}
              disabled={processing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {processing ? "Saving..." : "Save Metadata"}
            </button>
          )}
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
