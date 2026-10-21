"use client";

import { GoalCard } from "@/components/goal-card";
import { Pagination } from "@/components/ui/pagination";
import { GoalModal, type FinancialGoal, type GoalCategory } from "@/components/goal-modal";
import { useSession } from "@/components/require-session";
import {
  deleteGoal,
  getGoalImageUrl,
  getGoals,
  type GoalDocument,
} from "@/lib/appwrite/goals";
import { Plus, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

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
  const [goalToEdit, setGoalToEdit] = useState<FinancialGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Nota: ativas e alcançadas são separadas dentro da página atual (10 itens).
  const activeGoals = goals.filter((goal) => !goal.isCompleted);
  const completedGoals = goals.filter((goal) => goal.isCompleted);

  const refetchGoals = useCallback(async () => {
    try {
      const response = await getGoals(
        user.$id,
        ITEMS_PER_PAGE,
        (currentPage - 1) * ITEMS_PER_PAGE,
      );
      setTotalItems(response.total);

      const lastPage = Math.max(1, Math.ceil(response.total / ITEMS_PER_PAGE));
      if (response.total > 0 && currentPage > lastPage) {
        setCurrentPage(lastPage);
        return;
      }

      setGoals(response.documents.map(toFinancialGoal));
    } catch (error) {
      console.error("Falha ao carregar metas.", error);
      toast.error("Falha ao carregar as metas. Tente novamente.");
    }
  }, [user.$id, currentPage]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await getGoals(
          user.$id,
          ITEMS_PER_PAGE,
          (currentPage - 1) * ITEMS_PER_PAGE,
        );
        if (!active) return;
        setTotalItems(response.total);

        const lastPage = Math.max(1, Math.ceil(response.total / ITEMS_PER_PAGE));
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
  }, [user.$id, currentPage, refreshKey]);

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
      setRefreshKey((key) => key + 1);
      return;
    }
    // Criação: volta à primeira página, onde a nova meta é listada.
    if (currentPage !== 1) setCurrentPage(1);
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteGoal(goal: FinancialGoal) {
    if (deletingGoalId) return;

    const confirmed = window.confirm("Tem a certeza que deseja excluir esta meta?");
    if (!confirmed) return;

    setDeletingGoalId(goal.id);
    try {
      await deleteGoal(goal.id, goal.imageId);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      toast.success("Meta excluída com sucesso!");
      // Refetch para reconciliar a lista com o servidor.
      await refetchGoals();
    } catch (error) {
      console.error("Falha ao excluir meta:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Falha ao excluir a meta. Tente novamente.",
      );
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
              itemsPerPage={ITEMS_PER_PAGE}
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
