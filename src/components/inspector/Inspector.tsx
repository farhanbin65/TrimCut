import { useState } from 'react';
import { useEditor } from '../../store';
import { ASPECT_SIZES } from '../../types';
import { length, timecode } from '../../model';
import { Icon } from '../icons';
const tabs = ['Video', 'Audio', 'Speed', 'Animation', 'Adjust'] as const;
export function Inspector({ busy, onProxy }: { busy: boolean; onProxy: () => void }) {
  const clip = useEditor(s => s.clips.find(c => c.id === s.selected));
  const name = useEditor(s => s.projectName);
  const aspect = useEditor(s => s.aspect);
  const trim = useEditor(s => s.trim);
  const [tab, setTab] = useState<typeof tabs[number]>('Video');
  const [width, height] = ASPECT_SIZES[aspect];
  return <aside className="inspector panel" id="inspector-panel" aria-label="Inspector">
    <div className="panel-heading"><h2>{clip ? 'Inspector' : 'Project details'}</h2><Icon name="adjustment" size={17} /></div>
    {clip ? <>
      <div className="inspector-tabs" role="tablist" aria-label="Clip properties">
        {tabs.map((label, index) => <button id={`inspect-${label}`} key={label} role="tab"
          aria-selected={tab === label} aria-controls="inspector-content" tabIndex={tab === label ? 0 : -1}
          onClick={() => setTab(label)} onKeyDown={e => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            setTab(next); document.getElementById(`inspect-${next}`)?.focus();
          }}>{label}</button>)}
      </div>
      <div id="inspector-content" role="tabpanel" aria-labelledby={`inspect-${tab}`} tabIndex={0} className="inspector-content">
        <div className="clip-summary"><Icon name="media" /><strong title={clip.name}>{clip.name}</strong></div>
        {tab === 'Video' ? <>
          <section className="inspector-section"><h3>Source range <span>Seconds</span></h3>
            <label className="property-row">In point<input key={`${clip.id}-in-${clip.in}`} type="number" step={1 / 30}
              min={0} max={clip.out - 1 / 30} defaultValue={clip.in.toFixed(3)} disabled={busy}
              onBlur={e => { if (e.target.value !== '' && e.target.value !== clip.in.toFixed(3)) trim(clip.id, 'in', Number(e.target.value)); else e.target.value = clip.in.toFixed(3); }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
            <label className="property-row">Out point<input key={`${clip.id}-out-${clip.out}`} type="number" step={1 / 30}
              min={clip.in + 1 / 30} max={clip.duration} defaultValue={clip.out.toFixed(3)} disabled={busy}
              onBlur={e => { if (e.target.value !== '' && e.target.value !== clip.out.toFixed(3)) trim(clip.id, 'out', Number(e.target.value)); else e.target.value = clip.out.toFixed(3); }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
            <dl className="detail-list"><div><dt>Clip duration</dt><dd>{timecode(length(clip))}</dd></div>
              <div><dt>Source size</dt><dd>{clip.width} × {clip.height}</dd></div></dl>
          </section>
          <section className="inspector-section"><h3>Transform <span>Coming later</span></h3>
            <label className="property-row">Scale<input type="number" value={100} disabled readOnly /></label>
            <label className="property-row">Rotation<input type="number" value={0} disabled readOnly /></label>
            <div className="segmented"><button disabled><Icon name="mirror" size={16} />Mirror</button>
              <button disabled><Icon name="crop" size={16} />Crop</button></div>
          </section>
          <section className="inspector-section"><h3>Preview quality</h3><p className="muted">Create a smaller preview copy. Exports use your original file.</p>
            <button className="button full-width" disabled={busy} onClick={onProxy}>
              <Icon name={clip.proxyUrl ? 'check' : 'layers'} size={17} />{clip.proxyUrl ? 'Rebuild proxy' : 'Build preview proxy'}
            </button>
          </section>
        </> : <div className="inspector-unavailable"><Icon name={tab === 'Audio' ? 'audio' : tab === 'Speed' ? 'speed' : tab === 'Animation' ? 'keyframe' : 'adjustment'} size={30} />
          <h3>{tab} controls</h3><p>These controls will become available in the editing features phase.</p></div>}
      </div>
    </> : <div className="inspector-content"><div className="project-art"><Icon name="layers" size={40} /></div>
      <h3>{name || 'Untitled project'}</h3><dl className="detail-list">
        <div><dt>Aspect ratio</dt><dd>{aspect}</dd></div><div><dt>Canvas</dt><dd>{width} × {height}</dd></div>
        <div><dt>Frame rate</dt><dd>30 fps</dd></div><div><dt>Export</dt><dd>H.264 / MP4</dd></div></dl>
      <div className="inspector-tip"><Icon name="select" size={18} /><p>Select a clip to fine-tune its source range and preview quality.</p></div>
    </div>}
  </aside>;
}
