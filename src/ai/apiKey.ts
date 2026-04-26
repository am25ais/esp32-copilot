import * as vscode from 'vscode';

const SECRET_KEY = 'anthropic-api-key';

export async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
	const value = await vscode.window.showInputBox({
		prompt: 'Enter your Anthropic API key',
		placeHolder: 'sk-ant-...',
		password: true,
		ignoreFocusOut: true,
		validateInput: (value) =>
			value.startsWith('sk-ant-') ? null : 'API key should start with sk-ant-',
	});

	if (value === undefined) {
		return;
	}

	await context.secrets.store(SECRET_KEY, value);
	vscode.window.showInformationMessage('ESP32 Copilot: API key saved securely');
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
	return context.secrets.get(SECRET_KEY);
}

export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
	await context.secrets.delete(SECRET_KEY);
	vscode.window.showInformationMessage('ESP32 Copilot: API key cleared');
}
