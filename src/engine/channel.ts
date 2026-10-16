import type { AudioMixer } from './audio';
import type { RuntimeMedia } from '../editor/types';
import { VideoElementDecoder } from './decoder';
import type { VisualDecoder } from './decoder';
import { WebCodecsDecoder } from './webCodecs';
import { demuxMP4 } from './demux';
export class MediaChannel {
  readonly element = document.createElement('video');
  readonly sourceUrl: string;
  decoder: VisualDecoder;
  private audio: ReturnType<AudioMixer['attach']>;
  private dead = false;
  private seekingTo: number | null = null;
  private playPending = false;
  private removeListeners: (() => void)[] = [];
  private candidate?: VisualDecoder;
  constructor(readonly media: RuntimeMedia, readonly visual: boolean, mixer: AudioMixer,
    private changed: () => void, private failed: (message: string) => void, allowWebCodecs: boolean, useProxy: boolean) {
    const e = this.element;
    this.sourceUrl = useProxy && media.proxyUrl ? media.proxyUrl : media.url;
    e.preload = 'auto'; e.playsInline = true; e.src = this.sourceUrl;
    this.audio = mixer.attach(e); this.decoder = new VideoElementDecoder(e);
    for (const type of ['loadeddata', 'canplay', 'seeked', 'ended']) {
      const listener = () => { if (type === 'seeked') this.seekingTo = null; this.changed(); };
      e.addEventListener(type, listener); this.removeListeners.push(() => e.removeEventListener(type, listener));
    }
    const error = () => this.failed(e.error?.message || 'Media decoding failed. Try a preview proxy or another codec.');
    e.addEventListener('error', error); this.removeListeners.push(() => e.removeEventListener('error', error));
    e.load();
    if (visual && allowWebCodecs && this.sourceUrl === media.url && typeof VideoDecoder !== 'undefined') void this.upgrade();
  }
  private async upgrade() {
    try {
      const data = await demuxMP4(this.media.file);
      if (this.dead || !(await VideoDecoder.isConfigSupported(data.config)).supported) return;
      if (this.dead) return;
      this.candidate = new WebCodecsDecoder(data, this.changed, () => {
        this.candidate?.dispose(); this.candidate = undefined;
        if (this.decoder.mode === 'WebCodecs') { this.decoder.dispose(); this.decoder = new VideoElementDecoder(this.element); }
        this.changed();
      });
      this.changed();
    } catch { /* Unsupported input retains the streaming browser decoder. */ }
  }
  prepare(time: number, running: boolean) {
    const e = this.element;
    const tolerance = running ? 0.12 : 0.025;
    if (e.readyState >= 1 && Math.abs(e.currentTime - time) > tolerance && !e.seeking && this.seekingTo === null) {
      this.seekingTo = time; e.currentTime = Math.min(time, Math.max(0, e.duration - 0.001));
    }
    this.candidate?.request(time);
    if (this.candidate?.image(time)) { this.decoder = this.candidate; this.candidate = undefined; }
    this.decoder.request(time);
  }
  run(time: number, running: boolean, audible: boolean) {
    const e = this.element;
    this.audio.gain.gain.value = audible && running ? 1 : 0;
    if (running && this.ready(time) && e.paused && !this.playPending) {
      this.playPending = true;
      void e.play().catch((error: unknown) => {
        if (!this.dead && !(error instanceof DOMException && error.name === 'AbortError')) this.failed('Playback was blocked. Click Play to retry.');
      }).finally(() => { this.playPending = false; this.changed(); });
    } else if (!running && !e.paused) e.pause();
  }
  ready(time: number) {
    return this.element.readyState >= 2 && !this.element.seeking && Math.abs(this.element.currentTime - time) < 0.2;
  }
  image(time: number) { return this.decoder.image(time) || (this.ready(time) ? this.element : null); }
  silence() { this.audio.gain.gain.value = 0; this.element.pause(); }
  dispose() {
    this.dead = true; this.silence(); this.removeListeners.forEach(remove => remove());
    this.candidate?.dispose(); this.decoder.dispose(); this.audio.dispose();
    this.element.removeAttribute('src'); this.element.load();
  }
}
