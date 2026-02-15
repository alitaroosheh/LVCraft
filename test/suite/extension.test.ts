import * as assert from 'assert';
import * as vscode from 'vscode';

suite('LVCraft Extension Test Suite', () => {
  test('command is registered', async () => {
    const extension = vscode.extensions.getExtension('lvcraft.lvcraft');
    assert.ok(extension, 'Extension not found: lvcraft.lvcraft');
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('lvcraft.openDesigner'));
    assert.ok(commands.includes('lvcraft.createProject'));
    assert.ok(commands.includes('lvcraft.openProject'));
    assert.ok(commands.includes('lvcraft.generateCode'));
    assert.ok(commands.includes('lvcraft.cleanGenerated'));
  });
});

