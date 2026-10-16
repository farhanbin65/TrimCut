import { useEditor } from '../../store';
import { editable, accepts, frame } from '../../editor/math';
export function PlacementControls({ busy }: { busy: boolean }) {
  const document = useEditor(s => s.document), selection = useEditor(s => s.selection);
  const clip = document.clips[selection[0]]; if (!clip) return null;
  const disabled = busy || !editable(document, selection);
  return <section className="inspector-section"><h3>Timeline placement <span>{selection.length} selected</span></h3>
    <label className="property-row">Start (seconds)<input key={`${clip.id}-${clip.start}`} type="number" min={0} step={1 / 30}
      defaultValue={clip.start.toFixed(3)} disabled={disabled} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onBlur={e => {
        const n = Number(e.target.value);
        if (e.target.value && Number.isFinite(n)) useEditor.getState().move(selection, frame(n) - clip.start);
        e.target.value = (useEditor.getState().document.clips[clip.id]?.start ?? clip.start).toFixed(3);
      }} /></label>
    <label className="property-row">Track<select value={clip.trackId} disabled={disabled} onChange={e => {
      const from = document.tracks.findIndex(t => t.id === clip.trackId), to = document.tracks.findIndex(t => t.id === e.target.value);
      useEditor.getState().move(selection, 0, to - from);
    }}>{document.tracks.map(t => <option key={t.id} value={t.id} disabled={t.locked || !accepts(t, document.assets[clip.assetId])}>{t.name}</option>)}</select></label>
    <p className="muted">Linked clips move and trim together. Left-edge trimming keeps the right edge fixed.</p>
  </section>;
}
