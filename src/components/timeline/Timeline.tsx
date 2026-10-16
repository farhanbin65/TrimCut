import { useAnalysis } from '../../media/cache/context';
import { Playhead } from './Playhead';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../store';
import { timecode } from '../../model';
import { documentDuration, frame, snapTargets, snapTime } from '../../editor/math';
import { drawTimeline, RULER_HEIGHT, TRACK_HEIGHT } from '../../timeline/drawTimeline';
import { useTimelinePointer } from '../../hooks/useTimelinePointer';
import { useTimelineKeys } from '../../hooks/useTimelineKeys';
import { TimelineToolbar } from './TimelineToolbar';
import { TrackHeaders } from './TrackHeaders';
import { TimelineAccess } from './TimelineAccess';
export function Timeline({ busy }: { busy: boolean }) {
  const { cache, revision } = useAnalysis();
  const media = useEditor(s => s.media);
  const [viewHeight, setViewHeight] = useState(160);
  const canvas = useRef<HTMLCanvasElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800), [scroll, setScroll] = useState({ x: 0, y: 0 }), [zoom, setZoom] = useState(1);
  const document = useEditor(s => s.document), time = useEditor(s => s.time), selection = useEditor(s => s.selection);
  const snapGuide = useEditor(s => s.snapGuide);
  const scale = 48 * zoom, total = documentDuration(document);
  const height = RULER_HEIGHT + document.tracks.length * TRACK_HEIGHT;
  const worldWidth = Math.max(width, total * scale + width / 2);
  const pointer = useTimelinePointer(scale, scroll.x, scroll.y), keys = useTimelineKeys(busy);
  useEffect(() => {
    const el = viewport.current; if (!el) return;
    const observer = new ResizeObserver(() => { setWidth(el.clientWidth); setViewHeight(el.clientHeight); });
    observer.observe(el); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (canvas.current) drawTimeline(canvas.current, { width, height: viewHeight, document, selection, scale, scroll: scroll.x, scrollY: scroll.y, snapGuide, cache });
  }, [width, viewHeight, document, selection, scale, scroll.x, scroll.y, snapGuide, cache, revision]);
  useEffect(() => {
    const el = viewport.current;
    if (el && !useEditor.getState().transaction && (time * scale < el.scrollLeft || time * scale > el.scrollLeft + width - 40)) {
      el.scrollLeft = Math.max(0, time * scale - width / 3);
    }
  }, [time, scale, width]);
  useEffect(() => {
    const el = viewport.current, clip = document.clips[selection[0]];
    if (!el || !clip || useEditor.getState().transaction) return;
    const top = RULER_HEIGHT + document.tracks.findIndex(t => t.id === clip.trackId) * TRACK_HEIGHT;
    if (top < el.scrollTop || top + TRACK_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = Math.max(0, top - RULER_HEIGHT);
    }
  }, [selection, document]);
  useEffect(() => {
    for (const clip of Object.values(document.clips)) {
      const row = document.tracks.findIndex(t => t.id === clip.trackId);
      const y = RULER_HEIGHT + row * TRACK_HEIGHT;
      if (y + TRACK_HEIGHT < scroll.y || y > scroll.y + viewHeight) continue;
      if ((clip.start + clip.out - clip.in) * scale < scroll.x || clip.start * scale > scroll.x + width) continue;
      const asset = document.assets[clip.assetId], source = media[clip.assetId];
      if (asset && source) cache?.request(asset, source);
    }
  }, [cache, document, media, scale, scroll, width, viewHeight]);
  function changeZoom(value: number) {
    setZoom(value);
    requestAnimationFrame(() => { if (viewport.current) viewport.current.scrollLeft = Math.max(0, time * 48 * value - width / 2); });
  }
  return <section id="timeline-panel" className="timeline-panel" aria-label="Timeline">
    <TimelineToolbar busy={busy} zoom={zoom} onZoom={changeZoom} />
    <div className="timeline-tracks"><TrackHeaders busy={busy} scrollTop={scroll.y} />
      <div className="timeline-scroll" ref={viewport} onScroll={e => setScroll({ x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop })}
        onDragOver={e => { if (e.dataTransfer.types.includes('application/x-trimcut-asset')) { e.preventDefault(); e.stopPropagation(); } }}
        onDrop={e => {
          const id = e.dataTransfer.getData('application/x-trimcut-asset'); if (!id) return;
          e.preventDefault(); e.stopPropagation(); if (busy) return;
          const rect = e.currentTarget.getBoundingClientRect(), s = useEditor.getState();
          const row = Math.floor((e.clientY - rect.top + e.currentTarget.scrollTop - RULER_HEIGHT) / TRACK_HEIGHT);
          const track = s.document.tracks[row]; if (!track) return;
          const at = Math.max(0, (e.clientX - rect.left + e.currentTarget.scrollLeft - 16) / scale);
          const time = s.snapping ? snapTime(at, [0], snapTargets(s.document, [], s.time), 8 / scale).value : frame(at);
          s.insertAsset(id, track.id, time);
        }}>
        <div className="timeline-world" style={{ width: worldWidth, height }}>
          <canvas ref={canvas} tabIndex={busy ? -1 : 0} role="slider" aria-label="Timeline playhead"
            aria-valuemin={0} aria-valuemax={total} aria-valuenow={time} aria-valuetext={timecode(time)} aria-disabled={busy}
            aria-describedby="timeline-instructions" style={{ width, height: viewHeight, pointerEvents: busy ? 'none' : 'auto' }}
            {...pointer} onKeyDown={keys} />
          <Playhead width={width} scale={scale} scroll={scroll.x} scrollY={scroll.y} height={viewHeight} />
        </div>
      </div>
    </div>
    <TimelineAccess busy={busy} />
    <div className="timeline-footer"><span id="timeline-instructions">Drag to move · Edges to trim · Ctrl/⌘ toggle · Shift range · Esc cancels</span>
      <span>{selection.length} selected · {timecode(total)}</span></div>
  </section>;
}
