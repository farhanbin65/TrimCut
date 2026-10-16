import type { EditorDocument, TimelineClip, Track, Asset } from './types.ts';
export const FPS = 30;
export const FRAME = 1 / FPS;
export const frame = (time: number) => Math.round(time * FPS) / FPS;
export const clipLength = (c: TimelineClip) => c.out - c.in;
export const clipEnd = (c: TimelineClip) => c.start + clipLength(c);
export const documentDuration = (d: EditorDocument) => Math.max(0, ...Object.values(d.clips).map(clipEnd));
export const orderedClips = (d: EditorDocument) => Object.values(d.clips).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
export const accepts = (track: Track, asset: Asset) => asset.kind === 'audio'
  ? track.kind === 'audio' : track.kind === 'video' || track.kind === 'overlay';
export function linkedIds(d: EditorDocument, ids: readonly string[]): string[] {
  const links = new Set(ids.map(id => d.clips[id]?.linkId).filter(Boolean));
  return Object.values(d.clips).filter(c => ids.includes(c.id) || (c.linkId && links.has(c.linkId))).map(c => c.id);
}
export function editable(d: EditorDocument, ids: readonly string[]) {
  return ids.every(id => d.clips[id] && !d.tracks.find(t => t.id === d.clips[id].trackId)?.locked);
}
export function snapTime(value: number, edges: readonly number[], targets: readonly number[], threshold: number) {
  let delta = 0, distance = threshold + 1e-8, guide: number | null = null;
  for (const edge of edges) for (const target of targets) {
    const candidate = target - (value + edge);
    if (Math.abs(candidate) < distance) { delta = candidate; distance = Math.abs(candidate); guide = target; }
  }
  return { value: frame(value + delta), guide };
}
export function snapTargets(d: EditorDocument, excluded: readonly string[], playhead: number) {
  return [0, frame(playhead), ...d.markers.map(m => m.time), ...Object.values(d.clips)
    .filter(c => !excluded.includes(c.id)).flatMap(c => [c.start, clipEnd(c)])];
}
export function assertPlacement(d: EditorDocument) {
  for (const track of d.tracks) {
    const clips = orderedClips(d).filter(c => c.trackId === track.id);
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i], asset = d.assets[c.assetId];
      if (!asset || !accepts(track, asset)) throw Error('This media is not compatible with the destination track.');
      if (![c.start, c.in, c.out].every(Number.isFinite) || c.start < 0 || c.in < 0
        || c.out > asset.duration + 1e-8 || clipLength(c) < FRAME - 1e-8) throw Error('Invalid clip range.');
      if (i && clipEnd(clips[i - 1]) > c.start + 1e-8) throw Error('Clips on one track cannot overlap. Use another video or overlay track.');
    }
  }
}
