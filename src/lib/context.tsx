"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Expense, Category } from "./types";
import { loadExpenses, saveExpenses } from "./storage";
import { generateId } from "./utils";

interface ExpenseContextType {
  expenses: Expense[];
  isLoaded: boolean;
  addExpense: (data: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (id: string, data: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;
  getExpense: (id: string) => Expense | undefined;
}

const ExpenseContext = createContext<ExpenseContextType | null>(null);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setExpenses(loadExpenses());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveExpenses(expenses);
    }
  }, [expenses, isLoaded]);

  const addExpense = useCallback(
    (data: Omit<Expense, "id" | "createdAt">) => {
      const expense: Expense = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => [expense, ...prev]);
    },
    []
  );

  const updateExpense = useCallback(
    (id: string, data: Omit<Expense, "id" | "createdAt">) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      );
    },
    []
  );

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getExpense = useCallback(
    (id: string) => {
      return expenses.find((e) => e.id === id);
    },
    [expenses]
  );

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        isLoaded,
        addExpense,
        updateExpense,
        deleteExpense,
        getExpense,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error("useExpenses must be used within an ExpenseProvider");
  }
  return context;
}
