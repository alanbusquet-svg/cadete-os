import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'h-10 px-4 text-sm gap-1.5',
    md: 'min-h-[52px] px-5 text-base gap-2', // Standard 52px touch target
    lg: 'min-h-[58px] px-6 text-lg gap-2.5 font-bold'
  };

  const variantStyles = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/30',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/30',
    outline: 'bg-transparent border-2 border-zinc-700 hover:border-zinc-500 text-zinc-200',
    ghost: 'bg-transparent hover:bg-zinc-800/60 text-zinc-300'
  };

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth ? 'w-full' : '',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
