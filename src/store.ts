import { create } from 'zustand';
import { duration, split, trim } from './model.ts';
import type { AspectRatio, Clip, TrimEdge } from './types.ts';

interface EditorState {
  clips: Clip[];
  time: number;
  playing: boolean;
  selected: string | null;
  error: string;
  projectName: string;
  aspect: AspectRatio;
  add: (clip: Clip) => void;
  seek: (time: number) => void;
  play: (playing: boolean) => void;
  select: (id: string) => void;
  trim: (id: string, edge: TrimEdge, value: number) => void;
  split: () => void;
  move: (from: number, to: number) => void;
  setError: (error: string) => void;
  setProjectName: (name: string) => void;
  setAspect: (aspect: AspectRatio) => void;
  setProxy: (assetId: string, url: string) => void;
}

export const useEditor = create<EditorState>((set) => ({
  clips: [], time: 0, playing: false, selected: null, error: '',
  projectName: 'Untitled project', aspect: '16:9',
  add: clip => set(s => ({ clips: [...s.clips, clip], selected: clip.id })),
  seek: time => set(s => ({ time: Number.isFinite(time)
    ? Math.max(0, Math.min(time, duration(s.clips))) : s.time })),
  play: playing => set({ playing }),
  select: selected => set({ selected }),
  trim: (id, edge, value) => set(s => {
    const clips = s.clips.map(c => c.id === id ? trim(c, edge, value) : c);
    return { clips, playing: false, time: Math.min(s.time, duration(clips)) };
  }),
  split: () => set(s => ({ playing: false, clips: split(s.clips, s.time, crypto.randomUUID()) })),
  move: (from, to) => set(s => {
    if (from === to || !s.clips[from] || to < 0 || to >= s.clips.length) return s;
    const clips = [...s.clips];
    const [clip] = clips.splice(from, 1);
    clips.splice(to, 0, clip);
    return { clips, playing: false };
  }),
  setError: error => set({ error }),
  setProjectName: projectName => set({ projectName }),
  setAspect: aspect => set({ aspect }),
  setProxy: (assetId, proxyUrl) => set(s => {
    const old = new Set(s.clips.filter(c => c.assetId === assetId).map(c => c.proxyUrl));
    old.forEach(url => { if (url) URL.revokeObjectURL(url); });
    return { clips: s.clips.map(c => c.assetId === assetId ? { ...c, proxyUrl } : c) };
  }),
}));
