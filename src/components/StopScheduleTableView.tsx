import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Moon, Sun, Table } from 'lucide-react';
import type { StopTransitDetails, TransitStop } from '../types/transit';
import {
  getIstanbulLineColors,
} from '../utils/transitUtils';
import { TransitModeIcon } from './TransitModeIcon';

interface StopScheduleTableViewProps {
  stop: TransitStop;
  details: StopTransitDetails | null;
}

interface ScheduleRow {
  id: string;
  lineCode: string;
  lineName: string;
  direction: string;
  timeIso: string;
  timeStr: string;
  is24Hours: boolean;
  serviceType: '7/24 Kesintisiz' | 'Gece Seferi' | 'Gündüz Seferi';
}

export function StopScheduleTableView({
  stop,
  details,
}: StopScheduleTableViewProps) {
  const [filterMode, setFilterMode] = useState<'all' | '24h' | 'day'>('all');

  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    const list: ScheduleRow[] = [];
    const lines = details?.lines || [];

    if (lines.length > 0) {
      lines.forEach((l, idx) => {
        const lineCodeUp = l.lineCode.toUpperCase();
        const is24hLine =
          lineCodeUp === '34G' ||
          lineCodeUp.startsWith('E-') ||
          lineCodeUp.startsWith('HVİST') ||
          lineCodeUp === 'B1' ||
          lineCodeUp === 'M2' ||
          lineCodeUp === 'M4' ||
          lineCodeUp === 'M5' ||
          stop.mode === 'metrobus';

        const baseTime = l.departureTimeIso
          ? new Date(l.departureTimeIso)
          : new Date(Date.now() + (idx * 5 + 3) * 60000);

        for (let i = 0; i < 4; i++) {
          const depTime = new Date(baseTime.getTime() + i * (l.headwayMinutes || 12) * 60000);
          const hour = depTime.getHours();
          const isOvernight = hour >= 0 && hour < 6;
          const serviceType = is24hLine
            ? isOvernight
              ? '7/24 Kesintisiz'
              : 'Gündüz Seferi'
            : 'Gündüz Seferi';

          list.push({
            id: `${l.id}-slot-${i}`,
            lineCode: l.lineCode,
            lineName: l.lineName,
            direction: l.headsign || `${stop.name} Yönü`,
            timeIso: depTime.toISOString(),
            timeStr: depTime.toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            is24Hours: is24hLine,
            serviceType,
          });
        }
      });
    } else {
      const hints = stop.lineHintLabel
        ? stop.lineHintLabel.split('·').map((s) => s.trim()).filter(Boolean)
        : ['34G', stop.mode.toUpperCase()];

      hints.forEach((code, hIdx) => {
        const is24h = code === '34G' || code === 'B1' || stop.mode === 'metrobus';
        const now = new Date();
        for (let i = 0; i < 3; i++) {
          const depTime = new Date(now.getTime() + (hIdx * 15 + i * 12 + 5) * 60000);
          const hour = depTime.getHours();
          const isNight = hour >= 0 && hour < 6;

          list.push({
            id: `fallback-${code}-${i}`,
            lineCode: code,
            lineName: `${stop.name} - Hat Seferi`,
            direction: 'Karşılıklı Hat',
            timeIso: depTime.toISOString(),
            timeStr: depTime.toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            is24Hours: is24h,
            serviceType: is24h ? (isNight ? '7/24 Kesintisiz' : 'Gündüz Seferi') : 'Gündüz Seferi',
          });
        }
      });
    }

    return list.sort((a, b) => a.timeIso.localeCompare(b.timeIso));
  }, [details, stop]);

  const filteredRows = useMemo(() => {
    return scheduleRows.filter((r) => {
      if (filterMode === '24h') return r.is24Hours;
      if (filterMode === 'day') return !r.is24Hours;
      return true;
    });
  }, [scheduleRows, filterMode]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Table className="w-4 h-4 text-blue-600 dark:text-sky-400" aria-hidden="true" />
            <span>Detaylı Sefer Tablosu &amp; Saatleri</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Standart ve 7/24 kesintisiz gece seferleri ayrımıyla yaklaşan kalkış saatleri
          </p>
        </div>

        <div role="tablist" aria-label="Sefer filtreleri" className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === 'all'}
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Tümü ({scheduleRows.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === '24h'}
            onClick={() => setFilterMode('24h')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterMode === '24h'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            7/24 &amp; Gece ({scheduleRows.filter((r) => r.is24Hours).length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === 'day'}
            onClick={() => setFilterMode('day')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterMode === 'day'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Standart ({scheduleRows.filter((r) => !r.is24Hours).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono-tabular">
              <th className="px-3 py-2 font-semibold">Hat</th>
              <th className="px-3 py-2 font-semibold">Güzergah / Yön</th>
              <th className="px-3 py-2 font-semibold">Sefer Türü</th>
              <th className="px-3 py-2 font-semibold text-right">Kalkış Saati</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono-tabular">
            {filteredRows.map((row, idx) => {
              const badge = getIstanbulLineColors(row.lineCode, stop.mode);
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.2) }}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-extrabold shadow-xs inline-flex items-center gap-1"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      <TransitModeIcon mode={stop.mode} className="w-3 h-3" />
                      <span>{row.lineCode}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 font-sans max-w-[180px] truncate">
                    <div className="font-semibold truncate">{row.lineName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {row.direction}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        row.is24Hours
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {row.is24Hours ? (
                        <Moon className="w-3 h-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <Sun className="w-3 h-3 shrink-0" aria-hidden="true" />
                      )}
                      <span>{row.serviceType}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600 dark:text-sky-400" aria-hidden="true" />
                      <span>{row.timeStr}</span>
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
