import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(context: vscode.ExtensionContext): vscode.OutputChannel {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('ESP32 Copilot');
		context.subscriptions.push(outputChannel);
	}
	return outputChannel;
}
