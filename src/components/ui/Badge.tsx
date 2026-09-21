import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'neutral',
  size = 'sm',
  dot = false,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center font-medium font-mono uppercase tracking-wider rounded-[4px] whitespace-nowrap transition-colors select-none';

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1 leading-none',
    md: 'text-[11px] px-2 py-0.5 gap-1.5 leading-tight',
  };

  const variantClasses = {
    neutral: 'bg-[#f0f0ec] text-[#4a4c50] border border-[#deded8]',
    success: 'bg-[#edf7f1] text-[#13633c] border border-[#c4e8d3]',
    warning: 'bg-[#fef7ec] text-[#92400e] border border-[#fbdca7]',
    danger: 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]',
    info: 'bg-[#f0f8ff] text-[#0369a1] border border-[#bae6fd]',
    accent: 'bg-[#edf5f0] text-[#194432] border border-[#cbe4d6]',
    outline: 'bg-transparent text-[#55575a] border border-[#d8d8d2]',
  };

  const dotColors = {
    neutral: 'bg-[#7c7f84]',
    success: 'bg-[#1b7a4b]',
    warning: 'bg-[#d97706]',
    danger: 'bg-[#dc2626]',
    info: 'bg-[#0284c7]',
    accent: 'bg-[#194432]',
    outline: 'bg-[#8c8f94]',
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
};
