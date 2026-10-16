import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { useEditor } from '../store';
import { length } from '../model';
import type { Clip, TrimEdge } from '../types';
type Drag = { x: number; scale: number; edge: TrimEdge | 'move'; clip: Clip; index: number }
  | { edge: 'scrub' };
export function useTimelinePointer(scale: number, scroll: number) {
  const drag = useRef<Drag | null>(null);
  const xAt = (event: PointerEvent<HTMLCanvasElement>) => event.clientX - event.currentTarget.getBoundingClientRect().left;
  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const state = useEditor.getState(); state.play(false);
    const x = xAt(event), y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    let start = 0;
    for (const [index, clip] of state.clips.entries()) {
      const left = 16 + start * scale - scroll, right = left + length(clip) * scale;
      if (y >= 48 && y <= 100 && x >= left && x <= right) {
        state.select(clip.id);
        drag.current = { x, scale, clip, index, edge: x - left < 8 ? 'in' : right - x < 8 ? 'out' : 'move' };
        return;
      }
      start += length(clip);
    }
    drag.current = { edge: 'scrub' }; state.seek((x + scroll - 16) / scale);
  }
  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    const x = xAt(event), state = useEditor.getState();
    if (d.edge === 'scrub') state.seek((x + scroll - 16) / scale);
    else if (d.edge !== 'move') state.trim(d.clip.id, d.edge, d.clip[d.edge] + (x - d.x) / d.scale);
  }
  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (d?.edge === 'move' && Math.abs(xAt(event) - d.x) > 4) {
      const state = useEditor.getState();
      let start = 0, target = state.clips.length - 1;
      for (const [index, clip] of state.clips.entries()) {
        if ((xAt(event) + scroll - 16) / scale < start + length(clip)) { target = index; break; }
        start += length(clip);
      }
      state.move(d.index, target);
    }
    drag.current = null;
  }
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => { drag.current = null; } };
}
