"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AmbientBackground } from "@/components/AmbientBackground";

const Logo3D = dynamic(() => import("@/components/Logo3D"), { ssr: false });

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-[#050f0c] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/30 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <main className="flex h-screen w-full bg-slate-950">
      <section className="relative hidden h-full w-1/2 overflow-hidden bg-slate-950 bg-[radial-gradient(circle_at_45%_50%,_rgba(3,46,34,0.65)_0%,_rgba(2,21,17,0.3)_50%,_rgba(2,6,5,0.95)_100%)] lg:flex">
        <div className="relative h-full w-full">
          <Logo3D />
        </div>

        <blockquote className="absolute inset-x-0 bottom-0 z-10 max-w-lg bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-12 pt-20 pb-12">
          <p className="text-lg leading-relaxed font-medium text-white">
            “O controle financeiro inteligente para a sua vida.”
          </p>
          <footer className="mt-3 text-sm text-slate-400">— Projekt Fin</footer>
        </blockquote>
      </section>

      <section className="relative h-full w-full overflow-hidden bg-[#000503] lg:w-1/2">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]">
          <AmbientBackground contained />
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_8%,#000000_72%)] opacity-90" />

        <div className="relative z-10 flex h-full w-full justify-center overflow-y-auto px-6">
        <div className="relative z-10 my-auto w-full max-w-md py-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bem-vindo ao Projekt Fin
          </h1>
          <p className="mt-2 text-slate-400">
            Construa o seu futuro financeiro sem esforço.
          </p>

          <form className="mt-10 space-y-5" onSubmit={handleLogin}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className={fieldClassName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Senha</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className={fieldClassName}
              />
            </label>

            <div className="flex items-center justify-between gap-4">
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="relative inline-flex">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="block h-5 w-9 rounded-full bg-slate-700 transition duration-200 peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50" />
                  <span className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition duration-200 peer-checked:translate-x-4" />
                </span>
                <span className="text-sm text-slate-300">Lembrar-me</span>
              </label>

              <a
                href="#esqueci-senha"
                className="text-sm text-emerald-400 transition hover:text-emerald-300"
              >
                Esqueci minha senha?
              </a>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 transition duration-200 hover:shadow-emerald-500/40 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Entrar
            </button>
          </form>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs tracking-[0.18em] text-slate-500">OU</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <p className="mt-8 text-center text-sm text-slate-400">
            Não tem uma conta?{" "}
            <a
              href="#cadastro"
              className="font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              Cadastre-se
            </a>
          </p>
        </div>
        </div>
      </section>
    </main>
  );
}
