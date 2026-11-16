import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin, Moon, Repeat2, Search } from 'lucide-react';
import {
  ISTANBUL_24_HOUR_LINES,
  isNight24LineActiveNow,
} from '../data/istanbul24HourLines';
import type { LatLngPoint, Night24LineInfo } from '../types/transit';
import {
  TRANSIT_MODE_META,
  getIstanbulLineColors,
} from '../utils/transitUtils';
import { TransitModeIcon } from './TransitModeIcon';

type FilterKind = 'all' | '24/7' | 'weekend-night';

interface Night24HoursPanelProps {
  onSelectHubLocation: (point: LatLngPoint, label: string) => void;
  onPlanTransferToHub: (line: Night24LineInfo) => void;
}

export function Night24HoursPanel({
  onSelectHubLocation,
  onPlanTransferToHub,
}: Night24HoursPanelProps) {
  const [filter, setFilter] = useState<FilterKind>('all');
  const [query, setQuery] = useState('');
  const now = new Date();

  const filteredLines = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return ISTANBUL_24_HOUR_LINES.filter((line) => {
      if (filter !== 'all' && line.scheduleType !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        line.code.toLocaleLowerCase('tr-TR').includes(q) ||
        line.name.toLocaleLowerCase('tr-TR').includes(q) ||
        line.corridor.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [filter, query]);

  const count247 = ISTANBUL_24_HOUR_LINES.filter(
    (l) => l.scheduleType === '24/7'
  ).length;
  const countWeekend = ISTANBUL_24_HOUR_LINES.filter(
    (l) => l.scheduleType === 'weekend-night'
  ).length;

  return (
    <section
      id="yirmi-dort-saat"
      aria-label="24 saat çalışan İstanbul toplu taşıma hatları"
      className="space-y-4"
    >
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Moon
                className="w-4 h-4 text-blue-600 dark:text-sky-400"
                aria-hidden="true"
              />
              <span>24 Saat Çalışan İstanbul Hatları</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Haftanın 7 günü 24 saat kesintisiz çalışan Metrobüs, İETT &amp;
              HAVAİST hatları ile Cuma-Cumartesi geceleri 24 saat süren Gece
              Metrosu ve Marmaray seferleri.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hat kodu veya güzergah ara (örn. 34G, M2, Taksim, Kadıköy)"
            aria-label="24 saat çalışan hat ara"
            className="w-full min-h-[40px] pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-sky-400"
          />
        </div>

        {/* Schedule Filter Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'border-slate-900 dark:border-sky-400 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            Tümü ({ISTANBUL_24_HOUR_LINES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('24/7')}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              filter === '24/7'
                ? 'border-slate-900 dark:border-sky-400 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            7/24 ({count247})
          </button>
          <button
            type="button"
            onClick={() => setFilter('weekend-night')}
            className={`min-h-[36px] px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              filter === 'weekend-night'
                ? 'border-slate-900 dark:border-sky-400 bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            Gece Metro ({countWeekend})
          </button>
        </div>
      </div>

      {/* Lines List */}
      {filteredLines.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
          Aradığınız kriterle eşleşen 24 saat hattı bulunamadı.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLines.map((line, idx) => {
            const badge = getIstanbulLineColors(
              line.code,
              line.mode,
              line.color,
              line.textColor
            );
            const liveStatus = isNight24LineActiveNow(line, now);

            return (
              <motion.article
                key={line.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: Math.min(idx * 0.03, 0.25),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono-tabular inline-flex items-center gap-1.5 shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      <TransitModeIcon mode={line.mode} className="w-3.5 h-3.5" />
                      <span>{line.code}</span>
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {line.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {TRANSIT_MODE_META[line.mode].label} · {line.scheduleLabel}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                      liveStatus.active
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {liveStatus.statusText}
                  </span>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {line.corridor}
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 space-y-1 text-xs font-mono-tabular border border-slate-200/70 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
                    <span>Çalışma Saatleri: {line.operatingHours}</span>
                  </div>
                  {line.weekdayNightWindow && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pl-5">
                      {line.weekdayNightWindow}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
                    Sefer Sıklığı: {line.headwayText}
                  </div>
                </div>

                {line.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    {line.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectHubLocation(line.hubLocation, line.hubName)
                    }
                    className="flex-1 min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Durakları Gör ({line.hubName})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlanTransferToHub(line)}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Repeat2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Aktarma Planla</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
