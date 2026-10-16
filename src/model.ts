import { ASPECT_SIZES, FPS } from './types.ts';
import type { AspectRatio, ClipRange, Project, TrimEdge } from './types.ts';

export const MIN_CLIP = 1 / FPS;
export const length = (clip: ClipRange): number => clip.out - clip.in;
export const duration = (clips: readonly ClipRange[]): number =>
  clips.reduce((total, clip) => total + length(clip), 0);

export function locate<T extends ClipRange>(clips: readonly T[], time: number) {
  let start = 0;
  for (const clip of clips) {
    const end = start + length(clip);
    if (time < end) return { clip, start, source: clip.in + Math.max(0, time - start) };
    start = end;
  }
  const clip = clips.at(-1);
  return clip ? { clip, start: start - length(clip), source: clip.out } : null;
}

export function trim<T extends ClipRange>(clip: T, edge: TrimEdge, value: number): T {
  if (!Number.isFinite(value)) return clip;
  return edge === 'in'
    ? { ...clip, in: Math.max(0, Math.min(value, clip.out - MIN_CLIP)) }
    : { ...clip, out: Math.min(clip.duration, Math.max(value, clip.in + MIN_CLIP)) };
}

export function split<T extends ClipRange>(clips: readonly T[], time: number, id: string): T[] {
  const hit = locate(clips, time);
  if (!hit || hit.source - hit.clip.in < MIN_CLIP || hit.clip.out - hit.source < MIN_CLIP) {
    return [...clips];
  }
  return clips.flatMap(clip => clip.id === hit.clip.id
    ? [{ ...clip, out: hit.source }, { ...clip, id, in: hit.source }] : [clip]);
}

export function serialize(
  clips: readonly ClipRange[], name = 'Untitled project', aspect: AspectRatio = '16:9',
): Project {
  const [width, height] = ASPECT_SIZES[aspect];
  return {
    version: 1, name, width, height, fps: FPS,
    clips: clips.map(({ id, assetId, name, duration, in: start, out }) => ({
      id, assetId, name, duration, in: start, out, effects: [], keyframes: [],
    })),
  };
}

export function validateProject(value: unknown): Project {
  if (!value || typeof value !== 'object') throw Error('Unsupported project');
  const p = value as Record<string, unknown>;
  if (p.version !== 1 || !Array.isArray(p.clips) || p.clips.length > 1000) {
    throw Error('Unsupported project');
  }
  const ids = new Set<string>();
  for (const value of p.clips as unknown[]) {
    if (!value || typeof value !== 'object') throw Error('Invalid clip');
    const c = value as Record<string, unknown>;
    if (typeof c.id !== 'string' || typeof c.assetId !== 'string' || typeof c.name !== 'string'
      || typeof c.in !== 'number' || typeof c.out !== 'number' || typeof c.duration !== 'number'
      || ![c.in, c.out, c.duration].every(Number.isFinite)
      || c.in < 0 || c.out > c.duration || c.out - c.in < MIN_CLIP || ids.has(c.id)) {
      throw Error('Invalid clip');
    }
    ids.add(c.id);
  }
  for (const key of ['width', 'height', 'fps']) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || (p[key] as number) <= 0) {
      throw Error('Unsupported project');
    }
  }
  return value as Project;
}

export function timecode(seconds: number, fps = FPS): string {
  const frames = Math.max(0, Math.floor(seconds * fps + 0.000001));
  return [Math.floor(frames / (fps * 3600)), Math.floor(frames / (fps * 60)) % 60,
    Math.floor(frames / fps) % 60, frames % fps].map(n => String(n).padStart(2, '0')).join(':');
}
