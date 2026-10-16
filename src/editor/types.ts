import type { AspectRatio } from '../types.ts';
export type TrackKind = 'video' | 'overlay' | 'text' | 'sticker' | 'audio' | 'effect';
export interface Track { id: string; name: string; kind: TrackKind; locked: boolean; hidden: boolean }
export interface Asset { id: string; name: string; kind: 'video' | 'audio'; duration: number; width: number; height: number }
export interface TimelineClip { id: string; assetId: string; trackId: string; start: number; in: number; out: number; linkId?: string }
export interface Marker { id: string; time: number; name: string }
export interface EditorDocument {
  schemaVersion: 2;
  name: string;
  aspect: AspectRatio;
  fps: 30;
  tracks: Track[];
  clips: Record<string, TimelineClip>;
  assets: Record<string, Asset>;
  markers: Marker[];
}
export interface RuntimeMedia { file: File; url: string; proxyUrl?: string }
export type RuntimeRegistry = Record<string, RuntimeMedia>;
export const TRACK_KINDS: TrackKind[] = ['overlay', 'video', 'text', 'sticker', 'audio', 'effect'];
export function emptyDocument(): EditorDocument {
  return { schemaVersion: 2, name: 'Untitled project', aspect: '16:9', fps: 30,
    tracks: TRACK_KINDS.map(kind => ({ id: kind, name: `${kind[0].toUpperCase()}${kind.slice(1)} 1`, kind, locked: false, hidden: false })),
    clips: {}, assets: {}, markers: [] };
}
