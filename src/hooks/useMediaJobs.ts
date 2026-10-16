import { useRef, useState } from 'react';
import { useEditor } from '../store.ts';
import { serialize } from '../model.ts';
import { importVideo } from '../media/importVideo.ts';
import { exportMP4 } from '../media/export.ts';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function useMediaJobs() {
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
    const { clips, selected, aspect, projectName } = useEditor.getState();
    const clip = clips.find(c => c.id === selected);
    if (proxy && !clip) return;
    await job(proxy ? 'Building preview proxy' : 'Exporting MP4', async () => {
      const source = proxy && clip ? [{ ...clip, in: 0, out: clip.duration }] : clips;
      const blob = await exportMP4(source, setProgress, proxy, aspect);
      if (proxy && clip) useEditor.getState().setProxy(clip.assetId, URL.createObjectURL(blob));
      else download(blob, `${projectName.trim() || 'TrimCut'}.mp4`);
    });
  }
  function save() {
    const { clips, projectName, aspect } = useEditor.getState();
    const data = serialize(clips, projectName, aspect);
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'TrimCut.project.json');
  }
  return { busy, status, progress, add, run, save };
}
export type MediaJobs = ReturnType<typeof useMediaJobs>;
