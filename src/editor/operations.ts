import type { EditorDocument, TimelineClip } from './types.ts';
import { assertPlacement, clipEnd, clipLength, editable, frame, FRAME, linkedIds } from './math.ts';
export function moveClips(d: EditorDocument, ids: string[], delta: number, trackDelta = 0): EditorDocument {
  ids = linkedIds(d, ids);
  if (!ids.length || !editable(d, ids)) throw Error('Unlock linked tracks before moving these clips.');
  delta = Math.max(frame(delta), -Math.min(...ids.map(id => d.clips[id].start)));
  const clips = { ...d.clips };
  for (const id of ids) {
    const c = clips[id], index = d.tracks.findIndex(t => t.id === c.trackId);
    const track = d.tracks[index + trackDelta];
    if (!track || track.locked) throw Error('Choose an unlocked destination track.');
    clips[id] = { ...c, start: frame(c.start + delta), trackId: track.id };
  }
  const next = { ...d, clips }; assertPlacement(next); return next;
}
export function trimClip(d: EditorDocument, id: string, edge: 'in' | 'out', value: number): EditorDocument {
  const original = d.clips[id];
  if (!original || !Number.isFinite(value)) return d;
  const ids = linkedIds(d, [id]);
  if (!editable(d, ids)) throw Error('Unlock linked tracks before trimming.');
  let delta = frame(value) - original[edge];
  const group = ids.map(key => d.clips[key]);
  if (edge === 'in') delta = Math.max(Math.max(...group.map(c => -Math.min(c.in, c.start))),
    Math.min(delta, ...group.map(c => clipLength(c) - FRAME)));
  else delta = Math.max(Math.max(...group.map(c => FRAME - clipLength(c))),
    Math.min(delta, ...group.map(c => Math.floor(d.assets[c.assetId].duration * 30) / 30 - c.out)));
  const clips = { ...d.clips };
  for (const c of group) clips[c.id] = edge === 'in'
    ? { ...c, in: frame(c.in + delta), start: frame(c.start + delta) }
    : { ...c, out: frame(c.out + delta) };
  const next = { ...d, clips }; assertPlacement(next); return next;
}
export function splitClips(d: EditorDocument, ids: string[], time: number, uuid: () => string): EditorDocument {
  ids = linkedIds(d, ids.length ? ids : Object.keys(d.clips));
  time = frame(time);
  const candidates = ids.map(id => d.clips[id]).filter(c => c && time - c.start >= FRAME - 1e-8 && clipEnd(c) - time >= FRAME - 1e-8);
  if (!editable(d, candidates.map(c => c.id))) throw Error('Unlock linked tracks before splitting.');
  const clips = { ...d.clips }, links = new Map<string, string>();
  for (const c of candidates) {
    const source = frame(c.in + time - c.start), id = uuid();
    if (c.linkId && !links.has(c.linkId)) links.set(c.linkId, uuid());
    clips[c.id] = { ...c, out: source };
    clips[id] = { ...c, id, start: time, in: source, linkId: c.linkId ? links.get(c.linkId) : undefined };
  }
  return { ...d, clips };
}
export function removeClips(d: EditorDocument, ids: string[], ripple = false): EditorDocument {
  ids = linkedIds(d, ids);
  if (!ids.length) return d;
  if (!editable(d, ids)) throw Error('Unlock linked tracks before deleting.');
  const removed = ids.map(id => d.clips[id]);
  const clips = Object.fromEntries(Object.entries(d.clips).filter(([id]) => !ids.includes(id)));
  if (!ripple) return { ...d, clips };
  const intervals: [number, number][] = [];
  for (const c of removed.sort((a, b) => a.start - b.start)) {
    const last = intervals.at(-1);
    if (last && c.start <= last[1]) last[1] = Math.max(last[1], clipEnd(c));
    else intervals.push([c.start, clipEnd(c)]);
  }
  const shift = (t: number) => frame(t - intervals.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(t, b) - a), 0));
  for (const c of Object.values(clips)) {
    if (intervals.some(([a, b]) => c.start < b - 1e-8 && clipEnd(c) > a + 1e-8)) {
      throw Error('Ripple range still contains clips on another track. Select those clips too, or use normal delete.');
    }
    if (Math.abs(shift(c.start) - c.start) > 1e-8 && !editable(d, [c.id])) throw Error('Ripple would move a locked track.');
    clips[c.id] = { ...c, start: shift(c.start) };
  }
  return { ...d, clips, markers: d.markers.map(m => ({ ...m, time: shift(m.time) })) };
}
export function pasteClips(d: EditorDocument, copied: readonly TimelineClip[], time: number, uuid: () => string) {
  if (!copied.length) return { document: d, ids: [] };
  const origin = Math.min(...copied.map(c => c.start)), clips = { ...d.clips }, ids: string[] = [], links = new Map<string, string>();
  for (const c of copied) {
    const track = d.tracks.find(t => t.id === c.trackId);
    if (!track || track.locked || !d.assets[c.assetId]) throw Error('Clipboard media or unlocked destination track is unavailable.');
    if (c.linkId && !links.has(c.linkId)) links.set(c.linkId, uuid());
    const id = uuid(); ids.push(id);
    clips[id] = { ...c, id, start: frame(Math.max(0, time) + c.start - origin), linkId: c.linkId ? links.get(c.linkId) : undefined };
  }
  const document = { ...d, clips }; assertPlacement(document); return { document, ids };
}
