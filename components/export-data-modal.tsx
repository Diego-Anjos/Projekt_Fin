"use client";

import { useSession } from "@/components/require-session";
import { countUserData, fetchAllUserData } from "@/lib/appwrite/user-data";
import {
  buildFilteredExportCsv,
  buildFilteredExportJson,
  countFilteredExport,
  downloadBlob,
  exportFilename,
  filterUserDataForExport,
  type ExportDataTypes,
  type ExportFormat,
  type ExportPeriod,
} from "@/lib/export-data";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { Download, Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

type ExportDataModalProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_TYPES: ExportDataTypes = {
  income: true,
  expenses: true,
  goals: true,
  subscriptions: true,
};

const PERIODS: ExportPeriod[] = ["this_month", "last_3_months", "last_year", "all"];

export function ExportDataModal({ open, onClose }: ExportDataModalProps) {
  if (!open) return null;

  return <ExportDataModalForm onClose={onClose} />;
}

function ExportDataModalForm({ onClose }: Omit<ExportDataModalProps, "open">) {
  const { t } = useTranslation();
  const { user } = useSession();
  const [period, setPeriod] = useState<ExportPeriod>("this_month");
  const [types, setTypes] = useState<ExportDataTypes>(DEFAULT_TYPES);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);

  const hasTypeSelected = types.income || types.expenses || types.goals || types.subscriptions;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isExporting) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, isExporting]);

  function toggleType(key: keyof ExportDataTypes) {
    setTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleExportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isExporting || !hasTypeSelected) return;

    setIsExporting(true);
    const toastId = toast.loading(t("settings.preparingExport"));

    try {
      const raw = await fetchAllUserData(user.$id);
      if (countUserData(raw) === 0) {
        toast.info(t("settings.noDataToExport"), { id: toastId });
        return;
      }

      const filtered = filterUserDataForExport(raw, period, types);
      const total = countFilteredExport(filtered);

      if (total === 0) {
        toast.info(t("settings.exportNoMatches"), { id: toastId });
        return;
      }

      const filename = exportFilename(format);

      if (format === "csv") {
        downloadBlob(filename, buildFilteredExportCsv(filtered), "text/csv;charset=utf-8;");
      } else {
        downloadBlob(filename, buildFilteredExportJson(filtered), "application/json;charset=utf-8;");
      }

      toast.success(
        t(total === 1 ? "settings.exportDoneOne" : "settings.exportDoneMany", { count: total }),
        { id: toastId },
      );
      onClose();
    } catch (error) {
      console.error("Falha ao exportar dados:", error);
      toast.error(t("settings.exportError"), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }

  const typeOptions: { key: keyof ExportDataTypes; labelKey: string }[] = [
    { key: "income", labelKey: "settings.exportTypeIncome" },
    { key: "expenses", labelKey: "settings.exportTypeExpenses" },
    { key: "goals", labelKey: "settings.exportTypeGoals" },
    { key: "subscriptions", labelKey: "settings.exportTypeSubscriptions" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-data-title"
        className="relative max-h-[90vh] w-[95vw] max-w-md overflow-y-auto rounded-2xl border border-green-900/30 bg-[#070C09] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="mb-6 pr-10">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-emerald-800/40 bg-emerald-500/10 text-[#10B981]">
            <Download className="size-5" aria-hidden="true" />
          </div>
          <h2 id="export-data-title" className="text-xl font-semibold text-zinc-50">
            {t("settings.exportModalTitle")}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{t("settings.exportModalSubtitle")}</p>
        </div>

        <form onSubmit={handleExportData} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-300">{t("settings.exportPeriod")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {PERIODS.map((option) => {
                const selected = period === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPeriod(option)}
                    disabled={isExporting}
                    className={cn(
                      "h-10 rounded-lg border px-3 text-xs font-semibold transition-colors duration-200 sm:text-sm",
                      selected
                        ? "border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                    )}
                  >
                    {t(`settings.exportPeriod_${option}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-300">{t("settings.exportTypes")}</legend>
            <div className="space-y-2 rounded-xl border border-white/5 bg-black/30 p-3">
              {typeOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={types[option.key]}
                    onChange={() => toggleType(option.key)}
                    disabled={isExporting}
                    className="size-4 rounded border-zinc-600 bg-zinc-900 text-[#10B981] focus:ring-[#10B981]/40"
                  />
                  <span className="text-sm text-zinc-200">{t(option.labelKey)}</span>
                </label>
              ))}
            </div>
            {!hasTypeSelected ? (
              <p className="text-xs text-amber-400/90" role="alert">
                {t("settings.exportSelectType")}
              </p>
            ) : null}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-300">{t("settings.exportFormat")}</legend>
            <div className="flex gap-2">
              {(["csv", "json"] as const).map((option) => {
                const selected = format === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormat(option)}
                    disabled={isExporting}
                    className={cn(
                      "h-10 flex-1 rounded-lg border text-sm font-semibold uppercase tracking-wide transition-colors duration-200",
                      selected
                        ? "border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="h-12 rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:bg-zinc-900 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isExporting || !hasTypeSelected}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#10B981] px-5 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {isExporting ? t("settings.exporting") : t("settings.generateReport")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
