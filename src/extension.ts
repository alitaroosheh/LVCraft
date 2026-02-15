import * as vscode from 'vscode';
import { DesignerPanel } from './panels/DesignerPanel';
import { getLogChannel, log } from './infra/log';
import { runCreateProjectWizard } from './project/createProjectWizard';
import { runOpenProjectCommand } from './project/openProjectCommand';

export function activate(context: vscode.ExtensionContext) {
  log('Activated.');
  context.subscriptions.push(getLogChannel());

  context.subscriptions.push(
    vscode.commands.registerCommand('lvcraft.openDesigner', () => {
      log('Command: lvcraft.openDesigner');
      DesignerPanel.createOrShow(context.extensionUri);
    }),
    vscode.commands.registerCommand('lvcraft.createProject', () => runCreateProjectWizard()),
    vscode.commands.registerCommand('lvcraft.openProject', () => runOpenProjectCommand())
  );
}

export function deactivate() {
  // no-op
}

