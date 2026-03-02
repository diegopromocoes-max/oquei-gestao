import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function focusInput() {
  return "focus:ring-2 focus:ring-tremor-brand-muted focus:border-tremor-brand-default";
}

export function cx(...args) {
  return twMerge(clsx(args));
}
