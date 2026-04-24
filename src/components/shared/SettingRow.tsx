import React from 'react';
import { cn } from '@/lib/utils';

interface SettingRowProps {
  label: string;
  description?: string;
  control: React.ReactNode;
  className?: string;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  control,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        {description && (
          <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</div>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
};
