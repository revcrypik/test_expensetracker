import { Expense, Category, CATEGORIES } from "./types";
import { formatCurrency } from "./utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "json" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  dateFrom: string;
  dateTo: string;
  categories: Category[];
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  recordCount: number;
  totalAmount: number;
}

// ─── Filtering ──────────────────────────────────────────────────────────────

export function filterExpensesForExport(
  expenses: Expense[],
  options: Pick<ExportOptions, "dateFrom" | "dateTo" | "categories">
): Expense[] {
  return expenses.filter((exp) => {
    if (options.dateFrom && exp.date < options.dateFrom) return false;
    if (options.dateTo && exp.date > options.dateTo) return false;
    if (
      options.categories.length > 0 &&
      options.categories.length < CATEGORIES.length &&
      !options.categories.includes(exp.category)
    )
      return false;
    return true;
  });
}

// ─── CSV Generator ──────────────────────────────────────────────────────────

function generateCSV(expenses: Expense[]): string {
  const headers = ["Date", "Category", "Amount", "Description"];
  const escapeField = (field: string): string => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };
  const rows = expenses.map((e) =>
    [
      e.date,
      e.category,
      e.amount.toFixed(2),
      escapeField(e.description),
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

// ─── JSON Generator ─────────────────────────────────────────────────────────

function generateJSON(expenses: Expense[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    recordCount: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
    })),
  };
  return JSON.stringify(exportData, null, 2);
}

// ─── PDF Generator (plain-text styled) ───────────────────────────────────────
// Generates a self-contained HTML file styled to look like a professional PDF
// report. Users can open in a browser and print-to-PDF for a real PDF.

function generatePDFHTML(expenses: Expense[]): string {
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Build category summary
  const catMap = new Map<string, { count: number; total: number }>();
  for (const e of expenses) {
    const entry = catMap.get(e.category) || { count: 0, total: 0 };
    entry.count++;
    entry.total += e.amount;
    catMap.set(e.category, entry);
  }
  const catSummaryRows = Array.from(catMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([cat, info]) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${cat}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${info.count}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${formatCurrency(info.total)}</td>
        </tr>`
    )
    .join("");

  const expenseRows = expenses
    .map(
      (e) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${e.date}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${e.category}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${e.description}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${formatCurrency(e.amount)}</td>
        </tr>`
    )
    .join("");

  const dateRange =
    expenses.length > 0
      ? `${expenses[expenses.length - 1].date} to ${expenses[0].date}`
      : "N/A";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Expense Report</title>
<style>
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 14px; margin-bottom: 32px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary-card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 16px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #10b981; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
  th.right { text-align: right; }
  th.center { text-align: center; }
  .total-row td { font-weight: 700; border-top: 2px solid #1e293b; padding-top: 10px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <h1>Expense Report</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <div class="summary-grid">
    <div class="summary-card"><div class="label">Total Expenses</div><div class="value">${formatCurrency(total)}</div></div>
    <div class="summary-card"><div class="label">Records</div><div class="value">${expenses.length}</div></div>
    <div class="summary-card"><div class="label">Date Range</div><div class="value" style="font-size:14px">${dateRange}</div></div>
  </div>

  <h2>Category Summary</h2>
  <table>
    <thead><tr><th>Category</th><th class="center">Count</th><th class="right">Total</th></tr></thead>
    <tbody>${catSummaryRows}</tbody>
  </table>

  <h2>All Expenses</h2>
  <table>
    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="right">Amount</th></tr></thead>
    <tbody>
      ${expenseRows}
      <tr class="total-row">
        <td colspan="3" style="padding:10px 12px">Total</td>
        <td style="padding:10px 12px;text-align:right">${formatCurrency(total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">ExpenseTracker &mdash; Exported report. Open in a browser and use Print &rarr; Save as PDF for a PDF copy.</div>
</body>
</html>`;
}

// ─── Main Export Function ───────────────────────────────────────────────────

export async function executeExport(
  expenses: Expense[],
  options: ExportOptions
): Promise<ExportResult> {
  // Simulate a brief processing delay for large datasets
  await new Promise((r) => setTimeout(r, 600));

  const filtered = filterExpensesForExport(expenses, options);
  // Sort by date descending for the export
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  let blob: Blob;
  let extension: string;

  switch (options.format) {
    case "csv": {
      const csv = generateCSV(sorted);
      blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      extension = "csv";
      break;
    }
    case "json": {
      const json = generateJSON(sorted);
      blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      extension = "json";
      break;
    }
    case "pdf": {
      const html = generatePDFHTML(sorted);
      blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      extension = "html";
      break;
    }
  }

  const baseName = options.filename.replace(/\.[^.]+$/, "") || "expenses";
  const filename = `${baseName}.${extension}`;

  return {
    blob,
    filename,
    recordCount: sorted.length,
    totalAmount: sorted.reduce((sum, e) => sum + e.amount, 0),
  };
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildDefaultFilename(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `expenses-${yyyy}-${mm}-${dd}`;
}
