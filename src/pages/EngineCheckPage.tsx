import { useState } from 'react';
import { App } from '../App';
import { useEditor } from '../store';
import { importVideo } from '../media/importVideo';
import { usePreviewSettings } from '../engine/settings';
// Development-only reproducible smoke fixture; all media is originally generated.
export function EngineCheckPage() {
  const [loading, setLoading] = useState(false);
  const hasMedia = useEditor(s => Object.keys(s.document.assets).length > 0);
  async function load() {
    setLoading(true);
    try {
      for (const [name, type] of [['base.mp4', 'video/mp4'], ['overlay.mp4', 'video/mp4'], ['audio.wav', 'audio/wav']]) {
        const response = await fetch(`/demo/${name}`);
        if (!response.ok) throw Error('Original test fixture is unavailable.');
        await importVideo(new File([await response.blob()], name, { type }));
      }
      const s = useEditor.getState();
      const overlay = Object.values(s.document.clips).find(c => s.document.assets[c.assetId].name === 'overlay.mp4');
      if (overlay) s.apply('Arrange original demo', d => ({ ...d, clips: { ...d.clips, [overlay.id]: { ...overlay, trackId: 'overlay', start: 0 } } }));
      usePreviewSettings.setState({ volume: 0.2 });
    } catch (e) { useEditor.getState().setError(e instanceof Error ? e.message : 'Demo import failed.'); }
    finally { setLoading(false); }
  }
  return <><App /><div className="engine-check-tools" aria-label="Development engine checks">
    <button disabled={loading || hasMedia} onClick={() => void load()}>Load original engine demo</button>
    <button disabled={!hasMedia || loading} onClick={() => {
      const s = useEditor.getState(); s.move(Object.keys(s.document.clips), 2);
    }}>Insert 2s leading gap</button>
    <button disabled={!hasMedia || loading} onClick={() => {
      const s = useEditor.getState(), base = Object.values(s.document.clips).find(c => s.document.assets[c.assetId].name === 'base.mp4');
      if (base) { s.select(base.id); s.seek(base.start + 2); s.split(); }
    }}>Split base at 2s</button>
  </div></>;
}
