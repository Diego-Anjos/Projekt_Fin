"use client";

import { account } from "@/lib/appwrite/client";
import type { Models } from "appwrite";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type SessionContextValue = {
  user: Models.User;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("useSession só pode ser usado dentro de RequireSession.");
  }

  return session;
}

export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Models.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const currentUser = await account.get();
        if (active) {
          setUser(currentUser);
        }
      } catch {
        router.replace("/");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await account.deleteSession("current");
    router.replace("/");
    router.refresh();
  }

  if (loading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <span
            className="size-10 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-400">A verificar sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
