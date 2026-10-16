import { ASPECT_SIZES } from '../types.ts';
import type { EditorDocument } from './types.ts';
import { TRACK_KINDS } from './types.ts';
import { assertPlacement, FRAME } from './math.ts';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const onFrame = (v: number) => Math.abs(v * 30 - Math.round(v * 30)) < 1e-6;
export function validateDocument(value: unknown): EditorDocument {
  const fail = (): never => { throw Error('Unsupported project'); };
  if (!object(value)) return fail();
  const d = value;
  if (d.schemaVersion !== 2 || d.fps !== 30 || typeof d.name !== 'string' || d.name.length > 80
    || typeof d.aspect !== 'string' || !Object.hasOwn(ASPECT_SIZES, d.aspect)
    || !Array.isArray(d.tracks) || d.tracks.length > 100 || !object(d.clips) || !object(d.assets)
    || Object.keys(d.clips).length > 10000 || Object.keys(d.assets).length > 10000
    || !Array.isArray(d.markers) || d.markers.length > 10000) return fail();
  const tracks = new Set<string>(), markers = new Set<string>();
  for (const t of d.tracks) {
    if (!object(t) || typeof t.id !== 'string' || tracks.has(t.id) || typeof t.name !== 'string'
      || typeof t.kind !== 'string' || !TRACK_KINDS.some(k => k === t.kind)
      || typeof t.locked !== 'boolean' || typeof t.hidden !== 'boolean') return fail();
    tracks.add(t.id);
  }
  for (const [id, a] of Object.entries(d.assets)) {
    if (!object(a) || a.id !== id || typeof a.name !== 'string' || !['video', 'audio'].includes(String(a.kind))
      || !finite(a.duration) || a.duration < FRAME || !finite(a.width) || !finite(a.height)
      || a.width < 0 || a.height < 0 || ('file' in a) || ('url' in a) || ('proxyUrl' in a)) return fail();
  }
  for (const [id, c] of Object.entries(d.clips)) {
    if (!object(c) || c.id !== id || typeof c.assetId !== 'string' || !Object.hasOwn(d.assets, c.assetId)
      || typeof c.trackId !== 'string' || !tracks.has(c.trackId) || !finite(c.start) || !finite(c.in) || !finite(c.out)
      || ![c.start, c.in, c.out].every(onFrame) || (c.linkId !== undefined && typeof c.linkId !== 'string')) return fail();
  }
  for (const m of d.markers) {
    if (!object(m) || typeof m.id !== 'string' || markers.has(m.id) || !finite(m.time) || m.time < 0
      || !onFrame(m.time) || typeof m.name !== 'string') return fail();
    markers.add(m.id);
  }
  const document = value as unknown as EditorDocument;
  try { assertPlacement(document); } catch { return fail(); }
  return document;
}
