# Changelog

## V5.238 — 2026-10-11

This update publishes the previously unreleased V5.238 work and carries forward
the project-thumbnail contribution merged in PR #32. The app remains a prototype.

### Tracking (experimental)

- Motion 2D: Point, Two Points, Planar, Corner Pin, and Stabilizer modes with editable baked keyframes.
- Camera 3D: experimental camera analysis, re-solving saved observations, and camera/Null placement.
- Playback displays tracked observations as `+` markers. Select a continuous track to create a Null for parenting other layers.
- Supports source-plane tracking for footage placed in 3D Space, as well as 2D observation Nulls.
- Adds continuous-lifetime filters and optional poor-to-excellent quality colors. Display filtering leaves the saved analysis and existing Null keyframes unchanged.
- New analyses record measured matching quality; older saved tracks use labeled estimates until reanalyzed.

### Text Animator

- Character, word, line, and whole-text targets with independent range selectors.
- XYZ position/rotation, scale, pivots, styling, paths, and restricted expressions.
- 130 built-in presets, including continuous 3D animation, with editable keyframes and easing.
- Custom presets and reusable effect packages with local JSON import/export.
- Per-character glyph planes can use the scene camera and parent transforms in 3D Space.

### Home project thumbnails

- Real saved-preview thumbnails on project cards, adapted from [PR #32](https://github.com/Hada45/Open-Motion/pull/32) by [anonimBRO-design](https://github.com/anonimBRO-design).
- Bounded thumbnail capture from an eligible paused preview without starting additional rendering or decoding.
- Thumbnail persistence, invalid-image fallback, and compatibility with older projects. If no valid preview is available, the previous thumbnail is retained.
- Preserves the original contribution credit and merge history.

### Current limitations

- Tracking is experimental and depends on footage quality and browser/device capability. A video-plane Null does not reconstruct physical depth inside the recording; missing observations are not fabricated across gaps.
- Quality colors express relative matching quality, not accuracy probabilities. Old tracks require reanalysis for measured scores.
- 3D text uses flat glyph planes without extrusion. Some effects use a compatibility path that flattens per-character depth.

### PWA update

- Refreshes the offline-shell cache version while retaining network-first navigation and leaving imported media and project storage untouched.

