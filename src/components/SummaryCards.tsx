"use client";

import { useExpenses } from "@/lib/context";
import {
  formatCurrency,
  getTotalSpending,
  getCurrentMonthSpending,
  getAverageExpense,
} from "@/lib/utils";

export default function SummaryCards() {
  const { expenses, isLoaded } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse"
          >
            <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
            <div className="h-8 bg-slate-200 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  const total = getTotalSpending(expenses);
  const monthly = getCurrentMonthSpending(expenses);
  const average = getAverageExpense(expenses);
  const count = expenses.length;

  const cards = [
    {
      label: "Total Spending",
      value: formatCurrency(total),
      icon: "💰",
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "This Month",
      value: formatCurrency(monthly),
      icon: "📅",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Avg. Expense",
      value: formatCurrency(average),
      icon: "📊",
      color: "bg-purple-50 text-purple-700",
    },
    {
      label: "Total Expenses",
      value: count.toString(),
      icon: "🧾",
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">
              {card.label}
            </span>
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.color}`}
            >
              {card.icon}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
