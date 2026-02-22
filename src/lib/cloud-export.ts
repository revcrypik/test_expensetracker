import { Expense, Category, CATEGORIES } from "./types";
import { formatCurrency } from "./utils";

// ─── Cloud Export Types ──────────────────────────────────────────────────────

export type ExportFormat = "csv" | "json" | "pdf";
export type IntegrationId =
  | "google-sheets"
  | "dropbox"
  | "onedrive"
  | "notion"
  | "email";
export type ScheduleFrequency = "daily" | "weekly" | "monthly";
export type ExportStatus = "completed" | "processing" | "failed";
export type TemplateId =
  | "full-export"
  | "tax-report"
  | "monthly-summary"
  | "category-analysis";

export interface ExportHistoryEntry {
  id: string;
  timestamp: string;
  format: ExportFormat;
  destination: string; // "Local Download", "Google Sheets", "Email: x@y.com", etc.
  recordCount: number;
  totalAmount: number;
  status: ExportStatus;
  templateName?: string;
  filename: string;
}

export interface ScheduledBackup {
  id: string;
  frequency: ScheduleFrequency;
  destination: IntegrationId | "local";
  format: ExportFormat;
  enabled: boolean;
  nextRun: string;
  lastRun?: string;
  createdAt: string;
}

export interface Integration {
  id: IntegrationId;
  name: string;
  description: string;
  connected: boolean;
  icon: string; // SVG path
  color: string;
  bgColor: string;
}

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  format: ExportFormat;
  filterFn: (expenses: Expense[]) => Expense[];
  gradient: string;
}

// ─── Integrations Registry ───────────────────────────────────────────────────

export const INTEGRATIONS: Integration[] = [
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Sync expenses to a spreadsheet automatically",
    connected: false,
    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h8M8 9h2",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Auto-backup exports to your Dropbox",
    connected: false,
    icon: "M12 2L5 6.5l7 4.5 7-4.5L12 2zM5 15.5L12 20l7-4.5M5 11l7 4.5 7-4.5",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Save exports directly to OneDrive",
    connected: false,
    icon: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    color: "text-sky-600",
    bgColor: "bg-sky-50",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create expense databases in Notion",
    connected: false,
    icon: "M4 4h16v16H4zM9 9h6M9 12h6M9 15h4",
    color: "text-slate-800",
    bgColor: "bg-slate-100",
  },
  {
    id: "email",
    name: "Email",
    description: "Send exports directly to any email",
    connected: true, // always available
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
];

// ─── Export Templates ────────────────────────────────────────────────────────

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: "full-export",
    name: "Full Export",
    description: "All expenses with every detail",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    format: "csv",
    gradient: "from-emerald-500 to-teal-600",
    filterFn: (expenses) => expenses,
  },
  {
    id: "tax-report",
    name: "Tax Report",
    description: "Deductible categories formatted for tax filing",
    icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
    format: "pdf",
    gradient: "from-blue-500 to-indigo-600",
    filterFn: (expenses) =>
      expenses.filter((e) =>
        ["Transportation", "Bills", "Food"].includes(e.category)
      ),
  },
  {
    id: "monthly-summary",
    name: "Monthly Summary",
    description: "Current month expenses grouped by week",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    format: "csv",
    gradient: "from-amber-500 to-orange-600",
    filterFn: (expenses) => {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return expenses.filter((e) => e.date.startsWith(ym));
    },
  },
  {
    id: "category-analysis",
    name: "Category Analysis",
    description: "Spending breakdown by category with totals",
    icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
    format: "json",
    gradient: "from-purple-500 to-pink-600",
    filterFn: (expenses) => expenses,
  },
];

// ─── LocalStorage History Persistence ────────────────────────────────────────

const HISTORY_KEY = "expense-tracker-export-history";
const SCHEDULES_KEY = "expense-tracker-export-schedules";
const INTEGRATIONS_KEY = "expense-tracker-integrations";

export function loadExportHistory(): ExportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveExportHistory(entries: ExportHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
}

