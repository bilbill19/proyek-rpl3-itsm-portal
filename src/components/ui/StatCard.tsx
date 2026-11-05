import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose';
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'indigo',
  className,
}: StatCardProps) {
  const variantStyles = {
    indigo: {
      border: 'hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      valueColor: 'text-slate-900 dark:text-white',
    },
    emerald: {
      border: 'hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      border: 'hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
    },
    purple: {
      border: 'hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-600 dark:text-purple-300',
    },
    rose: {
      border: 'hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
    },
  };

  const style = variantStyles[variant] || variantStyles.indigo;

  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 transition-all duration-200 shadow-sm dark:shadow-lg flex items-center justify-between gap-4',
        style.border,
        className
      )}
    >
      <div className="space-y-1 overflow-hidden">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {title}
        </p>
        <p className={cn('text-2xl sm:text-3xl font-black tracking-tight', style.valueColor)}>
          {value}
        </p>
        {description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{description}</p>
        )}
      </div>

      <div
        className={cn(
          'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner',
          style.iconBg
        )}
      >
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
    </div>
  );
}
