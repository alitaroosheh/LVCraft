# LVCraft

Visual UI designer for LVGL inside VS Code. Design embedded UIs visually and generate firmware-ready C code.

## Features

- **Project Management** — Create, open, and manage LVCraft projects
- **Designer Panel** — Widget tree, canvas placeholder, property inspector (3-panel layout)
- **Code Generator** — Deterministic C output (`ui.c`, `ui.h`) from `layout.json`
- **User Code Protection** — Guard regions preserved across regeneration
- **Auto-refresh** — Designer updates when `layout.json`, `lvproj.json`, or `styles.json` changes
- **Toolbar** — Generate Code and Refresh from the Designer
- **Preview canvas** — Canvas area sized to project resolution; LVGL WASM integration planned

## Commands

| Command | Description |
|---------|-------------|
| LVCraft: Create New Project | Wizard to create a new LVCraft project |
| LVCraft: Open Existing Project | Open a folder containing `lvproj.json` |
| LVCraft: Open Designer | Open the Designer panel (requires project) |
| LVCraft: Open Simulator | Same as Open Designer (placeholder for LVGL WASM preview) |
| LVCraft: Generate Code | Generate `generated/ui/ui.c` and `ui.h` |
| LVCraft: Clean Generated | Delete contents of `generated/` |

## Project Structure

```
project-root/
  lvproj.json    # Project manifest (LVGL version, resolution, color depth)
  layout.json    # Widget tree
  styles.json    # Shared styles
  assets.json    # Asset manifest
  generated/     # Generated C code (ui/, etc.)
  user/          # User business logic
  backups/       # Versioned backups
```

## Getting Started

1. Run **LVCraft: Create New Project** and follow the wizard.
2. Edit `layout.json` to add widgets (or use the Designer when ready).
3. Run **LVCraft: Open Designer** to view the widget tree.
4. Run **LVCraft: Generate Code** to produce C files in `generated/ui/`.

## LVGL WASM Preview (automatic install)

- **End users** — After you install the extension, it installs the LVGL WASM runtime automatically: on startup it downloads `lvgl.js` from the extension’s GitHub Release (if not already bundled or in global storage). No Emscripten or manual steps. You can also run **LVCraft: Install LVGL WASM Runtime** from the Command Palette.
- **Releases** — For the auto-download to work, each GitHub Release must include a `lvgl.js` asset (run `npm run build:wasm` and attach `media/wasm/lvgl.js` as `lvgl.js`). See [wasm/README.md](wasm/README.md).
- **Override** — Put `lvgl.js` in your project at `.lvcraft/wasm/` to use your own build.

Online demos: [lvgl.io/demos](https://lvgl.io/demos)

## Development

```bash
npm install          # inits git submodule (deps/lv_web_emscripten)
npm run build
npm test
npm run build:wasm   # optional: build LVGL WASM (requires Emscripten)
```

- Press **F5** to launch the Extension Development Host.
- Run **LVCraft: Open Designer** in the new window (with an LVCraft project open).

## License

MIT
