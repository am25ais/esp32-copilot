import * as vscode from 'vscode';
import { ActionsProvider } from './ui/actionsProvider';
import { buildCommand } from './commands/build';
import { setApiKey, clearApiKey } from './ai/apiKey';
import { ChatPanel } from './ai/chatPanel';
import { flashCommand } from './commands/flash';
import { monitorCommand, stopMonitorCommand } from './commands/monitor';

export function activate(context: vscode.ExtensionContext) {
	console.log('ESP32 Copilot is now active');

	context.subscriptions.push(
		vscode.commands.registerCommand('esp32-copilot.build', () => buildCommand(context)),
		vscode.commands.registerCommand('esp32-copilot.flash', () => flashCommand(context)),
		vscode.commands.registerCommand('esp32-copilot.monitor', () => monitorCommand(context)),
		vscode.commands.registerCommand('esp32-copilot.stopMonitor', () => stopMonitorCommand()),
		vscode.commands.registerCommand('esp32-copilot.askAI', () => ChatPanel.createOrShow(context)),
		vscode.commands.registerCommand('esp32-copilot.setApiKey', () => setApiKey(context)),
		vscode.commands.registerCommand('esp32-copilot.clearApiKey', () => clearApiKey(context)),
		vscode.window.createTreeView('esp32-copilot.actionsView', {
			treeDataProvider: new ActionsProvider(),
		}),
	);
}

export function deactivate() {}
