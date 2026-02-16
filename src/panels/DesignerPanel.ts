import * as fs from 'fs';
import * as vscode from 'vscode';
import { getNonce } from '../webview/getNonce';
import { log } from '../infra/log';
import { readLvProj, readLayout, readAssets } from '../project/projectService';
import { resolveWasmPath } from '../wasm/wasmRuntimeInstaller';
import type { LayoutWidget } from '../project/types';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWidgetTree(w: LayoutWidget, path = 'root'): string {
  const label = escapeHtml(w.id ?? w.type ?? '?');
  const type = escapeHtml(w.type);
  const styleTag =
    typeof w.styleId === 'string' && w.styleId
      ? ` <span class="wt-style" title="style">[${escapeHtml(w.styleId)}]</span>`
      : '';
  const children = (w.children ?? [])
    .map((c, i) => `<li>${renderWidgetTree(c, path + '.' + i)}</li>`)
    .join('');
  return `<span class="wt-node" data-path="${escapeHtml(path)}" data-type="${type}" title="Click to select">${label}${styleTag}</span>${children ? `<ul>${children}</ul>` : ''}`;
}

export class DesignerPanel {
  public static currentPanel: DesignerPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _projectRoot: vscode.Uri;
  private readonly _globalStorageUri: vscode.Uri;
  private readonly _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    projectRoot: vscode.Uri,
    globalStorageUri: vscode.Uri
  ): DesignerPanel | undefined {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (DesignerPanel.currentPanel) {
      log('DesignerPanel: reveal existing panel');
      DesignerPanel.currentPanel._panel.reveal(column);
      return DesignerPanel.currentPanel;
    }

    log('DesignerPanel: create new panel');
    const panel = vscode.window.createWebviewPanel(
      'lvcraftDesigner',
      'LVCraft Designer',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    const iconPath = vscode.Uri.joinPath(extensionUri, 'LVCraft.png');
    if (fs.existsSync(iconPath.fsPath)) {
      panel.iconPath = iconPath;
    }

    const instance = new DesignerPanel(panel, extensionUri, projectRoot, globalStorageUri);
    DesignerPanel.currentPanel = instance;
    return instance;
  }

  private _extensionUri: vscode.Uri;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    projectRoot: vscode.Uri,
    globalStorageUri: vscode.Uri
  ) {
    this._panel = panel;
    this._projectRoot = projectRoot;
    this._extensionUri = extensionUri;
    this._globalStorageUri = globalStorageUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg: { type?: string; payload?: unknown }) => {
        if (msg.type === 'generateCode') {
          void vscode.commands.executeCommand('lvcraft.generateCode');
        } else if (msg.type === 'refresh') {
          this._refresh();
        } else if (msg.type === 'designerDebug' && msg.payload !== undefined) {
          log('Designer preview: ' + JSON.stringify(msg.payload));
        }
      },
      null,
      this._disposables
    );
    this._refresh();

    const watcher1 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, 'layout.json')
    );
    const watcher2 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, 'lvproj.json')
    );
    const watcher3 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, 'styles.json')
    );
    const watcher4 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, 'assets.json')
    );
    const onProjectFileChange = () => {
      if (DesignerPanel.currentPanel === this) this._refresh();
    };
    watcher1.onDidChange(onProjectFileChange);
    watcher1.onDidCreate(onProjectFileChange);
    watcher2.onDidChange(onProjectFileChange);
    watcher2.onDidCreate(onProjectFileChange);
    watcher3.onDidChange(onProjectFileChange);
    watcher3.onDidCreate(onProjectFileChange);
    watcher4.onDidChange(onProjectFileChange);
    watcher4.onDidCreate(onProjectFileChange);
    this._disposables.push(watcher1, watcher2, watcher3, watcher4);
  }

  private _refresh(): void {
    try {
      this._panel.webview.html = this._getHtmlForWebview(
        this._panel.webview,
        this._extensionUri
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      log(`DesignerPanel: failed to build HTML: ${err}`);
      if (e instanceof Error && e.stack) log(e.stack);
      this._panel.webview.html = this._getErrorHtml(err);
    }
  }

  private _getErrorHtml(message: string): string {
    const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>LVCraft</title></head><body style="margin:1rem;font-family:var(--vscode-font-family);color:var(--vscode-foreground);">
<h2>LVCraft Designer</h2>
<p>Failed to load the designer:</p>
<pre style="white-space:pre-wrap;word-break:break-all;">${escaped}</pre>
<p>Check the Output panel (LVCraft) and the main Developer Console for details.</p>
</body></html>`;
  }

  public dispose() {
    log('DesignerPanel: dispose');
    DesignerPanel.currentPanel = undefined;

    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, _extensionUri: vscode.Uri): string {
    const nonce = getNonce();
    const lvproj = readLvProj(this._projectRoot.fsPath);
    const layout = readLayout(this._projectRoot.fsPath);
    const assets = readAssets(this._projectRoot.fsPath);

    const width = Math.max(1, lvproj?.resolution?.width ?? 320);
    const height = Math.max(1, lvproj?.resolution?.height ?? 240);
    const lvglVersion = lvproj?.lvglVersion ?? '—';
    const colorDepth = lvproj?.colorDepth ?? 16;

    const widgetTreeHtml = layout.root
      ? renderWidgetTree(layout.root)
      : '<span class="wt-empty">Empty</span>';

    const assetImages = (assets.images ?? []).map(
      (a) => `<div class="asset-item">📷 ${escapeHtml(a.path)}${a.id ? ` <span class="asset-id">[${escapeHtml(a.id)}]</span>` : ''}</div>`
    ).join('');
    const assetFonts = (assets.fonts ?? []).map(
      (a) => `<div class="asset-item">🔤 ${escapeHtml(a.path)}${a.id ? ` <span class="asset-id">[${escapeHtml(a.id)}]</span>` : ''}</div>`
    ).join('');
    const assetsHtml =
      assetImages || assetFonts
        ? (assetImages ? `<div class="asset-section"><div class="asset-section-title">Images</div>${assetImages}</div>` : '') +
          (assetFonts ? `<div class="asset-section"><div class="asset-section-title">Fonts</div>${assetFonts}</div>` : '')
        : '<span class="asset-empty">No assets. Edit assets.json</span>';

    const previewData = JSON.stringify({ layout, width, height }).replace(
      /<\//g,
      '<\\/'
    );

    const wasmPath = resolveWasmPath(
      this._projectRoot.fsPath,
      this._extensionUri,
      this._globalStorageUri
    );
    let lvglScriptUri = '';
    if (wasmPath) {
      lvglScriptUri = webview.asWebviewUri(vscode.Uri.file(wasmPath)).toString();
    }
    const lvglScriptUriForJs = lvglScriptUri.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const csp = [
      `default-src 'none';`,
      `img-src ${webview.cspSource} https: data:;`,
      `style-src ${webview.cspSource} 'unsafe-inline';`,
      `script-src 'nonce-${nonce}' ${webview.cspSource} 'wasm-unsafe-eval';`,
      `worker-src 'none';`
    ].join(' ');

    return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LVCraft</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: var(--vscode-font-family, system-ui); font-size: 12px; color: var(--vscode-foreground); background: var(--vscode-editor-background); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
      .designer-header { padding: 8px 12px; background: var(--vscode-input-background); border-bottom: 1px solid var(--vscode-widget-border); display: flex; gap: 16px; align-items: center; flex-shrink: 0; }
      .designer-header h2 { margin: 0; font-size: 14px; }
      .designer-header .meta { display: flex; gap: 16px; font-size: 11px; color: var(--vscode-descriptionForeground); }
      .designer-header .toolbar { display: flex; gap: 8px; margin-left: auto; }
      .toolbar-btn { padding: 4px 10px; font-size: 12px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; }
      .toolbar-btn:hover { background: var(--vscode-button-hoverBackground); }
      .designer-main { flex: 1; display: flex; min-height: 0; }
      .panel { border-right: 1px solid var(--vscode-widget-border); display: flex; flex-direction: column; overflow: hidden; }
      .panel:last-of-type { border-right: none; }
      .panel-title { padding: 6px 10px; font-weight: 600; background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-widget-border); flex-shrink: 0; }
      .panel-body { flex: 1; overflow: auto; padding: 8px; }
      .wt-tree { list-style: none; margin: 0; padding-left: 12px; }
      .wt-tree ul { list-style: none; margin: 0; padding-left: 12px; }
      .wt-node { display: block; padding: 2px 4px; cursor: pointer; border-radius: 2px; }
      .wt-node:hover { background: var(--vscode-list-hoverBackground); }
      .wt-node.selected { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
      .wt-style { font-size: 10px; color: var(--vscode-descriptionForeground); margin-left: 4px; }
      .wt-empty { color: var(--vscode-descriptionForeground); font-style: italic; }
      .asset-section { margin-top: 8px; }
      .asset-section-title { font-size: 10px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; text-transform: uppercase; }
      .asset-item { font-size: 11px; padding: 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .asset-id { font-size: 10px; color: var(--vscode-descriptionForeground); }
      .asset-empty { color: var(--vscode-descriptionForeground); font-style: italic; font-size: 11px; }
      .preview-container { position: relative; min-height: 120px; background: #5a5a5a; overflow: hidden; }
      .preview-viewport { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
      .preview-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); color: var(--vscode-descriptionForeground); font-size: 12px; text-align: center; pointer-events: none; }
      .inspector-placeholder { color: var(--vscode-descriptionForeground); font-style: italic; }
      .inspector-body { font-size: 11px; }
      .inspector-row { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--vscode-widget-border); }
      .inspector-row:last-child { border-bottom: none; }
      .inspector-label { color: var(--vscode-descriptionForeground); min-width: 60px; }
      .inspector-value { font-family: var(--vscode-editor-font-family, monospace); word-break: break-all; }
      .inspector-empty { color: var(--vscode-descriptionForeground); font-style: italic; }
    </style>
  </head>
  <body>
    <header class="designer-header">
      <h2>LVCraft Designer</h2>
      <div class="meta">LVGL ${escapeHtml(String(lvglVersion))} · ${width}×${height} · ${colorDepth} bpp</div>
      <div class="toolbar">
        <button type="button" class="toolbar-btn" data-action="zoom100" title="Zoom 100%">100%</button>
        <button type="button" class="toolbar-btn" data-action="zoomFit" title="Fit to view">Fit</button>
        <button type="button" class="toolbar-btn" data-action="toggleGrid" title="Toggle pixel grid" id="lvcraft-grid-btn">Grid</button>
        <button type="button" class="toolbar-btn" data-action="generateCode">Generate Code</button>
        <button type="button" class="toolbar-btn" data-action="refresh">Refresh</button>
      </div>
    </header>
    <div class="designer-main">
      <aside class="panel" style="width: 200px; min-width: 160px;">
        <div class="panel-title">Widget Tree</div>
        <div class="panel-body"><ul class="wt-tree"><li>${widgetTreeHtml}</li></ul></div>
        <div class="panel-title" style="border-top: 1px solid var(--vscode-widget-border);">Asset Browser</div>
        <div class="panel-body" style="flex: 0 1 auto; min-height: 60px;">${assetsHtml}</div>
      </aside>
      <main class="panel" style="flex: 1;">
        <div class="panel-title">Canvas</div>
        <div id="lvcraft-preview-container" class="panel-body preview-container">
          <div id="lvcraft-preview-viewport" class="preview-viewport">
            <canvas id="canvas" data-lvcraft-id="lvcraft-preview-canvas" width="${width}" height="${height}" style="display: block; background: #e0e0e0;"></canvas>
            <canvas id="lvcraft-grid-canvas" width="${width}" height="${height}" style="position: absolute; top: 0; left: 0; pointer-events: none; display: none;"></canvas>
            <canvas id="lvcraft-selection-canvas" width="${width}" height="${height}" style="position: absolute; top: 0; left: 0; pointer-events: none;"></canvas>
          </div>
          <div id="lvcraft-debug-badge" style="position:absolute;left:6px;top:6px;z-index:5;padding:4px 6px;border-radius:4px;background:rgba(0,0,0,0.65);color:#fff;font:11px/1.3 var(--vscode-editor-font-family, monospace);white-space:pre;max-width:95%;pointer-events:none;"></div>
          <div id="lvcraft-preview-overlay" class="preview-overlay">
            <span>LVGL WASM: not built. See README for build instructions.</span>
          </div>
        </div>
      </main>
      <aside class="panel" style="width: 200px; min-width: 160px;">
        <div class="panel-title">Property Inspector</div>
        <div id="lvcraft-inspector-body" class="panel-body">
          <span id="lvcraft-inspector-placeholder" class="inspector-placeholder">Select a widget</span>
          <div id="lvcraft-inspector-content" class="inspector-body" style="display: none;"></div>
        </div>
      </aside>
    </div>
    <script nonce="${nonce}">
      (function() {
        window.__LVCRAFT_PREVIEW__ = ${previewData};
        const vscode = acquireVsCodeApi();
        const W = ${width}, H = ${height};
        const LVGL_SCRIPT_URI = ${lvglScriptUri ? `'${lvglScriptUriForJs}'` : 'null'};
        const MIN_ZOOM = 0.25, MAX_ZOOM = 2;
        var zoom = 1, offsetX = 0, offsetY = 0, panning = false, panStartX = 0, panStartY = 0, panOffsetX = 0, panOffsetY = 0;
        var container = document.getElementById('lvcraft-preview-container');
        var viewport = document.getElementById('lvcraft-preview-viewport');
        function applyTransform() {
          viewport.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + zoom + ')';
        }
        function getClientRect() {
          var r = container.getBoundingClientRect();
          return { left: r.left, top: r.top, w: r.width, h: r.height };
        }
        function zoomToPoint(clientX, clientY, delta) {
          var r = getClientRect();
          var mx = clientX - r.left, my = clientY - r.top;
          var cx = (mx - offsetX) / zoom, cy = (my - offsetY) / zoom;
          var factor = delta > 0 ? 1.1 : 1 / 1.1;
          zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
          offsetX = mx - cx * zoom;
          offsetY = my - cy * zoom;
          applyTransform();
        }
        container.addEventListener('wheel', function(e) {
          e.preventDefault();
          zoomToPoint(e.clientX, e.clientY, e.deltaY);
        }, { passive: false });
        container.addEventListener('mousedown', function(e) {
          if (e.button === 1) {
            e.preventDefault();
            panning = true;
            panStartX = e.clientX;
            panStartY = e.clientY;
            panOffsetX = offsetX;
            panOffsetY = offsetY;
          }
        });
        document.addEventListener('mousemove', function(e) {
          if (panning) {
            offsetX = panOffsetX + (e.clientX - panStartX);
            offsetY = panOffsetY + (e.clientY - panStartY);
            applyTransform();
          }
        });
        document.addEventListener('mouseup', function() { panning = false; });
        function zoom100() {
          var r = getClientRect();
          zoom = 1;
          offsetX = r.w > 0 ? (r.w - W) / 2 : 0;
          offsetY = r.h > 0 ? (r.h - H) / 2 : 0;
          applyTransform();
        }
        function zoomFit() {
          var r = getClientRect();
          if (r.w <= 0 || r.h <= 0) return;
          var sx = r.w / W, sy = r.h / H;
          zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(sx, sy)));
          offsetX = (r.w - W * zoom) / 2;
          offsetY = (r.h - H * zoom) / 2;
          applyTransform();
        }
        document.querySelectorAll('.toolbar-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var action = this.getAttribute('data-action');
            if (action === 'zoom100') zoom100();
            else if (action === 'zoomFit') zoomFit();
            else if (action === 'toggleGrid') toggleGrid();
            else if (action) vscode.postMessage({ type: action });
          });
        });
        /* Do not get 2D context on #canvas: Emscripten/SDL may use it for WebGL. Use CSS background for placeholder look. */
        var gridVisible = false;
        var gridCanvas = document.getElementById('lvcraft-grid-canvas');
        function drawGrid() {
          if (!gridCanvas || !gridCanvas.getContext) return;
          var gctx = gridCanvas.getContext('2d');
          if (!gctx) return;
          gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
          var step = 10;
          gctx.strokeStyle = 'rgba(128,128,128,0.4)';
          gctx.lineWidth = 1;
          gctx.beginPath();
          for (var x = step; x < W; x += step) {
            gctx.moveTo(x, 0);
            gctx.lineTo(x, H);
          }
          for (var y = step; y < H; y += step) {
            gctx.moveTo(0, y);
            gctx.lineTo(W, y);
          }
          gctx.stroke();
        }
        function toggleGrid() {
          gridVisible = !gridVisible;
          gridCanvas.style.display = gridVisible ? 'block' : 'none';
          if (gridVisible) drawGrid();
        }
        zoomFit();
        if (LVGL_SCRIPT_URI) {
          var overlayEl = document.getElementById('lvcraft-preview-overlay');
          var canvasEl = document.getElementById('canvas');
          var badgeEl = document.getElementById('lvcraft-debug-badge');
          var layout = (window.__LVCRAFT_PREVIEW__ && window.__LVCRAFT_PREVIEW__.layout) || null;
          var w = Math.max(1, parseInt(W, 10) || 320);
          var h = Math.max(1, parseInt(H, 10) || 240);
          [canvasEl, document.getElementById('lvcraft-grid-canvas'), document.getElementById('lvcraft-selection-canvas')].forEach(function(c) {
            if (c) { c.width = w; c.height = h; }
          });
          var hasRoot = layout && layout.root;
          function runAfterRuntimeReady() {
            try {
              if (badgeEl) {
                var ex = {
                  _lv_screen_active: !!Module._lv_screen_active,
                  _lv_obj_clean: !!Module._lv_obj_clean,
                  _lv_obj_create: !!Module._lv_obj_create,
                  _lv_label_create: !!Module._lv_label_create,
                  _lv_label_set_text: !!Module._lv_label_set_text,
                  _lvcraft_obj_set_style_text_color: !!Module._lvcraft_obj_set_style_text_color
                };
                var exOk = [ex._lv_screen_active, ex._lv_obj_clean, ex._lv_obj_create, ex._lv_label_create, ex._lv_label_set_text, ex._lvcraft_obj_set_style_text_color].filter(Boolean).length;
                badgeEl.textContent =
                  'LVCraft preview | canvas=' + (canvasEl ? canvasEl.id : 'null') +
                  ' | layout=' + (layout ? 'y' : 'n') + ' root=' + (hasRoot ? 'y' : 'n') +
                  ' | exports=' + exOk + '/6';
              }
            } catch (e) {}
            if (overlayEl) {
              if (hasRoot) overlayEl.style.display = 'none';
              else {
                overlayEl.style.display = 'flex';
                var span = overlayEl.querySelector('span');
                if (span) span.textContent = 'Layout empty. Add a root widget in layout.json to see the preview.';
              }
            }
            function tryBuild(attempt) {
              if (!hasRoot) return;
              if (!Module._lv_screen_active || !Module._lv_obj_clean) return;
              try {
                var scr = Module._lv_screen_active();
                if (!scr) {
                  if (badgeEl) badgeEl.textContent = badgeEl.textContent.replace(new RegExp(' \\| exports=[0-9]+/6$'), '') + ' wait=' + String(attempt);
                  if (attempt < 60) setTimeout(function() { tryBuild(attempt + 1); }, 50);
                  return;
                }
                Module._lv_obj_clean(scr);
                  var createObj = Module.cwrap('lv_obj_create', 'number', ['number']);
                  var createBtn = Module.cwrap('lv_button_create', 'number', ['number']);
                  var createLabel = Module.cwrap('lv_label_create', 'number', ['number']);
                  /* LVGL v9 uses lv_image_create; lv_img_create is only a macro alias (no exported symbol). */
                  var createImg =
                    (Module._lv_image_create ? Module.cwrap('lv_image_create', 'number', ['number']) : null) ||
                    (Module._lv_img_create ? Module.cwrap('lv_img_create', 'number', ['number']) : null);
                  var createSlider = Module._lv_slider_create ? Module.cwrap('lv_slider_create', 'number', ['number']) : null;
                  var createBar = Module._lv_bar_create ? Module.cwrap('lv_bar_create', 'number', ['number']) : null;
                  var createSwitch = Module._lv_switch_create ? Module.cwrap('lv_switch_create', 'number', ['number']) : null;
                  var createCheckbox = Module._lv_checkbox_create ? Module.cwrap('lv_checkbox_create', 'number', ['number']) : null;
                  var createTextarea = Module._lv_textarea_create ? Module.cwrap('lv_textarea_create', 'number', ['number']) : null;
                  var setPos = Module.cwrap('lv_obj_set_pos', null, ['number', 'number', 'number']);
                  var setSize = Module.cwrap('lv_obj_set_size', null, ['number', 'number', 'number']);
                  var setWidth = Module.cwrap('lv_obj_set_width', null, ['number', 'number']);
                  var setHeight = Module.cwrap('lv_obj_set_height', null, ['number', 'number']);
                  var setLabelText = Module.cwrap('lv_label_set_text', null, ['number', 'string']);
                  var setTextColor = Module._lvcraft_obj_set_style_text_color ? Module.cwrap('lvcraft_obj_set_style_text_color', null, ['number', 'number']) : null;
                  var setTextareaText = Module._lv_textarea_set_text ? Module.cwrap('lv_textarea_set_text', null, ['number', 'string']) : null;
                  var setTextareaPlaceholder = Module._lv_textarea_set_placeholder_text ? Module.cwrap('lv_textarea_set_placeholder_text', null, ['number', 'string']) : null;
                  var setSliderValue = Module._lv_slider_set_value ? Module.cwrap('lv_slider_set_value', null, ['number', 'number', 'number']) : null;
                  var setBarValue = Module._lv_bar_set_value ? Module.cwrap('lv_bar_set_value', null, ['number', 'number', 'number']) : null;
                  var setCheckboxText = Module._lv_checkbox_set_text ? Module.cwrap('lv_checkbox_set_text', null, ['number', 'string']) : null;
                  var createdCount = 0;
                  function createWidget(w, parent) {
                    if (!w) return 0;
                    var t = (w.type || 'obj').toLowerCase();
                    var obj = 0;
                    if (t === 'btn' || t === 'button') obj = createBtn(parent);
                    else if (t === 'label' || t === 'lbl') obj = createLabel(parent);
                    else if ((t === 'img' || t === 'image') && createImg) obj = createImg(parent);
                    else if (t === 'slider' && createSlider) obj = createSlider(parent);
                    else if (t === 'bar' && createBar) obj = createBar(parent);
                    else if (t === 'switch' && createSwitch) obj = createSwitch(parent);
                    else if (t === 'checkbox' && createCheckbox) obj = createCheckbox(parent);
                    else if (t === 'textarea' && createTextarea) obj = createTextarea(parent);
                    else obj = createObj(parent);
                    if (!obj) return 0;
                    createdCount++;
                    if (typeof w.x === 'number' && typeof w.y === 'number') setPos(obj, Math.round(w.x), Math.round(w.y));
                    if (typeof w.width === 'number' && typeof w.height === 'number') setSize(obj, Math.round(w.width), Math.round(w.height));
                    else if (typeof w.width === 'number') setWidth(obj, Math.round(w.width));
                    else if (typeof w.height === 'number') setHeight(obj, Math.round(w.height));
                    if (t === 'label' || t === 'lbl') {
                      if (typeof w.text === 'string') setLabelText(obj, w.text);
                      if (setTextColor) setTextColor(obj, (typeof w.textColor === 'number' ? w.textColor : 0x000000) >>> 0);
                    }
                    else if (t === 'textarea' && setTextareaText) {
                      if (typeof w.text === 'string') setTextareaText(obj, w.text);
                      if (typeof w.placeholder === 'string' && setTextareaPlaceholder) setTextareaPlaceholder(obj, w.placeholder);
                    }
                    else if (t === 'slider' && setSliderValue && typeof w.value === 'number') setSliderValue(obj, Math.round(w.value), 1);
                    else if (t === 'bar' && setBarValue && typeof w.value === 'number') setBarValue(obj, Math.round(w.value), 1);
                    else if (t === 'checkbox' && setCheckboxText && typeof w.text === 'string') setCheckboxText(obj, w.text);
                    (w.children || []).forEach(function(c) { createWidget(c, obj); });
                    return obj;
                  }
                  createWidget(layout.root, scr);
                  if (badgeEl) badgeEl.textContent = badgeEl.textContent.replace(new RegExp(' wait=[0-9]+$'), '').replace(new RegExp(' \\| exports=[0-9]+/6$'), '') + ' | created=' + String(createdCount);
                  if (Module._lv_refr_now) {
                    Module._lv_refr_now(0);
                    setTimeout(function() { Module._lv_refr_now(0); }, 50);
                    setTimeout(function() { Module._lv_refr_now(0); }, 150);
                  }
              } catch (e) { console.warn('LVCraft layout preview:', e); }
            }
            tryBuild(0);
            var viewportEl = document.getElementById('lvcraft-preview-viewport');
            function showLvglCanvas() {
              if (!viewportEl) return;
              var active = (typeof Module !== 'undefined' && Module.canvas) ? Module.canvas : null;
              if (active && active instanceof HTMLCanvasElement) {
                if (active !== canvasEl) {
                  if (active.parentNode !== viewportEl) {
                    active.style.position = 'absolute';
                    active.style.left = '0';
                    active.style.top = '0';
                    active.style.display = 'block';
                    active.style.zIndex = '1';
                    viewportEl.appendChild(active);
                  }
                  if (canvasEl) { canvasEl.style.display = 'none'; canvasEl.style.zIndex = '0'; }
                  return;
                }
              }
              if (canvasEl) { canvasEl.style.display = 'block'; canvasEl.style.zIndex = '1'; }
            }
            setTimeout(showLvglCanvas, 100);
            setTimeout(showLvglCanvas, 500);
            setTimeout(showLvglCanvas, 1200);
            setTimeout(function() {
              try {
                var count = document.querySelectorAll('canvas').length;
                var mid = (typeof Module !== 'undefined' && Module.canvas) ? (Module.canvas.id || '(no id)') : '(no Module.canvas)';
                vscode.postMessage({ type: 'designerDebug', payload: { canvasCount: count, moduleCanvasId: mid } });
              } catch (e) {}
            }, 1000);
          }
          window.Module = {
            canvas: canvasEl,
            /* Emscripten passes argv[0] as program name automatically.
               Our C main expects argv[1]=width, argv[2]=height. */
            arguments: [String(w), String(h)],
            lvcraft_layout: layout ? JSON.stringify(layout) : null,
            /* Run after main() so display is registered. */
            postRun: [function() { runAfterRuntimeReady(); }]
          };
          var script = document.createElement('script');
          script.id = 'mainScript';
          script.src = LVGL_SCRIPT_URI;
          script.onload = function() {
            /* Do NOT touch exported functions here: the JS file is loaded, but the Wasm instance
               may not be initialized yet. We rely on Module.postRun, which runs after main(). */
          };
          script.onerror = function() {
            if (overlayEl) {
              overlayEl.style.display = 'flex';
              overlayEl.querySelector('span').textContent = 'LVGL WASM: failed to load. Check .lvcraft/wasm/ and console.';
            }
          };
          document.body.appendChild(script);
        }
        function getWidgetByPath(layout, path) {
          if (!layout || !path || path === 'root') return layout?.root;
          var parts = path.split('.');
          var w = layout.root;
          for (var i = 1; i < parts.length && w; i++) {
            var idx = parseInt(parts[i], 10);
            w = (w.children && w.children[idx]) || null;
          }
          return w;
        }
        function getWidgetBounds(layout, path) {
          if (!layout || !path) return null;
          var parts = path.split('.');
          var w = layout.root;
          if (!w) return null;
          var absX = 0, absY = 0;
          for (var i = 1; i < parts.length && w; i++) {
            absX += (typeof w.x === 'number' ? w.x : 0);
            absY += (typeof w.y === 'number' ? w.y : 0);
            var idx = parseInt(parts[i], 10);
            w = (w.children && w.children[idx]) || null;
          }
          if (!w) return null;
          absX += (typeof w.x === 'number' ? w.x : 0);
          absY += (typeof w.y === 'number' ? w.y : 0);
          var ww = typeof w.width === 'number' ? w.width : (path === 'root' ? W : 50);
          var hh = typeof w.height === 'number' ? w.height : (path === 'root' ? H : 50);
          return { x: absX, y: absY, w: ww, h: hh };
        }
        var selectionCanvas = document.getElementById('lvcraft-selection-canvas');
        function drawSelectionBox(bounds) {
          if (!selectionCanvas || !bounds) return;
          var ctx = selectionCanvas.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
          ctx.strokeStyle = '#0078d4';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.setLineDash([]);
        }
        function clearSelectionBox() {
          if (!selectionCanvas) return;
          var ctx = selectionCanvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
        }
        function formatProp(val) {
          if (val === undefined || val === null) return '—';
          if (Array.isArray(val)) return val.length + ' items';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        }
        function renderInspector(widget) {
          if (!widget) return '';
          var order = ['type', 'id', 'styleId', 'x', 'y', 'width', 'height', 'children'];
          var seen = {};
          var html = '';
          for (var i = 0; i < order.length; i++) {
            var k = order[i];
            if (k in widget) {
              seen[k] = true;
              var v = k === 'children' ? (widget.children || []).length : widget[k];
              html += '<div class="inspector-row"><span class="inspector-label">' + escapeHtml(k) + '</span><span class="inspector-value">' + escapeHtml(formatProp(v)) + '</span></div>';
            }
          }
          var keys = Object.keys(widget).filter(function(k) { return !seen[k]; }).sort();
          for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            html += '<div class="inspector-row"><span class="inspector-label">' + escapeHtml(key) + '</span><span class="inspector-value">' + escapeHtml(formatProp(widget[key])) + '</span></div>';
          }
          return html || '<div class="inspector-row inspector-empty">No properties</div>';
        }
        function escapeHtml(s) {
          return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function selectWidget(path) {
          document.querySelectorAll('.wt-node.selected').forEach(function(n) { n.classList.remove('selected'); });
          var node = document.querySelector('.wt-node[data-path="' + path.replace(/"/g, '&quot;') + '"]');
          if (node) node.classList.add('selected');
          var layout = window.__LVCRAFT_PREVIEW__ && window.__LVCRAFT_PREVIEW__.layout;
          var widget = getWidgetByPath(layout, path);
          var ph = document.getElementById('lvcraft-inspector-placeholder');
          var ct = document.getElementById('lvcraft-inspector-content');
          if (widget) {
            ph.style.display = 'none';
            ct.style.display = 'block';
            ct.innerHTML = renderInspector(widget);
            var bounds = getWidgetBounds(layout, path);
            if (bounds) drawSelectionBox(bounds); else clearSelectionBox();
          } else {
            ph.style.display = 'block';
            ph.textContent = 'Select a widget';
            ct.style.display = 'none';
            clearSelectionBox();
          }
        }
        document.querySelectorAll('.wt-node').forEach(function(node) {
          node.addEventListener('click', function() {
            var path = this.getAttribute('data-path');
            if (path) selectWidget(path);
          });
        });
      })();
    </script>
  </body>
</html>`;
  }
}

