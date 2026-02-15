import * as vscode from 'vscode';
import { getNonce } from '../webview/getNonce';
import { log } from '../infra/log';
import { readLvProj } from '../project/projectService';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export class DesignerPanel {
  public static currentPanel: DesignerPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _projectRoot: vscode.Uri;
  private readonly _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, projectRoot: vscode.Uri) {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (DesignerPanel.currentPanel) {
      log('DesignerPanel: reveal existing panel');
      DesignerPanel.currentPanel._panel.reveal(column);
      return;
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

    DesignerPanel.currentPanel = new DesignerPanel(panel, extensionUri, projectRoot);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    projectRoot: vscode.Uri
  ) {
    this._panel = panel;
    this._projectRoot = projectRoot;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);
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

    const width = lvproj?.resolution.width ?? 320;
    const height = lvproj?.resolution.height ?? 240;
    const lvglVersion = lvproj?.lvglVersion ?? '—';
    const colorDepth = lvproj?.colorDepth ?? 16;

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
      body { font-family: var(--vscode-font-family, system-ui); margin: 12px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
      .meta { margin-bottom: 16px; padding: 12px; background: var(--vscode-input-background); border-radius: 4px; }
      .meta dt { font-weight: 600; margin-top: 8px; }
      .meta dd { margin: 4px 0 0 0; }
      .canvas-placeholder { border: 2px dashed var(--vscode-widget-border); background: var(--vscode-input-background); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground); }
    </style>
  </head>
  <body>
    <h2>LVCraft Designer</h2>
    <dl class="meta">
      <dt>LVGL</dt><dd>${escapeHtml(String(lvglVersion))}</dd>
      <dt>Resolution</dt><dd>${width} × ${height} px</dd>
      <dt>Color depth</dt><dd>${colorDepth} bpp</dd>
    </dl>
    <div class="canvas-placeholder" style="width: ${Math.min(width, 400)}px; height: ${Math.min(height, 300)}px;">
      Canvas ${width}×${height} — LVGL WASM preview in next step
    </div>
    <script nonce="${nonce}">
      // Reserved for WebView bootstrap in later steps.
    </script>
  </body>
</html>`;
  }
}

