export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';
export type TrimEdge = 'in' | 'out';
export interface ClipRange {
  id: string;
  assetId: string;
  name: string;
  duration: number;
  in: number;
  out: number;
}
export interface Clip extends ClipRange {
  file: File;
  url: string;
  proxyUrl?: string;
  width: number;
  height: number;
}
export interface Project {
  version: 1;
  name: string;
  width: number;
  height: number;
  fps: number;
  clips: Array<ClipRange & { effects: never[]; keyframes: never[] }>;
}
export const ASPECT_SIZES: Record<AspectRatio, readonly [number, number]> = {
  '16:9': [1920, 1080], '9:16': [1080, 1920],
  '1:1': [1080, 1080], '4:5': [864, 1080],
};
export const FPS = 30;
