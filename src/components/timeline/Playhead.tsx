import { useEffect, useRef } from 'react';
import { useEditor } from '../../store';
import { onPlaybackFrame } from '../../engine/events';
export function Playhead({ scale, scroll, scrollY, width, height }: { scale: number; scroll: number; scrollY: number; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = (time: number) => { if (ref.current) ref.current.style.transform = `translateX(${16 + time * scale - scroll}px)`; };
    update(useEditor.getState().time);
    const offFrame = onPlaybackFrame(f => update(f.time));
    const offState = useEditor.subscribe((s, old) => { if (s.time !== old.time) update(s.time); });
    return () => { offFrame(); offState(); };
  }, [scale, scroll]);
  return <div className="timeline-playhead-layer" aria-hidden="true" style={{ width, height, left: scroll, top: scrollY }}><div ref={ref} className="timeline-playhead" /></div>;
}
