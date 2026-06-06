import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, LogOut, ChevronRight, Star } from 'lucide-react';
import { playSfx } from '../audio/sfx';

interface ResultsScreenProps {
  score: number;
  stars: number;        // 0-3 earned this run
  didWin: boolean;
  canAdvance: boolean;  // true when a next, now-unlocked sector exists
  onRestart: () => void;
  onHub: () => void;
  onNext: () => void;
}

const TOTAL_STARS = 3;
const SCORE_ANIM_MS = 900;
const STAR_STAGGER_MS = 380;

// Count score up from 0 -> target with requestAnimationFrame (ease-out).
const useCountUp = (target: number, durationMs: number) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  score,
  stars,
  didWin,
  canAdvance,
  onRestart,
  onHub,
  onNext,
}) => {
  const animatedScore = useCountUp(score, SCORE_ANIM_MS);
  // Stars start dropping after the score finishes counting.
  const starsDelayBase = SCORE_ANIM_MS - 200;

  const accent = didWin ? '#00e676' : '#ff3b5c';

  return (
    <div className="absolute inset-0 z-80 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="glass-panel animate-results-in flex flex-col items-center gap-6 px-8 py-9 w-[90%] max-w-md text-center">
        {/* Outcome banner */}
        <h2
          className="text-3xl font-black uppercase tracking-widest"
          style={{ color: accent, textShadow: `0 0 14px ${accent}` }}
        >
          {didWin ? 'Sector Clear!' : 'Base Down'}
        </h2>

        {/* Animated score */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold">Score</span>
          <span className="font-mono text-5xl font-black text-[#00ffff] drop-shadow-[0_0_12px_rgba(0,255,255,0.6)]">
            {animatedScore}
          </span>
        </div>

        {/* Star containers: empty outlines that earned stars drop into, staggered. */}
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: TOTAL_STARS }).map((_, i) => {
            const earned = i < stars;
            return (
              <div key={i} className="relative h-16 w-16 flex items-center justify-center">
                {/* Empty container outline (always shown) */}
                <Star
                  size={62}
                  className="absolute text-slate-700"
                  strokeWidth={1.5}
                  fill="rgba(15,23,42,0.6)"
                />
                {/* Filled star drops in only when earned */}
                {earned && (
                  <Star
                    size={62}
                    className="absolute animate-star-drop text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.8)]"
                    strokeWidth={1.5}
                    fill="#fcd34d"
                    style={{ animationDelay: `${starsDelayBase + i * STAR_STAGGER_MS}ms` }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            disabled={!canAdvance}
            onClick={() => { playSfx('confirm'); onNext(); }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-bold uppercase tracking-widest border-2 border-emerald-400 bg-emerald-500/15 text-emerald-300 transition-all hover:bg-emerald-500/30 hover:shadow-[0_0_18px_rgba(16,185,129,0.4)] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/15 disabled:hover:shadow-none"
          >
            Next Sector
            <ChevronRight size={18} />
          </button>

          <div className="flex gap-3">
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider border border-cyan-400 bg-cyan-500/15 text-white transition-colors hover:bg-cyan-500/30"
            >
              <RotateCcw size={16} />
              Restart
            </button>
            <button
              onClick={() => { playSfx('back'); onHub(); }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider border border-slate-400 bg-slate-600/30 text-white transition-colors hover:bg-slate-600/50"
            >
              <LogOut size={16} />
              Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
