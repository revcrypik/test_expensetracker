"use client";

import SummaryCards from "@/components/SummaryCards";
import CategoryChart from "@/components/CategoryChart";
import MonthlyChart from "@/components/MonthlyChart";
import RecentExpenses from "@/components/RecentExpenses";
import { useExpenses } from "@/lib/context";
import { downloadCSV } from "@/lib/utils";

export default function DashboardPage() {
  const { expenses } = useExpenses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Overview of your spending
          </p>
        </div>
        <button
          onClick={() => downloadCSV(expenses)}
          disabled={expenses.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          Export Data
        </button>
      </div>

      <SummaryCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyChart />
        <CategoryChart />
      </div>

      <RecentExpenses />
    </div>
  );
}
