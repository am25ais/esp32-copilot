import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { getOutputChannel } from '../output';

interface ListAllBoard {
	name: string;
	fqbn: string;
}

export async function selectBoardCommand(context: vscode.ExtensionContext): Promise<void> {
	const channel = getOutputChannel(context);
	channel.show(true);
	channel.appendLine('$ arduino-cli board listall esp32:esp32 --format json');

	const boards = await listBoards(channel);
	if (!boards || boards.length === 0) {
		const msg = "No ESP32 boards found. Run 'arduino-cli core install esp32:esp32' first.";
		channel.appendLine(msg);
		vscode.window.showErrorMessage(msg);
		return;
	}

	const config = vscode.workspace.getConfiguration('esp32-copilot');
	const current = config.get<string>('fqbn');

	interface BoardPick extends vscode.QuickPickItem {
		fqbn: string;
	}
	const items: BoardPick[] = boards.map((b) => ({
		label: b.name,
		description: b.fqbn,
		picked: b.fqbn === current,
		fqbn: b.fqbn,
	}));

	const pick = await vscode.window.showQuickPick(items, {
		title: 'Select target ESP32 board',
		placeHolder: `Current: ${current}`,
		matchOnDescription: true,
	});
	if (!pick) {
		return;
	}

	await config.update('fqbn', pick.fqbn, vscode.ConfigurationTarget.Global);
	vscode.window.showInformationMessage(`Board set to ${pick.label}`);
	channel.appendLine(`Board set to ${pick.label} (${pick.fqbn})`);
}

function listBoards(channel: vscode.OutputChannel): Promise<ListAllBoard[] | null> {
	return new Promise((resolve) => {
		const proc = spawn('arduino-cli', ['board', 'listall', 'esp32:esp32', '--format', 'json']);

		let stdout = '';
		let stderr = '';
		let spawnFailed = false;

		proc.stdout.on('data', (d: Buffer) => {
			stdout += d.toString();
		});
		proc.stderr.on('data', (d: Buffer) => {
			stderr += d.toString();
		});

		proc.on('error', () => {
			spawnFailed = true;
			const msg = 'arduino-cli not found. Install it from https://arduino.github.io/arduino-cli';
			channel.appendLine(`\n${msg}`);
			vscode.window.showErrorMessage(msg);
			resolve(null);
		});

		proc.on('exit', (code) => {
			if (spawnFailed) {
				return;
			}
			if (code !== 0) {
				channel.appendLine(stderr);
				channel.appendLine(`\n✗ Board list failed (exit code ${code})`);
				resolve([]);
				return;
			}
			try {
				const parsed = JSON.parse(stdout) as { boards?: ListAllBoard[] };
				resolve(parsed.boards ?? []);
			} catch {
				channel.appendLine('Failed to parse arduino-cli output:');
				channel.appendLine(stdout);
				resolve([]);
			}
		});
	});
}
