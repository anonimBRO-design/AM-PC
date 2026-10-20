# Changelog

## V5.285 — 2026-10-19

### Mobile & PWA UX Refinements

- **Add Object Drawer Physics**: smooth slide-down close animations (`.drawerClosing`) for mobile bottom sheets and desktop docked trays; prevent stuck states and race conditions upon rapid toggle.
- **Experimental Notice Suppression**: add persistent "Jangan tampilkan lagi" / "Don't show again" secondary action with synchronous `localStorage` verification and 14-language translations.
- **Projects Tab Empty State**: high-contrast dark theme empty state with styled icon card (`#18202e`, `#73e2bd` accent) and clear typographic hierarchy (`#f1f5f9` header, `#94a3b8` description).
- **iOS Safari Viewport Docking**: switch mobile browser viewport height to `100dvh` to keep bottom navigation cleanly above the Safari URL bar, while preserving edge-to-edge `100lvh` for standalone Home Screen PWAs.
- **Android PWA Viewport Alignment**: restrict hardware screen scaling to iOS and standardize non-iOS standalone PWAs on `100dvh`, preventing bottom navigation bars from sinking beneath Android system buttons or gesture navigation areas.
- **Navbar Polish**: high-contrast white text for language selector badge ID in mobile navigation bar.

## V5.284 — 2026-10-19

### Alight Motion UX Alignment & Add Object Drawer Overhaul

- Redesign Add Object (`+`) popup drawer matching Alight Motion v5.0.273 (`activity_edit_addpopup.xml`):
  - 5 categorical top tabs (Shapes, Elements, Media, Audio, Templates) with AM icon assets and active pill indicators.
  - Dedicated right-side quick-add action rail (Freehand Drawing, Vector Drawing, Text, and Close).
  - Clean responsive layouts: mobile bottom sheet with 18px top radius and desktop docked tray below the timeline.
- Implement parametric vector shape tracing for primitive shapes: plus, heart, pie, and crescent/moon.
- Expand export frame rates up to 240 FPS (15, 18, 20, 24, 25, 30, 48, 50, 60, 90, 120, 144, and 240 FPS), with auto-sync of current project FPS upon opening the export sheet.
- Refine timeline splitter bar, playback transport controls, and responsive preview surface sizing.

## V5.283 — 2026-10-17

This update brings the tested single-file experimental build to main, including
the keyboard-shortcuts contribution from [PR #33](https://github.com/Hada45/Open-Motion/pull/33)
by [anonimBRO-design](https://github.com/anonimBRO-design). The app remains a prototype.

### Configurable keyboard shortcuts

- Open the categorized guide with the editor's ? button, F1, or ?.
- Remap 13 actions with Ctrl/Cmd, Shift, and Alt; conflicting combinations cannot be saved.
- Persist per-browser settings and restore defaults. Retain the contribution's nine UI languages.
- Keep typing/IME isolated from editing commands, restore dialog focus, and respect the active group timeline when seeking.

### Layer groups, appearance and audio

- Dedicated group timelines with breadcrumb navigation, ordinary groups, Mask and Exclude groups, and AM Link group import.
- Ungrouping retains child layers and the supported Mask/Exclude relationships.
- Inspector border and shadow controls, audio spectrum, and reusable audio-spectrum presets.
- Preserve existing tracking, Text Animator and project-thumbnail features, including credit for the PR #32 contribution.

### Experimental Alight Motion compatibility

- Expanded native/script, drawing, path, text, repeat and GPU effect integration with editable imported parameters/keyframes.
- WebGL1/2 compatibility and effect-graph, blur/bounds and procedural-kernel improvements.
- Scatter Repeat parameter/parent caching avoids repeated metadata work without reducing source copy counts or replacing 3D with 2D.
- Improved native Float parameter/default and Hz/RPM accumulation boundaries, waveform/noise/script-return handling, and script environment/Timecode serialization.
- Preserve AM XML source ordering, nested-scene ownership, transform parents and roundtrip data.

### Verification and limitations

- V5.283 passes 52 keyboard/UI checks, nine languages, 190-layer XML roundtrip with 117 source-owner references, 96 effect call-site controls and 50 original 3D Scatter time points across WebGL 1/2.
- Its renderer/effect definitions remain unchanged from verified V5.281. All 108 earlier suites were not rerun for this UI-only update.
- These are scoped desktop controls, not full-project phone FPS or proof of native Android parity. Effect-specific gaps, nonlinear easing, some source-clock/retiming, camera/parent, typography, media and export contracts remain under development.
- The unfinished V5.282 live source-clock draft is NOT included. Full Alight Motion effect parity is not claimed.
- Refresh the PWA shell-cache version while leaving imported media and project storage untouched.
- README is unchanged.

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


