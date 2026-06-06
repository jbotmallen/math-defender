// Smoothly ramp an audio element's volume to `target` over `durationMs`, then
// optionally pause when it reaches silence. Returns the interval id so the
// caller can cancel an in-flight fade.
export const fadeAudio = (
  audio: HTMLAudioElement,
  target: number,
  durationMs: number,
  pauseAtZero = false,
): ReturnType<typeof setInterval> => {
  const stepMs = 40;
  const steps = Math.max(1, Math.round(durationMs / stepMs));
  const start = audio.volume;
  const delta = target - start;
  let i = 0;
  const id = setInterval(() => {
    i += 1;
    const v = start + (delta * i) / steps;
    audio.volume = Math.min(1, Math.max(0, v));
    if (i >= steps) {
      clearInterval(id);
      audio.volume = Math.min(1, Math.max(0, target));
      if (pauseAtZero && target <= 0) audio.pause();
    }
  }, stepMs);
  return id;
};
