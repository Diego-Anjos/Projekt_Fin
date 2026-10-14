import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ConfirmDialogProvider } from "@/contexts/confirm-dialog-context";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PreferencesProvider } from "@/contexts/preferences-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Projekt Fin",
  description: "Dashboard financeiro",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="h-full overflow-hidden bg-black text-zinc-100"
        suppressHydrationWarning
      >
        <div className="pointer-events-none fixed top-[-10%] left-[-10%] -z-10 h-[50%] w-[50%] rounded-full bg-emerald-600/20 blur-[150px]" />
        <div className="pointer-events-none fixed right-[-10%] bottom-[-10%] -z-10 h-[60%] w-[60%] rounded-full bg-emerald-900/30 blur-[150px]" />
        <div className="pointer-events-none fixed top-[40%] left-[30%] -z-10 h-[30%] w-[30%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <AmbientBackground />
        <LanguageProvider>
          <PreferencesProvider>
            <ConfirmDialogProvider>
            {children}
            <Toaster
              position="top-center"
              theme="dark"
              richColors={false}
              offset={28}
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    "relative left-0 flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#06140e]/95 p-4 text-zinc-100 shadow-2xl shadow-black/80 ring-1 ring-emerald-500/10 backdrop-blur-xl before:pointer-events-none before:absolute before:-top-8 before:-left-8 before:size-24 before:rounded-full before:bg-emerald-500/20 before:blur-2xl",
                  content: "relative z-10 flex min-w-0 flex-col items-center gap-0.5 text-center",
                  title: "text-sm font-semibold tracking-tight text-zinc-50",
                  description: "text-sm leading-relaxed text-zinc-400",
                  icon: "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 [[data-type=error]_&]:bg-red-500/15 [[data-type=error]_&]:text-red-400 [[data-type=error]_&]:ring-red-500/30 [[data-type=warning]_&]:bg-amber-500/15 [[data-type=warning]_&]:text-amber-300 [[data-type=warning]_&]:ring-amber-500/30",
                  success:
                    "border-emerald-400/40 shadow-[0_24px_60px_-24px_rgba(16,185,129,0.65)]",
                  error: "border-red-500/40 shadow-[0_24px_60px_-24px_rgba(239,68,68,0.45)]",
                  warning: "border-amber-500/40",
                },
              }}
              style={{ "--width": "28rem" }}
            />
            </ConfirmDialogProvider>
          </PreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
