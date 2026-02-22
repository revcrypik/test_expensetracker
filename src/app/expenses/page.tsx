"use client";

import ExpenseListView from "@/components/ExpenseListView";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <p className="text-slate-500 mt-1">
          Manage and review all your expenses
        </p>
      </div>

      <ExpenseListView />
    </div>
  );
}
