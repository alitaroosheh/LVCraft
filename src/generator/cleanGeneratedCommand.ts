import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { findProjectRoot } from '../project/projectService';
import { log } from '../infra/log';

const DIR_GENERATED = 'generated';

export async function runCleanGeneratedCommand(): Promise<void> {
  log('Clean Generated started');

  const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const projectRoot = wsFolder ? findProjectRoot(wsFolder) : undefined;
  if (!projectRoot) {
    vscode.window.showWarningMessage(
      'Open an LVCraft project first (folder with lvproj.json).'
    );
    return;
  }

  const generatedDir = path.join(projectRoot, DIR_GENERATED);
  if (!fs.existsSync(generatedDir)) {
    vscode.window.showInformationMessage('Nothing to clean. generated/ is empty.');
    return;
  }

  const proceed = await vscode.window.showWarningMessage(
    'Delete all files in generated/?',
    'Delete',
    'Cancel'
  );
  if (proceed !== 'Delete') return;

  fs.rmSync(generatedDir, { recursive: true });
  fs.mkdirSync(generatedDir, { recursive: true });

  log(`Cleaned ${DIR_GENERATED}/`);
  vscode.window.showInformationMessage('LVCraft: Cleaned generated/');
}
