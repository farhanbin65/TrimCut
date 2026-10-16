export interface PlaybackFrame { time: number; buffering: boolean }
const listeners = new Set<(frame: PlaybackFrame) => void>();
export function onPlaybackFrame(listener: (frame: PlaybackFrame) => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
export function publishFrame(frame: PlaybackFrame) { listeners.forEach(listener => listener(frame)); }
