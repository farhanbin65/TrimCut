import { useRef, useState } from 'react';
import { useEditor } from '../../store';
import { Icon } from '../icons';
import { LIBRARY_TABS } from './TabRail';
import type { LibraryTab } from './TabRail';
interface Props { active: LibraryTab; busy: boolean; onImport: (files: FileList) => void }
export function MediaPanel({ active, busy, onImport }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const clips = useEditor(s => s.clips);
  const selected = useEditor(s => s.selected);
  const select = useEditor(s => s.select);
  const assets = [...new Map(clips.map(c => [c.assetId, c])).values()];
  const currentAsset = clips.find(c => c.id === selected)?.assetId;
  const label = LIBRARY_TABS.find(([id]) => id === active)?.[1];
  return <section id="media-panel" className="media-panel panel" role="tabpanel"
    aria-labelledby={`tab-${active}`} tabIndex={0}>
    <div className="panel-heading"><h2>{label}</h2><span className="subtle-label">{active === 'media' ? `${assets.length} files` : 'Library'}</span></div>
    {active === 'media' ? <>
      <input ref={input} type="file" accept="video/*" multiple hidden disabled={busy}
        onChange={e => { if (e.target.files) onImport(e.target.files); e.target.value = ''; }} />
      <button className="button import-button" onClick={() => input.current?.click()} disabled={busy}>
        <Icon name="import" size={18} /> Import media
      </button>
      <label className="search-field"><Icon name="search" size={16} />
        <input aria-label="Search media" placeholder="Search your media" value={search} onChange={e => setSearch(e.target.value)} />
      </label>
      <div className="media-list">
        {assets.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(clip =>
          <button key={clip.assetId} className={`media-card ${currentAsset === clip.assetId ? 'is-selected' : ''}`}
            disabled={busy} onClick={() => select(clip.id)} aria-label={`Select ${clip.name}`}>
            <div className="media-placeholder"><Icon name="media" size={28} /><span>{clip.duration.toFixed(1)}s</span></div>
            <strong title={clip.name}>{clip.name}</strong><small>{clip.width} × {clip.height} · Video</small>
          </button>)}
        {assets.length === 0 && <div className="library-empty"><span className="empty-symbol"><Icon name="layers" size={32} /></span>
          <h3>A home for your footage</h3><p>Import a video or drop it into the editor to start your story.</p>
          <small>MP4, MOV, WebM · browser-supported codecs</small></div>}
        {assets.length > 0 && !assets.some(c => c.name.toLowerCase().includes(search.toLowerCase())) &&
          <p className="empty-hint">No media matches “{search}”.</p>}
      </div>
      <div className="panel-footnote"><span className="status-dot" /> Your media stays on this device</div>
    </> : <div className="library-empty"><span className="empty-symbol"><Icon name={active} size={32} /></span>
      <h3>{label === 'Adjustment' ? 'Shape the mood' : `${label}, in your workspace`}</h3>
      <p>{label} editing will arrive in a later phase. Your imported footage is in Media.</p>
      <button className="button" disabled>{label === 'Captions' ? 'Generate captions' : `Add ${label?.toLowerCase()}`}</button>
    </div>}
  </section>;
}
