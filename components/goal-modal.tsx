"use client";

import { useSession } from "@/components/require-session";
import {
  CustomDatePicker,
  parseCalendarDate,
  toCalendarIso,
} from "@/components/ui/custom-date-picker";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import {
  createGoal,
  deleteGoalImage,
  getGoalImageUrl,
  updateGoal,
  uploadGoalImage,
} from "@/lib/appwrite/goals";
import { formatCurrencyInput, getCurrencySymbol, parseCurrencyToNumber } from "@/lib/utils";
import {
  Camera,
  Car,
  Gamepad2,
  GraduationCap,
  Home,
  Plane,
  Shield,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";

export type GoalCategory =
  | "travel"
  | "emergency"
  | "tech"
  | "home"
  | "education"
  | "car"
  | "other";

export type FinancialGoal = {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: GoalCategory;
  imageId?: string;
  imageUrl?: string;
  isCompleted: boolean;
};

const fieldClassName =
  "h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

const textareaClassName =
  "w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm leading-relaxed text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

const CATEGORY_OPTIONS: {
  id: GoalCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "travel", label: "Viagem", icon: Plane },
  { id: "emergency", label: "Emergência", icon: Shield },
  { id: "tech", label: "Tech / Setup", icon: Gamepad2 },
  { id: "home", label: "Casa", icon: Home },
  { id: "education", label: "Educação", icon: GraduationCap },
  { id: "car", label: "Veículo", icon: Car },
  { id: "other", label: "Outro", icon: Target },
];

const CATEGORY_LABEL_KEYS: Record<GoalCategory, string> = {
  travel: "goals.categoryTravel",
  emergency: "goals.categoryEmergency",
  tech: "goals.categoryTech",
  home: "goals.categoryHome",
  education: "goals.categoryEducation",
  car: "goals.categoryCar",
  other: "goals.categoryOther",
};

type GoalModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (goal: FinancialGoal) => void;
  /** Meta a editar; `null`/ausente = modo criação ("Nova Meta"). */
  goalToEdit?: FinancialGoal | null;
};

export function GoalModal({ open, onClose, onSave, goalToEdit }: GoalModalProps) {
  if (!open) return null;

  return (
    <GoalModalForm
      key={goalToEdit?.id ?? "new"}
      onClose={onClose}
      onSave={onSave}
      goalToEdit={goalToEdit ?? null}
    />
  );
}

/** `formatCurrencyInput` espera os dígitos em cêntimos (ex: "123456" -> 1.234,56). */
function amountToInput(value: number, currency: string) {
  return formatCurrencyInput(String(Math.round(value * 100)), currency);
}

