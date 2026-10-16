import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trim, split, locate, duration, serialize, validateProject, timecode } from '../src/model.ts';

const clip = { id: 'a', assetId: 'asset', name: 'test', duration: 10, in: 2, out: 8 };

test('trim clamps crossed and out-of-source bounds', () => {
  assert.equal(trim(clip, 'in', -4).in, 0);
  assert.ok(trim(clip, 'in', 99).in < 8);
  assert.equal(trim(clip, 'out', 100).out, 10);
  assert.deepEqual(trim(clip, 'out', NaN), clip);
});

test('split preserves source mapping and sequence duration', () => {
  const clips = split([clip], 3, 'b');
  assert.equal(clips.length, 2);
  assert.equal(clips[0].out, 5);
  assert.equal(clips[1].in, 5);
  assert.equal(duration(clips), 6);
  const boundary = locate(clips, 3);
  assert.ok(boundary);
  assert.equal(boundary.clip.id, 'b');
  assert.equal(boundary.source, 5);
  assert.equal(split([clip], 0, 'b').length, 1);
});

test('project excludes runtime file/blob data and rejects invalid intervals', () => {
  const runtimeClip = { ...clip, file: 'runtime', url: 'blob:temp' };
  const project = serialize([runtimeClip]);
  assert.equal('url' in project.clips[0], false);
  assert.equal('file' in project.clips[0], false);
  validateProject(project);
  assert.throws(() => validateProject({ ...project, clips: [{ ...clip, out: 99 }] }));
});

test('project stores selected aspect dimensions and project name', () => {
  const project = serialize([clip], 'Portrait story', '9:16');
  assert.equal(project.name, 'Portrait story');
  assert.equal(project.width, 1080);
  assert.equal(project.height, 1920);
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))), project);
});

test('invalid clips and project settings are rejected predictably', () => {
  const project = serialize([clip]);
  assert.throws(() => validateProject({ ...project, clips: [null] }), /Invalid clip/);
  assert.throws(() => validateProject({ ...project, clips: [clip, clip] }), /Invalid clip/);
  assert.throws(() => validateProject({ ...project, fps: 0 }), /Unsupported project/);
  assert.throws(() => validateProject({ ...project, width: Infinity }), /Unsupported project/);
});

test('timecode rolls frames into seconds and minutes', () => {
  assert.equal(timecode(29 / 30), '00:00:00:29');
  assert.equal(timecode(1), '00:00:01:00');
  assert.equal(timecode(60 + 1 / 30), '00:01:00:01');
});
