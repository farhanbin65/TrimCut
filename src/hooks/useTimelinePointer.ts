import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { useEditor } from '../store';
import { clipEnd, linkedIds, snapTargets, snapTime } from '../editor/math';
import { moveClips, trimClip } from '../editor/operations';
import { RULER_HEIGHT, TRACK_HEIGHT } from '../timeline/drawTimeline';
import type { TimelineClip } from '../editor/types';
type Drag = { edge: 'scrub' } | { edge: 'in' | 'out' | 'move'; x: number; y: number; clip: TimelineClip; ids: string[] };
export function useTimelinePointer(scale: number, scroll: number, scrollY: number) {
  const drag = useRef<Drag | null>(null);
  const xAt = (e: PointerEvent<HTMLCanvasElement>) => e.clientX - e.currentTarget.getBoundingClientRect().left;
  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;
    e.preventDefault(); e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId);
    const s = useEditor.getState(); s.play(false);
    const x = xAt(e), y = e.clientY - e.currentTarget.getBoundingClientRect().top + scrollY;
    const row = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT), track = s.document.tracks[row];
    const time = (x + scroll - 16) / scale;
    const clip = Object.values(s.document.clips).find(c => c.trackId === track?.id && time >= c.start && time <= clipEnd(c));
    if (clip && y >= RULER_HEIGHT + row * TRACK_HEIGHT + 8 && y <= RULER_HEIGHT + row * TRACK_HEIGHT + 60) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        s.select(clip.id, e.shiftKey ? 'range' : 'toggle'); return;
      }
      if (!s.selection.includes(clip.id)) s.select(clip.id);
      if (track.locked) return;
      const ids = linkedIds(s.document, useEditor.getState().selection);
      drag.current = { x, y, clip, ids, edge: Math.abs(time - clip.start) * scale < 8 ? 'in'
        : Math.abs(time - clipEnd(clip)) * scale < 8 ? 'out' : 'move' };
      useEditor.getState().begin(); return;
    }
    drag.current = { edge: 'scrub' }; s.seek(time);
  }
  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const d = drag.current, s = useEditor.getState(); if (!d) return;
    const x = xAt(e);
    if (d.edge === 'scrub') { s.seek((x + scroll - 16) / scale); return; }
    if (!s.transaction) return;
    const base = s.transaction.document, dx = x - d.x;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top + scrollY;
    if (Math.abs(dx) < 4 && Math.abs(y - d.y) < 4) {
      if (s.document !== base) s.apply('Restore drag origin', () => base);
      s.setSnapGuide(null); return;
    }
    const excluded = d.edge === 'move' ? d.ids : linkedIds(base, [d.clip.id]);
    const targets = snapTargets(base, excluded, s.time);
    const snap = (value: number, edges: number[]) => s.snapping && !e.altKey
      ? snapTime(value, edges, targets, 8 / scale) : { value, guide: null };
    if (d.edge === 'move') {
      const result = snap(dx / scale, d.ids.flatMap(id => [base.clips[id].start, clipEnd(base.clips[id])]));
      const from = base.tracks.findIndex(t => t.id === d.clip.trackId);
      const to = Math.max(0, Math.min(base.tracks.length - 1, Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)));
      s.apply('Move clips', () => moveClips(base, d.ids, result.value, to - from));
      s.setSnapGuide(result.guide);
    } else {
      const edge = d.edge;
      const boundary = edge === 'in' ? d.clip.start : clipEnd(d.clip);
      const result = snap(boundary + dx / scale, [0]);
      s.apply('Trim clips', () => trimClip(base, d.clip.id, edge, d.clip[edge] + result.value - boundary));
      s.setSnapGuide(result.guide);
    }
  }
  function cancel() { drag.current = null; useEditor.getState().cancel(); }
  function onPointerUp() {
    const d = drag.current; drag.current = null;
    if (d && d.edge !== 'scrub') useEditor.getState().commit(d.edge === 'move' ? 'Move clips' : 'Trim clips');
  }
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel,
    onLostPointerCapture: () => { if (drag.current) cancel(); } };
}
