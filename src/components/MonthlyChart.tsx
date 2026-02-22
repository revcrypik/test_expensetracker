"use client";

import { useExpenses } from "@/lib/context";
import { getMonthlyTotals, formatCurrency } from "@/lib/utils";

export default function MonthlyChart() {
  const { expenses, isLoaded } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-40 mb-6" />
        <div className="h-48 bg-slate-200 rounded" />
      </div>
    );
  }

  const monthlyTotals = getMonthlyTotals(expenses);

  if (monthlyTotals.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Monthly Spending Trend
        </h3>
        <p className="text-slate-500 text-sm text-center py-8">
          No expenses recorded yet. Add expenses to see monthly trends.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...monthlyTotals.map((m) => m.total));

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">
        Monthly Spending Trend
      </h3>
      <div className="flex items-end gap-3 h-48">
        {monthlyTotals.map((month) => {
          const heightPercent =
            maxTotal > 0 ? (month.total / maxTotal) * 100 : 0;
          return (
            <div
              key={month.month}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <span className="text-xs font-medium text-slate-700 tabular-nums">
                {formatCurrency(month.total)}
              </span>
              <div className="w-full relative" style={{ height: "160px" }}>
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 hover:from-emerald-500 hover:to-emerald-300"
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
