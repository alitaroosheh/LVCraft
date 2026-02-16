#!/usr/bin/env node
/**
 * Build LVGL WASM from deps/lv_web_emscripten and copy to media/wasm/lvgl.js.
 * Requires Emscripten (emcc, emcmake, emmake) on PATH.
 * Cross-platform: Windows, Linux, macOS.
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const depDir = path.join(root, 'deps', 'lv_web_emscripten');
const buildDir = path.join(depDir, 'cmbuild');
const outDir = path.join(root, 'media', 'wasm');
const outFile = path.join(outDir, 'lvgl.js');

function run(cmd, opts = {}) {
  const shell = process.platform === 'win32';
  execSync(cmd, { cwd: opts.cwd || root, stdio: 'inherit', shell });
}

// Check submodule exists
if (!fs.existsSync(path.join(depDir, 'CMakeLists.txt'))) {
  console.error('deps/lv_web_emscripten not found. Run: npm install (postinstall inits submodules)');
  process.exit(1);
}

// Check Emscripten
try {
  execSync('emcc -v', { stdio: 'pipe', shell: process.platform === 'win32' });
} catch {
  console.error('emcc not found. Install Emscripten and ensure emcc is on PATH.');
  console.error('See https://emscripten.org/docs/getting_started/downloads.html');
  process.exit(1);
}

// LVCraft overlay: patch for live layout preview (skip demo when layout provided)
const overlayDir = path.join(root, 'scripts', 'lvcraft-overlay');
const overlayMain = path.join(overlayDir, 'main.c');
if (fs.existsSync(overlayMain)) {
  const depMain = path.join(depDir, 'main.c');
  fs.copyFileSync(overlayMain, depMain);
  const cmakePath = path.join(depDir, 'CMakeLists.txt');
  let cmake = fs.readFileSync(cmakePath, 'utf-8');
  const exportedFns = [
    /* When explicitly setting EXPORTED_FUNCTIONS, include _main or Emscripten won't run main(). */
    '_main',
    '_lv_screen_active', '_lv_obj_clean', '_lv_obj_create', '_lv_refr_now', '_lv_obj_set_parent',
    '_lv_button_create', '_lv_label_create', '_lv_image_create', '_lv_slider_create',
    '_lv_bar_create', '_lv_switch_create', '_lv_checkbox_create', '_lv_textarea_create',
    '_lv_obj_set_pos', '_lv_obj_set_size', '_lv_obj_set_width', '_lv_obj_set_height',
    '_lv_label_set_text', '_lv_textarea_set_text', '_lv_textarea_set_placeholder_text',
    '_lv_slider_set_value', '_lv_bar_set_value', '_lv_checkbox_set_text',
    '_lvcraft_obj_set_style_text_color',
    '_lvcraft_obj_set_style_bg'
  ];
  const exportsJson = `[${exportedFns.map((e) => `"${e}"`).join(',')}]`;
  /* We need literal quotes for emcc, but this string lives inside a CMake double-quoted LINK_FLAGS.
     Therefore we escape quotes as \" in the CMake file. */
  const exportsForCmake = exportsJson.replace(/"/g, '\\"');
  const runtimeMethodsJson = `["cwrap","ccall"]`;
  const runtimeMethodsForCmake = runtimeMethodsJson.replace(/"/g, '\\"');

  /* Ensure EXPORTED_FUNCTIONS is inside the LINK_FLAGS quoted value.
     The previous implementation accidentally appended flags outside the quoted string, so exports were ignored. */
  cmake = cmake.replace(
    /set_target_properties\(\s*index\s+PROPERTIES\s+LINK_FLAGS\s+"([^"]*)"[^\n]*\n/,
    (_m, flags) => {
      let newFlags = String(flags);
      newFlags = newFlags
        .replace(/\s+-s\s+EXPORTED_FUNCTIONS='[^']*'/g, '')
        .replace(/\s+-s\s+EXPORTED_FUNCTIONS=\[[^\]]*\]/g, '')
        .replace(/\s+-s\s+EXPORTED_FUNCTIONS=[^\s]+/g, '')
        .replace(/\s+-s\s+EXPORTED_RUNTIME_METHODS='[^']*'/g, '')
        .replace(/\s+-s\s+EXPORTED_RUNTIME_METHODS=\[[^\]]*\]/g, '')
        .replace(/\s+-s\s+EXPORTED_RUNTIME_METHODS=[^\s]+/g, '')
        .trim();
      /* Avoid shell-dependent quoting: pass JSON array with escaped quotes. */
      newFlags += ` -s EXPORTED_FUNCTIONS=${exportsForCmake}`;
      newFlags += ` -s EXPORTED_RUNTIME_METHODS=${runtimeMethodsForCmake}`;
      return `set_target_properties(index PROPERTIES LINK_FLAGS "${newFlags}")\n`;
    }
  );
  fs.writeFileSync(cmakePath, cmake);
}

console.log('Building LVGL WASM (deps/lv_web_emscripten)...');
fs.mkdirSync(buildDir, { recursive: true });
run('emcmake cmake ..', { cwd: buildDir });
run('emmake make -j4', { cwd: buildDir });

let src = path.join(buildDir, 'index.js');
if (!fs.existsSync(src)) {
  const htmlPath = path.join(buildDir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    // Emscripten with custom shell: {{{ SCRIPT }}} is replaced by raw JS (no script tags)
    const afterLastScript = html.split(/<\/script>/i).pop();
    const beforeBody = afterLastScript.split(/<\/body>/i)[0];
    const rawJs = beforeBody ? beforeBody.trim() : '';
    if (rawJs.length > 1000) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outFile, rawJs, 'utf-8');
      console.log('Done: media/wasm/lvgl.js (extracted from index.html)');
      process.exit(0);
    }
    // Fallback: look for inline <script> blocks (non-custom shell)
    const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (match) {
      const scripts = match
        .map((tag) => {
          const m = tag.match(/<script[^>]*>([\s\S]*?)<\/script>/);
          return m ? m[1].trim() : '';
        })
        .filter((s) => s.length > 1000);
      if (scripts.length > 0) {
        const main = scripts.reduce((a, b) => (a.length > b.length ? a : b));
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outFile, main, 'utf-8');
        console.log('Done: media/wasm/lvgl.js (extracted from index.html)');
        process.exit(0);
      }
    }
  }
  console.error('Build did not produce index.js or index.html with inline script');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, outFile);
console.log('Done: media/wasm/lvgl.js');
