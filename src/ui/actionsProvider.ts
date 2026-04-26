import * as vscode from 'vscode';

class ActionItem extends vscode.TreeItem {
	constructor(label: string, command: string, icon: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.command = { command, title: label };
		this.iconPath = new vscode.ThemeIcon(icon);
	}
}

export class ActionsProvider implements vscode.TreeDataProvider<ActionItem> {
	getTreeItem(element: ActionItem): ActionItem {
		return element;
	}

	getChildren(): ActionItem[] {
		return [
			new ActionItem('Build', 'esp32-copilot.build', 'tools'),
			new ActionItem('Flash', 'esp32-copilot.flash', 'zap'),
			new ActionItem('Monitor', 'esp32-copilot.monitor', 'terminal'),
			new ActionItem('Ask AI', 'esp32-copilot.askAI', 'comment-discussion'),
		];
	}
}
