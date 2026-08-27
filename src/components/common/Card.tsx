import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'highlight' | 'danger';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-zinc-900 border border-zinc-800',
    elevated: 'bg-zinc-900/90 border border-zinc-700/80 shadow-lg shadow-black/40',
    highlight: 'bg-zinc-900 border-2 border-emerald-500/40 shadow-lg shadow-emerald-950/20',
    danger: 'bg-zinc-900 border-2 border-rose-500/40 shadow-lg shadow-rose-950/20'
  };

  return (
    <div
      className={cn('rounded-3xl p-5 transition-all text-zinc-100', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
