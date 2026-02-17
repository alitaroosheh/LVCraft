import * as vscode from 'vscode';
import { findProjectRoot, readLayout, writeLayout } from '../project/projectService';
import type { Layout, LayoutWidget } from '../project/types';
import { log } from '../infra/log';

const DEFAULT_GRID_STEP = 10;

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function snapWidgetToGrid(w: LayoutWidget, step: number): void {
  if (typeof w.x === 'number') w.x = roundToStep(w.x, step);
  if (typeof w.y === 'number') w.y = roundToStep(w.y, step);
  if (typeof w.width === 'number') w.width = Math.max(step, roundToStep(w.width, step));
  if (typeof w.height === 'number') w.height = Math.max(step, roundToStep(w.height, step));
  (w.children ?? []).forEach((c) => snapWidgetToGrid(c, step));
}

export function runSnapToGridCommand(gridStep: number = DEFAULT_GRID_STEP): void {
  const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const projectRoot = wsFolder ? findProjectRoot(wsFolder) : undefined;
  if (!projectRoot) {
    vscode.window.showWarningMessage(
      'Open an LVCraft project first (folder with lvproj.json).'
    );
    return;
  }

  const layout = readLayout(projectRoot);
  if (!layout.root) {
    vscode.window.showInformationMessage('Layout is empty. Nothing to snap.');
    return;
  }

  snapWidgetToGrid(layout.root, gridStep);
  writeLayout(projectRoot, layout);
  log(`Snap to grid (${gridStep}px): layout.json updated`);
  vscode.window.showInformationMessage(
    `LVCraft: Layout snapped to ${gridStep}px grid. Designer will refresh.`
  );
}
