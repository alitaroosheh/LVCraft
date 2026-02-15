import * as vscode from 'vscode';
import { createProject } from './projectService';
import { LvProj } from './types';
import { log } from '../infra/log';

const LVGL_VERSIONS = ['9.0.0', '8.3.0', '8.2.0'];
const RESOLUTIONS = [
  { label: '320 × 240', width: 320, height: 240 },
  { label: '480 × 320', width: 480, height: 320 },
  { label: '800 × 480', width: 800, height: 480 },
  { label: '240 × 240', width: 240, height: 240 },
  { label: 'Custom…', width: 0, height: 0 }
];
const COLOR_DEPTHS = [
  { label: '8 bpp', value: 8 as const },
  { label: '16 bpp', value: 16 as const },
  { label: '32 bpp', value: 32 as const }
];

export async function runCreateProjectWizard(): Promise<void> {
  log('Create Project Wizard started');

  const wsFolders = vscode.workspace.workspaceFolders;
  let parentFolder: vscode.Uri;

  if (wsFolders?.length === 1) {
    const useWs = await vscode.window.showQuickPick(
      ['Use current workspace folder', 'Browse…'],
      { placeHolder: 'Where to create the project?' }
    );
    if (!useWs) return;
    if (useWs === 'Browse…') {
      const picked = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select parent folder for new LVCraft project'
      });
      const uri = picked?.[0];
      if (!uri) return;
      parentFolder = uri;
    } else {
      const ws = wsFolders[0];
      if (!ws) return;
      parentFolder = ws.uri;
    }
  } else {
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectMany: false,
      title: 'Select parent folder for new LVCraft project'
    });
    const uri = picked?.[0];
    if (!uri) return;
    parentFolder = uri;
  }

  const projectName = await vscode.window.showInputBox({
    prompt: 'Project name',
    placeHolder: 'my-lvgl-ui',
    validateInput: (v) => {
      if (!v.trim()) return 'Project name is required';
      if (!/^[a-zA-Z0-9_-]+$/.test(v)) return 'Use only letters, numbers, - and _';
      return null;
    }
  });
  if (!projectName?.trim()) return;

  const lvglPick = await vscode.window.showQuickPick(
    LVGL_VERSIONS.map((v) => ({ label: v, value: v })),
    { placeHolder: 'LVGL version', title: 'Create LVCraft Project' }
  );
  if (!lvglPick) return;

  const resPick = await vscode.window.showQuickPick(
    RESOLUTIONS.map((r) => ({ label: r.label, value: r })),
    { placeHolder: 'Resolution', title: 'Create LVCraft Project' }
  );
  if (!resPick) return;

  let width = resPick.value.width;
  let height = resPick.value.height;
  if (width === 0 || height === 0) {
    const w = await vscode.window.showInputBox({
      prompt: 'Width (px)',
      placeHolder: '320',
      validateInput: (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 1 || n > 4096) return 'Enter a number 1–4096';
        return null;
      }
    });
    const h = await vscode.window.showInputBox({
      prompt: 'Height (px)',
      placeHolder: '240',
      validateInput: (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 1 || n > 4096) return 'Enter a number 1–4096';
        return null;
      }
    });
    if (!w || !h) return;
    width = parseInt(w, 10);
    height = parseInt(h, 10);
  }

  const colorPick = await vscode.window.showQuickPick(COLOR_DEPTHS, {
    placeHolder: 'Color depth',
    title: 'Create LVCraft Project'
  });
  if (!colorPick) return;

  const options: Partial<LvProj> = {
    lvglVersion: lvglPick.value,
    resolution: { width, height },
    colorDepth: colorPick.value
  };

  const projectUri = await createProject(parentFolder, projectName.trim(), options);
  if (!projectUri) return;

  await vscode.commands.executeCommand('vscode.openFolder', projectUri);
  vscode.window.showInformationMessage(`LVCraft project "${projectName}" created.`);
  log('Create Project Wizard completed');
}
