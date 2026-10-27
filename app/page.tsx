"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ID } from "appwrite";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Checkbox } from "@/components/ui/checkbox";
import { account } from "@/lib/appwrite/client";
import {
  clearAppSessionArtifacts,
  getValidAccount,
  markAppSession,
} from "@/lib/appwrite/session";
import {
  loginFormSchema,
  registerFormSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from "@/lib/validation/auth";

const Logo3D = dynamic(() => import("@/components/Logo3D"), { ssr: false });

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-[#050f0c] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/30 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40";

const fieldErrorClassName =
  "w-full rounded-lg border border-red-500/60 bg-[#050f0c] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/30 focus:border-red-400 focus:ring-2 focus:ring-red-500/30";

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

type AuthFormValues = LoginFormValues &
  Partial<Pick<RegisterFormValues, "name" | "terms">>;

type AuthFormProps = {
  isSignUp: boolean;
  loading: boolean;
  error: string;
  onToggleMode: () => void;
  onSubmit: (values: AuthFormValues) => Promise<void>;
};

function AuthForm({ isSignUp, loading, error, onToggleMode, onSubmit }: AuthFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(isSignUp ? registerFormSchema : loginFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      remember: false,
      terms: false,
    },
  });

  const termsAccepted = watch("terms") === true;
  const submitDisabled = loading || (isSignUp && !termsAccepted);

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {isSignUp && (
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Name</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={errors.name ? true : undefined}
              className={errors.name ? fieldErrorClassName : fieldClassName}
              {...register("name")}
            />
            {errors.name ? (
              <span className="block text-sm text-red-400" role="alert">
                {errors.name.message}
              </span>
            ) : null}
          </label>
        )}

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            className={errors.email ? fieldErrorClassName : fieldClassName}
            {...register("email")}
          />
          {errors.email ? (
            <span className="block text-sm text-red-400" role="alert">
              {errors.email.message}
            </span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="••••••••"
            aria-invalid={errors.password ? true : undefined}
            className={errors.password ? fieldErrorClassName : fieldClassName}
            {...register("password")}
          />
          {errors.password ? (
            <span className="block text-sm text-red-400" role="alert">
              {errors.password.message}
            </span>
          ) : null}
        </label>

        {!isSignUp && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center space-x-2">
              <Checkbox id="remember" {...register("remember")} />
              <label htmlFor="remember" className="cursor-pointer text-sm text-gray-400">
                Remember me
              </label>
            </div>
            <a
              href="#esqueci-senha"
              className="shrink-0 text-sm text-[#10B981] transition hover:underline"
            >
              Forgot password?
            </a>
          </div>
        )}

        {isSignUp && (
          <div className="my-4 space-y-2">
            <div className="flex w-full items-start space-x-2">
              <Checkbox
                id="terms"
                aria-invalid={errors.terms ? true : undefined}
                {...register("terms")}
              />
              <label
                htmlFor="terms"
                className="min-w-0 flex-1 cursor-pointer text-sm leading-snug text-gray-400"
              >
                Eu concordo com os{" "}
                <a
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#10B981] hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  Termos e Condições
                </a>{" "}
                e as políticas de privacidade do Projekt Fin.
              </label>
            </div>
            {errors.terms ? (
              <span className="block text-sm text-red-400" role="alert">
                {errors.terms.message}
              </span>
            ) : null}
          </div>
        )}

        {error ? <p className="mb-4 text-center text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 transition duration-200 hover:shadow-emerald-500/40 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Processing..." : isSignUp ? "Sign up" : "Sign in"}
        </button>
      </form>

      <div className="my-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs tracking-[0.18em] text-slate-500">OR</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-slate-400">
        {isSignUp ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={onToggleMode}
          className="cursor-pointer font-medium text-emerald-400 transition hover:text-emerald-300"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </p>
    </>
  );
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const user = await getValidAccount();
      if (!active) return;

      if (user) {
        await markAppSession();
        router.replace("/dashboard");
        return;
      }

      clearAppSessionArtifacts();
      setCheckingSession(false);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function onValidSubmit(values: AuthFormValues) {
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Defesa em profundidade: Zod já exige terms===true, mas o Appwrite
        // não valida termos — bloquear aqui antes de createAccount.
        const termsGate = registerFormSchema.safeParse({
          name: values.name ?? "",
          email: values.email,
          password: values.password,
          terms: values.terms === true,
        });
        if (!termsGate.success) {
          const termsIssue = termsGate.error.issues.find(
            (issue) => issue.path[0] === "terms",
          );
          setError(
            termsIssue?.message ??
              "Você precisa concordar com os Termos e Condições.",
          );
          return;
        }

        await account.create(
          ID.unique(),
          values.email,
          values.password,
          values.name?.trim() ?? "",
        );
        await account.createEmailPasswordSession(values.email, values.password);
      } else {
        await account.createEmailPasswordSession(values.email, values.password);
      }

      const user = await getValidAccount();
      if (!user) {
        clearAppSessionArtifacts();
        setError("Não foi possível validar a sessão. Tente novamente.");
        return;
      }

      await markAppSession();
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";

      if (message.toLowerCase().includes("session is active")) {
        const existing = await getValidAccount();
        if (existing) {
          await markAppSession();
          router.replace("/dashboard");
          return;
        }
        clearAppSessionArtifacts();
        setError("Sessão inválida no browser. Tente entrar novamente.");
      } else {
        setError(message || "Invalid credentials. Please check the email and password.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <span
            className="size-10 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-400">A verificar sessão...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full bg-slate-950">
      {/* Painel 3D + citação: só desktop */}
      <section className="relative hidden h-auto min-h-dvh w-1/2 overflow-hidden bg-slate-950 bg-[radial-gradient(circle_at_45%_50%,_rgba(3,46,34,0.65)_0%,_rgba(2,21,17,0.3)_50%,_rgba(2,6,5,0.95)_100%)] lg:flex">
        <div className="relative h-full w-full">
          <Logo3D />
        </div>

        <blockquote className="absolute inset-x-0 bottom-0 z-10 max-w-lg bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-12 pt-20 pb-12">
          <p className="text-lg leading-relaxed font-medium text-white">
            “Smart expense tracking for your everyday life.”
          </p>
          <footer className="mt-3 text-sm text-slate-400">— Projekt Fin</footer>
        </blockquote>
      </section>

      {/* Formulário: full-width no mobile, metade no desktop */}
      <section className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#000503] p-4 sm:p-8 lg:w-1/2">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]">
          <AmbientBackground contained />
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_8%,#000000_72%)] opacity-90" />

        <div className="relative z-10 w-full max-w-md py-6 sm:py-10">
          <div className="mb-8 flex w-full justify-center sm:mb-10">
            <Image
              src="/Logotipo Projekt Fin em fundo transparente.png"
              alt="Logotipo Projekt Fin"
              width={220}
              height={110}
              priority
              className="h-auto w-[160px] object-contain sm:w-[200px] lg:w-[220px]"
            />
          </div>
          <div className="mb-8 flex w-full flex-col items-center text-center sm:mb-10">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {isSignUp ? "Create an account" : "Welcome to Projekt Fin"}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              {isSignUp
                ? "Start managing your finances today."
                : "Track your expenses and take control of your money."}
            </p>
          </div>

          <AuthForm
            key={isSignUp ? "register" : "login"}
            isSignUp={isSignUp}
            loading={loading}
            error={error}
            onSubmit={onValidSubmit}
            onToggleMode={() => {
              setIsSignUp((current) => !current);
              setError("");
            }}
          />
        </div>
      </section>
    </main>
  );
}
