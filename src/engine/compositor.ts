import { useEditor } from '../store';
import { documentDuration } from '../editor/math';
import { AudioMixer } from './audio';
import { MediaChannel } from './channel';
import { activeLayers, upcomingLayers, contain, PlaybackClock } from './plan';
import type { ActiveLayer } from './plan';
import { publishFrame } from './events';
import { usePreviewSettings } from './settings';
const MAX_CHANNELS = 12;
export class Compositor {
  private mixer = new AudioMixer();
  private clock = new PlaybackClock();
  private channels = new Map<string, MediaChannel>();
  private raf = 0;
  private closed = false;
  private publishing = false;
  private lastPublish = 0;
  private waitingSince = 0;
  private unsubscribe: (() => void)[] = [];
  constructor(private canvas: () => HTMLCanvasElement | null) {
    this.clock.seek(useEditor.getState().time, this.now());
    this.unsubscribe.push(useEditor.subscribe((s, old) => {
      if (this.publishing) return;
      if (s.media !== old.media) {
        for (const [key, channel] of this.channels) {
          if (!Object.values(s.media).includes(channel.media)) { channel.dispose(); this.channels.delete(key); }
        }
      }
      if (s.time !== old.time || s.document !== old.document) this.clock.seek(s.time, this.now());
      if (s.playing !== old.playing) {
        this.clock.pause(this.now());
        if (s.playing) void this.mixer.resume().then(this.request).catch(() => this.fail('Click Play to enable audio.'));
        else this.channels.forEach(c => c.silence());
      }
      if (s.document !== old.document || s.media !== old.media || s.time !== old.time || s.playing !== old.playing) this.request();
    }));
    this.unsubscribe.push(usePreviewSettings.subscribe((s, old) => {
      if (s.volume !== old.volume) this.mixer.volume(s.volume);
      if (s.quality !== old.quality || s.decoder !== old.decoder) { this.releaseChannels(); this.clock.seek(useEditor.getState().time, this.now()); }
      if (s.quality !== old.quality || s.decoder !== old.decoder || s.volume !== old.volume) this.request();
    }));
    const hide = () => { if (document.hidden) useEditor.getState().play(false); };
    document.addEventListener('visibilitychange', hide);
    this.unsubscribe.push(() => document.removeEventListener('visibilitychange', hide)); this.request();
  }
  private now() { return this.mixer.context.currentTime; }
  readonly request = () => { if (!this.closed && !this.raf) this.raf = requestAnimationFrame(this.tick); };
  private fail(message: string) { if (this.closed) return; useEditor.getState().play(false); useEditor.getState().setError(message); }
  private releaseChannels() { this.channels.forEach(c => c.dispose()); this.channels.clear(); }
  private channel(layer: ActiveLayer, protectedKeys: Set<string>): MediaChannel | null {
    const runtime = useEditor.getState().media[layer.clip.assetId]; if (!runtime) return null;
    const settings = usePreviewSettings.getState(), proxy = settings.quality !== 'original' && !!runtime.proxyUrl;
    const url = proxy ? runtime.proxyUrl : runtime.url;
    let channel = this.channels.get(layer.key);
    if (channel && channel.sourceUrl !== url) { channel.dispose(); this.channels.delete(layer.key); channel = undefined; }
    if (!channel) {
      while (this.channels.size >= MAX_CHANNELS) {
        const removable = [...this.channels.keys()].find(key => !protectedKeys.has(key));
        if (!removable) return null;
        this.channels.get(removable)!.dispose(); this.channels.delete(removable);
      }
      channel = new MediaChannel(runtime, layer.visual, this.mixer, this.request, message => this.fail(message),
        settings.decoder === 'auto' && [...this.channels.values()].filter(c => c.visual).length < 2, proxy);
      this.channels.set(layer.key, channel);
    }
    return channel;
  }
  private tick = () => {
    this.raf = 0; if (this.closed) return;
    const s = useEditor.getState(), total = documentDuration(s.document), now = this.now();
    let time = Math.min(total, this.clock.read(now));
    const layers = activeLayers(s.document, time), keys = new Set(layers.map(l => l.key));
    if (layers.length > MAX_CHANNELS) { this.fail('Preview supports up to 12 simultaneous media layers. Hide a track to continue.'); return; }
    const active = layers.map(layer => ({ layer, channel: this.channel(layer, keys) }));
    for (const { layer, channel } of active) channel?.prepare(layer.sourceTime, s.playing);
    const ready = active.every(({ layer, channel }) => channel?.ready(layer.sourceTime));
    const running = s.playing && ready && this.mixer.context.state === 'running' && time < total;
    if (running) { this.waitingSince = 0; this.clock.play(now); }
    else {
      this.clock.pause(now);
      if (s.playing && !ready) {
        this.waitingSince ||= performance.now();
        if (performance.now() - this.waitingSince > 15000) this.fail('Preview could not buffer this media. Try a proxy or another codec.');
      } else this.waitingSince = 0;
    }
    for (const [key, channel] of this.channels) if (!keys.has(key)) channel.silence();
    for (const { layer, channel } of active) channel?.run(layer.sourceTime, running, true);
    // Bottom-to-top draw: higher tracks cover only their own fitted rectangle.
    const canvas = this.canvas(), context = canvas?.getContext('2d');
    if (canvas && context) {
      context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height);
      for (const { layer, channel } of [...active].reverse()) {
        if (!layer.visual || !channel) continue;
        const image = channel.image(layer.sourceTime), asset = s.document.assets[layer.clip.assetId];
        if (!image || !asset.width || !asset.height) continue;
        const box = contain(asset.width, asset.height, canvas.width, canvas.height);
        context.drawImage(image, box.x, box.y, box.width, box.height);
      }
    }
    if (s.playing && time >= total) { this.publishing = true; s.play(false); this.publishing = false; this.clock.pause(now); time = total; }
    if (performance.now() - this.lastPublish > 80 || !s.playing || time >= total) {
      this.publishing = true; if (s.time !== time) s.seek(time); this.publishing = false; this.lastPublish = performance.now();
      usePreviewSettings.setState({ level: running ? this.mixer.level() : 0 });
    }
    publishFrame({ time, buffering: s.playing && !running && time < total });
    const status = s.playing && !ready ? 'Buffering…' : s.playing && time < total ? 'Playing' : 'Ready';
    const upcoming = s.playing ? upcomingLayers(s.document, time) : [];
    if (s.playing) {
      for (const next of upcoming) if (!keys.has(next.key)) {
        const channel = this.channel(next, keys); channel?.prepare(next.sourceTime, false);
      }
    }
    const retained = new Set([...keys, ...upcoming.map(l => l.key)]);
    for (const [key, channel] of this.channels) if (!retained.has(key)) {
      channel.dispose(); this.channels.delete(key);
    }
    const wc = [...this.channels.values()].filter(c => c.decoder.mode === 'WebCodecs').length;
    const old = usePreviewSettings.getState();
    if (old.status !== status || old.channels !== this.channels.size || old.webCodecs !== wc) {
      usePreviewSettings.setState({ status, channels: this.channels.size, webCodecs: wc });
    }
    if (useEditor.getState().playing) this.request();
  };
  dispose() {
    this.closed = true; cancelAnimationFrame(this.raf); this.unsubscribe.forEach(fn => fn());
    this.releaseChannels(); this.mixer.dispose();
  }
}
