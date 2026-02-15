import * as vscode from 'vscode';
import { DesignerPanel } from './panels/DesignerPanel';
import { getLogChannel, log } from './infra/log';
import { findProjectRoot } from './project/projectService';
import { runCreateProjectWizard } from './project/createProjectWizard';
import { runOpenProjectCommand } from './project/openProjectCommand';
import { runGenerateCodeCommand } from './generator/generateCodeCommand';

export function activate(context: vscode.ExtensionContext) {
  log('Activated.');
  context.subscriptions.push(getLogChannel());

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
      DesignerPanel.createOrShow(context.extensionUri, vscode.Uri.file(projectRoot));
    }),
    vscode.commands.registerCommand('lvcraft.createProject', () => runCreateProjectWizard()),
    vscode.commands.registerCommand('lvcraft.openProject', () => runOpenProjectCommand()),
    vscode.commands.registerCommand('lvcraft.generateCode', () => runGenerateCodeCommand())
  );
}

export function deactivate() {
  // no-op
}

