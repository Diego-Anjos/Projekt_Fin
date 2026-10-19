"use client";

import { GoalCard } from "@/components/goal-card";
import { GoalModal, type FinancialGoal, type GoalCategory } from "@/components/goal-modal";
import { useSession } from "@/components/require-session";
import { getGoalImageUrl, getGoals, type GoalDocument } from "@/lib/appwrite/goals";
import { Plus, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const GOAL_CATEGORIES = new Set<GoalCategory>([
  "travel",
  "emergency",
  "tech",
  "home",
  "education",
  "car",
  "other",
]);

function toFinancialGoal(document: GoalDocument): FinancialGoal {
  const category = GOAL_CATEGORIES.has(document.category as GoalCategory)
    ? (document.category as GoalCategory)
    : "other";

  const imageId = document.imageId || undefined;

  return {
    id: document.$id,
    title: document.title,
    targetAmount: Number(document.targetAmount),
    currentAmount: Number(document.currentAmount),
    targetDate: document.targetDate,
    category,
    isCompleted: Boolean(document.isCompleted),
    ...(imageId
      ? {
          imageId,
          imageUrl: getGoalImageUrl(imageId),
        }
      : {}),
  };
}

export default function MetasPage() {
  const { user } = useSession();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeGoals = goals.filter((goal) => !goal.isCompleted);
  const completedGoals = goals.filter((goal) => goal.isCompleted);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await getGoals(user.$id);
        if (!active) return;
        setGoals(response.documents.map(toFinancialGoal));
      } catch (error) {
        console.error("Falha ao carregar metas.", error);
        if (active) {
          setGoals([]);
          toast.error("Falha ao carregar as metas. Tente novamente.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [user.$id]);

  function openCreateModal() {
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleSave(goal: FinancialGoal) {
    setGoals((current) => [goal, ...current.filter((item) => item.id !== goal.id)]);
  }

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
        <div className="flex items-center gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-800/40 bg-emerald-500/10 text-emerald-400">
            <Target className="size-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Minhas Metas
            </h1>
            <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
              Acompanhe os seus objetivos financeiros
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova Meta
        </button>
      </header>

      {loading ? (
        <p className="w-full py-12 text-center text-zinc-400">A carregar metas...</p>
      ) : goals.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-800/50 bg-black/40 px-6 py-16 text-center backdrop-blur-sm">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <Target className="size-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Nenhuma meta definida</h2>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Comece a mapear os seus objetivos — férias, reserva de emergência ou aquele upgrade
            que está na wishlist.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
          >
            <Plus className="size-4" aria-hidden="true" />
            Criar primeira meta
          </button>
        </div>
      ) : (
        <>
          {activeGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 px-6 py-10 text-center text-sm text-zinc-400">
              Todas as metas ativas foram alcançadas. Crie uma nova para continuar.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {activeGoals.map((goal) => (
                <li key={goal.id}>
                  <GoalCard goal={goal} />
                </li>
              ))}
            </ul>
          )}

          {completedGoals.length > 0 ? (
            <section aria-labelledby="completed-goals-heading">
              <h2
                id="completed-goals-heading"
                className="mt-8 mb-6 flex items-center gap-2 text-xl font-bold text-white md:mt-12"
              >
                <Trophy className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                Metas Alcançadas
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                {completedGoals.map((goal) => (
                  <li key={goal.id}>
                    <GoalCard goal={goal} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <GoalModal open={isModalOpen} onClose={closeModal} onSave={handleSave} />
    </div>
  );
}
