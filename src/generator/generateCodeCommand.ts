import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  findProjectRoot,
  readLayout,
  readLvProj,
  readStyles
} from '../project/projectService';
import { generateUiC, generateUiH } from './codeGen';
import {
  extractGuardedBlocks,
  detectMalformedGuards
} from './userCodeGuards';
import { log } from '../infra/log';

const DIR_GENERATED = 'generated';
const DIR_UI = 'ui';
const UI_C = 'ui.c';
const UI_H = 'ui.h';

export async function runGenerateCodeCommand(): Promise<void> {
  log('Generate Code started');

  const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const projectRoot = wsFolder ? findProjectRoot(wsFolder) : undefined;
  if (!projectRoot) {
    vscode.window.showWarningMessage(
      'Open an LVCraft project first (folder with lvproj.json).'
    );
    return;
  }

  const lvproj = readLvProj(projectRoot);
  const layout = readLayout(projectRoot);
  const styles = readStyles(projectRoot);

  if (!lvproj) {
    vscode.window.showErrorMessage('Invalid lvproj.json');
    return;
  }

  const uiDir = path.join(projectRoot, DIR_GENERATED, DIR_UI);
  const uiCPath = path.join(uiDir, UI_C);
  fs.mkdirSync(uiDir, { recursive: true });

  let preservedBlocks = new Map<string, string>();
  if (fs.existsSync(uiCPath)) {
    const existing = fs.readFileSync(uiCPath, 'utf-8');
    const malformed = detectMalformedGuards(existing);
    if (malformed.length > 0) {
      const proceed = await vscode.window.showWarningMessage(
        `Guard markers may be corrupted: ${malformed.join('; ')}. Overwrite anyway?`,
        'Overwrite',
        'Cancel'
      );
      if (proceed !== 'Overwrite') return;
    } else {
      preservedBlocks = extractGuardedBlocks(existing);
    }
  }

  let uiC = generateUiC(layout, lvproj, styles);
  for (const [id, content] of preservedBlocks) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(\\/\\*\\s*USER CODE BEGIN ${escaped}\\s*\\*\\/)\\s*[\\s\\S]*?\\s*(\\/\\*\\s*USER CODE END ${escaped}\\s*\\*\\/)`,
      'g'
    );
    uiC = uiC.replace(re, (_, begin, end) => `${begin}\n${content}\n  ${end}`);
  }

  const uiH = generateUiH(layout, lvproj, styles);

  fs.writeFileSync(uiCPath, uiC, 'utf-8');
  fs.writeFileSync(path.join(uiDir, UI_H), uiH, 'utf-8');

  log(`Generated ${DIR_UI}/${UI_C}, ${DIR_UI}/${UI_H}`);
  vscode.window.showInformationMessage(
    `LVCraft: Generated ${DIR_UI}/${UI_C} and ${DIR_UI}/${UI_H}`
  );
}
