import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ASPECT_SIZES } from '../types.ts';
import type { AspectRatio, Clip } from '../types.ts';

let engine: FFmpeg | undefined;
let loading: Promise<boolean> | undefined;
let busy = false;

async function load(): Promise<FFmpeg> {
  if (!engine) {
    engine = new FFmpeg();
    const base = new URL(`${import.meta.env.BASE_URL}ffmpeg/`, location.href);
    loading = engine.load({
      coreURL: new URL('ffmpeg-core.js', base).href,
      wasmURL: new URL('ffmpeg-core.wasm', base).href,
    }).catch((error: unknown) => {
      engine?.terminate();
      engine = undefined;
      loading = undefined;
      throw error;
    });
  }
  const current = engine;
  await loading;
  return current;
}

function hasAudio(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !('streams' in value) || !Array.isArray(value.streams)) {
    throw Error('Cannot read media streams.');
  }
  if (!value.streams.some((stream: unknown) => stream !== null && typeof stream === 'object'
    && 'codec_type' in stream && stream.codec_type === 'video')) throw Error('No video stream found.');
  return value.streams.some((stream: unknown) => stream !== null && typeof stream === 'object'
    && 'codec_type' in stream && stream.codec_type === 'audio');
}

export async function exportMP4(
  clips: readonly Clip[], onProgress: (progress: number) => void,
  proxy = false, aspect: AspectRatio = '16:9',
): Promise<Blob> {
  if (busy) throw Error('An FFmpeg job is already running.');
  if (!clips.length) throw Error('Add a clip first.');
  busy = true;
  let ff: FFmpeg | undefined;
  const paths = new Set<string>();
  const progress = ({ progress }: { progress: number }) =>
    onProgress(Math.min(0.99, Math.max(0, progress)));
  try {
    ff = await load();
    ff.on('progress', progress);
    for (const [index, clip] of clips.entries()) {
      const input = `input${index}`, output = `part${index}.mp4`, probe = `probe${index}.json`;
      [input, output, probe].forEach(path => paths.add(path));
      await ff.writeFile(input, await fetchFile(clip.file));
      // Core 0.12.10 can return -1 after successfully writing probe JSON.
      // A fresh output file and validated streams are the success criteria.
      await ff.ffprobe(['-v', 'error', '-show_streams', '-of', 'json', input, '-o', probe]);
      const data = await ff.readFile(probe, 'utf8');
      if (typeof data !== 'string') throw Error('Invalid media metadata.');
      const audio = hasAudio(JSON.parse(data) as unknown);
      const [width, height] = ASPECT_SIZES[aspect];
      const filter = proxy
        ? 'scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1'
        : `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
      const code = await ff.exec([
        '-i', input, ...(audio ? [] : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000']),
        '-ss', String(clip.in), '-t', String(clip.out - clip.in),
        '-map', '0:v:0', '-map', audio ? '0:a:0' : '1:a:0', '-vf', filter,
        '-r', '30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', proxy ? '28' : '20',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2',
        '-af', 'apad', '-shortest', output,
      ]);
      if (code !== 0) throw Error('Video encoding failed.');
      await ff.deleteFile(input);
      paths.delete(input);
      await ff.deleteFile(probe);
      paths.delete(probe);
    }
    paths.add('list.txt');
    paths.add('export.mp4');
    await ff.writeFile('list.txt', new TextEncoder().encode(
      clips.map((_, index) => `file 'part${index}.mp4'`).join('\n'),
    ));
    if (await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt',
      '-c', 'copy', '-movflags', '+faststart', 'export.mp4']) !== 0) {
      throw Error('Concatenation failed.');
    }
    const data = await ff.readFile('export.mp4');
    if (typeof data === 'string') throw Error('Unexpected export data.');
    onProgress(1);
    return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
  } finally {
    if (ff) {
      ff.off('progress', progress);
      for (const path of paths) await ff.deleteFile(path).catch(() => undefined);
    }
    busy = false;
  }
}
