import * as vscode from 'vscode';
import { DesignerPanel } from './panels/DesignerPanel';
import { getLogChannel, log } from './infra/log';
import { findProjectRoot } from './project/projectService';
import { runCreateProjectWizard } from './project/createProjectWizard';
import { runOpenProjectCommand } from './project/openProjectCommand';
import { runGenerateCodeCommand } from './generator/generateCodeCommand';
import { runCleanGeneratedCommand } from './generator/cleanGeneratedCommand';
import { runSnapToGridCommand } from './layout/snapToGrid';
import {
  ensureWasmRuntime,
  ensureWasmRuntimeBackground
} from './wasm/wasmRuntimeInstaller';

export function activate(context: vscode.ExtensionContext) {
  log('Activated.');
  context.subscriptions.push(getLogChannel());

  ensureWasmRuntimeBackground(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('lvcraft.openDesigner', () => {
      log('Command: lvcraft.openDesigner');
      const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const projectRoot = wsFolder ? findProjectRoot(wsFolder) : undefined;
      if (!projectRoot) {
        vscode.window.showWarningMessage(
          'Open an LVCraft project first (File → Open Folder, select a folder with lvproj.json).'
        );
        return;
      }
      DesignerPanel.createOrShow(
        context.extensionUri,
        vscode.Uri.file(projectRoot),
        context.globalStorageUri
      );
    }),
    vscode.commands.registerCommand('lvcraft.createProject', () => runCreateProjectWizard()),
    vscode.commands.registerCommand('lvcraft.openProject', () => runOpenProjectCommand()),
    vscode.commands.registerCommand('lvcraft.generateCode', () => runGenerateCodeCommand()),
    vscode.commands.registerCommand('lvcraft.cleanGenerated', () => runCleanGeneratedCommand()),
    vscode.commands.registerCommand('lvcraft.snapToGrid', () => runSnapToGridCommand()),
    vscode.commands.registerCommand('lvcraft.openSimulator', () => {
      log('Command: lvcraft.openSimulator');
      const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const projectRoot = wsFolder ? findProjectRoot(wsFolder) : undefined;
      if (!projectRoot) {
        vscode.window.showWarningMessage(
          'Open an LVCraft project first (folder with lvproj.json).'
        );
        return;
      }
      DesignerPanel.createOrShow(
        context.extensionUri,
        vscode.Uri.file(projectRoot),
        context.globalStorageUri
      );
    }),
    vscode.commands.registerCommand('lvcraft.installWasmRuntime', async () => {
      getLogChannel().show(true);
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'LVCraft: Installing LVGL WASM runtime...',
          cancellable: false
        },
        async () => ensureWasmRuntime(context)
      );
      if (result === 'already-present') {
        vscode.window.showInformationMessage(
          'LVCraft: LVGL WASM runtime is already installed. Open Designer to use it.'
        );
      } else if (result === 'installed') {
        vscode.window.showInformationMessage(
          'LVCraft: LVGL WASM runtime installed. Open Designer to use it.'
        );
      } else {
        vscode.window.showWarningMessage(
          'LVCraft: Could not install LVGL WASM runtime. See Output > LVCraft for details. You can run `npm run build:wasm` locally or place lvgl.js in your project `.lvcraft/wasm/`.'
        );
      }
    })
  );
}

export function deactivate() {
  // no-op
}

