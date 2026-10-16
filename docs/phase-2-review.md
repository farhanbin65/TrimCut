# Phase 2 review — timeline model and commands

## Delivered

- Normalized document: tracks[], clips{}, assets{}, markers[], project name/aspect, schemaVersion 2, and fixed 30fps timebase. Runtime File/blob URLs and proxies live separately from project metadata. Durations and resolved media are derived.
- Six track kinds: overlay, video, text, sticker, audio, effect. Importable video/audio can be placed only on compatible tracks. Text/sticker/effect content creation remains Phase 4.
- Explicit clip positions, gaps, cross-track overlaps, drag movement, edge trimming, selected/all-track split, delete, ripple delete, compatible cross-track movement, track lock/visibility.
- Snapping to playhead, clip starts/ends, zero, and markers, with an 8px tolerance and Alt bypass. Snap guide drawn on canvas.
- Ctrl/Command toggle selection and Shift range selection. Linked clips select, move, trim, and delete together. Copy/paste/duplicate create distinct clip IDs while sharing source assets; copied link groups get fresh IDs.
- Immutable reversible commands retain 120 edits. A pointer gesture is a transaction: one history entry on release; Escape/pointer cancellation restores the document; no-op edits create no entry. Undo/redo restores the document and selection.
- Track addition, locking, visibility, markers, project name, and aspect changes are undoable.
- Horizontal/vertical timeline scroll, zoom, playhead following, accessible clip/marker list, and inspector placement controls. Selected tracks are brought into view.
- Timeline-focused editing keys: S, Delete, Shift+Delete (ripple), Ctrl/Command Z and Shift-Z, C/V/D, arrows, Home/End, M and Escape. Global shortcut routing remains Phase 6.
- JSON download now contains schemaVersion 2 metadata; the optional server validates both legacy v1 and new v2 documents. Loading, relinking, migration, and autosave remain Phase 5.

## Editing rules

Times use seconds aligned to the fixed 30fps grid. Imported tails shorter than one frame are omitted. Same-track overlaps are rejected atomically; use a separate compatible track for overlapping footage. Left trim moves the clip start while retaining its right edge; linked trim applies a common source delta to the group. Duplicate inserts after the selected group's end and rejects collisions rather than overwriting existing clips.

Ripple deletion removes the union of selected time intervals globally and moves later clips/markers left. It rejects surviving content in those intervals and locked downstream clips. Select all content in the removed interval, or use normal delete. This avoids silently cutting another track or breaking its timing.

Runtime media is retained for undo/redo for the session. The in-memory clipboard is editor-local, not the operating system clipboard. If an import is undone, pasting clipboard clips that reference the now-absent document asset is rejected; redo the import first.

## Preview/export boundary

The Phase 2 playback adapter follows explicit placements, shows black gaps, and chooses the first visible video/overlay track from top to bottom. It plays only that video's embedded audio. Independent audio clips are editable but not mixed yet. Transparent compositing, multiple decoders, thumbnails, waveforms, and resource-cache management are Phase 3.

The existing MP4 exporter accepts a contiguous, non-overlapping video sequence. It rejects gaps, overlaps, hidden clips, missing media, and separate audio rather than producing a misleading flattened movie. Full multi-track export is Phase 5.

## Validation

- Strict TypeScript and production build pass.
- 26 tests pass: six legacy cases, fifteen new timeline/history/validation/adapter cases, and five actual Zustand store integration cases.
- Store coverage verifies 60 drag updates create one command, undo/redo restores placement and selection, Escape-equivalent cancel restores the original document, no-ops preserve history, split shares assets, and linked deletion/paste behaves correctly.
- Browser smoke checks at localhost: imported an original generated 4-second color video and original tone WAV; added/undid a track; deleted the audio clip; duplicated the video; moved the duplicate to Overlay via Inspector; added a marker; played the 8-second video sequence to its end. No console errors were observed in the queried browser logs.
- Browser checks do not constitute full pointer-drag, snapping, export, Electron, or long-project performance validation. Those remain manual below.
- No dependencies or third-party media were added. Existing license inventory in README still applies.

## Manual acceptance

1. Import two videos. Move and trim a clip continuously, then Undo once: the whole gesture should revert. Redo restores it. Drag back to its origin or press Escape: no extra history entry.
2. Add a video/overlay track, drag a clip onto it, and overlap footage across tracks. Confirm same-track collisions reject the edit. Check preview's documented topmost-video behavior.
3. Toggle snapping; move either edge near a playhead, marker, or another clip edge at several zoom levels. Alt bypasses snapping. Scroll and confirm coordinate accuracy.
4. Ctrl/Command-select two clips, link them, move/trim either, and undo. Lock a partner's track and confirm edits reject without partial updates.
5. Copy/paste into free space and duplicate a group. Confirm distinct instances retain original sources and linked group offsets. Test collision feedback.
6. Compare Delete with Shift+Delete/ripple. Verify other-track overlap and locked downstream clips prevent ripple; undo restores markers and all tracks.
7. Use the clip/marker access list and Inspector to select, move, and switch tracks by keyboard. Check focused timeline shortcuts and panel focus rings.
8. Save JSON and inspect normalized metadata (no File/blob URLs). Refresh still clears the project; load/autosave are not implemented.
9. Export a contiguous video-only sequence; verify MP4 playback/audio. Add a gap, overlap, hidden clip or independent audio and verify a clear export rejection.
10. Review text/sticker/effect tracks as structure only, and audio as placement/editing only, before approving the next phase.

## Files

`docs/phase-2-full-source.md` includes every changed/new text source file in full. `TrimCut-Phase2-source.zip` contains the runnable source, review, and screenshot. `docs/phase-2-preview.png` captures the editor after browser smoke checks.

Stop here for review. Phase 3 is the playback engine and media pipeline.
