import { ResourceCache } from './lru.ts';
import type { Asset, RuntimeMedia } from '../../editor/types.ts';
export interface Thumbnail { time: number; image: ImageBitmap }
export interface Analysis { thumbnails: Thumbnail[]; peaks: Float32Array | null; note: string }
export function peakEnvelope(channels: readonly Float32Array[], bins: number): Float32Array {
  const length = channels[0]?.length || 0, result = new Float32Array(bins);
  for (let bin = 0; bin < bins; bin++) {
    const from = Math.floor(bin * length / bins), to = Math.min(length, Math.ceil((bin + 1) * length / bins));
    let peak = 0;
    for (const samples of channels) for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(samples[i] || 0));
    result[bin] = peak;
  }
  return result;
}
function waitFor(element: HTMLVideoElement, event: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer); element.removeEventListener(event, done); element.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted); if (error) reject(error); else resolve();
    };
    const done = () => finish(), failed = () => finish(Error('Media analysis unavailable'));
    const aborted = () => finish(Error('Analysis cancelled'));
    const timer = window.setTimeout(failed, 10000);
    element.addEventListener(event, done, { once: true }); element.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true }); if (signal.aborted) aborted();
  });
}
async function thumbnails(asset: Asset, media: RuntimeMedia, signal: AbortSignal) {
  const video = document.createElement('video'), result: Thumbnail[] = [];
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  try {
    const ready = waitFor(video, 'loadeddata', signal); video.src = media.proxyUrl || media.url; video.load(); await ready;
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
    const ctx = canvas.getContext('2d')!;
    const count = Math.min(12, Math.max(2, Math.ceil(asset.duration / 2)));
    for (let i = 0; i < count; i++) {
      if (signal.aborted) throw Error('Analysis cancelled');
      const time = Math.min(asset.duration - 0.05, i * asset.duration / count);
      if (Math.abs(video.currentTime - time) > 0.001) {
        const seeked = waitFor(video, 'seeked', signal); video.currentTime = time; await seeked;
      }
      ctx.fillStyle = '#101418'; ctx.fillRect(0, 0, 160, 90);
      const ratio = Math.min(160 / video.videoWidth, 90 / video.videoHeight), w = video.videoWidth * ratio, h = video.videoHeight * ratio;
      ctx.drawImage(video, (160 - w) / 2, (90 - h) / 2, w, h);
      result.push({ time, image: await createImageBitmap(canvas) });
    }
    return result;
  } catch (error) { result.forEach(t => t.image.close()); throw error; }
  finally { video.pause(); video.removeAttribute('src'); video.load(); }
}
export class MediaAnalysisCache {
  private cache = new ResourceCache<Analysis>(32 * 1024 * 1024, a => a.thumbnails.forEach(t => t.image.close()));
  private pending = new Map<string, { asset: Asset; media: RuntimeMedia }>();
  private running = false;
  private controller = new AbortController();
  private listeners = new Set<() => void>();
  private revision = 0;
  private context?: OfflineAudioContext;
  private keys = new Map<string, string>();
  private closed = false;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.revision;
  private notify() { this.revision++; this.listeners.forEach(fn => fn()); }
  get(id: string) { const key = this.keys.get(id); return key ? this.cache.get(key) : undefined; }
  request(asset: Asset, media: RuntimeMedia) {
    if (this.closed) return;
    const key = `${asset.id}:${media.proxyUrl || media.url}`;
    const old = this.keys.get(asset.id);
    if (old && old !== key) { this.cache.delete(old); this.pending.delete(old); }
    this.keys.set(asset.id, key);
    if (this.cache.get(key) || this.pending.has(key)) return;
    this.pending.set(key, { asset, media }); void this.work();
  }
  private async work() {
    if (this.running || this.closed) return; this.running = true;
    while (this.pending.size && !this.closed) {
      const [key, { asset, media }] = this.pending.entries().next().value!;
      const analysis: Analysis = { thumbnails: [], peaks: null, note: '' };
      try {
        if (asset.kind === 'video') analysis.thumbnails = await thumbnails(asset, media, this.controller.signal);
        // Whole-buffer audio decoding is deliberately bounded; playback itself streams all sizes.
        if (asset.duration <= 60 && media.file.size <= 24 * 1024 * 1024 && !this.closed) {
          this.context ||= new OfflineAudioContext(1, 1, 8000);
          try {
            const decoded = await this.context.decodeAudioData(await media.file.arrayBuffer());
            if (decoded.length * decoded.numberOfChannels * 4 <= 64 * 1024 * 1024) {
              analysis.peaks = peakEnvelope(Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i)), 2048);
            } else analysis.note = 'Waveform exceeds analysis memory limit';
          } catch { analysis.note = 'No decodable audio waveform'; }
        } else analysis.note = 'Waveform skipped for large media';
      } catch { analysis.note = 'Media analysis unavailable'; }
      this.pending.delete(key);
      if (this.closed || this.keys.get(asset.id) !== key) analysis.thumbnails.forEach(t => t.image.close());
      else {
        this.cache.set(key, analysis, analysis.thumbnails.length * 160 * 90 * 4 + (analysis.peaks?.byteLength || 0) + 1024);
        this.notify();
      }
    }
    this.running = false;
  }
  prune(ids: Set<string>) {
    for (const [id, key] of this.keys) if (!ids.has(id)) { this.keys.delete(id); this.cache.delete(key); this.pending.delete(key); }
  }
  dispose() {
    this.closed = true; this.controller.abort(); this.pending.clear(); this.cache.clear(); this.keys.clear();
    this.listeners.clear(); this.context = undefined;
  }
}
