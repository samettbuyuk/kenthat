export function BrandLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="10" className="fill-slate-900 dark:fill-sky-500" />
      {/* Istanbul dual-continent rail & Bosphorus route lines */}
      <path
        d="M8.5 24.5C12.2 18.5 16.5 14.2 27.5 11.8"
        className="stroke-sky-400 dark:stroke-slate-950"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M8.5 13.5C14.8 15.8 20.2 19.6 27.5 24"
        stroke="#F43F5E"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Central transfer interchange node */}
      <circle
        cx="18"
        cy="17.8"
        r="3.4"
        className="fill-white dark:fill-slate-950 stroke-slate-900 dark:stroke-sky-500"
        strokeWidth="1.2"
      />
      <circle
        cx="27.5"
        cy="11.8"
        r="2"
        className="fill-emerald-400 dark:fill-slate-900"
      />
    </svg>
  );
}
