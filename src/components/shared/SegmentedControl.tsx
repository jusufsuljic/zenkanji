import React from 'react';
import { cn } from '@/lib/utils';

export const segmentedControlShellClass =
  'inline-flex gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 p-1 dark:border-slate-800 dark:bg-slate-900/80';

export const segmentedControlOptionBaseClass =
  'cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors active:translate-y-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

export const segmentedControlOptionActiveClass =
  'bg-white text-slate-950 shadow-sm dark:bg-slate-100 dark:text-slate-950';

export const segmentedControlOptionInactiveClass =
  'text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        segmentedControlShellClass,
        fullWidth && 'grid w-full',
        fullWidth && options.length === 2 && 'grid-cols-2',
        fullWidth && options.length === 3 && 'grid-cols-3',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              segmentedControlOptionBaseClass,
              fullWidth && 'w-full',
              isActive
                ? segmentedControlOptionActiveClass
                : segmentedControlOptionInactiveClass
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
