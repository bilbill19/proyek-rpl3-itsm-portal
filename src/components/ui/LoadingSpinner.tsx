import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  text,
  className,
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-indigo-400', sizeClasses[size])} />
      {text && <p className="text-xs sm:text-sm text-slate-400 font-medium">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8 w-full">
        {content}
      </div>
    );
  }

  return content;
}
