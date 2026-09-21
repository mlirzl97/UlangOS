import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  subtle?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  subtle = false,
  ...props
}) => {
  return (
    <div
      className={`rounded-[8px] border transition-colors ${
        subtle
          ? 'bg-[#f8f8f5] border-[#e4e4dd]'
          : 'bg-white border-[#e2e2dc] shadow-xs'
      } ${
        hoverable ? 'hover:border-[#c4c4bc] hover:bg-[#fafaf8] cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 pb-3 border-b border-[#f0f0ea] flex items-start justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3 className={`text-[15px] font-semibold tracking-tight text-[#181a1b] leading-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p className={`text-xs text-[#67696d] mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 pt-3 border-t border-[#f0f0ea] bg-[#fafaf7] rounded-b-[8px] flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
};
