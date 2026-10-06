import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AppHeader } from "@/components/app-header";
import { Sidebar } from "@/components/sidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
          <div className="flex h-full bg-transparent text-zinc-100">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
