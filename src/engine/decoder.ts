export interface VisualDecoder {
  readonly mode: 'WebCodecs' | 'Video element';
  request(time: number): void;
  image(time: number): CanvasImageSource | null;
  dispose(): void;
}
export class VideoElementDecoder implements VisualDecoder {
  readonly mode = 'Video element';
  constructor(private element: HTMLVideoElement) {}
  request() { /* The channel synchronizes this element with the shared clock. */ }
  image() { return this.element.readyState >= 2 && !this.element.seeking ? this.element : null; }
  dispose() { /* The channel owns the element and releases it. */ }
}
