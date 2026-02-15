import * as vscode from 'vscode';
import { DesignerPanel } from './panels/DesignerPanel';
import { getLogChannel, log } from './infra/log';

export function activate(context: vscode.ExtensionContext) {
  log('Activated.');
  context.subscriptions.push(getLogChannel());

  const openDesigner = vscode.commands.registerCommand('lvcraft.openDesigner', () => {
    log('Command: lvcraft.openDesigner');
    DesignerPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(openDesigner);
}

export function deactivate() {
  // no-op
}

