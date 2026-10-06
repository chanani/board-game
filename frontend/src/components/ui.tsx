import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type PanelProps = { children: ReactNode; className?: string; as?: 'section' | 'div' };

export function Panel({ children, className = '', as: Tag = 'section' }: PanelProps) {
  return <Tag className={`paper p-5 ${className}`}>{children}</Tag>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' };

const VARIANTS = {
  // 강조색은 방 테마 변수(--accent)를 따르고, 방 밖에서는 :root의 원목(머스터드) 값이다.
  primary: 'bg-(--accent) text-(--accent-text) shadow-[0_4px_0_var(--accent-shadow),0_8px_14px_rgb(0_0_0/0.3)] hover:bg-(--accent-hover)',
  secondary: 'bg-cream-50 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_8px_14px_rgb(0_0_0/0.25)] hover:bg-white',
  danger: 'bg-brick-500 text-cream-50 shadow-[0_4px_0_var(--color-brick-700),0_8px_14px_rgb(0_0_0/0.3)] hover:brightness-110',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`press-3d rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function TextInput({ label, hint, id, ...props }: TextInputProps) {
  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-sm font-semibold text-wood-700">{label}</span>
      <input
        id={id}
        className="w-full rounded-xl border border-cream-300 bg-cream px-3 py-2 shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50"
        {...props}
      />
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}
