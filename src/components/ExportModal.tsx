"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useExpenses } from "@/lib/context";
import { CATEGORIES, Category } from "@/lib/types";
import { formatCurrency, formatDate, CATEGORY_ICONS } from "@/lib/utils";
import {
  ExportFormat,
  ExportOptions,
  filterExpensesForExport,
  executeExport,
  triggerDownload,
  buildDefaultFilename,
} from "@/lib/export-engine";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "configure" | "preview" | "exporting" | "done";

const FORMAT_META: Record<
  ExportFormat,
  { label: string; desc: string; icon: string }
> = {
  csv: {
    label: "CSV",
    desc: "Spreadsheet-compatible format",
    icon: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m1.125-1.125c0 .621.504 1.125 1.125 1.125m-2.25-1.125c0 .621-.504 1.125-1.125 1.125",
  },
  json: {
    label: "JSON",
    desc: "Structured data format",
    icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  },
  pdf: {
    label: "PDF Report",
    desc: "Printable styled report",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
};

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const { expenses } = useExpenses();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // ── State ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("configure");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [filename, setFilename] = useState(buildDefaultFilename);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([
    ...CATEGORIES,
  ]);
  const [exportResult, setExportResult] = useState<{
    filename: string;
    recordCount: number;
    totalAmount: number;
  } | null>(null);
  const [blobRef, setBlobRef] = useState<Blob | null>(null);

  // ── Filtered preview data ──────────────────────────────────────────────
  const filteredExpenses = useMemo(
    () =>
      filterExpensesForExport(expenses, {
        dateFrom,
        dateTo,
        categories: selectedCategories,
      }),
    [expenses, dateFrom, dateTo, selectedCategories]
  );

  const previewTotal = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  // ── Dialog open / close sync ───────────────────────────────────────────
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("configure");
      setFormat("csv");
      setFilename(buildDefaultFilename());
      setDateFrom("");
      setDateTo("");
      setSelectedCategories([...CATEGORIES]);
      setExportResult(null);
      setBlobRef(null);
    }
  }, [open]);

  // ── Category toggle helpers ────────────────────────────────────────────
  const toggleCategory = useCallback((cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const toggleAllCategories = useCallback(() => {
    setSelectedCategories((prev) =>
      prev.length === CATEGORIES.length ? [] : [...CATEGORIES]
    );
  }, []);

  // ── Export handler ─────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setStep("exporting");
    try {
      const options: ExportOptions = {
        format,
        filename,
        dateFrom,
        dateTo,
        categories: selectedCategories,
      };
      const result = await executeExport(expenses, options);
      setBlobRef(result.blob);
      setExportResult({
        filename: result.filename,
        recordCount: result.recordCount,
        totalAmount: result.totalAmount,
      });
      triggerDownload(result.blob, result.filename);
      setStep("done");
    } catch {
      setStep("preview");
    }
  }, [format, filename, dateFrom, dateTo, selectedCategories, expenses]);

  const handleDownloadAgain = useCallback(() => {
    if (blobRef && exportResult) {
      triggerDownload(blobRef, exportResult.filename);
    }
  }, [blobRef, exportResult]);

  // ── Close on backdrop click ────────────────────────────────────────────
  const handleDialogClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose]
  );

  // ── Don't render content if not open ───────────────────────────────────
  if (!open) return null;

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderConfigureStep = () => (
    <>
      {/* Format selector */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Export Format
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(FORMAT_META) as [ExportFormat, (typeof FORMAT_META)[ExportFormat]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormat(key)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  format === key
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <svg
                  className={`w-6 h-6 ${format === key ? "text-emerald-600" : "text-slate-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                </svg>
                <span
                  className={`text-sm font-semibold ${format === key ? "text-emerald-700" : "text-slate-700"}`}
                >
                  {meta.label}
                </span>
                <span className="text-xs text-slate-500">{meta.desc}</span>
                {format === key && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Filename */}
      <div>
        <label htmlFor="export-filename" className="block text-sm font-semibold text-slate-700 mb-2">
          Filename
        </label>
        <div className="relative">
          <input
            id="export-filename"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="expenses-export"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
            .{format === "pdf" ? "html" : format}
          </span>
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-500 mb-1 block">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <span className="text-xs text-slate-500 mb-1 block">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="mt-2 text-xs text-slate-500 hover:text-slate-700"
          >
            Clear date filter
          </button>
        )}
      </div>

      {/* Category filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-700">
            Categories
          </label>
          <button
            onClick={toggleAllCategories}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {selectedCategories.length === CATEGORIES.length
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const selected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  selected
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-400 line-through"
                }`}
              >
                <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                <span className="truncate">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {filteredExpenses.length}
          </span>{" "}
          record{filteredExpenses.length !== 1 ? "s" : ""} match your filters
        </div>
        <div className="text-sm font-semibold text-slate-900">
          {formatCurrency(previewTotal)}
        </div>
      </div>
    </>
  );

  const renderPreviewStep = () => {
    const sorted = [...filteredExpenses].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    const previewItems = sorted.slice(0, 20);
    const hasMore = sorted.length > 20;

    return (
      <div className="space-y-4">
        {/* Preview header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Preview ({filteredExpenses.length} record
              {filteredExpenses.length !== 1 ? "s" : ""})
            </h4>
            <p className="text-xs text-slate-500">
              Total: {formatCurrency(previewTotal)} &middot; Format:{" "}
              {FORMAT_META[format].label}
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            {filename}.{format === "pdf" ? "html" : format}
          </span>
        </div>

        {/* Data table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewItems.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-sm">
                          {CATEGORY_ICONS[exp.category]}
                        </span>
                        <span className="text-slate-700">{exp.category}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate">
                      {exp.description}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900 tabular-nums">
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
              Showing 20 of {filteredExpenses.length} records. All records will
              be included in the export.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExportingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-900">Generating your export...</p>
        <p className="text-sm text-slate-500 mt-1">
          Processing {filteredExpenses.length} records as{" "}
          {FORMAT_META[format].label}
        </p>
      </div>
    </div>
  );

  const renderDoneStep = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-5">
      {/* Success icon */}
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900">Export Complete!</p>
        <p className="text-sm text-slate-500 mt-1">
          Your file has been downloaded.
        </p>
      </div>

      {exportResult && (
        <div className="w-full max-w-xs bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Filename</span>
            <span className="font-medium text-slate-900 font-mono text-xs">
              {exportResult.filename}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Records</span>
            <span className="font-medium text-slate-900">
              {exportResult.recordCount}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Amount</span>
            <span className="font-medium text-slate-900">
              {formatCurrency(exportResult.totalAmount)}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleDownloadAgain}
          className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          Download Again
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  // ── Step navigation ────────────────────────────────────────────────────
  const canProceedToPreview =
    filteredExpenses.length > 0 &&
    selectedCategories.length > 0 &&
    filename.trim().length > 0;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onClose={onClose}
      className="fixed inset-0 z-50 m-0 p-0 w-full h-full max-w-none max-h-none bg-transparent backdrop:bg-black/40"
    >
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Export Data
                </h2>
                <p className="text-xs text-slate-500">
                  {step === "configure" && "Configure your export"}
                  {step === "preview" && "Review before downloading"}
                  {step === "exporting" && "Processing..."}
                  {step === "done" && "All done!"}
                </p>
              </div>
            </div>
            {step !== "exporting" && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Step indicator (only for configure / preview) */}
          {(step === "configure" || step === "preview") && (
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    step === "configure"
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === "configure"
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {step === "configure" ? "1" : "\u2713"}
                  </span>
                  Configure
                </div>
                <div className="flex-1 h-px bg-slate-200" />
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    step === "preview" ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === "preview"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    2
                  </span>
                  Preview & Export
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {step === "configure" && renderConfigureStep()}
            {step === "preview" && renderPreviewStep()}
            {step === "exporting" && renderExportingStep()}
            {step === "done" && renderDoneStep()}
          </div>

          {/* Footer buttons (configure & preview only) */}
          {(step === "configure" || step === "preview") && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={step === "configure" ? onClose : () => setStep("configure")}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {step === "configure" ? "Cancel" : "Back"}
              </button>
              {step === "configure" ? (
                <button
                  onClick={() => setStep("preview")}
                  disabled={!canProceedToPreview}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview Export
                </button>
              ) : (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Export {FORMAT_META[format].label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
