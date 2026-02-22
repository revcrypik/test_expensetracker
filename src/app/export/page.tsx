"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useExpenses } from "@/lib/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ExportFormat,
  ExportHistoryEntry,
  ScheduledBackup,
  ScheduleFrequency,
  Integration,
  INTEGRATIONS,
  EXPORT_TEMPLATES,
  loadExportHistory,
  saveExportHistory,
  loadSchedules,
  saveSchedules,
  loadIntegrationStates,
  saveIntegrationStates,
  runExport,
  generateSharePayload,
  buildShareURL,
  computeNextRun,
} from "@/lib/cloud-export";

type Tab = "templates" | "integrations" | "share" | "history" | "schedules";

// ─── Tiny SVG helper ─────────────────────────────────────────────────────────
function Icon({
  d,
  className = "w-5 h-5",
}: {
  d: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export Hub page
// ─────────────────────────────────────────────────────────────────────────────

export default function ExportHubPage() {
  const { expenses, isLoaded } = useExpenses();
  const [activeTab, setActiveTab] = useState<Tab>("templates");

  // ── Persisted state ──────────────────────────────────────────────────
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduledBackup[]>([]);
  const [integrationStates, setIntegrationStates] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setHistory(loadExportHistory());
    setSchedules(loadSchedules());
    setIntegrationStates(loadIntegrationStates());
  }, []);

  // ── Toast state ────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "info" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  // ── Processing overlay ─────────────────────────────────────────────────
  const [processing, setProcessing] = useState<string | null>(null);

  // ── Tab definitions ────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: string }[] = [
    {
      id: "templates",
      label: "Quick Export",
      icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    },
    {
      id: "share",
      label: "Share",
      icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z",
    },
    {
      id: "history",
      label: "History",
      icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      id: "schedules",
      label: "Schedules",
      icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    },
  ];

  // ════════════════════════════════════════════════════════════════════════
  // Template Export Handler
  // ════════════════════════════════════════════════════════════════════════

  const handleTemplateExport = useCallback(
    async (templateId: string) => {
      const tpl = EXPORT_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;

      const filtered = tpl.filterFn(expenses);
      if (filtered.length === 0) {
        showToast("No expenses match this template filter", "info");
        return;
      }

      setProcessing(`Generating ${tpl.name}...`);
      try {
        const entry = await runExport({
          expenses: filtered,
          format: tpl.format,
          filename: `${tpl.id}-${new Date().toISOString().slice(0, 10)}`,
          templateId: tpl.id,
          destination: "Local Download",
        });
        setHistory((prev) => {
          const next = [entry, ...prev];
          saveExportHistory(next);
          return next;
        });
        showToast(
          `${tpl.name} exported — ${entry.recordCount} records, ${formatCurrency(entry.totalAmount)}`
        );
      } finally {
        setProcessing(null);
      }
    },
    [expenses, showToast]
  );

  // ════════════════════════════════════════════════════════════════════════
  // Integration Connect / Disconnect
  // ════════════════════════════════════════════════════════════════════════

  const handleToggleIntegration = useCallback(
    async (id: string) => {
      const wasConnected = integrationStates[id] || false;
      setProcessing(
        wasConnected ? "Disconnecting..." : "Connecting to service..."
      );
      await new Promise((r) => setTimeout(r, 1200));
      setIntegrationStates((prev) => {
        const next = { ...prev, [id]: !wasConnected };
        saveIntegrationStates(next);
        return next;
      });
      setProcessing(null);
      showToast(wasConnected ? "Service disconnected" : "Service connected!");
    },
    [integrationStates, showToast]
  );

  const handleSyncToIntegration = useCallback(
    async (integration: Integration) => {
      if (expenses.length === 0) {
        showToast("No expenses to sync", "info");
        return;
      }
      setProcessing(`Syncing to ${integration.name}...`);
      const entry = await runExport({
        expenses,
        format: "csv",
        filename: `sync-${integration.id}-${new Date().toISOString().slice(0, 10)}`,
        destination: integration.name,
      });
      setHistory((prev) => {
        const next = [entry, ...prev];
        saveExportHistory(next);
        return next;
      });
      setProcessing(null);
      showToast(`Synced ${entry.recordCount} records to ${integration.name}`);
    },
    [expenses, showToast]
  );

  // ════════════════════════════════════════════════════════════════════════
  // Share
  // ════════════════════════════════════════════════════════════════════════

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [emailAddr, setEmailAddr] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGenerateLink = useCallback(() => {
    if (expenses.length === 0) {
      showToast("No expenses to share", "info");
      return;
    }
    const token = generateSharePayload(expenses);
    setShareLink(buildShareURL(token));
    showToast("Shareable link generated");
  }, [expenses, showToast]);

  const handleCopyLink = useCallback(() => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      showToast("Link copied to clipboard");
    });
  }, [shareLink, showToast]);

  const handleEmailExport = useCallback(async () => {
    if (!emailAddr.includes("@")) {
      showToast("Please enter a valid email", "info");
      return;
    }
    setEmailSending(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1500));
    const entry: ExportHistoryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      format: "csv",
      destination: `Email: ${emailAddr}`,
      recordCount: expenses.length,
      totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
      status: "completed",
      filename: `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
    };
    setHistory((prev) => {
      const next = [entry, ...prev];
      saveExportHistory(next);
      return next;
    });
    setEmailSending(false);
    setEmailSent(true);
    showToast(`Export sent to ${emailAddr}`);
    setTimeout(() => setEmailSent(false), 4000);
  }, [emailAddr, expenses, showToast]);

  // ════════════════════════════════════════════════════════════════════════
  // Schedule Management
  // ════════════════════════════════════════════════════════════════════════

  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newFreq, setNewFreq] = useState<ScheduleFrequency>("weekly");
  const [newFormat, setNewFormat] = useState<ExportFormat>("csv");

  const handleCreateSchedule = useCallback(() => {
    const sched: ScheduledBackup = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      frequency: newFreq,
      destination: "local",
      format: newFormat,
      enabled: true,
      nextRun: computeNextRun(newFreq),
      createdAt: new Date().toISOString(),
    };
    setSchedules((prev) => {
      const next = [sched, ...prev];
      saveSchedules(next);
      return next;
    });
    setShowNewSchedule(false);
    showToast(`${newFreq} backup scheduled`);
  }, [newFreq, newFormat, showToast]);

  const handleToggleSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      saveSchedules(next);
      return next;
    });
  }, []);

  const handleDeleteSchedule = useCallback(
    (id: string) => {
      setSchedules((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveSchedules(next);
        return next;
      });
      showToast("Schedule removed");
    },
    [showToast]
  );

  // ════════════════════════════════════════════════════════════════════════
  // History Management
  // ════════════════════════════════════════════════════════════════════════

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveExportHistory([]);
    showToast("History cleared");
  }, [showToast]);

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════

  if (!isLoaded) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Hub</h1>
          <p className="text-slate-500 mt-1">
            Export, share, and sync your expense data
          </p>
        </div>
        {/* Live badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-700">
            {expenses.length} records ready
          </span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon d={tab.icon} className="w-4 h-4" />
              {tab.label}
              {tab.id === "history" && history.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full">
                  {history.length}
                </span>
              )}
              {tab.id === "schedules" &&
                schedules.filter((s) => s.enabled).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                    {schedules.filter((s) => s.enabled).length}
                  </span>
                )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Template cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPORT_TEMPLATES.map((tpl) => {
              const matchCount = tpl.filterFn(expenses).length;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateExport(tpl.id)}
                  disabled={matchCount === 0}
                  className="group relative text-left p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tpl.gradient} flex items-center justify-center mb-3`}
                  >
                    <Icon d={tpl.icon} className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {tpl.description}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400 uppercase font-medium">
                      {tpl.format}
                    </span>
                    <span className="text-xs text-slate-500">
                      {matchCount} record{matchCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Hover arrow */}
                  <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      className="w-5 h-5 text-emerald-500"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick custom export */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">
              Custom Export
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Choose a format and download all your data now
            </p>
            <div className="flex flex-wrap gap-3">
              {(["csv", "json", "pdf"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={async () => {
                    if (expenses.length === 0) {
                      showToast("No expenses to export", "info");
                      return;
                    }
                    setProcessing(`Exporting ${fmt.toUpperCase()}...`);
                    const entry = await runExport({
                      expenses,
                      format: fmt,
                      filename: `expenses-${new Date().toISOString().slice(0, 10)}`,
                      destination: "Local Download",
                    });
                    setHistory((prev) => {
                      const next = [entry, ...prev];
                      saveExportHistory(next);
                      return next;
                    });
                    setProcessing(null);
                    showToast(
                      `${fmt.toUpperCase()} exported — ${entry.recordCount} records`
                    );
                  }}
                  disabled={expenses.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    className="w-4 h-4"
                  />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATIONS TAB */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Connect cloud services to auto-sync or backup your expense data.
          </p>
          {INTEGRATIONS.map((integ) => {
            const connected =
              integ.id === "email"
                ? true
                : integrationStates[integ.id] || false;
            return (
              <div
                key={integ.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${integ.bgColor} flex items-center justify-center shrink-0`}
                >
                  <Icon d={integ.icon} className={`w-6 h-6 ${integ.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">
                      {integ.name}
                    </h4>
                    {connected && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{integ.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {connected && integ.id !== "email" && (
                    <button
                      onClick={() => handleSyncToIntegration(integ)}
                      disabled={expenses.length === 0}
                      className="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      Sync Now
                    </button>
                  )}
                  {integ.id !== "email" && (
                    <button
                      onClick={() => handleToggleIntegration(integ.id)}
                      className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                        connected
                          ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                          : "text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {connected ? "Disconnect" : "Connect"}
                    </button>
                  )}
                  {integ.id === "email" && (
                    <button
                      onClick={() => setActiveTab("share")}
                      className="px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors"
                    >
                      Send Export
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SHARE TAB */}
      {activeTab === "share" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shareable link */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Icon
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  className="w-5 h-5 text-indigo-600"
                />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Shareable Link
                </h3>
                <p className="text-xs text-slate-500">
                  Generate a link anyone can use to view your data
                </p>
              </div>
            </div>

            {shareLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                {/* QR placeholder */}
                <div className="border border-slate-200 rounded-xl p-6 flex flex-col items-center gap-3 bg-slate-50">
                  <div className="w-32 h-32 bg-white border-2 border-slate-300 rounded-lg grid grid-cols-5 grid-rows-5 gap-0.5 p-2">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${
                          [
                            0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22,
                            23, 24, 6, 8, 12, 16, 18,
                          ].includes(i)
                            ? "bg-slate-800"
                            : "bg-white"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    Scan to open shared report
                  </span>
                </div>
                <button
                  onClick={() => setShareLink(null)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Generate new link
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateLink}
                disabled={expenses.length === 0}
                className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Link
              </button>
            )}
          </div>

          {/* Email export */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Icon
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  className="w-5 h-5 text-violet-600"
                />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Email Export</h3>
                <p className="text-xs text-slate-500">
                  Send a CSV report to any email address
                </p>
              </div>
            </div>

            {emailSent ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Icon
                    d="M4.5 12.75l6 6 9-13.5"
                    className="w-6 h-6 text-emerald-600"
                  />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  Export sent!
                </p>
                <p className="text-xs text-slate-500">{emailAddr}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Recipient email
                  </label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={emailAddr}
                    onChange={(e) => setEmailAddr(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={handleEmailExport}
                  disabled={
                    emailSending ||
                    !emailAddr.includes("@") ||
                    expenses.length === 0
                  }
                  className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Icon
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        className="w-4 h-4"
                      />
                      Send Export
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {history.length} export{history.length !== 1 ? "s" : ""} recorded
            </p>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Icon
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                className="w-10 h-10 text-slate-300 mx-auto mb-3"
              />
              <p className="text-slate-500 text-sm">
                No exports yet. Use Quick Export or Integrations to get started.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    {/* Status indicator */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        entry.status === "completed"
                          ? "bg-emerald-100"
                          : entry.status === "processing"
                            ? "bg-amber-100"
                            : "bg-red-100"
                      }`}
                    >
                      {entry.status === "completed" && (
                        <Icon
                          d="M4.5 12.75l6 6 9-13.5"
                          className="w-4 h-4 text-emerald-600"
                        />
                      )}
                      {entry.status === "processing" && (
                        <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                      )}
                      {entry.status === "failed" && (
                        <Icon
                          d="M6 18L18 6M6 6l12 12"
                          className="w-4 h-4 text-red-600"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {entry.templateName || entry.filename}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-500 rounded">
                          {entry.format}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {entry.destination} &middot;{" "}
                        {new Date(entry.timestamp).toLocaleString()} &middot;{" "}
                        {entry.recordCount} records
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                      {formatCurrency(entry.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCHEDULES TAB */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Automated recurring exports
            </p>
            <button
              onClick={() => setShowNewSchedule(!showNewSchedule)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Icon d="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />
              New Schedule
            </button>
          </div>

          {/* New schedule form */}
          {showNewSchedule && (
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 space-y-4">
              <h4 className="font-semibold text-slate-900">
                Create Backup Schedule
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Frequency
                  </label>
                  <select
                    value={newFreq}
                    onChange={(e) =>
                      setNewFreq(e.target.value as ScheduleFrequency)
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="daily">Daily (2:00 AM)</option>
                    <option value="weekly">Weekly (Sunday)</option>
                    <option value="monthly">Monthly (1st)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Format
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) =>
                      setNewFormat(e.target.value as ExportFormat)
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF Report</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateSchedule}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Create Schedule
                </button>
                <button
                  onClick={() => setShowNewSchedule(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing schedules */}
          {schedules.length === 0 && !showNewSchedule ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Icon
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                className="w-10 h-10 text-slate-300 mx-auto mb-3"
              />
              <p className="text-slate-500 text-sm">
                No scheduled backups. Create one to automate your exports.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((sched) => (
                <div
                  key={sched.id}
                  className={`bg-white rounded-2xl border p-5 flex items-center gap-4 transition-colors ${
                    sched.enabled
                      ? "border-slate-200"
                      : "border-slate-100 opacity-60"
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleSchedule(sched.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      sched.enabled ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        sched.enabled ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 capitalize">
                        {sched.frequency} Backup
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-500 rounded">
                        {sched.format}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Next run:{" "}
                      {new Date(sched.nextRun).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteSchedule(sched.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <Icon
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      className="w-4 h-4"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Processing Overlay ──────────────────────────────────────────── */}
      {processing && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs mx-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
            </div>
            <p className="font-medium text-slate-900 text-center">
              {processing}
            </p>
            <p className="text-xs text-slate-500 text-center">
              This may take a moment...
            </p>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-white"
            }`}
          >
            {toast.type === "success" && (
              <Icon
                d="M4.5 12.75l6 6 9-13.5"
                className="w-4 h-4 text-emerald-200"
              />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
