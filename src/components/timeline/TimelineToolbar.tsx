import { IconButton } from '../ui/IconButton';
import { useEditor } from '../../store';
interface Props { busy: boolean; zoom: number; onZoom: (zoom: number) => void }
export function TimelineToolbar({ busy, zoom, onZoom }: Props) {
  const hasClips = useEditor(s => s.clips.length > 0);
  const split = useEditor(s => s.split);
  return <div className="timeline-toolbar" role="toolbar" aria-label="Timeline tools">
    <div className="tool-group">
      <IconButton icon="select" label="Selection tool" active aria-pressed="true" />
      <IconButton icon="split" label="Split at playhead" onClick={split} disabled={busy || !hasClips} />
      <IconButton icon="delete" label="Delete — available in Phase 2" disabled />
      <span className="divider" />
      <IconButton icon="undo" label="Undo — available in Phase 2" disabled />
      <IconButton icon="redo" label="Redo — available in Phase 2" disabled />
      <span className="divider" />
      <IconButton icon="snap" label="Snapping — available in Phase 2" disabled />
      <IconButton icon="link" label="Link clips — available in Phase 2" disabled />
    </div>
    <div className="tool-group zoom-tools"><IconButton icon="zoom-out" label="Zoom out timeline" disabled={zoom <= 0.5 || busy} onClick={() => onZoom(Math.max(0.5, zoom - 0.25))} />
      <input type="range" aria-label="Timeline zoom" min="0.5" max="4" step="0.25" value={zoom} disabled={busy} onChange={e => onZoom(Number(e.target.value))} />
      <IconButton icon="zoom-in" label="Zoom in timeline" disabled={zoom >= 4 || busy} onClick={() => onZoom(Math.min(4, zoom + 0.25))} />
      <IconButton icon="fit" label="Reset timeline zoom" disabled={busy} onClick={() => onZoom(1)} />
    </div>
  </div>;
}
