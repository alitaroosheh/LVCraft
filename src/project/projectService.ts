import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  LvProj,
  Layout,
  Styles,
  Assets,
  DEFAULT_LVPROJ,
  DEFAULT_LAYOUT,
  DEFAULT_STYLES,
  DEFAULT_ASSETS
} from './types';
import { log } from '../infra/log';

const LVPROJ_FILENAME = 'lvproj.json';
const LAYOUT_FILENAME = 'layout.json';
const STYLES_FILENAME = 'styles.json';
const ASSETS_FILENAME = 'assets.json';
const DIR_GENERATED = 'generated';
const DIR_USER = 'user';
const DIR_BACKUPS = 'backups';

/** Detect if a directory contains an LVCraft project (lvproj.json) */
export function isLVCraftProject(dir: string): boolean {
  const p = path.join(dir, LVPROJ_FILENAME);
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Find LVCraft project root by walking up from a file path */
export function findProjectRoot(fileOrDir: string): string | undefined {
  let current = path.resolve(fileOrDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (isLVCraftProject(current)) return current;
    current = path.dirname(current);
  }

  return undefined;
}

/** Read lvproj.json from a project root */
export function readLvProj(projectRoot: string): LvProj | undefined {
  const p = path.join(projectRoot, LVPROJ_FILENAME);
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as LvProj;
    if (parsed.version === 1 && parsed.lvglVersion && parsed.resolution) {
      return parsed;
    }
  } catch (e) {
    log(`Failed to read lvproj: ${e}`);
  }
  return undefined;
}

/** Read layout.json from a project root */
export function readLayout(projectRoot: string): Layout {
  const p = path.join(projectRoot, LAYOUT_FILENAME);
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as Layout;
    if (parsed.version === 1) return parsed;
  } catch (e) {
    log(`Failed to read layout: ${e}`);
  }
  return DEFAULT_LAYOUT;
}

/** Read assets.json from a project root */
export function readAssets(projectRoot: string): Assets {
  const p = path.join(projectRoot, ASSETS_FILENAME);
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as Assets;
    if (parsed.version === 1) return parsed;
  } catch (e) {
    log(`Failed to read assets: ${e}`);
  }
  return DEFAULT_ASSETS;
}

/** Read styles.json from a project root */
export function readStyles(projectRoot: string): Styles {
  const p = path.join(projectRoot, STYLES_FILENAME);
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as Styles;
    if (parsed.version === 1) return parsed;
  } catch (e) {
    log(`Failed to read styles: ${e}`);
  }
  return DEFAULT_STYLES;
}

/** Create a new LVCraft project at the given folder */
export async function createProject(
  parentFolder: vscode.Uri,
  projectName: string,
  options: Partial<LvProj> = {}
): Promise<vscode.Uri | undefined> {
  const projectRoot = path.join(parentFolder.fsPath, projectName);

  if (fs.existsSync(projectRoot)) {
    const overwrite = await vscode.window.showWarningMessage(
      `Folder "${projectName}" already exists. Overwrite?`,
      'Overwrite',
      'Cancel'
    );
    if (overwrite !== 'Overwrite') return undefined;
    // Remove existing folder for overwrite
    fs.rmSync(projectRoot, { recursive: true });
  }

  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, DIR_GENERATED), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, DIR_USER), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, DIR_BACKUPS), { recursive: true });

  const lvproj: LvProj = {
    ...DEFAULT_LVPROJ,
    ...options
  };

  fs.writeFileSync(
    path.join(projectRoot, LVPROJ_FILENAME),
    JSON.stringify(lvproj, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(projectRoot, LAYOUT_FILENAME),
    JSON.stringify(DEFAULT_LAYOUT, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(projectRoot, STYLES_FILENAME),
    JSON.stringify(DEFAULT_STYLES, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(projectRoot, ASSETS_FILENAME),
    JSON.stringify(DEFAULT_ASSETS, null, 2),
    'utf-8'
  );

  log(`Created project at ${projectRoot}`);
  return vscode.Uri.file(projectRoot);
}
