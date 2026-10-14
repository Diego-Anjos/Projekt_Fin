"use client";

import { ptBR } from "date-fns/locale/pt-BR";
import { Calendar } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";

type CustomDatePickerProps = {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  name?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const DatePickerInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DatePickerInput({ className: _className, ...props }, ref) {
    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={ref}
          className="h-12 w-full rounded-lg border border-emerald-500/30 bg-black/40 pr-10 pl-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <Calendar
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-400"
          aria-hidden="true"
        />
      </div>
    );
  },
);

function CalendarPortal({ children }: { children?: ReactNode }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function toCalendarIso(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

export function CustomDatePicker({
  selected,
  onChange,
  name,
  required,
  id,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
}: CustomDatePickerProps) {
  return (
    <div className={className}>
      <DatePicker
        id={id}
        name={name}
        selected={selected}
        onChange={onChange}
        locale={ptBR}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        required={required}
        disabled={disabled}
        customInput={<DatePickerInput />}
        showPopperArrow={false}
        popperContainer={CalendarPortal}
        popperClassName="pf-datepicker-popper"
        calendarClassName="pf-datepicker"
        wrapperClassName="block w-full"
        autoComplete="off"
      />
    </div>
  );
}
