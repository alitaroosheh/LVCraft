import * as vscode from 'vscode';
import { getNonce } from '../webview/getNonce';
import { log } from '../infra/log';
import { readLvProj, readLayout } from '../project/projectService';
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
  private readonly _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    projectRoot: vscode.Uri
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

    const instance = new DesignerPanel(panel, extensionUri, projectRoot);
    DesignerPanel.currentPanel = instance;
    return instance;
  }

  private _extensionUri: vscode.Uri;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    projectRoot: vscode.Uri
  ) {
    this._panel = panel;
    this._projectRoot = projectRoot;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg: { type?: string }) => {
        if (msg.type === 'generateCode') {
          void vscode.commands.executeCommand('lvcraft.generateCode');
        } else if (msg.type === 'refresh') {
          this._refresh();
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
    const onProjectFileChange = () => {
      if (DesignerPanel.currentPanel === this) this._refresh();
    };
    watcher1.onDidChange(onProjectFileChange);
    watcher1.onDidCreate(onProjectFileChange);
    watcher2.onDidChange(onProjectFileChange);
    watcher2.onDidCreate(onProjectFileChange);
    watcher3.onDidChange(onProjectFileChange);
    watcher3.onDidCreate(onProjectFileChange);
    this._disposables.push(watcher1, watcher2, watcher3);
  }

  private _refresh(): void {
    this._panel.webview.html = this._getHtmlForWebview(
      this._panel.webview,
      this._extensionUri
    );
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

    const width = lvproj?.resolution.width ?? 320;
    const height = lvproj?.resolution.height ?? 240;
    const lvglVersion = lvproj?.lvglVersion ?? '—';
    const colorDepth = lvproj?.colorDepth ?? 16;

    const widgetTreeHtml = layout.root
      ? renderWidgetTree(layout.root)
      : '<span class="wt-empty">Empty</span>';

    const previewData = JSON.stringify({ layout, width, height }).replace(
      /<\//g,
      '<\\/'
    );
    const csp = [
      `default-src 'none';`,
      `img-src ${webview.cspSource} https: data:;`,
      `style-src ${webview.cspSource} 'unsafe-inline';`,
      `script-src 'nonce-${nonce}' ${webview.cspSource};`,
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
      .preview-container { position: relative; min-height: 120px; background: #5a5a5a; overflow: hidden; }
      .preview-viewport { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
      .preview-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); color: var(--vscode-descriptionForeground); font-size: 12px; text-align: center; pointer-events: none; }
      .inspector-placeholder { color: var(--vscode-descriptionForeground); font-style: italic; }
      .inspector-body { font-size: 11px; }
      .inspector-row { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--vscode-widget-border); }
      .inspector-row:last-child { border-bottom: none; }
      .inspector-label { color: var(--vscode-descriptionForeground); min-width: 60px; }
      .inspector-value { font-family: var(--vscode-editor-font-family, monospace); }
    </style>
  </head>
  <body>
    <header class="designer-header">
      <h2>LVCraft Designer</h2>
      <div class="meta">LVGL ${escapeHtml(String(lvglVersion))} · ${width}×${height} · ${colorDepth} bpp</div>
      <div class="toolbar">
        <button type="button" class="toolbar-btn" data-action="zoom100" title="Zoom 100%">100%</button>
        <button type="button" class="toolbar-btn" data-action="zoomFit" title="Fit to view">Fit</button>
        <button type="button" class="toolbar-btn" data-action="generateCode">Generate Code</button>
        <button type="button" class="toolbar-btn" data-action="refresh">Refresh</button>
      </div>
    </header>
    <div class="designer-main">
      <aside class="panel" style="width: 180px; min-width: 140px;">
        <div class="panel-title">Widget Tree</div>
        <div class="panel-body"><ul class="wt-tree"><li>${widgetTreeHtml}</li></ul></div>
      </aside>
      <main class="panel" style="flex: 1;">
        <div class="panel-title">Canvas</div>
        <div id="lvcraft-preview-container" class="panel-body preview-container">
          <div id="lvcraft-preview-viewport" class="preview-viewport">
            <canvas id="lvcraft-preview-canvas" width="${width}" height="${height}" style="display: block; background: #1a1a1a;"></canvas>
          </div>
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
            else if (action) vscode.postMessage({ type: action });
          });
        });
        var c = document.getElementById('lvcraft-preview-canvas');
        if (c && c.getContext) {
          var ctx = c.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, c.width - 2, c.height - 2);
          }
        }
        zoomFit();
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
        function renderInspector(widget) {
          if (!widget) return '';
          var children = widget.children || [];
          var html = '<div class="inspector-row"><span class="inspector-label">type</span><span class="inspector-value">' + escapeHtml(String(widget.type || '—')) + '</span></div>';
          html += '<div class="inspector-row"><span class="inspector-label">id</span><span class="inspector-value">' + escapeHtml(String(widget.id || '—')) + '</span></div>';
          html += '<div class="inspector-row"><span class="inspector-label">styleId</span><span class="inspector-value">' + escapeHtml(String(widget.styleId || '—')) + '</span></div>';
          html += '<div class="inspector-row"><span class="inspector-label">children</span><span class="inspector-value">' + children.length + '</span></div>';
          return html;
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
          } else {
            ph.style.display = 'block';
            ph.textContent = 'Select a widget';
            ct.style.display = 'none';
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

