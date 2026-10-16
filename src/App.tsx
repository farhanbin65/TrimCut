import { AnalysisContext } from './media/cache/context';
import { useMediaLifecycle } from './hooks/useMediaLifecycle';
import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { useEditor } from './store';
import { useMediaJobs } from './hooks/useMediaJobs';
import { usePanelSizes } from './hooks/usePanelSizes';
import { TopBar } from './components/layout/TopBar';
import { TabRail } from './components/layout/TabRail';
import type { LibraryTab } from './components/layout/TabRail';
import { MediaPanel } from './components/layout/MediaPanel';
import { ResizeHandle } from './components/layout/ResizeHandle';
import { Inspector } from './components/inspector/Inspector';
import { VideoPreview } from './components/preview/VideoPreview';
import { Timeline } from './components/timeline/Timeline';
import { ShortcutsDialog } from './components/ui/ShortcutsDialog';
import { IconButton } from './components/ui/IconButton';
import { Icon } from './components/icons';
export function App() {
  const jobs = useMediaJobs();
  const analysis = useMediaLifecycle();
  const { sizes, resize } = usePanelSizes();
  const [tab, setTab] = useState<LibraryTab>('media');
  const [help, setHelp] = useState(false);
  const [dragging, setDragging] = useState(false);
  const error = useEditor(s => s.error);
  const setError = useEditor(s => s.setError);
  const style = { '--media-width': `${sizes.media}px`, '--inspector-width': `${sizes.inspector}px`,
    '--timeline-height': `${sizes.timeline}px` } as CSSProperties;
  function drop(event: DragEvent) {
    event.preventDefault(); setDragging(false);
    if (!jobs.busy && event.dataTransfer.files.length) { setTab('media'); void jobs.add(event.dataTransfer.files); }
  }
  return <AnalysisContext.Provider value={analysis}><main className={`editor ${dragging ? 'is-dropping' : ''}`} style={style}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={drop}>
    <TopBar busy={jobs.busy} onExport={() => void jobs.run()} onHelp={() => setHelp(true)} onSave={jobs.save} />
    <div className="workspace">
      <TabRail active={tab} onChange={setTab} />
      <MediaPanel active={tab} busy={jobs.busy} onImport={files => void jobs.add(files)} />
      <ResizeHandle panel="media" value={sizes.media} onResize={n => resize('media', n)} />
      <VideoPreview busy={jobs.busy} />
      <ResizeHandle panel="inspector" value={sizes.inspector} onResize={n => resize('inspector', n)} />
      <Inspector proxyBusy={jobs.proxyBusy} busy={jobs.busy} onProxy={() => void jobs.run(true)} />
    </div>
    <ResizeHandle panel="timeline" value={sizes.timeline} onResize={n => resize('timeline', n)} />
    <Timeline busy={jobs.busy} />
    <footer className="app-footer"><span><span className="status-dot" /> Local workspace</span>
      <span>TrimCut Studio <span className="footer-separator">/</span> Phase 3 <a href="/icons" target="_blank" rel="noopener noreferrer">Icon library ↗</a></span></footer>
    {dragging && <div className="drop-overlay"><Icon name="import" size={42} /><h2>Bring your story in</h2><p>Drop video files to import</p></div>}
    {jobs.proxyBusy && <div className="job-toast" role="status"><span className="spinner" /><div><strong>Building preview proxy</strong><p>Editing stays available · {Math.round(jobs.proxyProgress * 100)}%</p></div></div>}
    {jobs.busy && <div className="job-toast" role="status"><span className="spinner" /><div><strong>{jobs.status}</strong>
      <p>{jobs.status === 'Importing media' ? 'Reading source metadata…' : `${Math.round(jobs.progress * 100)}% · current encoding stage`}</p>
      <progress max={1} value={jobs.progress} aria-label={jobs.status} /></div></div>}
    {error && <div className="error-toast" role="alert"><p>{error}</p><IconButton icon="close" label="Dismiss error" onClick={() => setError('')} /></div>}
    <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
  </main></AnalysisContext.Provider>;
}
