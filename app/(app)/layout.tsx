import { AppHeader } from "@/components/app-header";
import { RequireSession } from "@/components/require-session";
import { Sidebar } from "@/components/sidebar";
import { AiCommandBar } from "@/components/ui/ai-command-bar";

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
          <AiCommandBar />
          <div className="min-h-0 flex-1 overflow-y-auto pb-28">{children}</div>
        </div>
      </div>
    </RequireSession>
  );
}
