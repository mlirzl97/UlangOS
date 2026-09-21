import React from 'react';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: {
    value: string;
    trend?: 'up' | 'down' | 'neutral';
    isGood?: boolean;
  };
  subtext?: string;
  status?: 'optimal' | 'warning' | 'danger' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  unit,
  delta,
  subtext,
  status = 'neutral',
  icon,
  className = '',
  onClick,
}) => {
  const statusBorder = {
    optimal: 'border-l-2 border-l-[#1b7a4b]',
    warning: 'border-l-2 border-l-[#b45309]',
    danger: 'border-l-2 border-l-[#b91c1c]',
    neutral: '',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[8px] border border-[#e2e2dc] p-4 transition-all shadow-xs flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-[#c4c4bc] hover:bg-[#fafaf8]' : ''
      } ${statusBorder[status]} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[#67696d] tracking-normal">{label}</span>
        {icon && <span className="text-[#888b90] shrink-0">{icon}</span>}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#181a1b] font-mono tnum leading-none">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-[#7a7c80]">{unit}</span>}
      </div>

      {(delta || subtext) && (
        <div className="mt-2.5 pt-2 border-t border-[#f0f0eb] flex items-center justify-between text-[11px] text-[#707276] flex-wrap gap-1">
          {subtext && <span className="truncate">{subtext}</span>}
          {delta && (
            <span
              className={`font-mono font-medium ml-auto flex items-center gap-0.5 ${
                delta.isGood === true
                  ? 'text-[#1b7a4b]'
                  : delta.isGood === false
                  ? 'text-[#b91c1c]'
                  : 'text-[#67696d]'
              }`}
            >
              {delta.trend === 'up' && '↑'}
              {delta.trend === 'down' && '↓'}
              <span>{delta.value}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
