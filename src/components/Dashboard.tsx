import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Maximize2, Minimize2, Settings, Star, Volume2, VolumeX, X, Globe, Moon, Hexagon, Lock } from 'lucide-react';
import { type AudioSettings } from '../settings';
import { fadeAudio } from '../audio/fade';
import { playSfx } from '../audio/sfx';

interface DashboardProps {
  stars: number;
  maxClearedLevel: number;
  unlockedCards: string[];
  audioSettings: AudioSettings;
  onAudioSettingsChange: (settings: AudioSettings) => void;
  onStartLevel: (level: number) => void;
}

interface Sector {
  level: number;
  title: string;
  subtitle: string;
  themeColor: string;
  icon: React.ReactNode;
  locked: boolean;
  starsCollected: number;
  maxStars: number;
}

const BACKGROUND_PARTICLES = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  size: Math.random() * 5 + 3, // 3px to 8px
  left: `${Math.random() * 100}%`,
  duration: Math.random() * 12 + 10, // 10s to 22s
  delay: Math.random() * -20, // Negative offset delay so they start mid-flight
  color: ['#00ffff', '#b829ff', '#3b82f6', '#10b981'][i % 4],
}));

const BGM_SRC = '/menu_bgm.mp3';
const BGM_MAX_VOLUME = 0.5; // ceiling so music sits under SFX; scaled by masterVolume

