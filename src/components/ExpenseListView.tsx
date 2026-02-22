"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useExpenses } from "@/lib/context";
import { Category, CATEGORIES, ExpenseFilters } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  downloadCSV,
  CATEGORY_ICONS,
} from "@/lib/utils";

export default function ExpenseListView() {
  const { expenses, isLoaded, deleteExpense } = useExpenses();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: "",
    category: "All",
    dateFrom: "",
    dateTo: "",
  });

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      if (
        filters.search &&
        !exp.description.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.category !== "All" && exp.category !== filters.category) {
        return false;
      }
      if (filters.dateFrom && exp.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && exp.date > filters.dateTo) {
        return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const totalFiltered = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered]
  );

  function handleDelete(id: string) {
    deleteExpense(id);
    setDeleteId(null);
  }

  function clearFilters() {
    setFilters({ search: "", category: "All", dateFrom: "", dateTo: "" });
  }

  const hasFilters =
    filters.search ||
    filters.category !== "All" ||
    filters.dateFrom ||
    filters.dateTo;

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse h-20"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Category filter */}
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                category: e.target.value as Category | "All",
              }))
            }
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="text-xs text-slate-500 whitespace-nowrap">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="text-xs text-slate-500 whitespace-nowrap">To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {filtered.length} expense{filtered.length !== 1 ? "s" : ""}
          {hasFilters ? " (filtered)" : ""} &middot;{" "}
          <span className="font-semibold">{formatCurrency(totalFiltered)}</span>
        </p>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <button
              onClick={() => downloadCSV(filtered)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
              Export CSV
            </button>
          )}
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
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
            Add
          </Link>
        </div>
      </div>

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          {hasFilters ? (
            <>
              <p className="text-slate-500 mb-2">
                No expenses match your filters
              </p>
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-500 mb-2">No expenses yet</p>
              <Link
                href="/expenses/new"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Add your first expense
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl w-10 text-center">
                  {CATEGORY_ICONS[expense.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {expense.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    {expense.category} &middot; {formatDate(expense.date)}
                  </p>
                </div>
                <span className="text-lg font-bold text-slate-900 tabular-nums mr-2">
                  {formatCurrency(expense.amount)}
                </span>
                <div className="flex gap-1">
                  <Link
                    href={`/expenses/edit?id=${expense.id}`}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit"
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
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </Link>
                  {deleteId === expense.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(expense.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
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
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
