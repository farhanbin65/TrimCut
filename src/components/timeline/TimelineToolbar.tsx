import { useState } from 'react';
import { IconButton } from '../ui/IconButton';
import { HistoryButtons } from './HistoryButtons';
import { useEditor } from '../../store';
import { TRACK_KINDS } from '../../editor/types';
import type { TrackKind } from '../../editor/types';
interface Props { busy: boolean; zoom: number; onZoom: (zoom: number) => void }
export function TimelineToolbar({ busy, zoom, onZoom }: Props) {
  const selection = useEditor(s => s.selection), snapping = useEditor(s => s.snapping);
  const clipboard = useEditor(s => s.clipboard), document = useEditor(s => s.document);
  const [kind, setKind] = useState<TrackKind>('video');
  const state = useEditor.getState;
  const disabled = busy || !selection.length;
  return <div className="timeline-toolbar" aria-label="Timeline tools">
    <div className="tool-group">
      <IconButton icon="select" label="Selection tool" active aria-pressed="true" />
      <IconButton icon="split" label="Split at playhead" onClick={() => state().split()} disabled={busy || !Object.keys(document.clips).length} />
      <IconButton icon="delete" label="Delete selected clips" onClick={() => state().remove()} disabled={disabled} />
      <IconButton icon="ripple" label="Ripple delete across all tracks" onClick={() => state().remove(true)} disabled={disabled} />
      <HistoryButtons busy={busy} />
      <IconButton icon="snap" label="Magnetic snapping (Alt bypasses)" active={snapping} aria-pressed={snapping}
        onClick={() => state().setSnapping(!snapping)} disabled={busy} />
      <IconButton icon="link" label="Link selected clips" onClick={() => state().link()} disabled={busy || selection.length < 2} />
      <IconButton icon="unlink" label="Unlink selected clips" onClick={() => state().unlink()} disabled={disabled} />
      <button className="text-button" disabled={disabled} onClick={() => state().copy()}>Copy</button>
      <button className="text-button" disabled={busy || !clipboard.length} onClick={() => state().paste()}>Paste</button>
      <button className="text-button" disabled={disabled} onClick={() => state().duplicate()}>Duplicate</button>
      <IconButton icon="marker" label="Add marker at playhead" onClick={() => state().addMarker()} disabled={busy} />
      <select aria-label="New track type" value={kind} onChange={e => setKind(e.target.value as TrackKind)} disabled={busy}>
        {TRACK_KINDS.map(k => <option key={k}>{k}</option>)}</select>
      <button className="text-button" disabled={busy} onClick={() => state().addTrack(kind)}>Add track</button>
    </div>
    <div className="tool-group zoom-tools">
      <IconButton icon="zoom-out" label="Zoom out timeline" disabled={zoom <= 0.25 || busy} onClick={() => onZoom(Math.max(0.25, zoom - 0.25))} />
      <input type="range" aria-label="Timeline zoom" min="0.25" max="8" step="0.25" value={zoom} disabled={busy} onChange={e => onZoom(Number(e.target.value))} />
      <IconButton icon="zoom-in" label="Zoom in timeline" disabled={zoom >= 8 || busy} onClick={() => onZoom(Math.min(8, zoom + 0.25))} />
    </div>
  </div>;
}
