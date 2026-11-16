import type { TransitMode } from '../types/transit';

interface TransitModeIconProps {
  mode: TransitMode;
  className?: string;
}

export function TransitModeIcon({
  mode,
  className = 'w-4 h-4',
}: TransitModeIconProps) {
  switch (mode) {
    case 'bus':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="14" rx="3" />
          <path d="M4 11h16" />
          <path d="M8.5 7.5h7" />
          <circle cx="8" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <path d="M7 18v2M17 18v2" />
        </svg>
      );

    case 'metrobus':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 16V9.5C3 7.8 4.3 6.5 6 6.5h12.2c1.5 0 2.8 1 3.1 2.4l.7 3.1v4c0 .8-.7 1.5-1.5 1.5H4.5C3.7 17.5 3 16.8 3 16Z" />
          <path d="M3 12h18.5" />
          <path d="M9.5 6.5v11" />
          <path d="M15 6.5v5.5" />
          <circle cx="7" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'metro':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 16V9a7 7 0 0 1 14 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
          <path d="M5 11.5h14" />
          <path d="M12 5v6.5" />
          <circle cx="8.5" cy="14.7" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="14.7" r="1" fill="currentColor" stroke="none" />
          <path d="M8 18l-2 3M16 18l2 3" />
        </svg>
      );

    case 'marmaray':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 3h4M12 3v2" />
          <rect x="5" y="5" width="14" height="11.5" rx="3.2" />
          <path d="M5 10.5h14" />
          <circle cx="8.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
          <path d="M3 20c1.8-1.2 3.2-1.2 5 0s3.2 1.2 5 0 3.2-1.2 5 0 2.5.8 3 .2" />
        </svg>
      );

    case 'tram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 3l3 2.5L15 3" />
          <path d="M12 5.5V7" />
          <rect x="6" y="7" width="12" height="11" rx="2.5" />
          <path d="M6 12h12" />
          <circle cx="9" cy="15" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="0.9" fill="currentColor" stroke="none" />
          <path d="M8.5 18l-1.5 3M15.5 18l1.5 3M5 21h14" />
        </svg>
      );

    case 'ferry':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 10V6.5A1.5 1.5 0 0 1 8.5 5h7A1.5 1.5 0 0 1 17 6.5V10" />
          <path d="M11 3v2M14 3v2" />
          <path d="M4 11.5L12 9l8 2.5-1.6 5.2a1.5 1.5 0 0 1-1.4 1H7a1.5 1.5 0 0 1-1.4-1L4 11.5Z" />
          <path d="M2.5 20.5c1.8-1 3.4-1 5.2 0s3.4 1 5.2 0 3.4-1 5.2 0 2.4.7 3.4.2" />
        </svg>
      );
  }
}
