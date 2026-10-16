import type { Clip } from '../types.ts';
import type { EditorDocument, RuntimeRegistry, TimelineClip } from './types.ts';
import { clipEnd, documentDuration, orderedClips } from './math.ts';
export interface ResolvedClip extends Clip { start: number; trackId: string; linkId?: string }
export function resolveClip(d: EditorDocument, media: RuntimeRegistry, c: TimelineClip): ResolvedClip | null {
  const asset = d.assets[c.assetId], runtime = media[c.assetId];
  return asset && runtime ? { ...asset, ...runtime, ...c } : null;
}
export function resolveClips(d: EditorDocument, media: RuntimeRegistry): ResolvedClip[] {
  return orderedClips(d).flatMap(c => { const resolved = resolveClip(d, media, c); return resolved ? [resolved] : []; });
}
export function previewHit(d: EditorDocument, media: RuntimeRegistry, time: number) {
  const total = documentDuration(d);
  const position = time >= total && total > 0 ? total - 0.00001 : time;
  for (const track of d.tracks.filter(t => !t.hidden && (t.kind === 'overlay' || t.kind === 'video'))) {
    const c = Object.values(d.clips).find(c => c.trackId === track.id && c.start <= position && clipEnd(c) > position);
    if (c) {
      const clip = resolveClip(d, media, c);
      if (clip) return { clip, start: c.start, source: c.in + position - c.start };
    }
  }
  return null;
}
export function exportSequence(d: EditorDocument, media: RuntimeRegistry): ResolvedClip[] {
  const clips = resolveClips(d, media);
  if (clips.length !== Object.keys(d.clips).length) throw Error('Some source media is unavailable.');
  let end = 0;
  for (const c of clips) {
    if (d.assets[c.assetId].kind !== 'video' || d.tracks.find(t => t.id === c.trackId)?.hidden
      || Math.abs(c.start - end) > 1e-7) {
      throw Error('Current MP4 export requires a continuous, non-overlapping video sequence without hidden clips or separate audio. Composited export arrives in Phase 5.');
    }
    end = clipEnd(c);
  }
  return clips;
}
