import { useRef, useState } from 'react';
import { useEditor } from '../../store';
import { accepts, clipEnd } from '../../editor/math';
import type { Asset } from '../../editor/types';
import { Icon } from '../icons';
import { LIBRARY_TABS } from './TabRail';
import type { LibraryTab } from './TabRail';
interface Props { active: LibraryTab; busy: boolean; onImport: (files: FileList) => void }
export function MediaPanel({ active, busy, onImport }: Props) {
  const input = useRef<HTMLInputElement>(null), [search, setSearch] = useState('');
  const document = useEditor(s => s.document), selection = useEditor(s => s.selection);
  const assets = Object.values(document.assets).filter(a => active !== 'audio' || a.kind === 'audio');
  const currentAsset = document.clips[selection[0]]?.assetId;
  const label = LIBRARY_TABS.find(([id]) => id === active)?.[1];
  const visible = assets.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  function insert(asset: Asset) {
    const s = useEditor.getState(), track = s.document.tracks.find(t => !t.locked && accepts(t, asset));
    if (!track) { s.setError('Add or unlock a compatible track first.'); return; }
    const end = Math.max(0, ...Object.values(s.document.clips).filter(c => c.trackId === track.id).map(clipEnd));
    s.insertAsset(asset.id, track.id, end);
  }
  return <section id="media-panel" className="media-panel panel" role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0}>
    <div className="panel-heading"><h2>{label}</h2><span className="subtle-label">{assets.length} files</span></div>
    {active === 'media' || active === 'audio' ? <>
      <input ref={input} type="file" accept={active === 'audio' ? 'audio/*' : 'video/*,audio/*'} multiple hidden disabled={busy}
        onChange={e => { if (e.target.files) onImport(e.target.files); e.target.value = ''; }} />
      <button className="button import-button" onClick={() => input.current?.click()} disabled={busy}><Icon name="import" size={18} /> Import media</button>
      <label className="search-field"><Icon name="search" size={16} /><input aria-label="Search media" placeholder="Search your media"
        value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div className="media-list">{visible.map(asset => <div key={asset.id} className="media-item">
        <button className={`media-card ${currentAsset === asset.id ? 'is-selected' : ''}`} disabled={busy} draggable={!busy}
          onDragStart={e => e.dataTransfer.setData('application/x-trimcut-asset', asset.id)}
          onClick={() => {
            const clip = Object.values(document.clips).find(c => c.assetId === asset.id);
            if (clip) useEditor.getState().select(clip.id); else insert(asset);
          }} aria-label={`Select ${asset.name}; drag to insert on a track`}>
          <div className="media-placeholder"><Icon name={asset.kind === 'audio' ? 'audio' : 'media'} size={28} /><span>{asset.duration.toFixed(1)}s</span></div>
          <strong title={asset.name}>{asset.name}</strong><small>{asset.kind === 'audio' ? 'Audio' : `${asset.width} × ${asset.height} · Video`}</small>
        </button><button className="text-button" disabled={busy} onClick={() => insert(asset)}>Add to timeline</button>
      </div>)}
        {!assets.length && <div className="library-empty"><span className="empty-symbol"><Icon name="layers" size={32} /></span>
          <h3>A home for your footage</h3><p>Import video or audio. Drag a media card onto a compatible track.</p><small>Browser-supported codecs</small></div>}
        {!!assets.length && !visible.length && <p className="empty-hint">No media matches “{search}”.</p>}
      </div><div className="panel-footnote"><span className="status-dot" /> Media stays local · video and audio preview</div>
    </> : <div className="library-empty"><span className="empty-symbol"><Icon name={active} size={32} /></span>
      <h3>{label} workspace</h3><p>Track structure is ready. {label} content creation arrives in Phase 4.</p>
      <button className="button" disabled>Add {label?.toLowerCase()}</button>
    </div>}
  </section>;
}
