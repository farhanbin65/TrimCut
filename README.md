# TrimCut Studio

A local video editor built with React 18, strict TypeScript, Zustand, Canvas, and FFmpeg.wasm. Phase 1 adds the desktop editing workspace and an original SVG icon system while preserving the single-track MVP.

## Run

Use Node **22.18+** (or 24/26) and npm. Node's built-in TypeScript stripping runs the model tests and the server's shared model import.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. `predev` copies the locally installed FFmpeg core into `public/ffmpeg/`; no runtime CDN is used.

```sh
npm test
npm run typecheck
npm run build
npm run desktop
```

Desktop requires the Vite server running on **5173**. It is a development shell, not a packaged production app. `build` runs type checking, prepares FFmpeg, and writes `dist/`. To inspect a production build, run `npx vite preview`. Deployment must serve the WASM file with the correct MIME type; subpath hosting requires Vite's base configuration and matching route handling. `/icons` is designed for root hosting.

## Implemented in Phase 1

- Token-based dark theme; cyan/teal accent; project name and JSON save.
- Full library tab rail and contextual inspector. Future editing actions are labeled and disabled.
- Mouse/touch and keyboard panel resizing, remembered in localStorage; double-click a divider to reset it.
- Working video import, search, source-range editing, split, sequence reordering, play/pause, frame stepping, and scrubbing.
- Timeline zoom and horizontal scrolling; playback keeps its playhead visible.
- Preview fit/50%/100%, fullscreen, and 16:9 / 9:16 / 1:1 / 4:5 project ratios. The selected ratio applies to MP4 export.
- Aspect-preserving preview proxies; exports always read original media.
- **59 original SVG icons**, separate components in `src/components/icons/`, typed `Icon` wrapper, `index.ts` barrel. No copied editor assets or icon library.
- `/icons` shows every icon at 16/20/24/32px in dark and light themes, with default/active/disabled examples and interactive hover/focus states.
- A modal lists current keyboard navigation and clearly identifies future editing shortcuts.

The main workspace is desktop-first (minimum 1010px, wider with expanded panels). Smaller windows can scroll; a compact mobile editor is not implemented.

## Architecture

```mermaid
flowchart TD
  UI["React shell and inspector"] --> S["Zustand editor state"]
  T["Canvas timeline"] --> S
  S --> P["Video playback controller"]
  P --> C["Preview canvas"]
  UI --> J["Media jobs"]
  J --> W["FFmpeg worker"]
  W --> O["MP4 or preview proxy"]
  S --> D["Version 1 JSON"]
  API["Optional local HTTP API"] --> DB["PostgreSQL JSONB"]
```

- `src/types.ts`, `model.ts`: typed clip ranges, time mapping, trim/split math, timecode, serialization.
- `src/store.ts`: ordered clips and session state. Multi-track normalization and command history belong to Phase 2.
- `src/components/layout/`: header, tabs, media panel, resize handles.
- `src/hooks/usePanelSizes.ts`: bounded local layout preferences.
- `src/components/preview/`, `hooks/useVideoPreview.ts`: video decoding, frame drawing, transport.
- `src/components/timeline/`, `timeline/`, `hooks/useTimelinePointer.ts`: visible viewport drawing and pointer editing.
- `src/components/inspector/`: selected-clip properties.
- `src/media/`, `hooks/useMediaJobs.ts`: import/export/proxy jobs and UI status.
- `src/components/icons/`, `pages/IconsPage.tsx`: original icon system and gallery.

The browser video element decodes frames and plays audio; Canvas fits those frames into the selected aspect. FFmpeg does not encode during normal playback or scrubbing. Preview still uses the MVP's single-video architecture; an overlap-aware compositor, independent audio clock/mixer, and WebCodecs support are later phases.

## Editing and export

Import or drop browser-decodable video. Click a clip to inspect it; drag its edges to trim or drag the body to reorder. Use the ruler to scrub. In/out fields commit on blur or Enter. Split uses the current playhead.

MP4 export is H.264, 30fps, stereo 48kHz AAC. Silent sources receive silence. Each segment is normalized and the parts are concatenated. Output sizes: 1920×1080, 1080×1920, 1080×1080, or 864×1080. Processing is local and can be slow for long media. Progress currently describes each encoding stage, not the entire job. Cancellation, custom resolution/fps/bitrate, WebM/GIF and 4K remain future work.

The installed FFmpeg core can return `-1` on successful ffprobe operations. The wrapper verifies fresh output JSON and the presence of a video stream instead of rejecting that return code alone. Encode and concat exit codes are still checked.

## Optional PostgreSQL API

Create a database, apply `server/schema.sql`, and set `DATABASE_URL` before running `npm run server`. GET/PUT `/api/projects/:uuid` persists the project document. This localhost-only API has no authentication and is not connected to the UI. The editor downloads JSON metadata; media embedding/relinking, project loading, migrations, and IndexedDB autosave are not implemented yet. Project and media state are lost on refresh; only panel sizes persist.

## Verification

- Strict TypeScript check and Vite production build pass.
- Six model tests cover range bounds, split mapping, runtime-field exclusion, aspect serialization, validation, and timecode.
- Direct execution of installed FFmpeg WASM core was smoke-tested with original generated color/tone sources: trimmed audio and silent clips normalized and concatenated to 1920×1080 H.264/stereo AAC, approximately 1 second.
- This core smoke check does not prove browser worker loading, downloads, or preview synchronization. On retry, the execution environment rejected the local Vite server with `listen EPERM` on port 5173, so browser/Electron visual and interaction checks remain manual. See `docs/phase-1-review.md`.

## Dependencies and assets

| Dependency | License | Use |
|---|---|---|
| React / React DOM | MIT | UI |
| Zustand | MIT | State |
| Vite | MIT | Dev server/build |
| TypeScript | Apache-2.0 | Strict type checking |
| React / React DOM / prop-types / Node type definitions | MIT | Development types |
| Electron | MIT | Desktop development shell |
| Express / pg | MIT | Optional persistence API |
| @ffmpeg/ffmpeg / @ffmpeg/util | MIT | Worker wrapper/utilities |
| @ffmpeg/core 0.12.10 | GPL-2.0-or-later | Compiled media engine |

FFmpeg core and bundled codecs have separate licensing from the MIT wrapper. Retaining this dependency does not establish compatibility with every future distribution model; the export/distribution phase must resolve that choice. No additional runtime library was introduced in Phase 1. Icons are original code; no third-party demo media is included.
