import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getLogChannel(): vscode.OutputChannel {
  channel ??= vscode.window.createOutputChannel('LVCraft');
  return channel;
}

export function log(message: string) {
  const ts = new Date().toISOString();
  getLogChannel().appendLine(`[${ts}] ${message}`);
}

