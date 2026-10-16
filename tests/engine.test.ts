import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PlaybackClock, activeLayers, upcomingLayers, contain } from '../src/engine/plan.ts';
import { ResourceCache } from '../src/media/cache/lru.ts';
import { peakEnvelope } from '../src/media/cache/analysis.ts';
import { demuxMP4 } from '../src/engine/demux.ts';
import { emptyDocument } from '../src/editor/types.ts';
const source = { id: 'a', name: 'a', duration: 10, width: 640, height: 360, kind: 'video' as const };
const d = { ...emptyDocument(), assets: { a: source, b: { ...source, id: 'b', kind: 'audio' as const } }, clips: {
  bottom: { id: 'bottom', assetId: 'a', trackId: 'video', start: 0, in: 2, out: 6 },
  top: { id: 'top', assetId: 'a', trackId: 'overlay', start: 1, in: 0, out: 2 },
  sound: { id: 'sound', assetId: 'b', trackId: 'audio', start: 1, in: 3, out: 5 },
} };
test('shared clock advances independently of media, freezes while buffering, and rebases seek', () => {
  const c = new PlaybackClock(); c.seek(2, 10); c.play(10);
  assert.equal(c.read(11), 3); c.pause(11); assert.equal(c.read(20), 3);
  c.play(20); assert.equal(c.read(20.5), 3.5);
  c.seek(8, 21); assert.equal(c.read(22), 9); c.pause(22); assert.equal(c.read(30), 9);
});
test('active render plan preserves top-to-bottom order and maps independent source trims', () => {
  const layers = activeLayers(d, 1.5);
  assert.deepEqual(layers.map(l => l.clip.id), ['top', 'bottom', 'sound']);
  assert.deepEqual(layers.map(l => l.sourceTime), [0.5, 3.5, 3.5]);
  assert.equal(layers[2].visual, false);
  assert.notEqual(layers[0].key, layers[1].key, 'same source overlapping on two tracks gets separate channels');
});
test('hidden tracks are excluded from both render and audio plan; lookahead is bounded', () => {
  const hidden = { ...d, tracks: d.tracks.map(t => ({ ...t, hidden: t.id === 'audio' })) };
  assert.deepEqual(activeLayers(hidden, 1.5).map(l => l.clip.id), ['top', 'bottom']);
  assert.equal(upcomingLayers(d, 0, 0.5).length, 0);
  assert.deepEqual(upcomingLayers(d, 0.7).map(l => l.clip.id), ['top', 'sound']);
});
test('adjacent split clips share a channel; gaps contain no active source', () => {
  const doc = { ...d, clips: {
    first: { id: 'first', assetId: 'a', trackId: 'video', start: 0, in: 0, out: 1 },
    second: { id: 'second', assetId: 'a', trackId: 'video', start: 1, in: 1, out: 2 },
    third: { id: 'third', assetId: 'a', trackId: 'video', start: 3, in: 4, out: 5 },
  } };
  assert.equal(activeLayers(doc, 0.5)[0].key, activeLayers(doc, 1.5)[0].key);
  assert.equal(activeLayers(doc, 2.5).length, 0);
  assert.ok(activeLayers(doc, 4)[0].sourceTime < 5, 'last-frame display stays inside source range');
});
test('contain rectangles preserve source aspect and leave lower layers visible in margins', () => {
  assert.deepEqual(contain(100, 200, 400, 200), { x: 150, y: 0, width: 100, height: 200 });
  assert.deepEqual(contain(200, 100, 400, 200), { x: 0, y: 0, width: 400, height: 200 });
});
test('LRU evicts least recently used resources, disposes replacements, and respects byte cap', () => {
  const freed: string[] = [], cache = new ResourceCache<string>(10, value => freed.push(value));
  cache.set('a', 'A', 4); cache.set('b', 'B', 4); cache.get('a'); cache.set('c', 'C', 4);
  assert.deepEqual(freed, ['B']); assert.equal(cache.bytes, 8); assert.equal(cache.get('b'), undefined);
  cache.set('a', 'A2', 4); cache.set('huge', 'H', 11); assert.ok(freed.includes('H')); assert.ok(freed.includes('A'));
  cache.prune(new Set(['a'])); assert.equal(cache.size, 1); cache.clear(); assert.equal(cache.bytes, 0);
});
test('waveforms combine channels and preserve transients across bin boundaries', () => {
  const peaks = peakEnvelope([new Float32Array([0, 0.2, -0.8, 0]), new Float32Array([0.9, 0, 0, 0.4])], 2);
  assert.ok(Math.abs(peaks[0] - 0.9) < 1e-6); assert.ok(Math.abs(peaks[1] - 0.8) < 1e-6);
  assert.deepEqual([...peakEnvelope([], 3)], [0, 0, 0]);
});
test('MP4 demux extracts original H264 packets and normalizes edit-list timestamps', async () => {
  const bytes = await readFile(new URL('./fixtures/original-test.mp4', import.meta.url));
  const data = await demuxMP4(new File([bytes], 'original.mp4'));
  assert.ok(data.config.codec.startsWith('avc1')); assert.ok(data.config.description);
  assert.equal(data.packets.length, 30); assert.equal(Math.min(...data.packets.map(p => p.time)), 0);
  assert.ok(data.packets[0].key); assert.ok(data.packets.every(p => p.data.length > 0 && p.duration > 0));
});
test('invalid and oversized files decline fast-path decoding', async () => {
  await assert.rejects(demuxMP4(new File([new Uint8Array(17 * 1024 * 1024)], 'large.mp4')), /large/);
  await assert.rejects(demuxMP4(new File(['not video'], 'invalid.mp4')));
});
