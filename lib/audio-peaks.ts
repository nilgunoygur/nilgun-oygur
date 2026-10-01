// Runs in the owner's browser at upload: the recording's length and the bar heights of its waveform.
// Students get the stored numbers, so nobody downloads or decodes a whole recording just to draw it.

/** Above this the decode is skipped (memory) and the player draws a neutral waveform instead. */
const maxDecodeBytes = 200 * 1024 * 1024;

function metadataDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(), url = URL.createObjectURL(file);
    const done = (seconds: number) => { URL.revokeObjectURL(url); if (Number.isFinite(seconds) && seconds > 0) resolve(seconds); else reject(new Error("unreadable")); };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(NaN);
    audio.src = url;
  });
}

/** Loudness (RMS) per bar, scaled so typical speech fills the height: integers 0–100. */
export function peaksFromSamples(samples: Float32Array, bars: number): number[] {
  const size = Math.max(1, Math.floor(samples.length / bars)), stride = Math.max(1, Math.floor(size / 2000));
  const levels = Array.from({ length: bars }, (_, bar) => {
    let sum = 0, count = 0;
    for (let i = bar * size, end = Math.min(i + size, samples.length); i < end; i += stride) { sum += samples[i] * samples[i]; count++; }
    return count ? Math.sqrt(sum / count) : 0;
  });
  // The 95th percentile, not the maximum, so one loud moment doesn't flatten everything else.
  const reference = [...levels].sort((a, b) => a - b)[Math.floor(bars * 0.95)] || Math.max(...levels) || 1;
  return levels.map(level => Math.round(Math.min(1, level / reference) * 100));
}

export async function measureAudio(file: File, bars: number): Promise<{ durationSeconds: number; peaks: number[] | null }> {
  if (file.size <= maxDecodeBytes && typeof OfflineAudioContext !== "undefined") {
    try {
      // 8 kHz is plenty for a loudness outline and keeps an hour of audio around a hundred megabytes.
      const buffer = await new OfflineAudioContext(1, 1, 8000).decodeAudioData(await file.arrayBuffer());
      return { durationSeconds: Math.max(1, Math.round(buffer.duration)), peaks: peaksFromSamples(buffer.getChannelData(0), bars) };
    } catch { /* fall through: unsupported codec or not enough memory */ }
  }
  return { durationSeconds: Math.max(1, Math.round(await metadataDuration(file))), peaks: null };
}
