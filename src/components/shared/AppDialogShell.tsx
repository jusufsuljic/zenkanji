import React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AppDialogShellProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  showCloseButton?: boolean;
}

export const AppDialogShell: React.FC<AppDialogShellProps> = ({
  title,
  description,
  icon,
  children,
  footer,
  className,
  bodyClassName,
  headerClassName,
  showCloseButton = true,
}) => {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        'w-[calc(100vw-1rem)] max-w-[32rem] max-h-[calc(100vh-1rem)] gap-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/96 p-0 shadow-[0_36px_120px_rgba(15,23,42,0.16)] dark:border-slate-800/80 dark:bg-slate-950/96',
        className
      )}
    >
      <DialogHeader
        className={cn(
          'border-b border-slate-100 px-5 pb-4 pt-5 dark:border-slate-800 sm:px-6 sm:pb-5 sm:pt-6',
          headerClassName
        )}
      >
        <div className="flex items-start gap-3 pr-10">
          {icon && (
            <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {icon}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className={cn('min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6', bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className="border-t border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          {footer}
        </div>
      )}
    </DialogContent>
  );
};
