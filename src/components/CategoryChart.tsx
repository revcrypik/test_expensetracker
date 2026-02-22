"use client";

import { useExpenses } from "@/lib/context";
import {
  getCategoryTotals,
  formatCurrency,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/utils";

export default function CategoryChart() {
  const { expenses, isLoaded } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-40 mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const categoryTotals = getCategoryTotals(expenses);

  if (categoryTotals.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Spending by Category
        </h3>
        <p className="text-slate-500 text-sm text-center py-8">
          No expenses recorded yet. Add your first expense to see category
          breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">
        Spending by Category
      </h3>

      {/* Donut visual */}
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {(() => {
              let offset = 0;
              return categoryTotals.map((cat) => {
                const dash = cat.percentage;
                const gap = 100 - dash;
                const currentOffset = offset;
                offset += dash;
                return (
                  <circle
                    key={cat.category}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke={CATEGORY_COLORS[cat.category]}
                    strokeWidth="3.5"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-currentOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(
                categoryTotals.reduce((sum, c) => sum + c.total, 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {categoryTotals.map((cat) => (
          <div key={cat.category} className="flex items-center gap-3">
            <span className="text-lg">{CATEGORY_ICONS[cat.category]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">
                  {cat.category}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(cat.total)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: CATEGORY_COLORS[cat.category],
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-slate-500 w-12 text-right">
              {cat.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