const Dashboard: React.FC<DashboardProps> = ({
  stars,
  maxClearedLevel,
  audioSettings,
  onAudioSettingsChange,
  onStartLevel,
}) => {
  const [activePanel, setActivePanel] = useState<'settings' | 'rules' | null>(null);
  const [rulesStep, setRulesStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Menu background music: loops with a fade in on mount and fade out on unmount.
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const fadeIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Target volume reflecting current settings; kept in a ref so the live-settings
  // effect can fade toward it without re-creating the element.
  const targetVolume = audioSettings.muted ? 0 : BGM_MAX_VOLUME * audioSettings.masterVolume;
  const targetVolumeRef = useRef(targetVolume);

  useEffect(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.volume = 0;
    bgmRef.current = audio;

    const startFadeIn = () => {
      if (fadeIdRef.current) clearInterval(fadeIdRef.current);
      fadeIdRef.current = fadeAudio(audio, targetVolumeRef.current, 1200);
    };

    // Browsers block autoplay until a user gesture; if play() rejects, retry
    // once on the first interaction.
    let detachGesture: (() => void) | null = null;
    const tryPlay = () => {
      audio.play().then(startFadeIn).catch(() => {
        const onGesture = () => {
          audio.play().then(startFadeIn).catch(() => {});
          detachGesture?.();
        };
        window.addEventListener('pointerdown', onGesture, { once: true });
        window.addEventListener('keydown', onGesture, { once: true });
        detachGesture = () => {
          window.removeEventListener('pointerdown', onGesture);
          window.removeEventListener('keydown', onGesture);
        };
      });
    };
    tryPlay();

    return () => {
      detachGesture?.();
      if (fadeIdRef.current) clearInterval(fadeIdRef.current);
      // Fade out then release the element (interval holds the ref alive after unmount).
      fadeAudio(audio, 0, 700, true);
      bgmRef.current = null;
    };
  }, []);

  // React to live mute / master-volume changes by fading to the new target.
  useEffect(() => {
    targetVolumeRef.current = targetVolume;
    const audio = bgmRef.current;
    if (!audio || audio.paused) return;
    if (fadeIdRef.current) clearInterval(fadeIdRef.current);
    fadeIdRef.current = fadeAudio(audio, targetVolume, 350);
  }, [targetVolume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const updateAudioSetting = (key: keyof AudioSettings, value: boolean | number) => {
    onAudioSettingsChange({ ...audioSettings, [key]: value });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch((error) => console.warn('Could not exit fullscreen', error));
      return;
    }

    void document.documentElement
      .requestFullscreen()
      .catch((error) => console.warn('Could not enter fullscreen', error));
  };

  const renderSlider = (
    label: string,
    value: number,
    key: 'masterVolume' | 'effectsVolume' | 'alertsVolume',
  ) => (
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-[#00ffff]">{Math.round(value * 100)}%</span>
      </span>
      <input
        className="accent-[#00ffff]"
        type="range"
        min="0"
        max="100"
        value={Math.round(value * 100)}
        onChange={(event) => updateAudioSetting(key, Number(event.target.value) / 100)}
      />
    </label>
  );

  const sectors: Sector[] = [
    {
      level: 1,
      title: 'SECTOR 1',
      subtitle: 'The Neon Frontier',
      themeColor: '#00ffff', // Cyan/Green
      icon: <Globe className="text-[#00ffff] drop-shadow-[0_0_5px_#00ffff]" size={40} />,
      locked: false,
      starsCollected: stars,
      maxStars: 30,
    },
    {
      level: 2,
      title: 'SECTOR 2',
      subtitle: 'Void Expanse',
      themeColor: '#b829ff', // Purple
      icon: <Moon className="text-[#b829ff] drop-shadow-[0_0_5px_#b829ff]" size={40} />,
      locked: maxClearedLevel < 1,
      starsCollected: 0,
      maxStars: 30,
    },
    {
      level: 3,
      title: 'SECTOR 3',
      subtitle: 'Singularity Core',
      themeColor: '#3b82f6', // Blue
      icon: <Hexagon className="text-[#3b82f6] drop-shadow-[0_0_5px_#3b82f6]" size={40} />,
      locked: maxClearedLevel < 2,
      starsCollected: 0,
      maxStars: 30,
    },
  ];

  const rulesSteps = [
    {
      title: '1. Your Mission',
      dialog: "Welcome to the Synergy Grid, Cadet! Alien asteroids are heading for our core. We must use our math modifier towers to build strong defensive laser beams and vaporize them!",
      visual: (
        <div className="flex items-center justify-around bg-black/45 p-6 rounded-xl border border-[#00ffff]/30 h-40 sm:h-44">
          <div className="text-center animate-pulse">
            <Globe className="text-[#00ffff] mx-auto w-12 h-12 sm:w-14 sm:h-14" />
            <span className="text-xs sm:text-sm font-bold block mt-2 text-slate-300">OUR BASE</span>
          </div>
          <div className="text-slate-400 font-black text-lg sm:text-xl animate-pulse">◀ ◀ ◀</div>
          <div className="text-center">
            <Hexagon className="text-red-500 animate-bounce mx-auto w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            <span className="text-xs sm:text-sm font-bold block mt-2 text-red-400">ASTEROID</span>
          </div>
        </div>
      ),
    },
    {
      title: '2. Math Magic',
      dialog: "Towers shoot regular lasers with 5 base damage. Placing math cards on the track alters the laser's value. For example, a laser starting at 5 hits a '+3' card to become 8, then hits a 'x2' card to multiply to 16! Order of operations matters!",
      visual: (
        <div className="flex items-center justify-center gap-3 sm:gap-4 bg-black/45 p-6 rounded-xl border border-[#00ffff]/30 h-40 sm:h-44 font-mono text-base sm:text-lg">
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-600 text-white font-black text-center min-w-16">
            <span className="text-[10px] sm:text-xs block font-bold text-slate-400 mb-0.5">START</span>
            5
          </div>
          <span className="text-[#00ffff] font-black text-xl animate-pulse">➔</span>
          <div className="px-4 py-2 bg-[#00ffff]/20 rounded-lg border border-[#00ffff] text-[#00ffff] font-black text-center min-w-16 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
            <span className="text-[10px] sm:text-xs block font-bold text-[#00ffff]/80 mb-0.5">+3 CARD</span>
            8
          </div>
          <span className="text-[#b829ff] font-black text-xl animate-pulse">➔</span>
          <div className="px-4 py-2 bg-[#b829ff]/20 rounded-lg border border-[#b829ff] text-[#b829ff] font-black text-center min-w-16 shadow-[0_0_10px_rgba(184,41,255,0.2)]">
            <span className="text-[10px] sm:text-xs block font-bold text-[#b829ff]/80 mb-0.5">x2 CARD</span>
            16
          </div>
        </div>
      ),
    },
    {
      title: '3. Break the Shields',
      dialog: "Asteroids have shields labeled with a factor number. Your laser must be an EXACT multiple of that factor to break it! If the shield is 3, a shot of 15 breaks it (3 x 5 = 15). But a shot of 16 will deflect and deal 0 damage!",
      visual: (
        <div className="grid grid-cols-2 gap-4 bg-black/45 p-4 rounded-xl border border-[#00ffff]/30 h-40 sm:h-44 text-sm sm:text-base">
          <div className="flex flex-col items-center justify-center p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
            <span className="text-[#00ffff] font-black font-mono text-center text-base sm:text-lg">SHOT: 15</span>
            <span className="text-slate-500 my-1 text-center font-bold text-xs">vs</span>
            <span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-md text-white font-black font-mono text-center">SHIELD: 3</span>
            <span className="text-emerald-400 font-extrabold mt-2 text-center animate-pulse">💥 HIT!</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-red-950/40 border border-red-500/50 rounded-lg shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]">
            <span className="text-[#00ffff] font-black font-mono text-center text-base sm:text-lg">SHOT: 16</span>
            <span className="text-slate-500 my-1 text-center font-bold text-xs">vs</span>
            <span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-md text-white font-black font-mono text-center">SHIELD: 3</span>
            <span className="text-red-400 font-extrabold mt-2 text-center">🚫 BLOCK!</span>
          </div>
        </div>
      ),
    },
    {
      title: '4. Draft Cards & Upgrade',
      dialog: "Every time you reach a score checkpoint, you get to draft a new modifier card from the deck. Plan ahead, draft cards that synergize (like using '+' to build a base, and 'x' to amplify it!), and secure the victory!",
      visual: (
        <div className="flex items-center justify-center gap-4 sm:gap-6 bg-black/45 p-6 rounded-xl border border-[#00ffff]/30 h-40 sm:h-44">
          <div className="px-3 py-5 bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] text-center w-20 sm:w-24 transform -rotate-6 hover:rotate-0 transition-transform">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-bold mb-1">DRAFT</span>
            <span className="text-lg sm:text-2xl font-black text-emerald-400 font-mono">+5</span>
          </div>
          <div className="px-3 py-5 bg-slate-900 border-2 border-[#b829ff] rounded-xl shadow-[0_0_15px_rgba(184,41,255,0.3)] text-center w-20 sm:w-24 transform translate-y-1 hover:-translate-y-1 transition-transform">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-bold mb-1">DRAFT</span>
            <span className="text-lg sm:text-2xl font-black text-[#b829ff] font-mono">x3</span>
          </div>
          <div className="px-3 py-5 bg-slate-900 border-2 border-[#00ffff] rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.3)] text-center w-20 sm:w-24 transform rotate-6 hover:rotate-0 transition-transform">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-bold mb-1">DRAFT</span>
            <span className="text-lg sm:text-2xl font-black text-[#00ffff] font-mono">1/2</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-[#05080f] text-[#e0f2fe] overflow-y-auto md:overflow-hidden">

      {/* Left Column - Poster */}
      <div className="w-full md:w-[55%] h-48 sm:h-64 md:h-full relative border-b-2 md:border-b-0 md:border-r-2 border-[#00ffff]/20 shadow-[0_0_50px_rgba(0,255,255,0.1)] shrink-0">
        {/* We use the clean poster.png generated earlier */}
        <img
          src="/poster_clean.png"
          alt="Game Poster"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay to blend with UI */}
        <div className="absolute inset-0 bg-linear-to-b md:bg-linear-to-r from-transparent to-[#05080f]"></div>
      </div>

      {/* Right Column - UI Menu */}
      <div className="w-full md:w-[45%] h-auto md:h-full flex flex-col p-4 md:p-6 relative overflow-y-auto md:overflow-y-hidden">

        {/* Floating Neon Background Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {BACKGROUND_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full animate-float-particle"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                bottom: '-20px',
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Absolute Settings Button */}
        <button
          onClick={() => { playSfx('click'); setActivePanel('settings'); }}
          className="absolute top-4 right-4 z-10 flex flex-col items-center group cursor-pointer"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900/80 border-2 border-[#00ffff]/30 rounded-lg flex justify-center items-center group-hover:border-[#00ffff] group-hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all">
            <Settings className="text-slate-300 group-hover:text-[#00ffff]" size={20} />
          </div>
          <span className="text-[9px] uppercase mt-1 text-slate-400 group-hover:text-[#00ffff] hidden md:inline">Settings</span>
        </button>

        {/* Title Section */}
        <div className="text-center mt-8 md:mt-0 mb-6 md:mb-8 flex flex-col items-center">
          <h1 className="text-5xl sm:text-6xl font-black italic tracking-wider text-transparent bg-clip-text bg-linear-to-b from-white to-[#00ffff] drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            MATH
          </h1>
          <h1 className="text-6xl sm:text-7xl font-black italic tracking-widest text-transparent bg-clip-text bg-linear-to-b from-[#b829ff] to-[#4a00e0] drop-shadow-[0_0_15px_rgba(184,41,255,0.6)] -mt-4">
            DEFENDERS
          </h1>

          <div className="mt-4 border border-[#00ffff]/50 rounded px-4 sm:px-6 py-1 bg-[#00ffff]/10 flex items-center gap-3 sm:gap-4 shadow-[0_0_15px_rgba(0,255,255,0.2)] max-w-full">
            <div className="w-3 sm:w-4 h-1 bg-[#00ffff]"></div>
            <p className="uppercase tracking-[0.2em] sm:tracking-[0.3em] font-bold text-xs sm:text-sm text-[#00ffff]">Operator Synergy Grid</p>
            <div className="w-3 sm:w-4 h-1 bg-[#00ffff]"></div>
          </div>
        </div>

        {/* Level Selector */}
        <div className="flex-1 flex flex-col gap-4 max-w-2xl mx-auto w-full px-4 justify-center">
          {sectors.map((sector) => (
            <div
              key={sector.level}
              className={`relative flex flex-col sm:flex-row items-center p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all gap-4 sm:gap-0 ${sector.locked ? 'opacity-50 grayscale' : 'hover:scale-[1.02]'
                }`}
              style={{ borderColor: sector.locked ? '#333' : sector.themeColor }}
            >
              {/* Lock Icon */}
              {sector.locked && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-[#05080f] rounded-full p-1 border border-slate-600">
                  <Lock size={16} className="text-slate-400" />
                </div>
              )}

              {/* Sector Icon (Hexagon) */}
              <div
                className="w-20 h-20 shrink-0 flex justify-center items-center"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  background: `linear-gradient(to bottom right, #000, ${sector.themeColor}40)`,
                  border: `1px solid ${sector.themeColor}`
                }}
              >
                {sector.icon}
              </div>

              {/* Sector Info */}
              <div className="flex-1 sm:ml-6 text-center sm:text-left">
                <h2 className="text-2xl font-black tracking-wider text-white" style={{ textShadow: `0 0 10px ${sector.themeColor}` }}>
                  {sector.title}
                </h2>
                <p className="text-sm font-semibold" style={{ color: sector.themeColor }}>
                  {sector.subtitle}
                </p>

                {/* Stars Progress */}
                <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((starIdx) => (
                      <Star
                        key={starIdx}
                        size={14}
                        fill={starIdx <= (sector.starsCollected / 10) ? sector.themeColor : 'transparent'}
                        color={starIdx <= (sector.starsCollected / 10) ? sector.themeColor : '#475569'}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {sector.starsCollected}/{sector.maxStars}
                  </span>
                </div>
              </div>

              {/* Deploy Button */}
              <button
                onClick={() => {
                  if (sector.locked) {
                    playSfx('error');
                    return;
                  }
                  playSfx('confirm');
                  onStartLevel(sector.level);
                }}
                aria-disabled={sector.locked}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded border border-white/20 bg-black/40 font-bold uppercase tracking-widest transition-all"
                style={{
                  boxShadow: sector.locked ? 'none' : `inset 0 0 10px ${sector.themeColor}40`,
                  color: sector.locked ? '#64748b' : '#fff'
                }}
                onMouseOver={(e) => {
                  if (!sector.locked) {
                    playSfx('hover');
                    e.currentTarget.style.backgroundColor = sector.themeColor;
                    e.currentTarget.style.boxShadow = `0 0 20px ${sector.themeColor}`;
                    e.currentTarget.style.color = '#000';
                  }
                }}
                onMouseOut={(e) => {
                  if (!sector.locked) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)';
                    e.currentTarget.style.boxShadow = `inset 0 0 10px ${sector.themeColor}40`;
                    e.currentTarget.style.color = '#fff';
                  }
                }}
              >
                DEPLOY {'>'}
              </button>
            </div>
          ))}
        </div>

        {/* HOW TO PLAY button */}
        <div className="max-w-2xl mx-auto w-full px-4 mt-4">
          <button
            onClick={() => { playSfx('click'); setActivePanel('rules'); setRulesStep(0); }}
            className="w-full py-4 bg-slate-900/80 hover:bg-[#00ffff]/10 border-2 border-dashed border-[#00ffff]/30 hover:border-[#00ffff] rounded-xl flex items-center justify-center gap-3 group transition-all hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] text-base font-bold uppercase tracking-widest text-[#00ffff] cursor-pointer"
          >
            <BookOpen className="text-[#00ffff]" size={20} />
            HOW TO PLAY (COMBAT GUIDE)
          </button>
        </div>

        {/* Bottom Navigation */}
        {/* <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center gap-12">
          {[
            { label: 'LOADOUT', icon: Crosshair },
            { label: 'UPGRADES', icon: ChevronsUp },
            { label: 'STATS', icon: BarChart2 },
            { label: 'ACHIEVEMENTS', icon: Trophy }
          ].map((nav, idx) => (
            <button key={idx} className="flex flex-col items-center group text-slate-500 hover:text-white transition-colors">
              <nav.icon size={24} className="mb-2 group-hover:drop-shadow-[0_0_8px_#fff]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{nav.label}</span>
            </button>
          ))}
        </div> */}

      </div>

      {/* Settings / Rules Modals */}
      {activePanel && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md">
          <div className={`glass-panel w-[95%] p-5 sm:p-8 shadow-[0_0_40px_rgba(0,255,255,0.15)] transition-all ${activePanel === 'settings' ? 'max-w-xl' : 'max-w-3xl'
            }`}>
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#00ffff] uppercase tracking-widest">
                {activePanel === 'settings' ? 'System Settings' : 'Combat Guide'}
              </h2>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:border-red-500 hover:text-red-500"
                onClick={() => { playSfx('back'); setActivePanel(null); }}
              >
                <X size={18} />
              </button>
            </div>

            {activePanel === 'settings' ? (
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-4 text-sm font-bold text-slate-100 transition hover:border-[#00ffff]/60 hover:text-[#00ffff]"
                    onClick={() => { playSfx('toggle'); updateAudioSetting('muted', !audioSettings.muted); }}
                  >
                    {audioSettings.muted ? <VolumeX size={24} className="text-red-400" /> : <Volume2 size={24} />}
                    {audioSettings.muted ? 'AUDIO OFF' : 'AUDIO ON'}
                  </button>
                  <button
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-4 text-sm font-bold text-slate-100 transition hover:border-[#00ffff]/60 hover:text-[#00ffff]"
                    onClick={() => { playSfx('toggle'); toggleFullscreen(); }}
                  >
                    {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                    {isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}
                  </button>
                </div>

                <div className="space-y-4 bg-black/30 p-4 rounded-lg border border-white/5">
                  {renderSlider('Master Volume', audioSettings.masterVolume, 'masterVolume')}
                  {renderSlider('Effects Volume', audioSettings.effectsVolume, 'effectsVolume')}
                  {renderSlider('Alerts Volume', audioSettings.alertsVolume, 'alertsVolume')}
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {/* Dialogue: Portrait on the left, speech bubble on the right */}
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-white/10 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
                  {/* Commander Portrait */}
                  <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 relative flex items-center justify-center rounded-full bg-slate-950 border-2 border-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.4)] overflow-hidden">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-[#00ffff] fill-none stroke-current" strokeWidth="2.5">
                      <circle cx="50" cy="50" r="45" strokeOpacity="0.1" strokeDasharray="2 2" />
                      <circle cx="50" cy="50" r="38" strokeOpacity="0.2" />
                      <path d="M30 68 C30 35, 70 35, 70 68 L65 78 L35 78 Z" strokeWidth="3" />
                      <path d="M35 48 L65 48 L60 56 L40 56 Z" fill="#00ffff" fillOpacity="0.3" strokeWidth="2" />
                      <rect x="25" y="52" width="6" height="14" rx="2" fill="#00ffff" />
                      <rect x="69" y="52" width="6" height="14" rx="2" fill="#00ffff" />
                      <path d="M40 78 L32 88 M60 78 L68 88 M50 78 L50 90" strokeWidth="2" strokeOpacity="0.7" />
                      <line x1="10" y1="50" x2="90" y2="50" stroke="#b829ff" strokeWidth="1" strokeDasharray="3 3" className="animate-pulse" />
                    </svg>
                    <div className="absolute inset-0 bg-linear-to-t from-[#00ffff]/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00ffff] rounded-full animate-ping"></div>
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00ffff] rounded-full"></div>
                  </div>

                  {/* Commander Speech Bubble */}
                  <div className="w-full sm:flex-1 bg-black/45 p-4 sm:p-5 rounded-xl border border-white/10 relative text-left shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                    <div className="hidden sm:block absolute top-8 -left-2 w-4 h-4 bg-slate-900 border-l border-b border-white/10 transform rotate-45" style={{ backgroundColor: 'rgba(21, 29, 43, 0.9)' }}></div>
                    <div className="font-bold text-[#00ffff] mb-2 text-sm sm:text-base tracking-widest">COMMANDER AI</div>
                    <p className="text-slate-100 leading-relaxed text-sm sm:text-base font-semibold">
                      {rulesSteps[rulesStep].dialog}
                    </p>
                  </div>
                </div>

                {/* Visual Demonstration */}
                <div className="bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-white/5">
                  <div className="text-xs sm:text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">
                    Visual Demonstration
                  </div>
                  {rulesSteps[rulesStep].visual}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    disabled={rulesStep === 0}
                    onClick={() => { playSfx('back'); setRulesStep(rulesStep - 1); }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-white/20 hover:border-white/40 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Back
                  </button>

                  <div className="flex gap-2">
                    {rulesSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === rulesStep ? 'bg-[#00ffff] scale-110 shadow-[0_0_8px_#00ffff]' : 'bg-slate-700'
                          }`}
                      />
                    ))}
                  </div>

                  {rulesStep < rulesSteps.length - 1 ? (
                    <button
                      onClick={() => { playSfx('click'); setRulesStep(rulesStep + 1); }}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-[#00ffff]/40 hover:border-[#00ffff] text-[#00ffff] bg-[#00ffff]/10 hover:bg-[#00ffff]/20 transition-all hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={() => { playSfx('confirm'); setActivePanel(null); }}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    >
                      Finish
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
