import { create } from 'zustand';
import type { AspectRatio, Clip, TrimEdge } from './types.ts';
import { emptyDocument } from './editor/types.ts';
import type { EditorDocument, RuntimeRegistry, TimelineClip, TrackKind } from './editor/types.ts';
import { accepts, assertPlacement, clipEnd, documentDuration, frame, linkedIds } from './editor/math.ts';
import { moveClips, pasteClips, removeClips, splitClips, trimClip } from './editor/operations.ts';
import { execute, record, undo as revert } from './editor/history.ts';
import type { EditSnapshot, History } from './editor/history.ts';
export interface EditorState {
  document: EditorDocument; media: RuntimeRegistry; selection: string[];
  time: number; playing: boolean; error: string; snapping: boolean; snapGuide: number | null;
  history: History; transaction: EditSnapshot | null; clipboard: TimelineClip[];
  apply: (label: string, edit: (d: EditorDocument) => EditorDocument, selection?: string[]) => void;
  add: (clip: Clip, kind?: 'video' | 'audio') => void;
  insertAsset: (assetId: string, trackId: string, time: number) => void;
  seek: (time: number) => void; play: (playing: boolean) => void;
  select: (id: string, mode?: 'only' | 'toggle' | 'range') => void;
  trim: (id: string, edge: TrimEdge, value: number) => void;
  split: () => void; remove: (ripple?: boolean) => void;
  move: (ids: string[], delta: number, trackDelta?: number) => void;
  begin: () => void; commit: (label: string) => void; cancel: () => void;
  undo: () => void; redo: () => void; copy: () => void; paste: () => void; duplicate: () => void;
  link: () => void; unlink: () => void; addMarker: () => void; removeMarker: (id: string) => void;
  addTrack: (kind: TrackKind) => void; toggleTrack: (id: string, key: 'locked' | 'hidden') => void;
  setError: (error: string) => void; setProjectName: (name: string) => void;
  setAspect: (aspect: AspectRatio) => void; setProxy: (id: string, url: string) => void;
  setSnapping: (value: boolean) => void; setSnapGuide: (value: number | null) => void;
}
const uuid = () => crypto.randomUUID();
const snapshot = (s: EditorState): EditSnapshot => ({ document: s.document, selection: s.selection });
export const useEditor = create<EditorState>((set, get) => ({
  document: emptyDocument(), media: {}, selection: [], time: 0, playing: false, error: '',
  snapping: true, snapGuide: null, history: { past: [], future: [] }, transaction: null, clipboard: [],
  apply: (label, edit, selection) => {
    const s = get();
    try {
      const document = edit(s.document);
      const after = { document, selection: (selection ?? s.selection).filter(id => document.clips[id]) };
      const command = { label, before: snapshot(s), after };
      set({ ...execute(command), playing: false, error: '', time: Math.min(s.time, documentDuration(document)),
        history: s.transaction ? s.history : record(s.history, command) });
    } catch (e) { set({ error: e instanceof Error ? e.message : 'Edit failed.' }); }
  },
  add: (clip, kind = 'video') => {
    const { assetId, name, duration, width, height, file, url } = clip;
    set(s => ({ media: { ...s.media, [assetId]: { file, url } } }));
    get().apply('Import media', d => {
      let track = d.tracks.find(t => t.kind === kind && !t.locked);
      const tracks = [...d.tracks];
      if (!track) { track = { id: uuid(), kind, name: `${kind} track`, locked: false, hidden: false }; tracks.push(track); }
      const start = Math.max(0, ...Object.values(d.clips).filter(c => c.trackId === track.id).map(clipEnd));
      return { ...d, tracks, assets: { ...d.assets, [assetId]: { id: assetId, name, duration, width, height, kind } },
        clips: { ...d.clips, [clip.id]: { id: clip.id, assetId, trackId: track.id, start: frame(start), in: 0, out: Math.floor(duration * 30) / 30 } } };
    }, [clip.id]);
  },
  insertAsset: (assetId, trackId, time) => {
    const id = uuid();
    get().apply('Insert media', d => {
      const asset = d.assets[assetId], track = d.tracks.find(t => t.id === trackId);
      if (!asset || !track || track.locked || !accepts(track, asset)) throw Error('Choose a compatible unlocked track.');
      const document = { ...d, clips: { ...d.clips, [id]: { id, assetId, trackId, start: Math.max(0, frame(time)), in: 0, out: Math.floor(asset.duration * 30) / 30 } } };
      assertPlacement(document); return document;
    }, [id]);
  },
  seek: time => { if (Number.isFinite(time)) set(s => ({ time: Math.max(0, Math.min(time, documentDuration(s.document))) })); },
  play: playing => set({ playing }),
  select: (id, mode = 'only') => set(s => {
    if (!s.document.clips[id]) return {};
    let ids = [id];
    if (mode === 'range' && s.selection.length) {
      const anchor = s.document.clips[s.selection[0]], target = s.document.clips[id];
      ids = Object.values(s.document.clips).filter(c => c.trackId === target.trackId && c.start >= Math.min(anchor.start, target.start)
        && c.start <= Math.max(anchor.start, target.start)).map(c => c.id);
    }
    ids = linkedIds(s.document, ids);
    return { selection: mode === 'toggle' ? (s.selection.includes(id) ? s.selection.filter(key => !ids.includes(key))
      : [...new Set([...s.selection, ...ids])]) : ids };
  }),
  trim: (id, edge, value) => get().apply('Trim clips', d => trimClip(d, id, edge, value)),
  split: () => get().apply('Split at playhead', d => splitClips(d, get().selection, get().time, uuid)),
  remove: (ripple = false) => get().apply(ripple ? 'Ripple delete' : 'Delete clips', d => removeClips(d, get().selection, ripple)),
  move: (ids, delta, trackDelta = 0) => get().apply('Move clips', d => moveClips(d, ids, delta, trackDelta)),
  begin: () => { const s = get(); if (!s.transaction) set({ transaction: snapshot(s), playing: false }); },
  commit: label => { const s = get(); if (s.transaction) set({ transaction: null, snapGuide: null,
    history: record(s.history, { label, before: s.transaction, after: snapshot(s) }) }); },
  cancel: () => { const s = get(); if (s.transaction) set({ ...s.transaction, transaction: null, snapGuide: null, error: '' }); },
  undo: () => { const s = get(); if (s.transaction) { s.cancel(); return; } const command = s.history.past.at(-1);
    if (command) set({ ...revert(command), playing: false, error: '', time: Math.min(s.time, documentDuration(command.before.document)),
      history: { past: s.history.past.slice(0, -1), future: [...s.history.future, command] } }); },
  redo: () => { const s = get(); if (s.transaction) return; const command = s.history.future.at(-1);
    if (command) set({ ...execute(command), playing: false, error: '', time: Math.min(s.time, documentDuration(command.after.document)),
      history: { past: [...s.history.past, command], future: s.history.future.slice(0, -1) } }); },
  copy: () => set(s => ({ clipboard: linkedIds(s.document, s.selection).map(id => ({ ...s.document.clips[id] })) })),
  paste: () => {
    const s = get();
    try { const pasted = pasteClips(s.document, s.clipboard, s.time, uuid); s.apply('Paste clips', () => pasted.document, pasted.ids); }
    catch (e) { s.setError(e instanceof Error ? e.message : 'Paste failed.'); }
  },
  duplicate: () => {
    const s = get(), copied = linkedIds(s.document, s.selection).map(id => s.document.clips[id]);
    if (!copied.length) return;
    try { const pasted = pasteClips(s.document, copied, Math.max(...copied.map(clipEnd)), uuid); s.apply('Duplicate clips', () => pasted.document, pasted.ids); }
    catch (e) { s.setError(e instanceof Error ? e.message : 'Duplicate failed.'); }
  },
  link: () => get().apply('Link clips', d => {
    const ids = linkedIds(d, get().selection), linkId = uuid();
    if (ids.length < 2) return d;
    if (ids.some(id => d.tracks.find(t => t.id === d.clips[id].trackId)?.locked)) throw Error('Unlock tracks before linking.');
    return { ...d, clips: Object.fromEntries(Object.entries(d.clips).map(([id, c]) => [id, ids.includes(id) ? { ...c, linkId } : c])) };
  }),
  unlink: () => get().apply('Unlink clips', d => {
    const ids = linkedIds(d, get().selection);
    if (ids.some(id => d.tracks.find(t => t.id === d.clips[id].trackId)?.locked)) throw Error('Unlock tracks before unlinking.');
    return { ...d, clips: Object.fromEntries(Object.entries(d.clips).map(([id, c]) => [id, ids.includes(id) ? { ...c, linkId: undefined } : c])) };
  }),
  addMarker: () => get().apply('Add marker', d => ({ ...d, markers: [...d.markers, { id: uuid(), time: frame(get().time), name: `Marker ${d.markers.length + 1}` }] })),
  removeMarker: id => get().apply('Remove marker', d => ({ ...d, markers: d.markers.filter(m => m.id !== id) })),
  addTrack: kind => get().apply('Add track', d => ({ ...d, tracks: [...d.tracks, { id: uuid(), kind,
    name: `${kind[0].toUpperCase()}${kind.slice(1)} ${d.tracks.filter(t => t.kind === kind).length + 1}`, locked: false, hidden: false }] })),
  toggleTrack: (id, key) => get().apply(`Toggle track ${key}`, d => ({ ...d, tracks: d.tracks.map(t => t.id === id ? { ...t, [key]: !t[key] } : t) })),
  setError: error => set({ error }),
  setProjectName: name => get().apply('Rename project', d => ({ ...d, name })),
  setAspect: aspect => get().apply('Change aspect ratio', d => ({ ...d, aspect })),
  setProxy: (id, proxyUrl) => { const old = get().media[id]; if (!old) { URL.revokeObjectURL(proxyUrl); return; }
    set(s => ({ media: { ...s.media, [id]: { ...old, proxyUrl } } }));
    if (old.proxyUrl) URL.revokeObjectURL(old.proxyUrl); },
  setSnapping: snapping => set({ snapping }), setSnapGuide: snapGuide => set({ snapGuide }),
}));
