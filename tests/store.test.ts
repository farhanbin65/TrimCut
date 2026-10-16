import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useEditor } from '../src/store.ts';
import { emptyDocument } from '../src/editor/types.ts';
import { moveClips } from '../src/editor/operations.ts';
import { validateDocument } from '../src/editor/validate.ts';
const state = useEditor.getState;
function reset() {
  useEditor.setState({ document: emptyDocument(), media: {}, selection: [], time: 0, playing: false, error: '',
    history: { past: [], future: [] }, transaction: null, clipboard: [] });
}
function add(id = 'a') {
  state().add({ id, assetId: id, name: id, file: new File([], `${id}.mp4`), url: `blob:${id}`,
    duration: 2, in: 0, out: 2, width: 640, height: 360 });
}
test('many drag updates record one command; undo/redo restores selection and placement', () => {
  reset(); add(); const count = state().history.past.length;
  state().begin(); const original = state().transaction!.document;
  for (let i = 1; i <= 60; i++) state().apply('Move', () => moveClips(original, ['a'], i / 30));
  assert.equal(state().history.past.length, count);
  state().commit('Move clips'); assert.equal(state().history.past.length, count + 1);
  assert.equal(state().document.clips.a.start, 2);
  state().undo(); assert.equal(state().document.clips.a.start, 0); assert.deepEqual(state().selection, ['a']);
  state().redo(); assert.equal(state().document.clips.a.start, 2);
});
test('cancel and zero-distance drags create no history; invalid edits are atomic', () => {
  reset(); add(); const before = state().document, count = state().history.past.length;
  state().begin(); state().move(['a'], 3); state().cancel();
  assert.equal(state().document, before); assert.equal(state().history.past.length, count);
  state().begin(); state().move(['a'], 0); state().commit('No change');
  assert.equal(state().history.past.length, count);
  state().move(['a'], 0, 1); assert.match(state().error, /compatible/); assert.equal(state().document.clips.a.trackId, 'video');
});
test('split shares asset/runtime records; import undo retains source for redo', () => {
  reset(); add(); state().seek(1); state().split();
  assert.equal(Object.keys(state().document.clips).length, 2);
  assert.equal(Object.keys(state().document.assets).length, 1); assert.equal(Object.keys(state().media).length, 1);
  state().undo(); state().undo(); assert.equal(Object.keys(state().document.assets).length, 0);
  state().redo(); assert.equal(state().media.a.url, 'blob:a'); validateDocument(state().document);
});
test('delete undo restores linked group; clipboard paste creates distinct instances', () => {
  reset(); add('a'); add('b'); state().select('a'); state().select('b', 'toggle'); state().link();
  const original = state().document; state().select('a'); assert.equal(state().selection.length, 2);
  state().remove(); assert.equal(Object.keys(state().document.clips).length, 0);
  state().undo(); assert.deepEqual(state().document, original); assert.equal(state().selection.length, 2);
  state().copy(); state().seek(4); state().paste(); assert.equal(Object.keys(state().document.clips).length, 4);
  assert.equal(state().selection.length, 2); assert.ok(state().selection.every(id => id !== 'a' && id !== 'b'));
  validateDocument(state().document);
});
test('locks, markers, and aspect changes are undoable; new edits discard redo', () => {
  reset(); add(); state().toggleTrack('video', 'locked'); state().remove(); assert.ok(state().document.clips.a);
  state().undo(); assert.equal(state().document.tracks.find(t => t.id === 'video')!.locked, false);
  state().setAspect('9:16'); assert.equal(state().history.future.length, 0);
  state().seek(1); state().addMarker(); assert.equal(state().document.markers[0].time, 1);
  state().undo(); assert.equal(state().document.markers.length, 0); state().undo(); assert.equal(state().document.aspect, '16:9');
});
