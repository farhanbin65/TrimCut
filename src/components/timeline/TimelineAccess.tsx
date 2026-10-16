import { useEditor } from '../../store';
import { orderedClips } from '../../editor/math';
import { timecode } from '../../model';
export function TimelineAccess({ busy }: { busy: boolean }) {
  const document = useEditor(s => s.document), selection = useEditor(s => s.selection);
  return <details className="timeline-access"><summary>Clips & markers · keyboard access</summary>
    <div className="timeline-access-items" aria-label="Timeline clips">{orderedClips(document).map(c =>
      <button key={c.id} disabled={busy} aria-pressed={selection.includes(c.id)} onClick={e => {
        const s = useEditor.getState(); s.select(c.id, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'only'); s.play(false); s.seek(c.start);
      }}>{document.assets[c.assetId].name} · {document.tracks.find(t => t.id === c.trackId)?.name} · {timecode(c.start)}</button>)}
      {document.markers.map(m => <span key={m.id}><button disabled={busy} onClick={() => {
        const s = useEditor.getState(); s.play(false); s.seek(m.time);
      }}>{m.name} · {timecode(m.time)}</button><button disabled={busy} aria-label={`Remove ${m.name}`} onClick={() => useEditor.getState().removeMarker(m.id)}>×</button></span>)}
    </div>
  </details>;
}
