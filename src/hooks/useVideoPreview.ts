import { useEffect, useRef } from 'react';
import { useEditor } from '../store';
import { duration, locate } from '../model';

export function useVideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clips = useEditor(s => s.clips);
  const time = useEditor(s => s.time);
  const playing = useEditor(s => s.playing);
  const hit = locate(clips, time);
  const url = hit?.clip.proxyUrl || hit?.clip.url;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    if (url) video.src = url; else video.removeAttribute('src');
    video.load();
    return () => { video.pause(); };
  }, [url]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hit) return;
    const sync = () => {
      const target = Math.min(hit.source, Math.max(hit.clip.in, hit.clip.out - 0.001));
      if ((!playing && Math.abs(video.currentTime - target) > 0.001)
        || Math.abs(video.currentTime - target) > 0.2) video.currentTime = target;
      if (playing && video.paused) {
        void video.play().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          useEditor.getState().play(false);
          useEditor.getState().setError(error instanceof Error ? error.message : 'Playback failed.');
        });
      } else if (!playing) video.pause();
    };
    if (video.readyState >= 1) sync(); else video.addEventListener('loadedmetadata', sync, { once: true });
    return () => video.removeEventListener('loadedmetadata', sync);
  }, [time, playing, hit?.clip.id, hit?.clip.in, hit?.clip.out, url]);
  useEffect(() => {
    let frame = 0;
    let lastDraw = '';
    let lastTick = 0;
    function tick(now: number) {
      const video = videoRef.current, canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const state = useEditor.getState();
      const active = locate(state.clips, state.time);
      if (video && canvas && ctx) {
        const signature = `${video.currentSrc}:${video.currentTime}:${video.readyState}:${canvas.width}:${canvas.height}`;
        if (signature !== lastDraw) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (video.readyState >= 2 && video.videoWidth > 0 && !video.seeking) {
            const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
            const width = video.videoWidth * scale, height = video.videoHeight * scale;
            ctx.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
            lastDraw = signature;
          }
        }
        if (state.playing && active && video.readyState >= 2 && !video.seeking) {
          if (video.currentTime >= active.clip.out - 0.005 || video.ended) {
            const next = active.start + active.clip.out - active.clip.in;
            if (next >= duration(state.clips) - 0.001) {
              video.pause(); state.play(false); state.seek(duration(state.clips));
            } else state.seek(next + 0.00001);
          } else if (!video.paused && now - lastTick >= 1000 / 30) {
            state.seek(active.start + Math.max(0, video.currentTime - active.clip.in));
            lastTick = now;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return { videoRef, canvasRef };
}
