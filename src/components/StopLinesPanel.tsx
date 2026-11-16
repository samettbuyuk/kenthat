import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility,
  Clock,
  ExternalLink,
  Footprints,
  Navigation,
  RefreshCw,
  Route,
  TrainFront,
} from 'lucide-react';
import type { StopTransitDetails, TransitStop } from '../types/transit';
import {
  TRANSIT_MODE_META,
  formatClockTime,
  formatDistanceKm,
  formatMinutesUntilDeparture,
  formatWalkingDuration,
  getIstanbulLineColors,
} from '../utils/transitUtils';
import { TransitModeIcon } from './TransitModeIcon';

interface StopLinesPanelProps {
  stop: TransitStop | null;
  details: StopTransitDetails | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRequestDirections: (stop: TransitStop) => void;
}

export function StopLinesPanel({
  stop,
  details,
  isLoading,
  error,
  onRefresh,
  onRequestDirections,
}: StopLinesPanelProps) {
  if (!stop) {
    return (
      <section
        id="durak-hatlari"
        aria-label="Durak hatları ve seferler"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center"
      >
        <TrainFront
          className="w-7 h-7 mx-auto text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <h2 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-slate-100">
          Duraktan Geçen Hatlar &amp; Seferler
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          Yukarıdan veya haritadan bir toplu taşıma durağı seçtiğinizde o duraktan
          geçen hat numaraları ve yaklaşan seferler anlık olarak listelenir.
        </p>
      </section>
    );
  }

  const meta = TRANSIT_MODE_META[stop.mode];
  const fallbackHints = stop.lineHintLabel
    ? stop.lineHintLabel.split('·').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <section
      id="durak-hatlari"
      aria-label="Seçili duraktan geçen hatlar ve seferler"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: meta.color }}
            >
              <TransitModeIcon mode={stop.mode} className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {meta.label}
                </span>
                {details?.agencies && details.agencies.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{details.agencies.join(', ')}</span>
                  </>
                )}
              </div>

              <h2 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white leading-snug break-words">
                {stop.name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                <span className="inline-flex items-center gap-1 text-blue-700 dark:text-sky-400 font-semibold">
                  <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
                  {stop.isWalkable === false
                    ? 'Karşı yaka'
                    : `Yürüyerek ${formatWalkingDuration(stop.walkingMinutes)} · ${formatDistanceKm(stop.distanceMeters)}`}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Hat verilerini yenile"
            title="Anlık hat verilerini yenile"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Quick Actions inside Selected Stop Board */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onRequestDirections(stop)}
            className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 transition-colors whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Haritada Yürüyüş Rotası Çiz</span>
          </motion.button>

          {stop.googleMapsUri && (
            <a
              href={stop.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Durak Detayı</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Live Lines & Departures Body */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" aria-hidden="true" />
            <span>Bu Duraktan Geçen Hatlar &amp; Seferler</span>
          </h3>
          {details && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono-tabular">
              {formatClockTime(details.fetchedAtIso)} itibarıyla
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2.5" aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0 animate-pulse"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-7 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800/70" />
                  </div>
                </div>
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : details && details.lines.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {details.lines.map((line, index) => {
                const badge = getIstanbulLineColors(
                  line.lineCode,
                  stop.mode,
                  line.color,
                  line.textColor
                );
                const depClock = line.departureTimeIso
                  ? formatClockTime(line.departureTimeIso)
                  : '';
                const depCountdown = line.departureTimeIso
                  ? formatMinutesUntilDeparture(line.departureTimeIso)
                  : '';

                return (
                  <motion.li
                    key={line.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: Math.min(index * 0.035, 0.35),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="min-w-[52px] px-2 py-1 rounded-md text-center text-xs font-extrabold font-mono-tabular tracking-tight shrink-0 shadow-xs"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {line.lineCode}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {line.headsign
                            ? `${line.headsign} Yönü`
                            : line.lineName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                          <span className="truncate">{line.lineName}</span>
                          {line.headwayMinutes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular shrink-0">
                                Her {line.headwayMinutes} dk
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono-tabular">
                      {depClock ? (
                        <>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1">
                            <Clock
                              className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            />
                            <span>{depClock}</span>
                          </div>
                          {depCountdown && (
                            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              {depCountdown}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Aktif Hat
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </AnimatePresence>
        ) : (
          <div className="space-y-3 py-1">
            {fallbackHints.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {fallbackHints.map((code) => {
                  const badge = getIstanbulLineColors(code, stop.mode);
                  return (
                    <span
                      key={code}
                      className="px-2.5 py-1 rounded-md text-xs font-extrabold font-mono-tabular"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {code}
                    </span>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bu saat diliminde Google Transit üzerinde yaklaşan aktif sefer
              bildirimi görünmüyor. Yenile butonuna basabilir veya Google
              Haritalar durak detayından tüm saatleri inceleyebilirsiniz.
            </p>
          </div>
        )}

        {/* Platform / Stop Codes from Google Places TransitStation */}
        {details && details.platforms.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Durak / Peron Bilgileri
            </div>
            <div className="space-y-1">
              {details.platforms.slice(0, 4).map((plat, idx) => (
                <div
                  key={`${plat.name}-${idx}`}
                  className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span className="truncate flex items-center gap-1.5">
                    {plat.wheelchairAccessible && (
                      <Accessibility
                        className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">
                      {plat.signageText || plat.name}
                    </span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    {[
                      plat.platformCode ? `Peron ${plat.platformCode}` : '',
                      plat.stopCode ? `Kod ${plat.stopCode}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
