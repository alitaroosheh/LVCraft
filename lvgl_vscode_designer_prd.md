
# LVGL VSCode Designer – Full Product Requirements & Technical Specification (PRD + TSD)

---

# 1. Product Overview

## 1.1 Purpose
Create a **professional visual UI designer for LVGL** integrated into **Visual Studio Code** that allows developers to design embedded UIs visually while producing **clean, deterministic, firmware-ready C code** without manual UI coding.

The tool must behave similarly to WinForms / Qt Designer in user experience while keeping LVGL’s performance and embedded constraints.

---

## 1.2 Target Users
- Embedded firmware engineers
- IoT platform developers
- UI/UX engineers working on MCUs
- Hardware startups
- LVGL beginners and advanced users

---

## 1.3 Core Value
- Eliminates manual LVGL UI coding
- Ensures firmware-accurate preview
- Safe code generation
- Cross-platform workflow
- Professional developer tooling

---

# 2. Core Design Principles

## 2.1 Runtime = Preview
The rendering engine in preview **must be the same LVGL runtime** used in firmware.  
No mock engines, no CSS rendering, no screenshot mirroring.

## 2.2 Determinism
Same input project must always generate the same output files.

## 2.3 Separation of Concerns
- Designer Layout
- Generated UI Code
- User Business Logic

These must never mix.

## 2.4 Cross-Platform Neutrality
Must function identically on:
- Windows
- Linux
- macOS

No OS-specific binaries required.

---

# 3. System Architecture

```
+---------------------+
| VSCode Extension    |
+----------+----------+
           |
           v
+---------------------+
| WebView UI          |
| (React/Vue/Svelte)  |
+----------+----------+
           |
           v
+---------------------+
| LVGL Runtime (WASM) |
+----------+----------+
           |
           v
+---------------------+
| Code Generator      |
| Node / Rust / Go    |
+----------+----------+
           |
           v
+---------------------+
| User Firmware Repo  |
+---------------------+
```

---

# 4. Modules

---

## 4.1 Project Management Module

### Features
- Create Project Wizard
- Open Existing Project
- Save / Save As
- Duplicate Project
- Export Firmware Package
- Import External Assets

### Project Metadata
- LVGL version
- Target MCU
- Resolution
- Color depth
- Memory profile
- Theme
- Generator config
- Asset manifest hash

---

## 4.2 File Structure

```
project-root/
  lvproj.json
  layout.json
  styles.json
  assets.json
  generated/
  user/
  backups/
```

---

## 4.3 Designer UI Module

### Canvas Features
- Zoom / Pan
- Pixel grid overlay
- Snap to grid
- Bounding box display
- Multi-select
- Alignment tools

### Widget Tree
- Drag reorder
- Parent/child relationships
- Visibility toggle
- Lock state
- Group/ungroup

---

## 4.4 Styling System

### Style Types
- Inline
- Shared
- Global Theme

### States
- Default
- Pressed
- Focused
- Disabled
- Checked

---

## 4.5 Preview Engine

### Technology
- LVGL compiled with **Emscripten → WASM**
- Render to `<canvas>`
- Hardware acceleration optional

### Event Handling
- Mouse → Touch mapping
- Keyboard mapping
- Scroll wheel mapping

### Optimization
- Dirty rectangle redraw
- Frame limiter
- Resolution downscale mode

---

## 4.6 Code Generator

### Requirements
- Deterministic output
- Stable IDs
- Modular file splitting
- Configurable naming conventions

### Output Layout
```
ui/
  ui.c
  ui.h
  screens/
  widgets/
  styles/
  assets/
```

---

## 4.7 User Code Protection

### Guard Regions
```
/* USER CODE BEGIN ID */
/* USER CODE END ID */
```

### Rules
- Never overwrite guarded blocks
- Preserve whitespace
- Detect missing markers
- Warn user on corruption

---

## 4.8 Asset Pipeline

### Supported Types
- PNG
- JPG
- BMP
- TTF → LVGL Font
- SVG → Rasterized

### Transformations
- Compression
- Color conversion
- Scaling
- Binary packing

---

## 4.9 Event Binding

