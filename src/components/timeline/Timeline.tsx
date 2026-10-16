import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../store';
import { duration, timecode } from '../../model';
import { drawTimeline } from '../../timeline/drawTimeline';
import { useTimelinePointer } from '../../hooks/useTimelinePointer';
import { Icon } from '../icons';
import { TimelineToolbar } from './TimelineToolbar';
export function Timeline({ busy }: { busy: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 150 });
  const [scroll, setScroll] = useState(0);
  const [zoom, setZoom] = useState(1);
  const clips = useEditor(s => s.clips);
  const time = useEditor(s => s.time);
  const selected = useEditor(s => s.selected);
  const playing = useEditor(s => s.playing);
  const scale = 48 * zoom;
  const total = duration(clips);
  const worldWidth = Math.max(size.width, total * scale + 96);
  const pointer = useTimelinePointer(scale, scroll);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height - 14 }));
    observer.observe(el); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (canvas.current) drawTimeline(canvas.current, { ...size, clips, time, selected, scale, scroll });
  }, [size, clips, time, selected, scale, scroll]);
  useEffect(() => {
    const el = viewport.current;
    if (el && playing && (time * scale < el.scrollLeft || time * scale > el.scrollLeft + size.width - 40)) {
      el.scrollLeft = Math.max(0, time * scale - size.width / 3);
    }
  }, [time, playing, scale, size.width]);
  function changeZoom(value: number) {
    setZoom(value);
    requestAnimationFrame(() => {
      if (viewport.current) viewport.current.scrollLeft = Math.max(0, time * 48 * value - size.width / 2);
    });
  }
  return <section id="timeline-panel" className="timeline-panel" aria-label="Timeline">
    <TimelineToolbar busy={busy} zoom={zoom} onZoom={changeZoom} />
    <div className="timeline-tracks"><div className="track-headers"><div className="track-ruler">TRACKS <span>01</span></div>
      <div className="track-title"><Icon name="media" size={17} /><span>Video 1</span><Icon name="eye" size={15} /></div>
      <div className="track-phase">Single track</div></div>
      <div className="timeline-scroll" ref={viewport} onScroll={e => setScroll(e.currentTarget.scrollLeft)}>
        <div className="timeline-world" style={{ width: worldWidth }}>
          <canvas ref={canvas} tabIndex={busy ? -1 : 0} role="slider" aria-label="Timeline playhead"
            aria-valuemin={0} aria-valuemax={total} aria-valuenow={time} aria-valuetext={timecode(time)} aria-disabled={busy}
            style={{ width: size.width, height: size.height, pointerEvents: busy ? 'none' : 'auto' }}
            {...pointer} onKeyDown={e => {
              if (busy) return;
              const state = useEditor.getState();
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault(); state.play(false); state.seek(time + (e.key === 'ArrowRight' ? 1 : -1) / 30);
              } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault(); state.play(false); state.seek(e.key === 'Home' ? 0 : total);
              }
            }} />
          {!clips.length && <div className="timeline-empty"><Icon name="import" size={18} /><span>Drop a video to start editing</span></div>}
        </div>
      </div>
    </div>
    <div className="timeline-footer"><span>Drag edges to trim · Drag clips to reorder</span><span>{clips.length} clips · {timecode(total)}</span></div>
  </section>;
}
