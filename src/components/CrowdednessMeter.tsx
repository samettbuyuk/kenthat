import type { CrowdednessLevel, StopCrowdednessInfo } from '../types/transit';

export function getCrowdednessColorMeta(level: CrowdednessLevel): {
  barActiveClass: string;
  textClass: string;
  hex: string;
  filledBars: number;
} {
  switch (level) {
    case 'low':
      return {
        barActiveClass: 'bg-emerald-500 dark:bg-emerald-400',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        hex: '#10B981',
        filledBars: 1,
      };
    case 'moderate':
      return {
        barActiveClass: 'bg-amber-500 dark:bg-amber-400',
        textClass: 'text-amber-700 dark:text-amber-300',
        hex: '#F59E0B',
        filledBars: 2,
      };
    case 'high':
      return {
        barActiveClass: 'bg-orange-500 dark:bg-orange-400',
        textClass: 'text-orange-700 dark:text-orange-300',
        hex: '#F97316',
        filledBars: 3,
      };
    case 'very_high':
      return {
        barActiveClass: 'bg-rose-600 dark:bg-rose-400',
        textClass: 'text-rose-700 dark:text-rose-300',
        hex: '#E11D48',
        filledBars: 4,
      };
  }
}

export function CrowdednessMeter({
  info,
  compact = false,
}: {
  info: StopCrowdednessInfo;
  compact?: boolean;
}) {
  const style = getCrowdednessColorMeta(info.level);

  return (
    <div
      className="inline-flex items-center gap-1.5 font-mono-tabular"
      title={`${info.label} (%${info.occupancyPercent}) — ${info.advice}`}
    >
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={`w-[3px] rounded-xs transition-colors ${
              bar <= style.filledBars
                ? style.barActiveClass
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </span>
      <span className={`text-[11px] font-semibold ${style.textClass} whitespace-nowrap`}>
        {compact
          ? `%${info.occupancyPercent}`
          : `${info.label} · %${info.occupancyPercent}`}
      </span>
    </div>
  );
}
