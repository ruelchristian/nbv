import React, { useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
  showText?: boolean;
  className?: string;
  imgClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showText = true,
  className = '',
  imgClassName = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: {
      emblem: 'w-8 h-8 sm:w-9 sm:h-9',
      title: 'text-sm sm:text-base font-serif font-bold text-[#231F20] tracking-tight leading-tight whitespace-nowrap',
      subtitle: 'text-[8px] sm:text-[9px] tracking-[0.2em] font-sans font-semibold text-[#8B3A56] uppercase -mt-0.5 whitespace-nowrap',
    },
    md: {
      emblem: 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12',
      title: 'text-base sm:text-lg md:text-xl lg:text-[1.35rem] font-serif font-bold text-[#231F20] tracking-tight leading-tight whitespace-nowrap',
      subtitle: 'text-[9px] sm:text-[10px] md:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] font-sans font-semibold text-[#8B3A56] uppercase -mt-0.5 whitespace-nowrap',
    },
    lg: {
      emblem: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
      title: 'text-lg sm:text-xl md:text-2xl font-serif font-bold text-[#231F20] tracking-tight leading-tight whitespace-nowrap',
      subtitle: 'text-[10px] sm:text-xs tracking-[0.2em] font-sans font-semibold text-[#8B3A56] uppercase -mt-0.5 whitespace-nowrap',
    },
    xl: {
      emblem: 'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20',
      title: 'text-xl sm:text-2xl md:text-3xl font-serif font-bold text-[#231F20] tracking-tight leading-tight whitespace-nowrap',
      subtitle: 'text-xs sm:text-sm tracking-[0.25em] font-sans font-semibold text-[#8B3A56] uppercase -mt-0.5 whitespace-nowrap',
    },
    '2xl': {
      emblem: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
      title: 'text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#231F20] tracking-tight leading-tight whitespace-nowrap',
      subtitle: 'text-sm sm:text-base tracking-[0.25em] font-sans font-semibold text-[#8B3A56] uppercase -mt-0.5 whitespace-nowrap',
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 md:gap-3 select-none ${className}`}>
      {/* Circular Official Logo Emblem */}
      <div
        className={`relative rounded-full bg-white shadow-xs sm:shadow-sm border border-[#F3B8C3]/80 flex items-center justify-center overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${currentSize.emblem}`}
      >
        {!imageError ? (
          <img
            src="/assets/logo.png"
            alt="Nails by Vril"
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover rounded-full ${imgClassName}`}
            loading="eager"
          />
        ) : (
          /* Elegant Fallback SVG if image is unavailable */
          <div className="relative w-full h-full flex items-center justify-center bg-radial from-[#FCE5EC] via-[#F8D3DF] to-white">
            <svg
              viewBox="0 0 100 100"
              className="relative z-10 w-3/4 h-3/4 text-[#8B3A56]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ellipse cx="50" cy="46" rx="6" ry="5.5" fill="#8B3A56" />
              <path
                d="M 45 44 C 30 28, 12 36, 18 52 C 23 64, 38 52, 45 47"
                fill="currentColor"
                fillOpacity="0.15"
              />
              <path
                d="M 55 44 C 70 28, 88 36, 82 52 C 77 64, 62 52, 55 47"
                fill="currentColor"
                fillOpacity="0.15"
              />
              <path
                d="M 46 51 Q 38 68 32 82 Q 36 80 41 84 Q 45 72 48 53"
                fill="currentColor"
                fillOpacity="0.2"
              />
              <path
                d="M 54 51 Q 62 68 68 82 Q 64 80 59 84 Q 55 72 52 53"
                fill="currentColor"
                fillOpacity="0.2"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Accompanying Typography */}
      {showText && (
        <div className="flex flex-col text-left min-w-0 shrink-0">
          <span className={currentSize.title}>
            Nails by Vril
          </span>
          {showSubtitle && (
            <span className={currentSize.subtitle}>
              Nail Artist
            </span>
          )}
        </div>
      )}
    </div>
  );
};
