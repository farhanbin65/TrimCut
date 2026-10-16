import type { EditorDocument, TimelineClip } from '../editor/types.ts';
import { clipEnd, documentDuration } from '../editor/math.ts';
export interface ActiveLayer { clip: TimelineClip; sourceTime: number; visual: boolean; key: string }
export function activeLayers(document: EditorDocument, time: number): ActiveLayer[] {
  const total = documentDuration(document);
  const at = total > 0 && time >= total ? Math.max(0, total - 1 / document.fps) : time;
  return document.tracks.filter(t => !t.hidden).flatMap(track => Object.values(document.clips)
    .filter(c => c.trackId === track.id && c.start <= at && clipEnd(c) > at)
    .map(clip => ({ clip, sourceTime: clip.in + at - clip.start,
      visual: document.assets[clip.assetId]?.kind === 'video', key: `${track.id}:${clip.assetId}` })));
}
export function upcomingLayers(document: EditorDocument, time: number, horizon = 0.5): ActiveLayer[] {
  return document.tracks.filter(t => !t.hidden).flatMap(track => Object.values(document.clips)
    .filter(c => c.trackId === track.id && c.start > time && c.start <= time + horizon)
    .map(clip => ({ clip, sourceTime: clip.in, visual: document.assets[clip.assetId]?.kind === 'video', key: `${track.id}:${clip.assetId}` })));
}
export function contain(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const w = sourceWidth * scale, h = sourceHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
export class PlaybackClock {
  private anchor = 0;
  private position = 0;
  private running = false;
  seek(position: number, now: number) { this.position = position; this.anchor = now; }
  play(now: number) { if (!this.running) { this.anchor = now; this.running = true; } }
  pause(now: number) { this.position = this.read(now); this.running = false; }
  read(now: number) { return this.position + (this.running ? Math.max(0, now - this.anchor) : 0); }
}
