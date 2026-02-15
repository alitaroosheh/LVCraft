import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { findProjectRoot, readLayout, readLvProj } from '../project/projectService';
import { generateUiC, generateUiH } from './codeGen';
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

  if (!lvproj) {
    vscode.window.showErrorMessage('Invalid lvproj.json');
    return;
  }

  const uiDir = path.join(projectRoot, DIR_GENERATED, DIR_UI);
  fs.mkdirSync(uiDir, { recursive: true });

  const uiC = generateUiC(layout, lvproj);
  const uiH = generateUiH(layout, lvproj);

  fs.writeFileSync(path.join(uiDir, UI_C), uiC, 'utf-8');
  fs.writeFileSync(path.join(uiDir, UI_H), uiH, 'utf-8');

  log(`Generated ${DIR_UI}/${UI_C}, ${DIR_UI}/${UI_H}`);
  vscode.window.showInformationMessage(
    `LVCraft: Generated ${DIR_UI}/${UI_C} and ${DIR_UI}/${UI_H}`
  );
}
