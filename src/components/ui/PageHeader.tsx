import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  badgeText?: string;
  badgeIcon?: LucideIcon;
  title: string;
  titleIcon?: LucideIcon;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  badgeText,
  badgeIcon: BadgeIcon = Sparkles,
  title,
  titleIcon: TitleIcon,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80',
        className
      )}
    >
      <div className="space-y-1">
        {badgeText && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-1">
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          {TitleIcon && <TitleIcon className="w-7 h-7 text-indigo-400 shrink-0" />}
          <span>{title}</span>
        </h1>

        {description && (
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
