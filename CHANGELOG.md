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
