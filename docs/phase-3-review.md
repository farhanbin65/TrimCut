# Phase 3 review

## Implemented

- One animation scheduler and AudioContext playback clock, frozen during buffering.
- Visible video layers composited bottom-to-top with aspect-preserving placement; independent audio mixed with monitor gain, limiter and level meter.
- Optional incremental WebCodecs H.264 decoding with browser media fallback. Adjacent split clips reuse a track/asset channel.
- Preview quality selection and a separate proxy worker, keeping edits and playback available during proxy work.
- Cached thumbnails and peak waveforms; viewport-sized timeline drawing, visible clip culling and an independent DOM playhead.
- Media URLs retained while referenced by undo/redo or clipboard; stale channels, frames and cache entries disposed.
- Development-only `/engine-check` page with original synthetic media, leading-gap and split controls.

## Scope and limits

This is a preview engine, not the Phase 5 composited exporter. Existing export guards still reject gaps, overlaps, hidden clips and independent audio. Transform/effect controls remain deferred.

Up to 12 active/prefetched channels are retained. At most two visual channels use WebCodecs. Eligibility is nonfragmented H.264 MP4, at most 16 MiB, 1080p and 20,000 samples, with supported transform/edit metadata. Other inputs fall back to browser decoding. Each decoder limits its queue to eight chunks and retained frames to ten. Media elements still provide audio and synchronization, so the implementation does not eliminate duplicate decoding or guarantee sample-accurate cuts. Running drift correction uses a 120 ms tolerance; transitions may buffer.

Analysis uses a 32 MiB LRU, 2–12 thumbnails per asset and 2,048 waveform bins. Waveform admission is limited to 60 seconds and 24 MiB input; decoded PCM above 64 MiB is discarded. These are admission/retention limits, not a hard bound on the browser's temporary decoding memory. Large or unsupported inputs may have no waveform. Long-project performance and cross-browser/Electron behavior require further testing.

## Validation

Strict TypeScript and production build pass; all 35 tests pass. Nine engine tests cover clock behavior, render ordering/source mapping, visibility, lookahead, split reuse, gaps, aspect fitting, cache disposal, waveform peaks and real H.264 demux; existing editing/history/export guard tests remain green.

Browser checks exercised layered rendering, three-source playback with two WebCodecs decoders, standalone audio with video tracks hidden, browser fallback, leading gaps and split boundaries. On the final retry, a malformed HTML doctype was fixed. Proxy startup was fixed by excluding the FFmpeg wrapper from Vite dependency optimization (its relative worker URL otherwise resolved to a missing file). The browser then completed a proxy while playback continued, showed Rebuild proxy, and returned to the layered first frame. Startup now times out after 30 seconds with a recoverable error instead of remaining busy indefinitely. The development server required a restart to pick up configuration changes; polling is enabled in the current review session.

## Manual acceptance checklist

1. Run `npm ci`, `npm run dev`; open `/engine-check` and load the original engine demo.
2. Play: orange portrait overlays the moving base; the audio meter responds. Hide each video track and verify independent audio remains.
3. Select Browser decoder, insert a leading gap, split the base, return to start and play through both boundaries.
4. Select base.mp4 and build a proxy; verify editing remains available, the proxy finishes, and Original/Proxy switching preserves source time.
5. Scrub, frame-step, trim, undo and scroll/zoom. Check thumbnails, waveforms and playhead alignment.
6. Repeat with long media, unsupported codecs and the intended desktop/browser targets before release.

## Dependencies and media

MP4Box 2.4.1 is BSD-3-Clause; its full notice is in `docs/licenses/mp4box-BSD-3-Clause.txt`. Existing FFmpeg core is GPL-2.0-or-later, separate from the MIT wrapper; distribution licensing remains a later-phase decision. No third-party editor artwork was copied.

Demo/test files were generated locally from FFmpeg lavfi testsrc2/color/sine sources: moving 640×360 30fps base with 440 Hz audio (8s), orange 180×320 overlay (4s), 880 Hz WAV (8s), and 160×90 H.264 demux fixture (1s). They contain no third-party footage or music.
