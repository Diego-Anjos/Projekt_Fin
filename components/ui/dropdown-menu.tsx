"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  menuId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within <DropdownMenu>.");
  }
  return context;
}

/**
 * Menu dropdown leve (API próxima do shadcn/ui), alinhado ao tema dark
 * do Projekt Fin — sem dependência Radix, no mesmo espírito do AppSelect.
 */
export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, menuId, triggerRef }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const { open, setOpen, menuId, triggerRef } = useDropdownMenu();

  return (
    <button
      {...props}
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick?.(event);
        setOpen(!open);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className = "",
  align = "end",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  align?: "start" | "end";
}) {
  const { open, setOpen, menuId, triggerRef } = useDropdownMenu();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return (
    <div
      {...props}
      ref={contentRef}
      id={menuId}
      role="menu"
      className={`absolute top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl ${
        align === "end" ? "right-0" : "left-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className = "",
  onSelect,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  onSelect?: () => void;
}) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      {...props}
      type="button"
      role="menuitem"
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200 outline-none transition-colors hover:bg-zinc-800 focus:bg-zinc-800 ${className}`}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick?.(event);
        onSelect?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
