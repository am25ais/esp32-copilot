import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import { getOutputChannel } from '../output';

interface DetectedPort {
	port: {
		address: string;
		label?: string;
		protocol: string;
		protocol_label?: string;
	};
	matching_boards?: Array<{ name: string; fqbn: string }>;
}

export async function flashCommand(context: vscode.ExtensionContext): Promise<void> {
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

	const ports = await detectSerialPorts(channel);
	if (ports === null) {
		return;
	}

	if (ports.length === 0) {
		const msg = 'No ESP32 board detected. Please connect one via USB and try again.';
		channel.appendLine(msg);
		vscode.window.showErrorMessage(msg);
		return;
	}

	const recognized = ports.filter(
		(p) => p.matching_boards && p.matching_boards.length > 0,
	);
	const unknown = ports.filter(
		(p) => !p.matching_boards || p.matching_boards.length === 0,
	);

	let portAddress: string;
	if (recognized.length === 1 && unknown.length === 0) {
		portAddress = recognized[0].port.address;
	} else {
		interface PortPick extends vscode.QuickPickItem {
			portAddress: string;
		}
		const items: PortPick[] = [
			...recognized.map((p) => ({
				label: `$(circuit-board) ${p.port.address}`,
				description: p.matching_boards![0].name,
				detail: p.matching_boards![0].fqbn,
				portAddress: p.port.address,
			})),
			...unknown.map((p) => ({
				label: `$(question) ${p.port.address}`,
				description: 'Unknown device',
				detail: 'May not be an ESP32 — could be a Bluetooth dongle or other serial device',
				portAddress: p.port.address,
			})),
		];
		const pick = await vscode.window.showQuickPick(items, {
			title: 'Select port to flash',
			placeHolder: 'Choose which port to upload to',
		});
		if (!pick) {
			return;
		}
		portAddress = pick.portAddress;
	}

	const fqbn = 'esp32:esp32:esp32';
	channel.appendLine(
		`$ arduino-cli upload --fqbn ${fqbn} --port ${portAddress} ${sketchFolderPath}`,
	);

	const proc = spawn('arduino-cli', [
		'upload',
		'--fqbn',
		fqbn,
		'--port',
		portAddress,
		sketchFolderPath,
	]);

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
			channel.appendLine('\n✓ Flash successful');
			vscode.window.showInformationMessage('ESP32 Copilot: Flash successful');
		} else {
			channel.appendLine(`\n✗ Flash failed (exit code ${code})`);
			vscode.window.showErrorMessage(`ESP32 Copilot: Flash failed (exit code ${code})`);
		}
	});
}

function detectSerialPorts(
	channel: vscode.OutputChannel,
): Promise<DetectedPort[] | null> {
	return new Promise((resolve) => {
		channel.appendLine('$ arduino-cli board list --format json');
		const proc = spawn('arduino-cli', ['board', 'list', '--format', 'json']);

		let stdout = '';
		let stderr = '';
		let spawnFailed = false;

		proc.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});
		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
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
				channel.appendLine(`\n✗ Port detection failed (exit code ${code})`);
				resolve([]);
				return;
			}
			try {
				const parsed = JSON.parse(stdout) as { detected_ports?: DetectedPort[] };
				const all = parsed.detected_ports ?? [];
				const serial = all.filter((p) => p.port?.protocol === 'serial');
				resolve(serial);
			} catch {
				channel.appendLine('Failed to parse arduino-cli output:');
				channel.appendLine(stdout);
				resolve([]);
			}
		});
	});
}
