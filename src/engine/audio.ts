export class AudioMixer {
  readonly context = new AudioContext({ latencyHint: 'interactive' });
  private master = this.context.createGain();
  private analyser = this.context.createAnalyser();
  private samples = new Float32Array(256);
  private limiter = this.context.createDynamicsCompressor();
  constructor() {
    this.master.gain.value = 0.8;
    this.limiter.threshold.value = -3; this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20; this.limiter.attack.value = 0.003; this.limiter.release.value = 0.15;
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser); this.analyser.connect(this.limiter); this.limiter.connect(this.context.destination);
  }
  attach(element: HTMLMediaElement) {
    const source = this.context.createMediaElementSource(element), gain = this.context.createGain();
    gain.gain.value = 0; source.connect(gain); gain.connect(this.master);
    return { gain, dispose: () => { source.disconnect(); gain.disconnect(); } };
  }
  level() { this.analyser.getFloatTimeDomainData(this.samples); return Math.sqrt(this.samples.reduce((sum, n) => sum + n * n, 0) / this.samples.length); }
  resume() { return this.context.resume(); }
  volume(value: number) { this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.01); }
  dispose() { this.master.disconnect(); this.analyser.disconnect(); this.limiter.disconnect(); void this.context.close(); }
}
