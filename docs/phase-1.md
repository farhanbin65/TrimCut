# Phase 1 — evidence, limits, and follow-up

Target inspected read-only: /Applications/CapCut.app, CFBundleShortVersionString 8.9.0. Analysis date: 2026-10-16. No target execution or project modification performed.

REA repository reviewed: https://github.com/morluto/rea. README documents `npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json`, which returns modules/imports/Electron boundaries for supplied JavaScript/ASAR. Shell attempts to clone repository and query npm failed with ENOTFOUND; REA itself was NOT executed. These are manual static inventory findings, not REA output.

## Verified local observations

`otool -L /Applications/CapCut.app/Contents/MacOS/CapCut` shows QtCore, QtQuick, QtQmlModels, QtQml, QtOpenGL, QtWidgets (6.2.2), AVFoundation, CoreMedia, CoreVideo, and WebKit dependencies. Bundle inventory contains Chromium Embedded Framework.framework and CapCut Helper (Renderer).app. No .asar found. This build has a native Qt application and embedded Chromium; Electron cannot be assumed from a Renderer helper name.

| Area | Located artifact | What this proves |
|---|---|---|
| Host UI | Contents/MacOS/CapCut; Resources/qml; Qt frameworks | Native Qt/QML runtime dependencies, not a recovered timeline module |
| Video engine candidates | Frameworks/libVECreator.dylib; libVEConfig.dylib; libcccreator.dylib | Libraries exist; exact preview/export call graph unknown |
| Graphics/effects candidates | Frameworks/libAGFX.dylib; libEffectPlatform.dylib | Libraries exist; responsibility inferred from names only |
| Effect resources | Resources/lumi_js_resources/js/feature/feature.js; resources/featureBlend/config.json; featureBlit/config.json; featureMask/config.json | Script/config resources exist; no proof these own the full effects stack |
| Media tooling | Resources/ffmpeg; Frameworks/libswscale.dylib; libdav1d.dylib | Bundled media tooling, not proof every export uses ffmpeg |

## Requested internals: current status

Timeline ownership/state model: unverified. Project serialization fields/units: unverified; no user drafts were read. Renderer/main IPC names and payloads: unverified; no Electron boundary established. Keyframe schema/interpolation: unverified. Preview decoder/compositor scheduling and timeline-to-export graph: unverified. Do not invent CapCut filenames, JSON fields, channel names, or native symbols from this inventory.

## Complete REA analysis when installation is available

1. Pin the REA release and record its version, target bundle version and executable SHA-256. Use the repository's Apple application/artifact inventory workflow first because this target is native Qt/CEF.
2. Analyze extracted JavaScript resources separately with the documented analyze-javascript-application CLI; this cannot recover native timeline code by itself.
3. Configure an available Ghidra/Hopper/IDA provider following REA's native guide. Trace timeline/seek/export/effect/keyframe symbols and string references in the executable and candidate libraries. Record artifact, symbol/offset, call edges and confidence for every conclusion.
4. Create controlled disposable drafts: one clip, then trim, then one effect, then two keyframes. Compare before/after serialization to determine identifiers, time units, ranges, interpolation and resource references. Do not infer units from field names alone.
5. Observe this disposable session to connect play/seek operations to decoder, compositor, audio clock and presentation calls; separately trace export graph construction, encoders and muxer. Inventory CEF/Qt bridges and native process boundaries before describing any IPC.
6. Report verified contracts separately from hypotheses. Provider setup and target runtime capture remain pending.

## Independent TrimCut architecture (not CapCut findings)

Zustand owns ordered clips and playhead. Clips reference source assets and in/out times in seconds. Global timeline time maps to source time by cumulative preceding clip durations. Trimming changes metadata only. Split duplicates a reference to one asset with adjoining source intervals. Drag/drop imports files; dragging clip bodies reorders the sequence.

HTMLVideoElement decodes media and supplies its clock/audio; Canvas draws decoded frames in requestAnimationFrame. Scrubbing sets video.currentTime. Optional FFmpeg proxy encodes the full source at reduced resolution, preserving the original source-time coordinates. No re-encode occurs during normal playback/scrub. Future effects should be evaluated per frame in a compositor (WebGL/WebGPU for demanding filters), with the same parameter model translated to export filters. Canvas alone does not reproduce arbitrary FFmpeg filters.

Version-1 JSON: {version,width,height,fps,clips:[{id,assetId,name,duration,in,out,effects:[],keyframes:[]}]}. File/Blob URLs are runtime-only. PostgreSQL stores the document as JSONB. Future keyframe records should explicitly define property, clip-local timestamp, value and interpolation, with deterministic evaluation shared by preview/export; this is proposed, not implemented.

Export snapshots the sequence, loads original bytes into FFmpeg.wasm, trims and normalizes each segment (1920×1080, square pixels, 30fps H.264, stereo 48kHz AAC), supplies silence for silent sources, concatenates normalized segments, then writes a fast-start MP4. No TrimCut renderer/main IPC contracts are needed yet: Electron hosts an isolated renderer; local project persistence uses HTTP PUT/GET /api/projects/:id.
