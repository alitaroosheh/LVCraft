import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as vscode from 'vscode';
import { log } from '../infra/log';

const WASM_FILENAME = 'lvgl.js';
const REPO_RELEASE_URL =
  'https://github.com/alitaroosheh/LVCraft/releases/download';

/**
 * Returns the path to lvgl.js if it exists in extension media (media/wasm/lvgl.js).
 */
export function getBundledWasmPath(extensionUri: vscode.Uri): string | undefined {
  const p = path.join(extensionUri.fsPath, 'media', 'wasm', WASM_FILENAME);
  return fs.existsSync(p) ? p : undefined;
}

/**
 * Returns the path to lvgl.js in globalStorage if it exists.
 */
export function getGlobalStorageWasmPath(globalStorageUri: vscode.Uri): string | undefined {
  const p = path.join(globalStorageUri.fsPath, WASM_FILENAME);
  return fs.existsSync(p) ? p : undefined;
}

/**
 * Resolve WASM script path in order: project .lvcraft/wasm > extension media > globalStorage.
 */
export function resolveWasmPath(
  projectRootFsPath: string | undefined,
  extensionUri: vscode.Uri,
  globalStorageUri: vscode.Uri
): string | undefined {
  if (projectRootFsPath) {
    const projLvgl = path.join(projectRootFsPath, '.lvcraft', 'wasm', WASM_FILENAME);
    const projIndex = path.join(projectRootFsPath, '.lvcraft', 'wasm', 'index.js');
    if (fs.existsSync(projLvgl)) return projLvgl;
    if (fs.existsSync(projIndex)) return projIndex;
  }
  const bundled = getBundledWasmPath(extensionUri);
  if (bundled) return bundled;
  return getGlobalStorageWasmPath(globalStorageUri);
}

export type WasmInstallResult = 'already-present' | 'installed' | 'failed';

/**
 * Download lvgl.js from GitHub Release and save to globalStorage.
 * Resolves when done. Returns status for caller to show feedback.
 */
export async function ensureWasmRuntime(context: vscode.ExtensionContext): Promise<WasmInstallResult> {
  const ext = context.extension;
  if (!ext) return 'failed';

  const version = (ext.packageJSON as { version?: string }).version || '0.0.1';
  const globalStoragePath = context.globalStorageUri.fsPath;
  const destPath = path.join(globalStoragePath, WASM_FILENAME);

  if (getBundledWasmPath(context.extensionUri) || getGlobalStorageWasmPath(context.globalStorageUri)) {
    log('LVGL WASM: already available (bundled or in global storage)');
    return 'already-present';
  }

  const tagsToTry = [`v${version}`, 'release', 'prerelease'];

  const tryDownload = (tagIndex: number): Promise<WasmInstallResult> =>
    new Promise((resolve) => {
      if (tagIndex >= tagsToTry.length) {
        log('LVGL WASM: all download URLs failed');
        resolve('failed');
        return;
      }
      const tag = tagsToTry[tagIndex];
      const url = `${REPO_RELEASE_URL}/${tag}/${WASM_FILENAME}`;
      log(`LVGL WASM: trying ${url}`);

      const req = https.get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode !== 200) {
          log(`LVGL WASM: ${tag} failed (${res.statusCode})`);
          void tryDownload(tagIndex + 1).then(resolve);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            fs.mkdirSync(globalStoragePath, { recursive: true });
            fs.writeFileSync(destPath, Buffer.concat(chunks), 'binary');
            log(`LVGL WASM: saved to globalStorage from ${tag}`);
            resolve('installed');
          } catch (e) {
            log(`LVGL WASM: write failed ${e}`);
            resolve('failed');
          }
        });
      });
      req.on('error', (e) => {
        log(`LVGL WASM: download error ${e.message}`);
        void tryDownload(tagIndex + 1).then(resolve);
      });
      req.on('timeout', () => {
        req.destroy();
        log('LVGL WASM: download timeout');
        void tryDownload(tagIndex + 1).then(resolve);
      });
    });

  return tryDownload(0);
}

/**
 * Run installer in background (fire-and-forget). Call on activation.
 */
export function ensureWasmRuntimeBackground(context: vscode.ExtensionContext): void {
  void ensureWasmRuntime(context);
}
