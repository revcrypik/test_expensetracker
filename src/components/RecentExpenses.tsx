"use client";

import Link from "next/link";
import { useExpenses } from "@/lib/context";
import { formatCurrency, formatDate, CATEGORY_ICONS } from "@/lib/utils";

export default function RecentExpenses() {
  const { expenses, isLoaded } = useExpenses();
  const recent = expenses.slice(0, 5);

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Recent Expenses
        </h3>
        {expenses.length > 5 && (
          <Link
            href="/expenses"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all
          </Link>
        )}
      </div>
      {recent.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm mb-3">No expenses yet</p>
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add your first expense
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recent.map((expense) => (
            <Link
              key={expense.id}
              href={`/expenses/edit?id=${expense.id}`}
              className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <span className="text-xl w-8 text-center">
                {CATEGORY_ICONS[expense.category]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {expense.description}
                </p>
                <p className="text-xs text-slate-500">
                  {expense.category} &middot; {formatDate(expense.date)}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {formatCurrency(expense.amount)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
