import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-text-muted mb-1.5">
      {children}
    </label>
  );
}

const baseFieldClass =
  "w-full h-12 rounded-xl border border-border bg-bg px-3.5 text-[15px] text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseFieldClass, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(baseFieldClass, "h-24 py-2.5 resize-none", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseFieldClass, className)} {...props}>
      {children}
    </select>
  );
}

export function FieldGroup({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({
  className,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        className={cn(
          "h-5 w-5 rounded-md border-2 border-border accent-[var(--color-accent)]",
          className,
        )}
        {...props}
      />
      <span className="text-[15px] text-text">{label}</span>
    </label>
  );
}
