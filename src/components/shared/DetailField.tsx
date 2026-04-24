import React from 'react';
import { cn } from '@/lib/utils';

interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  hint,
  className,
  valueClassName,
}) => {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70',
        className
      )}
    >
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          'mt-3 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100 sm:text-xl',
          valueClassName
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
};
