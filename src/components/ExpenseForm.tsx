"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Category, CATEGORIES, Expense } from "@/lib/types";
import { useExpenses } from "@/lib/context";
import { formatDateInput, CATEGORY_ICONS } from "@/lib/utils";

interface ExpenseFormProps {
  expense?: Expense;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
  category?: string;
}

export default function ExpenseForm({ expense }: ExpenseFormProps) {
  const router = useRouter();
  const { addExpense, updateExpense } = useExpenses();
  const isEditing = !!expense;

  const [amount, setAmount] = useState(expense?.amount.toString() || "");
  const [category, setCategory] = useState<Category>(
    expense?.category || "Food"
  );
  const [description, setDescription] = useState(expense?.description || "");
  const [date, setDate] = useState(
    expense?.date || formatDateInput(new Date())
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errs.amount = "Please enter a valid amount greater than 0";
    }
    if (numAmount > 999999.99) {
      errs.amount = "Amount cannot exceed $999,999.99";
    }
    if (!description.trim()) {
      errs.description = "Description is required";
    }
    if (description.trim().length > 200) {
      errs.description = "Description must be 200 characters or less";
    }
    if (!date) {
      errs.date = "Date is required";
    }
    if (!CATEGORIES.includes(category)) {
      errs.category = "Please select a valid category";
    }

    return errs;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const data = {
      amount: Math.round(parseFloat(amount) * 100) / 100,
      category,
      description: description.trim(),
      date,
    };

    if (isEditing && expense) {
      updateExpense(expense.id, data);
    } else {
      addExpense(data);
    }

    router.push("/expenses");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            $
          </span>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            max="999999.99"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            className={`w-full pl-8 pr-4 py-3 border rounded-xl text-lg font-medium focus:outline-none focus:ring-2 transition-colors ${
              errors.amount
                ? "border-red-300 focus:ring-red-500"
                : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
            }`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1.5 text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                category === cat
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
              <span className="text-xs">{cat}</span>
            </button>
          ))}
        </div>
        {errors.category && (
          <p className="mt-1.5 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Description
        </label>
        <input
          id="description"
          type="text"
          placeholder="What was this expense for?"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description)
              setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          maxLength={200}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
            errors.description
              ? "border-red-300 focus:ring-red-500"
              : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
          }`}
        />
        <div className="flex justify-between mt-1.5">
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-400">
            {description.length}/200
          </span>
        </div>
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
          }}
          max={formatDateInput(new Date())}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
            errors.date
              ? "border-red-300 focus:ring-red-500"
              : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
          }`}
        />
        {errors.date && (
          <p className="mt-1.5 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Expense"
              : "Add Expense"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
