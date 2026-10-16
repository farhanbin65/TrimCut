import { createFile, DataStream, Endianness, MP4BoxBuffer } from 'mp4box';
import type { Sample } from 'mp4box';
export interface Packet { time: number; duration: number; key: boolean; data: Uint8Array<ArrayBuffer> }
export interface DemuxedVideo { config: VideoDecoderConfig; packets: Packet[] }
// Conservative fast path. Large files, rotation, complex edits and other containers use HTML media.
export async function demuxMP4(file: File): Promise<DemuxedVideo> {
  if (file.size > 16 * 1024 * 1024) throw Error('Use the streaming media fallback for large files.');
  const parser = createFile();
  let config: VideoDecoderConfig | undefined, error = '', shift = 0;
  const packets: Packet[] = [];
  parser.onError = message => { error = String(message); };
  parser.onReady = info => {
    const track = info.videoTracks[0];
    if (!track?.video || !track.codec.startsWith('avc1') || track.video.width * track.video.height > 1920 * 1080
      || track.nb_samples > 20000 || info.isFragmented) { error = 'Unsupported fast-path video'; return; }
    const matrix = track.matrix;
    if (matrix && (matrix[0] !== 65536 || matrix[1] !== 0 || matrix[3] !== 0 || matrix[4] !== 65536)) {
      error = 'Display transform requires media fallback'; return;
    }
    const edits = track.edits || [];
    if (edits.length > 1 || edits.some(e => e.media_time < 0 || e.media_rate_integer !== 1 || e.media_rate_fraction !== 0)) {
      error = 'Complex edit list requires media fallback'; return;
    }
    shift = edits[0]?.media_time || 0;
    const entry = parser.getTrackById(track.id).mdia.minf.stbl.stsd.entries[0];
    const pasp = 'pasp' in entry ? entry.pasp : null;
    if (!('avcC' in entry) || !entry.avcC || typeof entry.avcC !== 'object' || !('write' in entry.avcC) || typeof entry.avcC.write !== 'function'
      || (pasp && typeof pasp === 'object' && 'hSpacing' in pasp && 'vSpacing' in pasp && pasp.hSpacing !== pasp.vSpacing)) {
      error = 'Unsupported sample description'; return;
    }
    const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN); entry.avcC.write(stream);
    config = { codec: track.codec, codedWidth: track.video.width, codedHeight: track.video.height,
      description: new Uint8Array(stream.buffer.slice(8)), optimizeForLatency: true };
    parser.setExtractionOptions(track.id, undefined, { nbSamples: 100 }); parser.start();
  };
  parser.onSamples = (_id, _user, samples: Sample[]) => {
    for (const sample of samples) {
      if (!sample.data) { error = 'Missing sample data'; continue; }
      packets.push({ time: (sample.cts - shift) / sample.timescale, duration: sample.duration / sample.timescale,
        key: sample.is_sync, data: sample.data.slice() });
    }
  };
  parser.appendBuffer(MP4BoxBuffer.fromArrayBuffer(await file.arrayBuffer(), 0)); parser.flush(); parser.stop();
  if (error || !config || !packets.length) throw Error(error || 'No decodable samples');
  return { config, packets };
}
