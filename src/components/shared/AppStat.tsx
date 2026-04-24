import React from 'react';
import { cn } from '@/lib/utils';

export const appStatShellClass =
  'rounded-[22px] border border-slate-200/80 bg-white/82 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-slate-800 dark:bg-slate-950/76 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

export const appStatLabelClass =
  'text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400';

export const appStatValueClass =
  'mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50';

interface AppStatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export const AppStat: React.FC<AppStatProps> = ({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}) => {
  return (
    <div
      className={cn(
        appStatShellClass,
        className
      )}
    >
      <div
        className={cn(
          appStatLabelClass,
          labelClassName
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          appStatValueClass,
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  );
};