### Modes
- Function binding
- Auto stub generation
- Parameter injection
- Global handler

---

# 5. Non-Functional Requirements

## Performance
- Preview frame < 16ms
- Load < 2s
- Code generation < 1s incremental

## Stability
- Crash recovery
- Auto-save
- Versioned backups

## Security
- Sandboxed WASM
- No arbitrary execution

---

# 6. Reliability & Recovery

- Autosave interval configurable
- Snapshot system
- Crash restore dialog
- Unlimited undo/redo
- Safe file writes

---

# 7. Extensibility

- Plugin API
- Custom widgets
- Custom exporters
- Theme packs

---

# 8. VSCode Integration

### Panels
- Widget Tree
- Property Inspector
- Style Manager
- Asset Browser

### Commands
- Generate Code
- Clean Generated
- Open Simulator

---

# 9. Testing

### Unit
- Generator
- Parser
- Merge engine

### Integration
- WASM runtime
- Asset pipeline

### UI
- Drag/drop
- Save/load cycles

---

# 10. Future Expansion

- Hardware live preview
- Collaboration
- Cloud asset sync
- AI assisted layout

---

# 11. Success Criteria

- No manual editing of generated UI files
- Preview identical to firmware
- Git-friendly diffs
- Cross-OS compatibility
- Zero data loss
- Responsive performance

---

# 12. Anti-Goals

- Not a mock tool
- Not screenshot mirroring
- Not MCU vendor-locked
- Not cloud-locked
- Not modifying business logic

---

This document defines a **production-grade LVGL Visual Designer**, not a prototype.  
Every skipped section increases technical debt and reduces long-term maintainability.

---

# 13. Implementation Steps (Tracking)

Status legend:
- <mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>
- <mark style="background: #fefcbf; color: #744210; padding: 0 4px; border-radius: 3px;">In progress!</mark>

