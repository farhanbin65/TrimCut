import type { VisualDecoder } from './decoder';
import type { DemuxedVideo } from './demux';
export class WebCodecsDecoder implements VisualDecoder {
  readonly mode = 'WebCodecs';
  private decoder: VideoDecoder;
  private frames: VideoFrame[] = [];
  private target = -1;
  private cursor = 0;
  private limit = 0;
  private flushed = false;
  private closed = false;
  private generation = 0;
  constructor(private data: DemuxedVideo, private changed: () => void, private failed: () => void) {
    this.decoder = this.create();
  }
  private create() {
    const generation = ++this.generation;
    const decoder = new VideoDecoder({ output: frame => {
      if (this.closed || generation !== this.generation || frame.timestamp / 1e6 < this.target - 0.08) { frame.close(); return; }
      this.frames.push(frame); this.frames.sort((a, b) => a.timestamp - b.timestamp);
      while (this.frames.length > 10) this.frames.pop()!.close();
      this.changed();
    }, error: () => { if (!this.closed) this.failed(); } });
    decoder.configure(this.data.config); decoder.ondequeue = () => this.pump(); return decoder;
  }
  request(time: number) {
    if (this.closed) return;
    const discontinuity = this.target < 0 || time < this.target - 0.05 || time > this.target + 0.5;
    if (discontinuity || (this.flushed && !this.image(time))) {
      this.decoder.close(); this.frames.forEach(f => f.close()); this.frames = [];
      this.cursor = 0;
      for (let i = 0; i < this.data.packets.length; i++) {
        const p = this.data.packets[i]; if (p.key && p.time <= time) this.cursor = i;
      }
      this.decoder = this.create(); this.flushed = false;
    }
    this.target = time;
    while (this.frames.length > 1 && this.frames[1].timestamp / 1e6 <= time) this.frames.shift()!.close();
    this.limit = this.cursor;
    for (let i = this.cursor; i < this.data.packets.length; i++) {
      if (this.data.packets[i].time <= time + 0.2) this.limit = Math.min(this.data.packets.length, i + 5);
      if (this.data.packets[i].time > time + 1) break;
    }
    this.pump();
  }
  private pump() {
    if (this.closed || this.decoder.state !== 'configured' || this.flushed) return;
    try {
      while (this.cursor < this.limit && this.decoder.decodeQueueSize < 8) {
        const p = this.data.packets[this.cursor++];
        this.decoder.decode(new EncodedVideoChunk({ type: p.key ? 'key' : 'delta', timestamp: Math.round(p.time * 1e6),
          duration: Math.round(p.duration * 1e6), data: p.data }));
      }
      if (this.cursor === this.data.packets.length && !this.flushed) {
        this.flushed = true; void this.decoder.flush().then(this.changed).catch(() => { if (!this.closed) this.failed(); });
      }
    } catch { this.failed(); }
  }
  image(time: number): VideoFrame | null {
    const found = [...this.frames].reverse().find(f => f.timestamp / 1e6 <= time + 0.001);
    return found && time - found.timestamp / 1e6 < 0.1 ? found : null;
  }
  dispose() {
    if (this.closed) return; this.closed = true;
    if (this.decoder.state !== 'closed') this.decoder.close();
    this.frames.forEach(f => f.close()); this.frames = [];
  }
}
