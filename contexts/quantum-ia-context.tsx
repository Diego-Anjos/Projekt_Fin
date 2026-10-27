"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FinancialContextPayload } from "@/lib/chat/financial-context";

/**
 * Snapshot live das páginas (Market Hub, Compras, …) para a Quantum.IA.
 * Cada ecrã publica o que o utilizador está a ver; o chat funde e envia no POST.
 */
export type QuantumScreenContext = Partial<FinancialContextPayload>;

type QuantumIaContextValue = {
  screenContext: QuantumScreenContext | null;
  setScreenContext: (next: QuantumScreenContext | null) => void;
};

const QuantumIaContext = createContext<QuantumIaContextValue | null>(null);

/** Noop estável para fallback fora do provider (evita re-disparar useEffects). */
const noopSetScreenContext: QuantumIaContextValue["setScreenContext"] = () => {};

function sameScreenContext(
  left: QuantumScreenContext | null,
  right: QuantumScreenContext | null,
) {
  if (left === right) return true;
  if (left === null || right === null) return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function QuantumIaProvider({ children }: { children: ReactNode }) {
  const [screenContext, setScreenContextState] =
    useState<QuantumScreenContext | null>(null);

  const setScreenContext = useCallback((next: QuantumScreenContext | null) => {
    // Evita re-renders (e loops) quando o ecrã republica o mesmo snapshot.
    setScreenContextState((prev) =>
      sameScreenContext(prev, next) ? prev : next,
    );
  }, []);

  const value = useMemo(
    () => ({ screenContext, setScreenContext }),
    [screenContext, setScreenContext],
  );

  return (
    <QuantumIaContext.Provider value={value}>{children}</QuantumIaContext.Provider>
  );
}

export function useQuantumIaScreenContext(): QuantumIaContextValue {
  const context = useContext(QuantumIaContext);
  if (!context) {
    return {
      screenContext: null,
      setScreenContext: noopSetScreenContext,
    };
  }
  return context;
}
