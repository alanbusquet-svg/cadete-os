import React, { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'zinc' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'zinc',
  size = 'md',
  className
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    blue: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    zinc: 'bg-zinc-800 text-zinc-300 border-zinc-700'
  };

  const sizeStyles = {
    sm: 'text-[11px] font-semibold px-2 py-0.5 rounded-lg border',
    md: 'text-xs font-semibold px-2.5 py-1 rounded-xl border'
  };

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium tracking-tight select-none', sizeStyles[size], variantStyles[variant], className)}>
      {children}
    </span>
  );
};
