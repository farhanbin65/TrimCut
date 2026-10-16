import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store.ts';
import { exportSequence, resolveClips } from '../editor/selectors';
import { importVideo } from '../media/importVideo.ts';
import { exportMP4, exportProxy, disposeMediaEngines } from '../media/export.ts';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function useMediaJobs() {
  const [proxyBusy, setProxyBusy] = useState(false);
  const [proxyProgress, setProxyProgress] = useState(0);
  const proxyLock = useRef(false);
  useEffect(() => () => disposeMediaEngines(), []);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const locked = useRef(false);
  const busy = status !== '';
  async function job(label: string, run: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setStatus(label);
    setProgress(0);
    useEditor.getState().play(false);
    useEditor.getState().setError('');
    try { await run(); }
    catch (error) { useEditor.getState().setError(error instanceof Error ? error.message : 'Media job failed.'); }
    finally { locked.current = false; setStatus(''); }
  }
  async function add(files: FileList | File[]) {
    const incoming = Array.from(files);
    await job('Importing media', async () => {
      const failures: string[] = [];
      for (const file of incoming) {
        try { await importVideo(file); }
        catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'Import failed'}`); }
      }
      if (failures.length) throw Error(failures.join(' · '));
    });
  }
  async function run(proxy = false) {
    const { document, media, selection } = useEditor.getState();
    const { aspect, name: projectName } = document;
    const clip = resolveClips(document, media).find(c => c.id === selection[0]);
    if (proxy) {
      if (!clip || proxyLock.current || locked.current) return;
      proxyLock.current = true; setProxyBusy(true); setProxyProgress(0);
      try {
        const blob = await exportProxy([{ ...clip, in: 0, out: clip.duration }], setProxyProgress, true, aspect);
        useEditor.getState().setProxy(clip.assetId, URL.createObjectURL(blob));
      } catch (error) { useEditor.getState().setError(error instanceof Error ? error.message : 'Proxy generation failed.'); }
      finally { proxyLock.current = false; setProxyBusy(false); }
      return;
    }
    if (proxyLock.current) { useEditor.getState().setError('Wait for the preview proxy before exporting. Editing remains available.'); return; }
    await job('Exporting MP4', async () => {
      const blob = await exportMP4(exportSequence(document, media), setProgress, false, aspect);
      download(blob, `${projectName.trim() || 'TrimCut'}.mp4`);
    });
  }
  function save() {
    const data = useEditor.getState().document;
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'TrimCut.project.json');
  }
  return { busy, proxyBusy, proxyProgress, status, progress, add, run, save };
}
export type MediaJobs = ReturnType<typeof useMediaJobs>;
