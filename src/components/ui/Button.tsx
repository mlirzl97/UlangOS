import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#194432] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed btn-tactile cursor-pointer';

    const variantClasses = {
      primary:
        'bg-[#194432] hover:bg-[#133628] text-white border border-[#133628] shadow-[0_1px_2px_rgba(25,68,50,0.2)]',
      secondary:
        'bg-[#f2f2ee] hover:bg-[#eaeae4] text-[#181a1b] border border-[#e2e2dc]',
      outline:
        'bg-white hover:bg-[#f8f8f6] text-[#181a1b] border border-[#dcdcd6] hover:border-[#c8c8c0] shadow-xs',
      ghost:
        'bg-transparent hover:bg-[#eaeae4] text-[#55575a] hover:text-[#181a1b]',
      destructive:
        'bg-[#b91c1c] hover:bg-[#991b1b] text-white border border-[#991b1b] shadow-xs',
      link:
        'bg-transparent text-[#194432] hover:underline p-0 h-auto border-0 shadow-none',
    };

    const sizeClasses = {
      xs: 'h-6 px-2 text-[11px] rounded-[4px] gap-1',
      sm: 'h-8 px-2.5 text-xs rounded-[6px] gap-1.5',
      md: 'h-9 px-3.5 text-xs sm:text-sm rounded-[7px] gap-2',
      lg: 'h-10 px-4 text-sm rounded-[8px] gap-2',
      icon: 'h-8 w-8 p-0 rounded-[6px] justify-center',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
