# TrimCut MVP

React 18 + Zustand, Canvas timeline/preview, FFmpeg.wasm export, Electron development shell, Node/PostgreSQL project API.

## Run

Node 22+ and npm required. From this folder:

```sh
npm install
npm run prepare:ffmpeg
npm run dev
```

Open http://127.0.0.1:5173. For desktop run `npm run desktop` in a second terminal while Vite runs. Import browser-decodable video (H.264 MP4 recommended), drag edges to trim, drag bodies to reorder, scrub ruler, split, play and export. Export outputs a letterboxed 1920×1080 30fps H.264/AAC MP4. Preview proxy is an explicit optional FFmpeg job; ordinary playback uses the browser decoder and Canvas without re-encoding. No effects/keyframe UI yet.

```sh
npm test
npm run build
```

## Optional persistence API

Create a PostgreSQL database and apply `server/schema.sql` with psql. Set DATABASE_URL, run `npm run server`. PUT/GET `/api/projects/:uuid` accepts/returns versioned project JSON. API is local only, has no authentication, and is not wired to the MVP UI. The Save JSON button downloads the same metadata format. Media files are not embedded: project restore and media relinking UI are future work. Electron exposes no custom IPC or Node APIs to the renderer; its current launcher requires the Vite server and is not a packaged distribution.

## Limits and validation

Single sequential video track; no overlays, transitions, undo, waveform, thumbnails or effects. FFmpeg runs in a worker but keeps media in WASM memory; long/large videos can exceed memory and encode slowly. Original-file export and reduced-resolution proxies preserve trim coordinates. Proxy canvas playback letterboxes into 16:9. Browser codec support determines what can be imported. Progress reflects each individual encode stage, not overall elapsed work. During export playback/editing is disabled. Generated media URLs live for the editing session.

Dependencies could not be installed in the authoring environment because registry DNS was unavailable. Logic tests were run, but production build, Electron startup, actual browser playback, proxy generation, and 1080p audiovisual export need validation after installation. See docs/phase-1.md for evidence and REA follow-up.