export function loadSchedules(): ScheduledBackup[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SCHEDULES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSchedules(schedules: ScheduledBackup[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
}

export function loadIntegrationStates(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(INTEGRATIONS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveIntegrationStates(
  states: Record<string, boolean>
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(states));
}

// ─── File Generators ─────────────────────────────────────────────────────────

export function generateCSV(expenses: Expense[]): string {
  const headers = ["Date", "Category", "Amount", "Description"];
  const esc = (s: string) =>
    s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  const rows = expenses.map((e) =>
    [e.date, e.category, e.amount.toFixed(2), esc(e.description)].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function generateJSON(expenses: Expense[]): string {
  return JSON.stringify(
    {
      meta: {
        exportedAt: new Date().toISOString(),
        records: expenses.length,
        total: expenses.reduce((s, e) => s + e.amount, 0),
      },
      expenses: expenses.map(({ date, category, amount, description }) => ({
        date,
        category,
        amount,
        description,
      })),
    },
    null,
    2
  );
}

export function generatePDFHTML(expenses: Expense[]): string {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const catMap = new Map<string, { count: number; total: number }>();
  for (const e of expenses) {
    const v = catMap.get(e.category) || { count: 0, total: 0 };
    v.count++;
    v.total += e.amount;
    catMap.set(e.category, v);
  }
  const catRows = Array.from(catMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([c, v]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${c}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${v.count}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${formatCurrency(v.total)}</td></tr>`
    )
    .join("");
  const expRows = expenses
    .map(
      (e) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${e.date}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${e.category}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${e.description}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${formatCurrency(e.amount)}</td></tr>`
    )
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Expense Report</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:40px 24px}h1{font-size:24px;margin:0 0 4px}.sub{color:#64748b;font-size:14px;margin-bottom:32px}.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}.sc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px}.sc .l{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}.sc .v{font-size:22px;font-weight:700;margin-top:4px}h2{font-size:16px;margin:32px 0 12px;padding-bottom:8px;border-bottom:2px solid #10b981}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:8px 12px;background:#f1f5f9;border-bottom:2px solid #cbd5e1;font-weight:600}.r{text-align:right}.c{text-align:center}.t td{font-weight:700;border-top:2px solid #1e293b;padding-top:10px}.f{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}</style></head><body><h1>Expense Report</h1><p class="sub">Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p><div class="sg"><div class="sc"><div class="l">Total</div><div class="v">${formatCurrency(total)}</div></div><div class="sc"><div class="l">Records</div><div class="v">${expenses.length}</div></div><div class="sc"><div class="l">Period</div><div class="v" style="font-size:14px">${expenses.length ? expenses[expenses.length - 1].date + " — " + expenses[0].date : "N/A"}</div></div></div><h2>By Category</h2><table><thead><tr><th>Category</th><th class="c">Count</th><th class="r">Total</th></tr></thead><tbody>${catRows}</tbody></table><h2>All Expenses</h2><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>${expRows}<tr class="t"><td colspan="3" style="padding:10px 12px">Total</td><td style="padding:10px 12px;text-align:right">${formatCurrency(total)}</td></tr></tbody></table><div class="f">ExpenseTracker Cloud Export</div></body></html>`;
}

// ─── Execute Export ──────────────────────────────────────────────────────────

export interface RunExportOpts {
  expenses: Expense[];
  format: ExportFormat;
  filename: string;
  templateId?: TemplateId;
  destination: string;
}

export async function runExport(
  opts: RunExportOpts
): Promise<ExportHistoryEntry> {
  // Simulate network delay for cloud-feel
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

  const sorted = [...opts.expenses].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  let content: string;
  let mime: string;
  let ext: string;

  switch (opts.format) {
    case "csv":
      content = generateCSV(sorted);
      mime = "text/csv;charset=utf-8;";
      ext = "csv";
      break;
    case "json":
      content = generateJSON(sorted);
      mime = "application/json;charset=utf-8;";
      ext = "json";
      break;
    case "pdf":
      content = generatePDFHTML(sorted);
      mime = "text/html;charset=utf-8;";
      ext = "html";
      break;
  }

  // Trigger download
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const baseName = opts.filename.replace(/\.[^.]+$/, "") || "expenses";
  a.download = `${baseName}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const entry: ExportHistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    format: opts.format,
    destination: opts.destination,
    recordCount: sorted.length,
    totalAmount: sorted.reduce((s, e) => s + e.amount, 0),
    status: "completed",
    templateName: opts.templateId
      ? EXPORT_TEMPLATES.find((t) => t.id === opts.templateId)?.name
      : undefined,
    filename: `${baseName}.${ext}`,
  };

  // Persist to history
  const history = loadExportHistory();
  history.unshift(entry);
  saveExportHistory(history);

  return entry;
}

// ─── Share Link Generator ────────────────────────────────────────────────────

export function generateSharePayload(expenses: Expense[]): string {
  // Encode expense data as a base64 URL-safe token (simulated shareable link)
  const payload = {
    v: 1,
    ts: Date.now(),
    data: expenses.map(({ date, category, amount, description }) => ({
      d: date,
      c: category,
      a: amount,
      n: description,
    })),
  };
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildShareURL(token: string): string {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${token.slice(0, 12)}`;
}

// ─── Schedule Helpers ────────────────────────────────────────────────────────

export function computeNextRun(freq: ScheduleFrequency): string {
  const d = new Date();
  switch (freq) {
    case "daily":
      d.setDate(d.getDate() + 1);
      d.setHours(2, 0, 0, 0);
      break;
    case "weekly":
      d.setDate(d.getDate() + (7 - d.getDay()));
      d.setHours(2, 0, 0, 0);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(2, 0, 0, 0);
      break;
  }
  return d.toISOString();
}
