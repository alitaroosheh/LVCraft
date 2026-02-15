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
  const children = (w.children ?? [])
    .map((c) => `<li>${renderWidgetTree(c)}</li>`)
    .join('');
  return `<span class="wt-node" data-type="${type}">${label}</span>${children ? `<ul>${children}</ul>` : ''}`;
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
    this._refresh();

    const watcher1 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, 'layout.json')
    );
    const watcher2 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, 'lvproj.json')
    );
    const onProjectFileChange = () => {
      if (DesignerPanel.currentPanel === this) this._refresh();
    };
    watcher1.onDidChange(onProjectFileChange);
    watcher1.onDidCreate(onProjectFileChange);
    watcher2.onDidChange(onProjectFileChange);
    watcher2.onDidCreate(onProjectFileChange);
    this._disposables.push(watcher1, watcher2);
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

    const csp = [
      `default-src 'none';`,
      `img-src ${webview.cspSource} https: data:;`,
      `style-src ${webview.cspSource} 'unsafe-inline';`,
      `script-src 'nonce-${nonce}';`
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
      .designer-main { flex: 1; display: flex; min-height: 0; }
      .panel { border-right: 1px solid var(--vscode-widget-border); display: flex; flex-direction: column; overflow: hidden; }
      .panel:last-of-type { border-right: none; }
      .panel-title { padding: 6px 10px; font-weight: 600; background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-widget-border); flex-shrink: 0; }
      .panel-body { flex: 1; overflow: auto; padding: 8px; }
      .wt-tree { list-style: none; margin: 0; padding-left: 12px; }
      .wt-tree ul { list-style: none; margin: 0; padding-left: 12px; }
      .wt-node { display: block; padding: 2px 4px; cursor: default; border-radius: 2px; }
      .wt-node:hover { background: var(--vscode-list-hoverBackground); }
      .wt-empty { color: var(--vscode-descriptionForeground); font-style: italic; }
      .canvas-placeholder { border: 2px dashed var(--vscode-widget-border); background: var(--vscode-input-background); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground); text-align: center; width: 100%; height: 100%; min-height: 120px; }
      .inspector-placeholder { color: var(--vscode-descriptionForeground); font-style: italic; }
    </style>
  </head>
  <body>
    <header class="designer-header">
      <h2>LVCraft Designer</h2>
      <div class="meta">LVGL ${escapeHtml(String(lvglVersion))} · ${width}×${height} · ${colorDepth} bpp</div>
    </header>
    <div class="designer-main">
      <aside class="panel" style="width: 180px; min-width: 140px;">
        <div class="panel-title">Widget Tree</div>
        <div class="panel-body"><ul class="wt-tree"><li>${widgetTreeHtml}</li></ul></div>
      </aside>
      <main class="panel" style="flex: 1;">
        <div class="panel-title">Canvas</div>
        <div class="panel-body">
          <div class="canvas-placeholder" style="min-width: ${Math.min(width, 300)}px; min-height: ${Math.min(height, 200)}px;">
            ${width}×${height} — LVGL WASM preview in next step
          </div>
        </div>
      </main>
      <aside class="panel" style="width: 200px; min-width: 160px;">
        <div class="panel-title">Property Inspector</div>
        <div class="panel-body"><span class="inspector-placeholder">Select a widget</span></div>
      </aside>
    </div>
    <script nonce="${nonce}">
      // Reserved for WebView bootstrap in later steps.
    </script>
  </body>
</html>`;
  }
}

