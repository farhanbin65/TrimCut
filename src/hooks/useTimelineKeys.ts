import type { KeyboardEvent } from 'react';
import { useEditor } from '../store';
import { documentDuration } from '../editor/math';
export function useTimelineKeys(busy: boolean) {
  return (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (busy) return;
    const s = useEditor.getState(), mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') s.cancel();
    else if (s.transaction) return;
    else if (mod && e.key.toLowerCase() === 'z') { if (e.shiftKey) s.redo(); else s.undo(); }
    else if (mod && e.key.toLowerCase() === 'c') s.copy();
    else if (mod && e.key.toLowerCase() === 'v') s.paste();
    else if (mod && e.key.toLowerCase() === 'd') s.duplicate();
    else if (e.key === 'Delete' || e.key === 'Backspace') s.remove(e.shiftKey);
    else if (e.key.toLowerCase() === 's') s.split();
    else if (e.key.toLowerCase() === 'm') s.addMarker();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      s.play(false); s.seek(s.time + (e.key === 'ArrowRight' ? 1 : -1) / 30);
    } else if (e.key === 'Home' || e.key === 'End') {
      s.play(false); s.seek(e.key === 'Home' ? 0 : documentDuration(s.document));
    } else return;
    e.preventDefault();
  };
}
