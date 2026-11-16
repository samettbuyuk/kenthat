import { motion } from 'motion/react';
import { Footprints } from 'lucide-react';
import type { TransitStop } from '../types/transit';
import {
  TRANSIT_MODE_META,
  formatDistanceKm,
  formatWalkingDuration,
} from '../utils/transitUtils';

interface IstanbulTransitHeaderProps {
  fastestStop: TransitStop | null;
  locationLabel: string;
}

export function IstanbulTransitHeader({
  fastestStop,
  locationLabel,
}: IstanbulTransitHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-900 text-white p-4 sm:p-5">
      {/* Subtle architectural grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.45) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-sky-300 tracking-wide">
            İstanbul Canlı Ulaşım Rehberi
          </div>
          <h1 className="mt-1 text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug">
            {fastestStop
              ? `En Hızlı Erişim: ${TRANSIT_MODE_META[fastestStop.mode].shortLabel}`
              : 'Konumuna En Yakın Duraklar & Hatlar'}
          </h1>

          {fastestStop ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
              <span className="font-semibold text-white truncate max-w-[200px]">
                {fastestStop.name}
              </span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-mono-tabular text-emerald-300 font-semibold">
                <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
                {formatWalkingDuration(fastestStop.walkingMinutes)} (
                {formatDistanceKm(fastestStop.distanceMeters)})
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {locationLabel
                ? `${locationLabel} için yaya mesafesi hesaplanıyor...`
                : 'Konum alınca yürüyerek süre, mesafe ve duraktan geçen tüm hatları görün.'}
            </p>
          )}
        </div>

        {/* Animated Istanbul Transit Pulse Emblem */}
        <div
          aria-hidden="true"
          className="relative w-12 h-12 shrink-0 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border border-dashed border-sky-400/50"
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-7 h-7 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center shadow-md"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 17H19" />
              <path d="M7 17L9 7H15L17 17" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="15" cy="20" r="1" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Minimalist Istanbul Skyline & Animated Rail Track */}
      <div aria-hidden="true" className="relative z-10 mt-3.5">
        <svg
          viewBox="0 0 440 46"
          fill="none"
          className="w-full h-9 text-sky-400/35"
          preserveAspectRatio="none"
        >
          {/* Bosphorus Suspension Bridge */}
          <path
            d="M85 40 V12 M210 40 V8 M85 12 Q147 32 210 8 M25 34 Q55 30 85 12 M210 8 Q245 30 280 34"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Galata Tower */}
          <path
            d="M318 40 V18 L324 9 L330 18 V40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Maiden's Tower */}
          <path
            d="M378 40 V26 L383 19 L388 26 V40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Base rail line */}
          <line
            x1="0"
            y1="40"
            x2="440"
            y2="40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Animated transit train pulse */}
          <motion.rect
            x="0"
            y="37"
            width="36"
            height="4"
            rx="2"
            fill="#38BDF8"
            animate={{ x: [-40, 460] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      </div>
    </div>
  );
}
