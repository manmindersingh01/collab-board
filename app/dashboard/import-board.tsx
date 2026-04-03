"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type ImportFormat = "trello" | "csv" | "jira";

const FORMAT_OPTIONS: { value: ImportFormat; label: string; ext: string }[] = [
  { value: "trello", label: "Trello (JSON)", ext: ".json" },
  { value: "csv", label: "Generic CSV", ext: ".csv" },
  { value: "jira", label: "Jira (CSV)", ext: ".csv" },
];

function detectFormat(filename: string): ImportFormat {
  if (filename.endsWith(".json")) return "trello";
  return "csv";
}

function IconUpload() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function ImportBoardModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat>("trello");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFormat("trello");
      setError(null);
      setIsImporting(false);
      setDragActive(false);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setFormat(detectFormat(f.name));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  async function handleImport() {
    if (!file) return;
    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", format);

      const res = await fetch("/api/boards/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Import failed (${res.status})`);
      }

      const { boardId } = await res.json();
      onClose();
      router.push(`/board/${boardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsImporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="neo-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="neo-card w-full max-w-md p-0 animate-slide-up"
        role="dialog"
        aria-labelledby="import-board-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-black bg-neo-blue/20 rounded-t-[6px]">
          <h2 id="import-board-title" className="font-black text-lg">
            Import Board
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <IconX />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                dragActive
                  ? "border-neo-blue bg-neo-blue/10"
                  : file
                    ? "border-neo-green bg-neo-green/5"
                    : "border-neo-black/30 hover:border-neo-black hover:bg-gray-50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="text-neo-muted">
                <IconUpload />
              </div>
              {file ? (
                <>
                  <p className="font-bold text-sm">{file.name}</p>
                  <p className="text-xs text-neo-muted">
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-neo-muted">
                    Supports .json (Trello) and .csv (Generic / Jira)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label
              htmlFor="import-format"
              className="block text-sm font-bold mb-1.5"
            >
              Import Format
            </label>
            <select
              id="import-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ImportFormat)}
              className="neo-input"
              disabled={isImporting}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-neo-red/10 border-2 border-neo-red rounded-lg px-4 py-2.5 text-sm font-semibold text-neo-red">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn neo-btn-ghost flex-1"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="neo-btn neo-btn-primary flex-1"
              disabled={isImporting || !file}
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Importing...
                </span>
              ) : (
                "Import Board"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
