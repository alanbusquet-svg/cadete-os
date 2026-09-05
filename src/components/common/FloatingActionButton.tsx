import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface FloatingActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  ariaLabel: string;
  position?: 'bottom-left' | 'bottom-right';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  ariaLabel,
  position = 'bottom-left',
  className,
  ...props
}) => {
  const positionClasses = {
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4'
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'fixed z-40 md:hidden flex items-center justify-center',
        'min-w-[60px] min-h-[60px] w-[60px] h-[60px] rounded-full',
        'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600',
        'active:scale-95 transition-transform text-zinc-950',
        'shadow-xl shadow-emerald-950/60 border border-emerald-400/40',
        'select-none cursor-pointer focus:outline-none focus:ring-2',
        'focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950',
        positionClasses[position],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
};
