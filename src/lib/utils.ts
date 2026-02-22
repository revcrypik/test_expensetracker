import { Expense, Category, CategoryTotal, MonthlyTotal } from "./types";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<Category, { total: number; count: number }>();

  for (const exp of expenses) {
    const existing = totals.get(exp.category) || { total: 0, count: 0 };
    existing.total += exp.amount;
    existing.count += 1;
    totals.set(exp.category, existing);
  }

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return Array.from(totals.entries())
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getMonthlyTotals(expenses: Expense[]): MonthlyTotal[] {
  const totals = new Map<string, number>();

  for (const exp of expenses) {
    const monthKey = exp.date.slice(0, 7); // "YYYY-MM"
    totals.set(monthKey, (totals.get(monthKey) || 0) + exp.amount);
  }

  return Array.from(totals.entries())
    .map(([month, total]) => ({
      month,
      label: getMonthLabel(month),
      total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Last 6 months
}

export function getTotalSpending(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getCurrentMonthSpending(expenses: Expense[]): number {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getAverageExpense(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  return getTotalSpending(expenses) / expenses.length;
}

export function exportToCSV(expenses: Expense[]): string {
  const headers = ["Date", "Category", "Description", "Amount"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    `"${e.description.replace(/"/g, '""')}"`,
    e.amount.toFixed(2),
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadCSV(expenses: Expense[], filename?: string): void {
  const csv = exportToCSV(expenses);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `expenses-${formatDateInput(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "#f97316",
  Transportation: "#3b82f6",
  Entertainment: "#a855f7",
  Shopping: "#ec4899",
  Bills: "#eab308",
  Other: "#6b7280",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: "🍽️",
  Transportation: "🚗",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Bills: "📄",
  Other: "📌",
};