function GoalModalForm({
  onClose,
  onSave,
  goalToEdit,
}: Omit<GoalModalProps, "open"> & { goalToEdit: FinancialGoal | null }) {
  const { user } = useSession();
  const { currency } = usePreferences();
  const { t } = useTranslation();
  const isEditing = goalToEdit !== null;
  const [title, setTitle] = useState(goalToEdit?.title ?? "");
  const [description, setDescription] = useState(goalToEdit?.description ?? "");
  const [targetAmount, setTargetAmount] = useState(() =>
    goalToEdit ? amountToInput(goalToEdit.targetAmount, currency) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(() =>
    goalToEdit
      ? amountToInput(goalToEdit.currentAmount, currency)
      : formatCurrencyInput(0, currency),
  );
  const [targetDate, setTargetDate] = useState<Date | null>(() =>
    parseCalendarDate(goalToEdit?.targetDate),
  );
  const [category, setCategory] = useState<GoalCategory>(goalToEdit?.category ?? "travel");
  const [imagePreview, setImagePreview] = useState<string | null>(
    goalToEdit?.imageUrl ?? null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<string | null>(null);

  imagePreviewRef.current = imagePreview;

  useEffect(() => {
    setTargetAmount((current) =>
      current ? formatCurrencyInput(current, currency) : current,
    );
    setCurrentAmount((current) =>
      current ? formatCurrencyInput(current, currency) : current,
    );
  }, [currency]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && document.querySelector(".react-datepicker")) return;
      if (event.key === "Escape" && !isSubmitting) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, isSubmitting]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  function handleCurrencyChange(
    value: string,
    setter: (next: string) => void,
  ) {
    setter(formatCurrencyInput(value, currency));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImagePreview() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Descartar um ficheiro novo ainda não enviado restaura a imagem atual da meta.
    if (imageFile) {
      setImageFile(null);
      setImagePreview(goalToEdit?.imageUrl ?? null);
      return;
    }

    // Sem ficheiro novo, remover significa apagar a imagem existente ao guardar.
    setImagePreview(null);
    setImageRemoved(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedTarget = parseCurrencyToNumber(targetAmount);
    const parsedCurrent = parseCurrencyToNumber(currentAmount);
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError(t("goalModal.titleError"));
      return;
    }

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError(t("goalModal.targetError"));
      return;
    }

    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      setError(t("goalModal.initialNegativeError"));
      return;
    }

    if (parsedCurrent > parsedTarget) {
      setError(t("goalModal.initialExceedsError"));
      return;
    }

    if (!targetDate) {
      setError(t("goalModal.targetDateError"));
      return;
    }

    if (!user?.$id) {
      setError(t("goalModal.sessionMissing"));
      return;
    }

    let uploadedImageId: string | undefined;

    try {
      setIsSubmitting(true);

      if (imageFile) {
        uploadedImageId = await uploadGoalImage(imageFile, user.$id);
      }

      const isCompleted = parsedCurrent >= parsedTarget;
      // undefined = manter a imagem atual; null = remover; string = substituir.
      const nextImageId: string | null | undefined = uploadedImageId
        ? uploadedImageId
        : imageRemoved
          ? null
          : undefined;

      const document =
        isEditing && goalToEdit
          ? await updateGoal(goalToEdit.id, {
              title: trimmedTitle,
              description: description.trim(),
              targetAmount: parsedTarget,
              currentAmount: parsedCurrent,
              targetDate: toCalendarIso(targetDate),
              category,
              isCompleted,
              ...(nextImageId !== undefined ? { imageId: nextImageId } : {}),
            })
          : await createGoal({
              userId: user.$id,
              title: trimmedTitle,
              description: description.trim(),
              targetAmount: parsedTarget,
              currentAmount: parsedCurrent,
              targetDate: toCalendarIso(targetDate),
              category,
              isCompleted,
              ...(uploadedImageId ? { imageId: uploadedImageId } : {}),
            });

      // A atualização correu bem: já é seguro apagar a imagem antiga substituída/removida.
      if (
        goalToEdit?.imageId &&
        nextImageId !== undefined &&
        goalToEdit.imageId !== nextImageId
      ) {
        await deleteGoalImage(goalToEdit.imageId);
      }

      const goal: FinancialGoal = {
        id: document.$id,
        title: document.title,
        description: document.description?.trim() ? document.description : undefined,
        targetAmount: Number(document.targetAmount),
        currentAmount: Number(document.currentAmount),
        targetDate: document.targetDate,
        category: document.category as GoalCategory,
        isCompleted: Boolean(document.isCompleted),
        ...(document.imageId
          ? {
              imageId: document.imageId,
              imageUrl: getGoalImageUrl(document.imageId),
            }
          : {}),
      };

      onSave(goal);
      toast.success(isEditing ? t("goalModal.updated") : t("goalModal.created"));
      onClose();
    } catch (submitError) {
      // Evita deixar órfã no Storage a imagem enviada se o documento falhar a guardar.
      if (uploadedImageId) {
        await deleteGoalImage(uploadedImageId);
      }
      console.error(isEditing ? "Falha ao atualizar meta:" : "Falha ao criar meta:", submitError);
      const message =
        submitError instanceof Error
          ? submitError.message
          : isEditing
            ? t("goalModal.updateError")
            : t("goalModal.createError");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="goal-modal-title" className="pr-10 text-xl font-semibold text-zinc-50">
          {isEditing ? t("goalModal.editTitle") : t("goalModal.newTitle")}
        </h2>
        <p className="mt-1 mb-6 text-sm text-zinc-400">
          {isEditing
            ? t("goalModal.editSubtitle")
            : t("goalModal.newSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-zinc-300">{t("goalModal.name")}</span>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("goalModal.namePlaceholder")}
              required
              className={fieldClassName}
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-zinc-300">
              {t("goalModal.description")} <span className="font-normal text-zinc-500">{t("goalModal.optional")}</span>
            </span>
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("goalModal.descriptionPlaceholder")}
              rows={2}
              maxLength={255}
              className={textareaClassName}
            />
            <span className="self-end text-xs text-zinc-500">{description.length}/255</span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {t("goalModal.targetAmount", { symbol: getCurrencySymbol(currency) })}
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-medium text-emerald-400 select-none">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="text"
                name="targetAmount"
                inputMode="numeric"
                value={targetAmount}
                onChange={(event) =>
                  handleCurrencyChange(event.target.value, setTargetAmount)
                }
                placeholder={currency === "USD" ? "0.00" : "0,00"}
                required
                className={`${fieldClassName} pl-12`}
              />
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {isEditing ? t("goalModal.currentAmount", { symbol: getCurrencySymbol(currency) }) : t("goalModal.initialAmount", { symbol: getCurrencySymbol(currency) })}
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-medium text-emerald-400 select-none">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="text"
                name="currentAmount"
                inputMode="numeric"
                value={currentAmount}
                onChange={(event) =>
                  handleCurrencyChange(event.target.value, setCurrentAmount)
                }
                placeholder={currency === "USD" ? "0.00" : "0,00"}
                className={`${fieldClassName} pl-12`}
              />
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">{t("goalModal.targetDate")}</span>
            <CustomDatePicker
              name="targetDate"
              selected={targetDate}
              onChange={setTargetDate}
              required
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">{t("goalModal.category")}</span>
            <div
              role="radiogroup"
              aria-label={t("goalModal.categoryAria")}
              className="mt-2 flex flex-wrap gap-2 md:gap-3"
            >
              {CATEGORY_OPTIONS.map((option) => {
                const selected = category === option.id;
                const Icon = option.icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={t(CATEGORY_LABEL_KEYS[option.id])}
                    aria-label={t(CATEGORY_LABEL_KEYS[option.id])}
                    onClick={() => setCategory(option.id)}
                    className={`flex size-11 items-center justify-center rounded-xl border transition-colors duration-200 ${
                      selected
                        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-zinc-300">{t("goalModal.photo")}</span>
            {imagePreview ? (
              <div className="relative h-40 w-full overflow-hidden rounded-xl border border-zinc-700/50 sm:h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt={t("goalModal.photoPreviewAlt")}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearImagePreview}
                  aria-label={t("goalModal.removePhoto")}
                  className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-red-500/80"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-4 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-500/5 sm:h-48">
                <Camera className="size-6 text-emerald-400/80" aria-hidden="true" />
                <span className="text-sm text-zinc-400">
                  {t("goalModal.addPhoto")}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          {error ? (
            <p className="col-span-1 text-sm text-red-400 md:col-span-2" role="alert">
              {error}
            </p>
          ) : null}

          <div className="col-span-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-12 rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:bg-zinc-900 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSubmitting
                ? isEditing
                  ? t("goalModal.savingEdit")
                  : t("goalModal.creating")
                : isEditing
                  ? t("subscriptions.saveChanges")
                  : t("goalModal.createGoal")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
