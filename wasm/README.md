# LVGL WASM for LVCraft Preview

The Designer runs LVGL in the browser when a built LVGL + Emscripten bundle is available. It can come from the **extension** (bundled) or from your **project** (override).

## How the extension gets LVGL WASM

1. **Submodule** — This repo includes [lv_web_emscripten](https://github.com/lvgl/lv_web_emscripten) as a git submodule under `deps/lv_web_emscripten`.
2. **postinstall** — When you run `npm install`, `postinstall` runs `git submodule update --init --recursive`, so the submodule is cloned (no Emscripten needed).
3. **Build** — Run `npm run build:wasm` to build LVGL from the submodule. Requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) on your PATH (`emcc`, `emcmake`, `emmake`). Output is written to `media/wasm/lvgl.js`. Works on **Windows** and **Linux** (and macOS).
4. **Packaging** — When creating the VSIX (`npm run package`), include `media/wasm/lvgl.js` so that **end users get LVGL preview as soon as they install the extension** (no Emscripten or manual build on their machine). So: run `npm run build:wasm` before `npm run package` when releasing.

## Automatic install (like ESP-IDF)

After you install the extension:

1. **On startup** — The extension activates and, in the background, ensures the LVGL WASM runtime is available. If `media/wasm/lvgl.js` is not bundled and global storage does not have it yet, it **downloads** `lvgl.js` from the extension’s GitHub Release (e.g. `v0.0.1`) and saves it to VS Code global storage. No Emscripten or manual steps required.
2. **Manual install** — You can run **LVCraft: Install LVGL WASM Runtime** from the Command Palette to trigger the download and see progress.

For this to work, each release must have a **Release asset** named `lvgl.js`. The [GitHub Action](.github/workflows/release.yml) builds it automatically when you push a tag.

**Triggering the workflow** — Push one of these tags:

- `prerelease` or `prerelease-*`
- `release` or `release-*`
- `v*` (e.g. `v0.0.1`)

The workflow builds `lvgl.js` (Emscripten) and the VSIX, then creates a GitHub Release with both as assets. The installer tries `v{version}`, then `release`, then `prerelease`.

## Load order

The Designer loads LVGL WASM in this order:

1. **Project** — `.lvcraft/wasm/lvgl.js` or `.lvcraft/wasm/index.js` in the LVCraft project (folder with `lvproj.json`). Use this to override with a custom build.
2. **Extension bundled** — `media/wasm/lvgl.js` inside the installed extension (if the VSIX was built with `build:wasm`).
3. **Global storage** — `lvgl.js` in the extension’s global storage (downloaded on first run if no bundled or project WASM).

## As an end user (no Emscripten)

- Install the LVCraft extension (from VSIX or marketplace). After VS Code starts, the extension will download the LVGL WASM runtime from the release if needed. Open the Designer; LVGL preview should work once the download has finished.
- Or run **LVCraft: Install LVGL WASM Runtime** to install it manually.
- Or put `lvgl.js` in your project at `.lvcraft/wasm/lvgl.js` to use your own build.

## As a developer (building WASM)

```bash
# Clone repo (submodule will be empty until npm install)
git clone https://github.com/your-org/LVCraft.git
cd LVCraft

# Install deps and init submodule (no Emscripten needed)
npm install

# Build LVGL WASM (requires Emscripten on PATH)
npm run build:wasm
```

Then run the extension (F5) or package: `media/wasm/lvgl.js` is used by the Designer.

## Emscripten (Windows / Linux)

- **Windows** — Install [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html), open a shell where `emcc` is on PATH (e.g. run `emsdk_env.bat` or use the Emscripten command prompt).
- **Linux** — Install the SDK and `source ./emsdk_env.sh` so `emcc` is on PATH.

The build script (`scripts/build-wasm.js`) runs `emcmake cmake ..` and `emmake make -j4` in `deps/lv_web_emscripten/cmbuild/` and copies `index.js` to `media/wasm/lvgl.js`.

## What you get

The standard lv_web_emscripten build runs the default LVGL demo (e.g. widgets) in the Designer canvas. Resolution comes from your `lvproj.json` (passed as `Module.arguments`).

## Custom build (LVCraft layout preview)

To render your **layout.json** in the preview instead of the demo, you need a custom Emscripten build that reads `Module.LVCRAFT_PREVIEW` and builds the widget tree from it. The extension already sets `window.__LVCRAFT_PREVIEW__`; a custom main could use that. Not provided here.

## Troubleshooting

- **Overlay stays visible** — Check WebView devtools for load errors. Ensure `media/wasm/lvgl.js` exists (after `build:wasm`) or `.lvcraft/wasm/lvgl.js` in your project.
- **emcc not found** — Install Emscripten and ensure `emcc` is on PATH in the shell where you run `npm run build:wasm`.
- **Submodule empty** — Run `npm install` (postinstall inits submodules) or `git submodule update --init --recursive`.
