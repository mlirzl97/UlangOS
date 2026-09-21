import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  description,
  error,
  required,
  htmlFor,
  className = '',
  children,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={htmlFor} className="block text-[12px] font-medium text-[#2d3034]">
            {label} {required && <span className="text-[#b91c1c]">*</span>}
          </label>
        </div>
      )}
      {children}
      {description && !error && <p className="text-[11px] text-[#707276] leading-normal">{description}</p>}
      {error && <p className="text-[11px] font-medium text-[#b91c1c] leading-normal">{error}</p>}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', prefixNode, suffixNode, hasError, disabled, ...props }, ref) => {
    const errorClasses = hasError
      ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-[#b91c1c]'
      : 'border-[#dcdcd6] focus:border-[#194432] focus:ring-[#194432]';

    return (
      <div className={`relative flex items-center w-full rounded-[6px] transition-colors ${disabled ? 'bg-[#f4f4f0] opacity-60 cursor-not-allowed' : 'bg-white'}`}>
        {prefixNode && <div className="pl-3 pr-1 text-[#787a7e] select-none text-xs flex items-center shrink-0">{prefixNode}</div>}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full h-9 px-3 text-xs sm:text-sm text-[#181a1b] placeholder:text-[#9a9ca0] rounded-[6px] border bg-transparent focus:outline-none focus:ring-1 transition-all ${errorClasses} ${
            prefixNode ? 'pl-1.5' : ''
          } ${suffixNode ? 'pr-1.5' : ''} ${className}`}
          {...props}
        />
        {suffixNode && <div className="pr-3 pl-1 text-[#787a7e] select-none text-xs flex items-center shrink-0">{suffixNode}</div>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, hasError, disabled, ...props }, ref) => {
    const errorClasses = hasError
      ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-[#b91c1c]'
      : 'border-[#dcdcd6] focus:border-[#194432] focus:ring-[#194432]';

    return (
      <div className={`relative w-full rounded-[6px] ${disabled ? 'bg-[#f4f4f0] opacity-60 cursor-not-allowed' : 'bg-white'}`}>
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full h-9 pl-3 pr-8 text-xs sm:text-sm text-[#181a1b] rounded-[6px] border bg-transparent appearance-none focus:outline-none focus:ring-1 transition-all cursor-pointer ${errorClasses} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#787a7e]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', hasError, disabled, ...props }, ref) => {
    const errorClasses = hasError
      ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-[#b91c1c]'
      : 'border-[#dcdcd6] focus:border-[#194432] focus:ring-[#194432]';

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full min-h-[72px] p-2.5 text-xs sm:text-sm text-[#181a1b] placeholder:text-[#9a9ca0] rounded-[6px] border bg-white focus:outline-none focus:ring-1 transition-all ${
          disabled ? 'bg-[#f4f4f0] opacity-60 cursor-not-allowed' : ''
        } ${errorClasses} ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
