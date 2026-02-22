"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ExpenseForm from "@/components/ExpenseForm";
import { useExpenses } from "@/lib/context";
import Link from "next/link";

function EditExpenseContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { getExpense, isLoaded } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
          <div className="space-y-4">
            <div className="h-10 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-slate-500 mb-4">No expense ID provided</p>
        <Link
          href="/expenses"
          className="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Back to expenses
        </Link>
      </div>
    );
  }

  const expense = getExpense(id);

  if (!expense) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-slate-500 mb-4">Expense not found</p>
        <Link
          href="/expenses"
          className="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Back to expenses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Expense</h1>
        <p className="text-slate-500 mt-1">Update expense details</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <ExpenseForm expense={expense} />
      </div>
    </div>
  );
}

export default function EditExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
            <div className="space-y-4">
              <div className="h-10 bg-slate-200 rounded" />
              <div className="h-10 bg-slate-200 rounded" />
              <div className="h-10 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      }
    >
      <EditExpenseContent />
    </Suspense>
  );
}
