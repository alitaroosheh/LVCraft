import * as vscode from 'vscode';
import { getNonce } from '../webview/getNonce';
import { log } from '../infra/log';
import { readLvProj, readLayout } from '../project/projectService';
import type { LayoutWidget } from '../project/types';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWidgetTree(w: LayoutWidget): string {
  const label = escapeHtml(w.id ?? w.type ?? '?');
  const type = escapeHtml(w.type);
  const styleTag =
    typeof w.styleId === 'string' && w.styleId
      ? ` <span class="wt-style" title="style">[${escapeHtml(w.styleId)}]</span>`
      : '';
  const children = (w.children ?? [])
    .map((c) => `<li>${renderWidgetTree(c)}</li>`)
    .join('');
  return `<span class="wt-node" data-type="${type}">${label}${styleTag}</span>${children ? `<ul>${children}</ul>` : ''}`;
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
      .wt-node { display: block; padding: 2px 4px; cursor: default; border-radius: 2px; }
      .wt-node:hover { background: var(--vscode-list-hoverBackground); }
      .wt-style { font-size: 10px; color: var(--vscode-descriptionForeground); margin-left: 4px; }
      .wt-empty { color: var(--vscode-descriptionForeground); font-style: italic; }
      .preview-container { position: relative; display: flex; align-items: center; justify-content: center; min-height: 120px; background: #1e1e1e; }
      .preview-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); color: var(--vscode-descriptionForeground); font-size: 12px; text-align: center; pointer-events: none; }
      .inspector-placeholder { color: var(--vscode-descriptionForeground); font-style: italic; }
    </style>
  </head>
  <body>
    <header class="designer-header">
      <h2>LVCraft Designer</h2>
      <div class="meta">LVGL ${escapeHtml(String(lvglVersion))} · ${width}×${height} · ${colorDepth} bpp</div>
      <div class="toolbar">
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
        <div class="panel-body preview-container">
          <canvas id="lvcraft-preview-canvas" width="${width}" height="${height}" style="max-width: 100%; max-height: 100%; object-fit: contain; background: #1e1e1e;"></canvas>
          <div id="lvcraft-preview-overlay" class="preview-overlay">
            <span>LVGL WASM: not built. See README for build instructions.</span>
          </div>
        </div>
      </main>
      <aside class="panel" style="width: 200px; min-width: 160px;">
        <div class="panel-title">Property Inspector</div>
        <div class="panel-body"><span class="inspector-placeholder">Select a widget</span></div>
      </aside>
    </div>
    <script nonce="${nonce}">
      (function() {
        window.__LVCRAFT_PREVIEW__ = ${previewData};
        const vscode = acquireVsCodeApi();
        document.querySelectorAll('.toolbar-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action) vscode.postMessage({ type: action });
          });
        });
        var c = document.getElementById('lvcraft-preview-canvas');
        if (c && c.getContext) {
          var ctx = c.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.strokeStyle = '#404040';
            ctx.lineWidth = 1;
            ctx.strokeRect(1, 1, c.width - 2, c.height - 2);
          }
        }
      })();
    </script>
  </body>
</html>`;
  }
}

