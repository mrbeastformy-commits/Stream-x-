import React from 'react';

interface StreamxLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const StreamxLogo: React.FC<StreamxLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-11 h-11',
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-[#713CFF] to-[#247BFF] p-1.5 shadow-lg shadow-[#713CFF]/30 ${iconSizes[size]}`}>
          {/* Play triangle inside modern rounded box */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full text-white fill-white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 4.5V19.5L19 12L6 4.5Z"
              fill="white"
            />
          </svg>
          <div className="absolute inset-0 rounded-xl bg-white/20 blur-[2px] pointer-events-none" />
        </div>
        <div className="flex items-baseline">
          <span className={`font-black tracking-wider text-white ${sizeClasses[size]}`}>
            STREAM
          </span>
          <span className={`font-black tracking-wider bg-gradient-to-r from-[#713CFF] via-[#a855f7] to-[#247BFF] bg-clip-text text-transparent ${sizeClasses[size]}`}>
            X
          </span>
        </div>
      </div>
      {showTagline && (
        <span className="text-[9px] font-semibold tracking-[0.25em] text-slate-400 uppercase mt-0.5 pl-0.5">
          Entertainment Without Limits
        </span>
      )}
    </div>
  );
};
