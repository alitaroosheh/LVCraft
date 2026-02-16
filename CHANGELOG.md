# Changelog

All notable changes to LVCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Event binding in code generator**: Layout widgets support event properties (`onClick`, `onValueChanged`, `onPressed`, `onReleased`, `onFocus`, `onDefocus`). Use a string for custom handler name or `true` for auto-generated stub. Code generator emits `lv_obj_add_event_cb` and USER CODE-guarded handler stubs.
- **Position/size in code generator**: Layout widgets with `x`, `y`, `width`, `height` emit `lv_obj_set_pos`, `lv_obj_set_size` (or `lv_obj_set_width`/`lv_obj_set_height`).
- **Text in code generator**: Label `text` → `lv_label_set_text`; textarea `text` → `lv_textarea_set_text`, `placeholder` → `lv_textarea_set_placeholder_text`; dropdown/roller `options` → `lv_dropdown_set_options` / `lv_roller_set_options`.
- **Bounding box display**: Selecting a widget in the Widget Tree shows a dashed selection rectangle on the canvas at the widget's position and size from layout.json.
- **Live layout preview**: Designer canvas renders the user's layout.json in real LVGL WASM. Rebuild lvgl.js with `npm run build:wasm` to enable; when layout is present, the demo is skipped and widgets (obj, btn, label) are created from layout with pos/size/text.

## [0.0.1] - 2026-02-15

### Added

- **Project Management**: Create New Project wizard, Open Existing Project
- **Designer Panel**: 3-panel layout (Widget Tree, Canvas placeholder, Property Inspector)
- **Code Generator**: Deterministic C output from `layout.json` (`ui.c`, `ui.h`)
- **User Code Protection**: Guard regions (`/* USER CODE BEGIN init */`) preserved on regeneration
- **Styles Integration**: `styles.json` shared styles emitted; widgets with `styleId` get `lv_obj_add_style`
- **Designer Toolbar**: Generate Code and Refresh buttons
- **Auto-refresh**: Designer updates when `layout.json`, `lvproj.json`, or `styles.json` changes
- **Commands**: Open Designer, Open Simulator, Generate Code, Clean Generated
- **Canvas Zoom/Pan**: Wheel zoom (25%–200%), middle-mouse pan, 100%/Fit toolbar buttons
- **Widget selection + Property Inspector**: Click widget in tree to select; inspector shows type, id, styleId, children count
- **Pixel grid overlay**: 10px grid on canvas; Grid toolbar button to toggle
- **Property Inspector: all properties**: Shows type, id, styleId, x, y, width, height, children, and any other layout.json keys
- **Asset Browser**: Panel lists images and fonts from assets.json; assets.json in file watcher
- **LVGL WASM loader**: Load LVGL from project `.lvcraft/wasm/` (lvgl.js or index.js); hide overlay on success; wasm/README build instructions
- **LVGL WASM from extension install**: lv_web_emscripten as git submodule (`deps/lv_web_emscripten`); postinstall inits submodules; `npm run build:wasm` builds to `media/wasm/lvgl.js` (Windows/Linux); Designer loads from extension media when project has no WASM
- **Automatic LVGL WASM install (ESP-IDF style)**: On startup extension ensures LVGL WASM runtime; if not bundled, downloads `lvgl.js` from GitHub Release and saves to global storage. Command **LVCraft: Install LVGL WASM Runtime** for manual install. Designer resolves WASM from project → extension media → global storage