## Step 1 — Project scaffold (VS Code extension)
- TypeScript extension skeleton (`src/extension.ts`)
- Minimal designer WebView panel shell
- Build + lint + test wiring
- Debug configs (`.vscode/launch.json`, `.vscode/tasks.json`)

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 2 — Project Management Module
- Project file types (`lvproj.json`, `layout.json`, `styles.json`, `assets.json`)
- Create Project Wizard (LVGL version, resolution, color depth)
- Open Existing Project (folder picker, `lvproj.json` validation)
- Project structure (`generated/`, `user/`, `backups/`)

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 3 — Designer project context
- Designer requires LVCraft project open (workspace with `lvproj.json`)
- Load and display project metadata (LVGL version, resolution, color depth)
- Canvas placeholder with project resolution

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 4 — Designer 3-panel layout
- Widget Tree (left): reads `layout.json`, displays widget hierarchy
- Canvas (center): placeholder for LVGL WASM preview
- Property Inspector (right): placeholder for selected widget properties

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 5 — Code Generator
- `LVCraft: Generate Code` command (requires LVCraft project open)
- Deterministic output: `generated/ui/ui.c`, `generated/ui/ui.h`
- Maps `layout.json` widgets to LVGL create calls (lv_obj_create, lv_btn_create, etc.)
- Stable snake_case IDs from widget `id` or `type_index`

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 6 — User Code Protection + Clean Generated
- Guard regions in generated `ui.c`: `/* USER CODE BEGIN init */` ... `/* USER CODE END init */`
- Regeneration preserves content inside guarded blocks
- Detect malformed markers (missing END/BEGIN) and warn before overwrite
- `LVCraft: Clean Generated` command: delete contents of `generated/`

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 7 — Designer refresh + Open Simulator
- Designer panel refreshes when `layout.json` or `lvproj.json` changes (file watcher)
- `LVCraft: Open Simulator` command: opens Designer (placeholder for LVGL WASM preview)

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 8 — WebView ↔ Extension messaging + Designer toolbar
- Toolbar in Designer: "Generate Code" and "Refresh" buttons
- WebView posts messages; extension handles `generateCode` and `refresh`

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 9 — README and packaging
- README: features, commands, project structure, getting started, dev instructions
- `.vscodeignore` for vsce package (exclude dev/test source)

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 10 — styles.json in code generator
- Read `styles.json`, emit `lv_style_t` and `lv_style_init` for shared styles
- Support: `bg_color`, `bg_opa`, `border_width`, `border_color`, `radius`, `pad_all`, `text_color`
- Widgets with `styleId` get `lv_obj_add_style(ui_xxx, &ui_style_yyy, 0)`

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 11 — CHANGELOG + Designer polish
- `CHANGELOG.md` (Keep a Changelog format)
- Designer: `styles.json` in file watcher (refresh on change)
- Widget Tree: show `[styleId]` badge when widget has styleId

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 12 — Preview infrastructure (LVGL WASM bootstrap)
- Real `<canvas>` sized to project resolution
- Embed `layout`, `width`, `height` as `window.__LVCRAFT_PREVIEW__` for future LVGL loader
- Canvas fallback: gray fill + border
- README: LVGL WASM build instructions (lv_web_emscripten)

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 13 — Canvas Zoom / Pan
- Wheel zoom (centered on cursor) with min 25% / max 200%
- Middle-mouse drag for pan
- Toolbar: Zoom 100%, Fit to View buttons

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 14 — Widget selection + Property Inspector
- Click widget in Widget Tree to select
- Property Inspector shows selected widget: type, id, styleId, children count

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 15 — Pixel grid overlay
- Grid overlay on canvas (10px spacing)
- Grid visibility toggle in toolbar

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 16 — Property Inspector: all properties
- Show all widget properties (not just type, id, styleId, children)
- Display x, y, width, height and any other keys from layout.json

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 17 — Asset Browser
- Read `assets.json`, display images and fonts in Asset Browser panel
- Add `assets.json` to file watcher (refresh on change)

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 18 — LVGL WASM loader
- Look for LVGL WASM in project `.lvcraft/wasm/` (lvgl.js or index.js + optional lvgl.wasm)
- When present, load script with canvas and resolution; hide overlay on success
- CSP: allow script from webview URI, wasm-unsafe-eval for WebAssembly
- wasm/ README: build lv_web_emscripten and copy output to `.lvcraft/wasm/`

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 19 — Event binding in code generator
- Layout widgets: `onClick`, `onValueChanged`, `onPressed`, `onReleased`, `onFocus`, `onDefocus` (string = handler name, `true` = auto stub)
- Code generator: emit `lv_obj_add_event_cb` and static handler stubs with USER CODE guards
- Regeneration preserves event handler USER CODE blocks

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 20 — Position/size/text in code generator
- Layout widgets with `x`, `y` emit `lv_obj_set_pos`; `width`, `height` emit `lv_obj_set_size` (or partial)
- Text: label `text` → `lv_label_set_text`; textarea `text`, `placeholder` → `lv_textarea_set_text`, `lv_textarea_set_placeholder_text`; dropdown/roller `options` → `lv_dropdown_set_options`, `lv_roller_set_options`

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 21 — Bounding box display on canvas
- When a widget is selected in the Widget Tree, show a dashed selection rectangle on the canvas at the widget's position (x, y, width, height from layout.json)
- Absolute position computed from nested parent offsets
- Selection overlay canvas; cleared when no widget selected

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 22 — Live layout preview in LVGL WASM
- Build patches lv_web_emscripten: skip demo when Module.lvcraft_layout is set; export LVGL APIs (lv_obj_create, lv_button_create, lv_label_create, lv_obj_set_pos, lv_obj_set_size, lv_label_set_text, etc.)
- Designer passes layout.json to Module.lvcraft_layout before loading LVGL script
- JS layout builder: clears screen and creates widget tree from layout (obj, btn, label; x, y, width, height, text)
- Satisfies PRD 2.1 Runtime = Preview: Designer canvas shows user's layout rendered in real LVGL

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>

## Step 23 — More widget types in live preview
- Export and use in JS builder: img, slider, bar, switch, checkbox, textarea (create + set_text/placeholder/value where applicable)
- Live preview shows these widgets with pos/size and text/value/placeholder

<mark style="background: #c6f6d5; color: #22543d; padding: 0 4px; border-radius: 3px;">Done!</mark>
