# Phase 1 review

## Scope delivered

Strict TypeScript front-end, decomposed components/hooks, resizable editor shell, full tab rail, contextual inspector, functional transport/aspect controls, timeline zoom, original 59-icon system and gallery. Existing single-track editing and MP4/proxy jobs are preserved. No Phase 2 command history or normalized multi-track model has been implemented.

## Fixes made while migrating

- Clicks without movement no longer execute a reorder/reset.
- Trimming retains the playhead (clamped to duration) and uses the drag's starting scale.
- Timeline clip hit testing respects vertical clip bounds.
- Video sources are keyed by media URL instead of split clip ID, avoiding unnecessary reloads for adjacent splits.
- React uses narrower store subscriptions. Preview drawing skips unchanged paused frames; timeline backing dimensions are not reset on every playhead update.
- Runtime metadata validation rejects malformed clips and dimensions. Tiny/invalid imports are rejected.
- Import metadata elements and replaced proxy URLs are released.
- Proxies retain source aspect; the project's selected aspect controls preview and export.
- FFmpeg input/probe files are deleted after each encoded segment to reduce retained memory.
- FFprobe success is verified by fresh structured stream output, accounting for observed core 0.12.10 return behavior.

## Validation performed

- `npm run typecheck`: pass, strict mode, no authored `any`.
- `npm run build`: pass; produces bundled JS/CSS/worker and local FFmpeg core files.
- `npm test`: 6 tests pass.
- Source component size check: every TSX component is below 200 lines.
- Direct WASM core smoke check: original generated silent and tone clips, source trim, normalization, concat, H.264 1920×1080 and 48kHz stereo AAC verified; resulting duration 1.022 seconds for two half-second segments (AAC/container timing overhead).
- Retry validation: strict typecheck, all six tests, and production build passed again.
- Browser verification remains blocked: the retry cannot start Vite because this execution environment rejects listening on `127.0.0.1:5173` (`EPERM`). No claim of visual or end-to-end browser verification.
- The icon gallery opens in a separate tab so reviewing it does not discard the current unsaved project. Node type definitions are declared directly for reproducible strict checking.

## Manual acceptance checklist

1. Open the app at a desktop resolution. Check all panels, dark theme, focus rings, and resize handles. Drag each divider, reload, and confirm panel sizes persist. Focus dividers and use arrow keys/Home/End; double-click resets.
2. Rename the project. Import two short H.264 MP4s, one silent and one with audio. Search media, select clips, and verify inspector details. Drop a video onto the editor.
3. Play/pause, step forward/backward one frame, scrub, split, trim both edges, edit in/out fields, and reorder clips. Check adjacent split pieces of one source. Verify that clicking without dragging does not move a clip or reset the playhead.
4. Change aspect between all four choices. Test Fit/50%/100%, fullscreen/Escape, and resizing while previewing.
5. Zoom/scroll the timeline and play through a clip outside the initial viewport. Check playhead visibility. Focus the timeline and use arrows/Home/End.
6. Export each aspect and inspect output dimensions/audio in a media player. Build a proxy and compare timing with the original. Watch error/status UI and confirm edit controls are disabled during jobs.
7. Save JSON; verify name, dimensions and clip ranges. Loading is not available yet. Refreshing clears the project and media; it retains only layout.
8. Open `/icons`. Verify all 59 entries in dark and light themes at 16/20/24/32px. Search, hover, tab through active controls and inspect disabled states.
9. Open shortcuts help, check the distinction between current and future shortcuts, press Escape, and confirm focus returns to the trigger. Switch rail and inspector tabs using arrow keys.
10. Check that future actions (undo, redo, delete, snapping, linking, transforms, advanced editing) are visibly unavailable, with no false success behavior.

## Review delivery

`docs/phase-1-full-source.md` contains every new/changed authored file in full (including manifests and lockfile), with an explicit list of superseded files. Generated build output, dependency directories, and the review document itself are excluded. `TrimCut-Phase1-source.zip` contains the complete runnable project source and this review.

Approve Phase 2 only after reviewing this phase. The next phase introduces normalized tracks/assets/clips and undoable editing commands.
