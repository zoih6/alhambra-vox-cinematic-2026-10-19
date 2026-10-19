> **Preserved v2/v3 engine documentation.** The later sung interlude and Shatha Yasser end credit are described in `muwashah-v4-edit-notes.md`; the old engine remains unchanged for reproduction of the approved base film.

# Cinematic engine v2

## The two clocks

The project has one absolute **32fps timeline**. Camera projection, focus, light and dust use its continuous time. A separate **8fps sampling clock** controls the internal transforms of paper, text cards and illustrated objects. This creates deliberate stop-motion in the material without making the camera stutter.

`window.seek(t)` is the only frame-drawing entry point. Every frame is computed from time and immutable assets. Cached surfaces are deterministic rasterization caches, not prior-frame simulation state. Randomness uses fixed seeds.

## Camera

- Perspective projection with an explicit depth coordinate for every layer.
- Slow continuous dolly, horizontal drift, vertical drift and restrained roll.
- Per-layer reference projection keeps the authored composition aligned while allowing different parallax rates.
- Camera motion is continuous across the ten-second render checkpoint boundaries. The maximum tested one-frame camera change at those boundaries is recorded in `research/cinematic-preflight.json`.
- Dynamic framing remains within the overscan of the two generated foundation plates.

## Rack focus

Each semantic scene has an explicit focus target in `src/cinematic/timeline.json`. A 1.35-second smooth transition moves focus from the previous target to the new target. Blur amount depends on the distance between layer depth and focus depth. Cached blur levels are interpolated rather than snapped. Essential text stays readable and is not deliberately defocused.

## Lighting

A warm, slowly moving light shaft is combined with a restrained vignette. Fixed-seed dust particles move continuously at different depths; their brightness depends on proximity to the light, not random flashes. No particle bursts are used as transitions.

## Depth assets

The two cinematic plates are preserved whole, along with their separated layers and depth metadata. Hidden backing is filled only behind the extracted layers. The original plate remains available for reproducibility. Genuine location images are separate photo layers; they are never replaced by a generated reconstruction when used as documentary evidence.

See `tools/prepare_cinematic_assets.py` and `research/cinematic-depth-assets.json`.

## Forty semantic scenes, twenty-seven render files

Scene boundaries follow the recorded narration. The physical output files are checkpoints of ten seconds each, with a shorter final checkpoint. They are **not** creative scene cuts. Camera time does not restart when a new file begins.

The 8,621-frame master includes approximately four seconds of credits after the untouched 265.4-second narration. Output duration: **269.40625 seconds**, 1920×1080, constant **32fps**.

## Render pipeline

1. Load the self-contained local project resources in Playwright Chromium.
2. Invoke `window.seek(frame / 32)` for each output frame.
3. Encode a high-quality JPEG frame in memory and stream it directly into FFmpeg; no thousands-of-files frame directory is created.
4. Encode H.264/yuv420p and AAC for each independently playable ten-second checkpoint.
5. Verify frame count, dimensions, frame rate, audio presence and SHA-256.
6. Publish that checkpoint to the authorized public GitHub repository and record the commit before proceeding.
7. Concatenate the video streams and mux the continuous full-length audio mix to avoid reintroducing per-segment AAC priming at the final joins.
8. Preserve the master, then create a smaller same-resolution viewing copy only if the workspace budget requires it.

No checkpoint is deleted after upload. Large runtime copies live in a cache/staging location, but every completed checkpoint is immediately preserved in GitHub and listed in the persistent project manifest. The original project sources, audio and assets remain in persistent folders.

## Audio

The supplied narration is the timing authority. It is not time-stretched or regenerated. Background music is looped with an equal-power crossfade and ducked continuously under the narrator. Sparse deterministic paper, click and low thump cues mark relevant events. The recorded muwashah is retained as an unused alternative, avoiding a competing vocal line.

The encoded mix was measured at **−14.58 LUFS integrated** and **−1.51 dBTP** after an AAC guard limiter. Exact measurements and method are in `research/audio-mix-report.json`.

## Validation scope

- Asset existence and Arabic fonts.
- Deterministic out-of-order seek.
- Camera continuity across checkpoint boundaries.
- Encoded frame rate, dimensions, frame count, duration and audio streams.
- Contact-sheet visual review and corrected typography collisions/contrast.
- Loudness and encoded true-peak measurement.

These are specific checks, not a claim of independent human approval of every frame or every sound. The historical narration and supplied audio rights are described separately in `CREDITS.md`.
