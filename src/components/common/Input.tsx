import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftElement, rightElement, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-zinc-400 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-zinc-400">
              {leftElement}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full min-h-[52px] bg-zinc-900 border border-zinc-800 rounded-2xl px-4 text-base text-zinc-100 placeholder-zinc-500 transition-colors',
              'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
              'disabled:opacity-50 disabled:bg-zinc-950',
              leftElement ? 'pl-11' : '',
              rightElement ? 'pr-11' : '',
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : '',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 flex items-center text-zinc-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && <span className="text-xs font-medium text-rose-400">{error}</span>}
        {!error && helperText && <span className="text-xs text-zinc-500">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
