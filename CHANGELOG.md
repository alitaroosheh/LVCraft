# Changelog

All notable changes to LVCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
