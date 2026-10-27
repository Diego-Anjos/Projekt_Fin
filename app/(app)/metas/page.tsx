"use client";

import { GoalCard } from "@/components/goal-card";
import { Pagination } from "@/components/ui/pagination";
import { GoalModal, type FinancialGoal, type GoalCategory } from "@/components/goal-modal";
import { useSession } from "@/components/require-session";
import { useQuantumIaScreenContext } from "@/contexts/quantum-ia-context";
import {
  deleteGoal,
  getAllGoals,
  getGoalImageUrl,
  getGoals,
  type GoalDocument,
} from "@/lib/appwrite/goals";
import type { FinancialContextPayload } from "@/lib/chat/financial-context";
import { generateGoalsContext } from "@/lib/chat/generate-goals-context";
import { useTranslation } from "@/hooks/use-translation";
import { Plus, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const itemsPerPage = 6;

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
    description: document.description?.trim() ? document.description : undefined,
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
  const { t } = useTranslation();
  const { setScreenContext } = useQuantumIaScreenContext();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  /** Lista completa (sem paginação) para o resumo da Quantum.IA. */
  const [allGoalsForIa, setAllGoalsForIa] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<FinancialGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Nota: ativas e alcançadas são separadas dentro da página atual (6 itens).
  const activeGoals = goals.filter((goal) => !goal.isCompleted);
  const completedGoals = goals.filter((goal) => goal.isCompleted);

  const refetchGoals = useCallback(async () => {
    try {
      const response = await getGoals(
        user.$id,
        itemsPerPage,
        (currentPage - 1) * itemsPerPage,
      );
      setTotalItems(response.total);

      const lastPage = Math.max(1, Math.ceil(response.total / itemsPerPage));
      if (response.total > 0 && currentPage > lastPage) {
        setCurrentPage(lastPage);
        return;
      }

      setGoals(response.documents.map(toFinancialGoal));
    } catch (error) {
      console.error("Falha ao carregar metas.", error);
      toast.error(t("goals.loadError"));
    }
  }, [user.$id, currentPage, t]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await getGoals(
          user.$id,
          itemsPerPage,
          (currentPage - 1) * itemsPerPage,
        );
        if (!active) return;
        setTotalItems(response.total);

        const lastPage = Math.max(1, Math.ceil(response.total / itemsPerPage));
        if (response.total > 0 && currentPage > lastPage) {
          setCurrentPage(lastPage);
          return;
        }

        setGoals(response.documents.map(toFinancialGoal));
      } catch (error) {
        console.error("Falha ao carregar metas.", error);
        if (active) {
          setGoals([]);
          setTotalItems(0);
          toast.error(t("goals.loadError"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [user.$id, currentPage, refreshKey, t]);

  // Snapshot completo (sem paginação) para a Quantum.IA.
  useEffect(() => {
    let active = true;

    async function loadAllForIa() {
      try {
        const documents = await getAllGoals(user.$id);
        if (!active) return;
        setAllGoalsForIa(documents.map(toFinancialGoal));
      } catch (error) {
        console.warn("[metas] falha ao carregar lista para a Quantum.IA:", error);
      }
    }

    void loadAllForIa();

    return () => {
      active = false;
    };
  }, [user.$id, refreshKey]);

  const iaContextData = useMemo(
    (): Partial<FinancialContextPayload> => ({
      metas: generateGoalsContext(allGoalsForIa),
    }),
    [allGoalsForIa],
  );

  useEffect(() => {
    setScreenContext(iaContextData);
    return () => {
      setScreenContext(null);
    };
  }, [iaContextData, setScreenContext]);

  function openCreateModal() {
    setGoalToEdit(null);
    setIsModalOpen(true);
  }

  function openEditModal(goal: FinancialGoal) {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setGoalToEdit(null);
  }

  function handleSave(goal: FinancialGoal) {
    if (goalToEdit) {
      // Edição: substitui no lugar (mantém a ordem).
      setGoals((current) => current.map((item) => (item.id === goal.id ? goal : item)));
      setAllGoalsForIa((current) =>
        current.map((item) => (item.id === goal.id ? goal : item)),
      );
      setRefreshKey((key) => key + 1);
      return;
    }
    // Criação: volta à primeira página, onde a nova meta é listada.
    setAllGoalsForIa((current) => [goal, ...current]);
    if (currentPage !== 1) setCurrentPage(1);
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteGoal(goal: FinancialGoal) {
    if (deletingGoalId) return;

    const confirmed = window.confirm(t("goals.deleteConfirm"));
    if (!confirmed) return;

    setDeletingGoalId(goal.id);
    try {
      await deleteGoal(goal.id, goal.imageId);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      setAllGoalsForIa((current) => current.filter((item) => item.id !== goal.id));
      toast.success(t("goals.deleted"));
      // Refetch para reconciliar a lista com o servidor.
      await refetchGoals();
      setRefreshKey((key) => key + 1);
    } catch (error) {
      console.error("Falha ao excluir meta:", error);
      toast.error(error instanceof Error ? error.message : t("goals.deleteError"));
    } finally {
      setDeletingGoalId(null);
    }
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
              {t("goals.title")}
            </h1>
            <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
              {t("goals.subtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("goals.new")}
        </button>
      </header>

      {loading ? (
        <p className="w-full py-12 text-center text-zinc-400">{t("goals.loading")}</p>
      ) : goals.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-800/50 bg-black/40 px-6 py-16 text-center backdrop-blur-sm">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <Target className="size-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">{t("goals.emptyTitle")}</h2>
          <p className="mt-2 max-w-md text-sm text-zinc-400">{t("goals.emptyText")}</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("goals.createFirst")}
          </button>
        </div>
      ) : (
        <>
          {activeGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 px-6 py-10 text-center text-sm text-zinc-400">
              {t("goals.allCompleted")}
            </div>
          ) : (
            <ul className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {activeGoals.map((goal) => (
                <li key={goal.id} className="h-full">
                  <GoalCard
                    goal={goal}
                    onEdit={openEditModal}
                    onDelete={handleDeleteGoal}
                    isDeleting={deletingGoalId === goal.id}
                  />
                </li>
              ))}
            </ul>
          )}

          {completedGoals.length > 0 ? (
            <section aria-labelledby="completed-goals-heading" className="mb-8">
              <h2
                id="completed-goals-heading"
                className="mb-6 flex items-center gap-2 text-xl font-bold text-white md:mt-4"
              >
                <Trophy className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                {t("goals.completed")}
              </h2>
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {completedGoals.map((goal) => (
                  <li key={goal.id} className="h-full">
                    <GoalCard
                      goal={goal}
                      onEdit={openEditModal}
                      onDelete={handleDeleteGoal}
                      isDeleting={deletingGoalId === goal.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {totalItems > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </>
      )}

      <GoalModal
        open={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        goalToEdit={goalToEdit}
      />
    </div>
  );
}
