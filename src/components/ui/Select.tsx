import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
  wrapperClassName?: string;
  error?: boolean | string;
  icon?: React.ReactNode;
  ref?: React.Ref<HTMLSelectElement>;
}

export default function Select({
  className,
  containerClassName,
  wrapperClassName,
  children,
  error,
  disabled,
  icon,
  ref,
  ...props
}: SelectProps) {
  const containerCls = containerClassName ?? wrapperClassName;

  return (
    <div className={twMerge('relative w-full', containerCls)}>
      <select
        ref={ref}
        disabled={disabled}
        className={twMerge(
          'appearance-none w-full rounded-xl ps-4 pe-10 py-2.5 text-sm outline-none transition cursor-pointer',
          'bg-white/80 border border-soil-900/15 text-soil-900',
          'focus:ring-2 focus:ring-flora-500/20 focus:border-flora-500',
          'dark:bg-flora-900 dark:border-dust-50/20 dark:text-dust-50',
          'dark:focus:border-flora-300 dark:focus:ring-flora-300/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&>option]:bg-white [&>option]:text-soil-900 dark:[&>option]:bg-flora-950 dark:[&>option]:text-dust-50',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400' : '',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-soil-700/60 dark:text-dust-300/70"
      >
        {icon || (
          <svg
            className="size-4 shrink-0 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </div>
    </div>
  );
}

