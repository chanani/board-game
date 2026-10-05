import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</section>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' };

const VARIANTS = {
  primary: 'bg-safari-600 text-white hover:bg-safari-700',
  secondary: 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50',
  danger: 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function TextInput({ label, hint, id, ...props }: TextInputProps) {
  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        id={id}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-safari-500 focus:ring-2 focus:ring-safari-100"
        {...props}
      />
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}
