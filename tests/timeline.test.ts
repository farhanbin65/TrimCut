import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDocument } from '../src/editor/types.ts';
import type { EditorDocument, TimelineClip } from '../src/editor/types.ts';
import { clipEnd, documentDuration, frame, snapTime } from '../src/editor/math.ts';
import { moveClips, pasteClips, removeClips, splitClips, trimClip } from '../src/editor/operations.ts';
import { record, undo, execute, HISTORY_LIMIT } from '../src/editor/history.ts';
import type { History } from '../src/editor/history.ts';
import { validateDocument } from '../src/editor/validate.ts';
import { exportSequence, previewHit } from '../src/editor/selectors.ts';
const asset = { id: 'asset', name: 'Original', duration: 60, width: 1920, height: 1080, kind: 'video' as const };
const clip = (id: string, start: number, end: number, trackId = 'video'): TimelineClip => ({ id, assetId: 'asset', trackId, start, in: 2, out: 2 + end - start });
function doc(...clips: TimelineClip[]): EditorDocument {
  return { ...emptyDocument(), assets: { asset }, clips: Object.fromEntries(clips.map(c => [c.id, c])) };
}
let n = 0; const uuid = () => `new-${++n}`;
test('duration is maximum placed end, not sum of overlapping tracks', () => {
  assert.equal(documentDuration(doc(clip('a', 2, 7), clip('b', 4, 6, 'overlay'))), 7);
});
test('snap either selection edge to nearest target within pixel-equivalent tolerance', () => {
  assert.deepEqual(snapTime(2.1, [0, 3], [5], 0.2), { value: 2, guide: 5 });
  assert.deepEqual(snapTime(2.3, [0, 3], [5], 0.2), { value: 2.3, guide: null });
  assert.deepEqual(snapTime(2.1, [0], [2.2, 2], 0.2).value, frame(2.2));
});
test('move clamps group at zero and preserves offsets; compatible cross-track move works', () => {
  const d = doc(clip('a', 2, 4), clip('b', 6, 8));
  const result = moveClips(d, ['a', 'b'], -99, -1);
  assert.equal(result.clips.a.start, 0); assert.equal(result.clips.b.start, 4);
  assert.equal(result.clips.a.trackId, 'overlay'); assert.equal(d.clips.a.start, 2);
});
test('moves reject occupied, incompatible, and locked destinations atomically', () => {
  const d = doc(clip('a', 0, 3), clip('b', 5, 8));
  assert.throws(() => moveClips(d, ['a'], 4), /overlap/);
  assert.throws(() => moveClips(d, ['a'], 0, 1), /compatible/);
  const locked = { ...d, tracks: d.tracks.map(t => ({ ...t, locked: t.id === 'overlay' })) };
  assert.throws(() => moveClips(locked, ['a'], 0, -1), /unlocked/);
  assert.equal(d.clips.a.start, 0);
});
test('left trim preserves source mapping and right edge, clamps timeline zero', () => {
  const d = doc(clip('a', 1, 6));
  const result = trimClip(d, 'a', 'in', 4);
  assert.equal(result.clips.a.start, 3); assert.equal(result.clips.a.in, 4); assert.equal(clipEnd(result.clips.a), 6);
  const extended = trimClip(d, 'a', 'in', -99);
  assert.equal(extended.clips.a.start, 0); assert.equal(extended.clips.a.in, 1);
});
test('right trim clamps source end and minimum frame; neighboring collision rejected', () => {
  const d = doc(clip('a', 0, 3), clip('b', 4, 6));
  assert.throws(() => trimClip(d, 'a', 'out', 7), /overlap/);
  const result = trimClip(doc(clip('a', 0, 3)), 'a', 'out', 0);
  assert.ok(Math.abs(result.clips.a.out - result.clips.a.in - 1 / 30) < 1e-8);
  assert.equal(trimClip(doc(clip('a', 0, 3)), 'a', 'out', 99).clips.a.out, 60);
});
test('linked movement and trimming include unselected partners; locked partner prevents edit', () => {
  const d = doc({ ...clip('a', 2, 5), linkId: 'group' }, { ...clip('b', 2, 5, 'overlay'), linkId: 'group' });
  assert.equal(moveClips(d, ['a'], 1).clips.b.start, 3);
  assert.equal(trimClip(d, 'a', 'in', 3).clips.b.in, 3);
  d.tracks = d.tracks.map(t => ({ ...t, locked: t.id === 'overlay' }));
  assert.throws(() => moveClips(d, ['a'], 1), /Unlock/);
  assert.throws(() => trimClip(d, 'a', 'out', 4), /Unlock/);
});
test('split creates two frame-aligned ranges with shared asset and fresh right link group', () => {
  const d = doc({ ...clip('a', 1, 5), linkId: 'g' }, { ...clip('b', 1, 5, 'overlay'), linkId: 'g' });
  const result = splitClips(d, ['a'], 3, uuid), rights = Object.values(result.clips).filter(c => c.start === 3);
  assert.equal(Object.keys(result.clips).length, 4); assert.equal(result.clips.a.out, 4);
  assert.equal(rights[0].in, 4); assert.equal(rights[0].linkId, rights[1].linkId); assert.notEqual(rights[0].linkId, 'g');
  assert.equal(Object.keys(result.assets).length, 1); assert.equal(documentDuration(result), 5);
  assert.equal(Object.keys(splitClips(d, ['a'], 1, uuid).clips).length, 2);
});
test('normal delete leaves placements; ripple merges removed intervals once across tracks', () => {
  const d = doc(clip('a', 1, 4), clip('b', 2, 4, 'overlay'), clip('c', 6, 8));
  d.markers = [{ id: 'm', time: 7, name: 'Beat' }];
  assert.equal(removeClips(d, ['a', 'b']).clips.c.start, 6);
  const result = removeClips(d, ['a', 'b'], true);
  assert.equal(result.clips.c.start, 3); assert.equal(result.markers[0].time, 4);
});
test('ripple rejects surviving overlap and locked downstream content', () => {
  assert.throws(() => removeClips(doc(clip('a', 1, 4), clip('b', 2, 4, 'overlay')), ['a'], true), /still contains/);
  const d = doc(clip('a', 0, 2), clip('b', 4, 6, 'overlay'));
  d.tracks = d.tracks.map(t => ({ ...t, locked: t.id === 'overlay' }));
  assert.throws(() => removeClips(d, ['a'], true), /locked/);
});
test('paste preserves group offsets and remaps IDs/link groups without copying media', () => {
  const d = doc({ ...clip('a', 0, 2), linkId: 'g' }, { ...clip('b', 1, 3, 'overlay'), linkId: 'g' });
  const result = pasteClips(d, Object.values(d.clips), 6, uuid), copies = result.ids.map(id => result.document.clips[id]);
  assert.equal(copies[0].start, 6); assert.equal(copies[1].start, 7);
  assert.equal(copies[0].linkId, copies[1].linkId); assert.notEqual(copies[0].linkId, 'g');
  assert.equal(copies[0].assetId, 'asset'); assert.equal(result.document.assets, d.assets);
  assert.throws(() => pasteClips(d, Object.values(d.clips), 0, uuid), /overlap/);
});
test('commands restore whole document and selection; 120 edits retained, new edit clears redo', () => {
  let history: History = { past: [], future: [] }, d = doc(clip('a', 0, 2));
  for (let i = 1; i <= 140; i++) {
    const next = { ...d, name: String(i) };
    history = record(history, { label: 'Rename', before: { document: d, selection: ['a'] }, after: { document: next, selection: [] } }); d = next;
  }
  assert.equal(history.past.length, HISTORY_LIMIT);
  const command = history.past.at(-1)!;
  assert.equal(undo(command).document.name, '139'); assert.deepEqual(undo(command).selection, ['a']);
  assert.equal(execute(command).document.name, '140');
  const branched = record({ past: history.past.slice(0, -1), future: [command] }, { ...command, after: { document: { ...d, name: 'Branch' }, selection: [] } });
  assert.equal(branched.future.length, 0);
  assert.equal(record(history, { ...command, before: command.after }), history);
});
test('version 2 validates normalized references and excludes runtime handles', () => {
  const d = doc(clip('a', 0, 2)); assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(d))), d);
  assert.throws(() => validateDocument({ ...d, clips: { a: { ...d.clips.a, assetId: 'missing' } } }));
  assert.throws(() => validateDocument({ ...d, assets: { asset: { ...asset, url: 'blob:source' } } }));
  assert.throws(() => validateDocument({ ...d, clips: { a: { ...d.clips.a, start: 0.01 } } }));
});
const media = { asset: { file: new File([], 'test.mp4'), url: 'blob:test' } };
test('preview chooses top visible track; gaps are black; no fabricated sequential mapping', () => {
  const d = doc(clip('a', 1, 5), clip('b', 2, 4, 'overlay'));
  assert.equal(previewHit(d, media, 0), null); assert.equal(previewHit(d, media, 3)?.clip.id, 'b');
  assert.equal(previewHit(d, media, 4)?.clip.id, 'a');
  d.tracks = d.tracks.map(t => ({ ...t, hidden: t.kind === 'overlay' }));
  assert.equal(previewHit(d, media, 3)?.clip.id, 'a');
});
test('legacy export rejects gaps, overlaps, hidden or audio clips instead of flattening', () => {
  assert.equal(exportSequence(doc(clip('a', 0, 2), clip('b', 2, 4)), media).length, 2);
  assert.throws(() => exportSequence(doc(clip('a', 1, 3)), media), /continuous/);
  assert.throws(() => exportSequence(doc(clip('a', 0, 3), clip('b', 1, 3, 'overlay')), media), /continuous/);
  const d = doc(clip('a', 0, 3)); d.tracks = d.tracks.map(t => ({ ...t, hidden: true }));
  assert.throws(() => exportSequence(d, media), /continuous/);
});
