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

## LVGL WASM Preview (planned)

The Designer Canvas shows a placeholder. Full LVGL preview requires building LVGL with Emscripten:

1. Install [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html)
2. Clone [lv_web_emscripten](https://github.com/lvgl/lv_web_emscripten): `git clone --recursive https://github.com/lvgl/lv_web_emscripten.git`
3. Build: `cd lv_web_emscripten && mkdir cmbuild && cd cmbuild && emcmake cmake .. && emmake make`
4. Integrate the generated `lvgl.js` and `lvgl.wasm` into the extension (see PRD 4.5)

Online demos: [lvgl.io/demos](https://lvgl.io/demos)

## Development

```bash
npm install
npm run build
npm test
```

- Press **F5** to launch the Extension Development Host.
- Run **LVCraft: Open Designer** in the new window (with an LVCraft project open).

## License

MIT
