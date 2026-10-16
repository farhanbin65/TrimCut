import { MIN_CLIP } from '../model.ts';
import { useEditor } from '../store.ts';

export async function importVideo(file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(Error('Video metadata timed out.')), 15000);
      video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(Error('Cannot preview this codec. Try an H.264 MP4.'));
      };
      video.src = url;
    });
    if (!Number.isFinite(video.duration) || video.duration < MIN_CLIP || !video.videoWidth) {
      throw Error('Choose a video at least one frame long.');
    }
    const id = crypto.randomUUID();
    useEditor.getState().add({
      id, assetId: id, name: file.name, file, url,
      duration: video.duration, in: 0, out: video.duration,
      width: video.videoWidth, height: video.videoHeight,
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    video.onloadedmetadata = null;
    video.onerror = null;
    video.removeAttribute('src');
    video.load();
  }
}
