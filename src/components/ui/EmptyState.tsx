import React from 'react';
import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center py-16 px-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto shadow-sm',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 shadow-inner">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>

      {actionText && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="md" className="shadow-md shadow-indigo-600/20">
                {actionText}
              </Button>
            </Link>
          ) : onAction ? (
            <Button size="md" onClick={onAction} className="shadow-md shadow-indigo-600/20">
              {actionText}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
