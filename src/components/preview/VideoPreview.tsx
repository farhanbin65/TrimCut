import { PreviewSettings } from './PreviewSettings';
import { useRef, useState } from 'react';
import { useEditor } from '../../store';
import { ASPECT_SIZES } from '../../types';
import type { AspectRatio } from '../../types';
import { useVideoPreview } from '../../hooks/useVideoPreview';
import { Icon } from '../icons';
import { IconButton } from '../ui/IconButton';
import { Transport } from './Transport';
export function VideoPreview({ busy }: { busy: boolean }) {
  const { canvasRef } = useVideoPreview();
  const stage = useRef<HTMLDivElement>(null);
  const aspect = useEditor(s => s.document.aspect);
  const setAspect = useEditor(s => s.setAspect);
  const hasClips = useEditor(s => Object.keys(s.document.clips).length > 0);
  const [zoom, setZoom] = useState('fit');
  const [width, height] = ASPECT_SIZES[aspect];
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch { useEditor.getState().setError('Fullscreen is unavailable in this window.'); }
  }
  return <section className="preview-panel" aria-label="Player">
    <div className="panel-heading"><h2>Player</h2><div className="preview-options">
      <label className="compact-select"><span className="sr-only">Project aspect ratio</span>
        <select value={aspect} disabled={busy} onChange={e => setAspect(e.target.value as AspectRatio)}>
          {Object.keys(ASPECT_SIZES).map(ratio => <option key={ratio}>{ratio}</option>)}
        </select></label>
      <span className="preview-quality">Original / proxy</span>
    </div></div>
    <div className="preview-stage" ref={stage}>
      {hasClips ? <canvas ref={canvasRef} width={width / 2} height={height / 2} aria-label="Video preview"
        className={zoom === 'fit' ? 'canvas-fit' : 'canvas-zoom'}
        style={zoom === 'fit' ? undefined : { width: width * Number(zoom), height: height * Number(zoom) }} /> :
        <><canvas ref={canvasRef} width={960} height={540} hidden />
          <div className="preview-empty"><span className="preview-outline"><Icon name="play" size={32} /></span>
            <h2>Every story starts with a frame.</h2><p>Bring in your footage. Make it yours.</p><span>Drop video anywhere to begin</span></div></>}
    </div>
    <PreviewSettings />
    <div className="preview-bottom"><div className="preview-view-tools">
      <IconButton icon="fit" label="Zoom preview to fit" active={zoom === 'fit'} onClick={() => setZoom('fit')} />
      <select aria-label="Preview zoom" value={zoom} onChange={e => setZoom(e.target.value)}>
        <option value="fit">Fit</option><option value="0.5">50%</option><option value="1">100%</option>
      </select><IconButton icon="fullscreen" label="Fullscreen preview" onClick={() => void fullscreen()} />
    </div><Transport busy={busy} /></div>
  </section>;
}
