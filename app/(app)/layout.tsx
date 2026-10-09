import { AppHeader } from "@/components/app-header";
import { RequireSession } from "@/components/require-session";
import { Sidebar } from "@/components/sidebar";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireSession>
      <div className="flex h-full bg-transparent text-zinc-100">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </RequireSession>
  );
}
