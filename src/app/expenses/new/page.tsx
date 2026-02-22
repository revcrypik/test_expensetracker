"use client";

import ExpenseForm from "@/components/ExpenseForm";

export default function NewExpensePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Expense</h1>
        <p className="text-slate-500 mt-1">Record a new expense</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <ExpenseForm />
      </div>
    </div>
  );
}
