import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-zinc-400 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full min-h-[52px] bg-zinc-900 border border-zinc-800 rounded-2xl px-4 pr-10 text-base text-zinc-100 transition-colors appearance-none cursor-pointer',
              'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
              'disabled:opacity-50 disabled:bg-zinc-950',
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : '',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100 py-2">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 pointer-events-none text-zinc-400">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
        {error && <span className="text-xs font-medium text-rose-400">{error}</span>}
        {!error && helperText && <span className="text-xs text-zinc-500">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
