import * as vscode from 'vscode';
import { isLVCraftProject } from './projectService';
import { log } from '../infra/log';

export async function runOpenProjectCommand(): Promise<void> {
  log('Open Existing Project started');

  const picked = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Select LVCraft project folder (containing lvproj.json)'
  });

  const uri = picked?.[0];
  if (!uri) return;

  const folder = uri.fsPath;
  if (!isLVCraftProject(folder)) {
    vscode.window.showErrorMessage(
      'Selected folder is not an LVCraft project. It must contain lvproj.json.'
    );
    log('Open project failed: no lvproj.json');
    return;
  }

  await vscode.commands.executeCommand('vscode.openFolder', uri);
  log('Open Existing Project completed');
}
