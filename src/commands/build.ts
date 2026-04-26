import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import { getOutputChannel } from '../output';

export async function buildCommand(context: vscode.ExtensionContext): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('Open a folder first');
		return;
	}

	const inoFiles = await vscode.workspace.findFiles('**/*.ino', null, 1);
	if (inoFiles.length === 0) {
		vscode.window.showErrorMessage('No .ino file found in workspace');
		return;
	}

	const sketchFolderPath = path.dirname(inoFiles[0].fsPath);

	const channel = getOutputChannel(context);
	channel.show(true);

	const fqbn = 'esp32:esp32:esp32';
	channel.appendLine(`$ arduino-cli compile --fqbn ${fqbn} ${sketchFolderPath}`);

	const proc = spawn('arduino-cli', ['compile', '--fqbn', fqbn, sketchFolderPath]);

	let spawnFailed = false;

	proc.stdout.on('data', (data: Buffer) => {
		channel.append(data.toString());
	});

	proc.stderr.on('data', (data: Buffer) => {
		channel.append(data.toString());
	});

	proc.on('error', () => {
		spawnFailed = true;
		const msg = 'arduino-cli not found. Install it from https://arduino.github.io/arduino-cli';
		channel.appendLine(`\n${msg}`);
		vscode.window.showErrorMessage(msg);
	});

	proc.on('exit', (code) => {
		if (spawnFailed) {
			return;
		}
		if (code === 0) {
			channel.appendLine('\n✓ Build successful');
			vscode.window.showInformationMessage('ESP32 Copilot: Build successful');
		} else {
			channel.appendLine(`\n✗ Build failed (exit code ${code})`);
			vscode.window.showErrorMessage(`ESP32 Copilot: Build failed (exit code ${code})`);
		}
	});
}
