# Design System — LEOBOG Hi75C Pro WebHID Configurator

## Visual World & Mode

- **Surface Mode:** Operate
- **Aesthetic Direction:** Dark CNC anodized aluminum workbench (`#090a0d` obsidian ground, `#111318` precision panels, `#171a22` elevated controls, `#1d212b` sculpted PBT keycaps) with a minimalist focus workspace and collapsible right inspector.
- **Signature Accent:** Electric Cyan (`#38bdf8`) strictly for active selection, focus rings, and primary connection action.
- **Semantic Status Colors:** Emerald (`#34d399`) for connected/charging, Amber (`#f59e0b`) for pending unsaved changes and sleep state, Rose (`#fb7185`) for errors.

## Typography

- **UI Sans:** `Archivo`, `Noto Sans TC`, system sans-serif.
- **Technical Mono:** `IBM Plex Mono` with `tabular-nums` for key matrix indices, battery percentage, effect IDs, hex codes, and slider readouts.

## Layout & Components

- **Top Utility Bar (`HeaderBar`):** 52px single-row instrument bar housing the `75C` emblem, connection/battery telemetry cluster, mode switcher (`改鍵` / `燈效`), profile export/import, locale toggle, and inspector drawer toggle.
- **Keyboard Stage (`KeyboardVisual`):** Responsive `ResizeObserver`-scaled 75% CNC aluminum chassis with corner hex screws, engraved `LEOBOG · HI75C PRO` mark, sculpted dual-legend keycaps, knurled rotary knob (`K82`), and floating top stage toolbar (layer quick-switch + selected key readout in keymap mode; color picker + 8 quick swatches + Paint/Eyedropper/Fill All in per-key RGB mode).
- **Collapsible Inspector (`KeymapInspector` / `LightingPanel`):** 368px right drawer with keycap preview, Assigned vs. Default comparison, key listen, 4 modifier toggles, searchable keycode catalog, 24-effect grid, custom-filled range sliders, color swatches, Win Lock, and sleep timer.
- **Floating Pending Dock:** Pill-shaped action bar below the stage when `totalPending > 0`, offering `還原` and `儲存套用`.

## Iconography

- Uniform `1.75px` stroke inline SVG icons in `src/components/Icons.tsx` (zero emoji icons).
