import * as vscode from 'vscode';
import { spawn } from 'child_process';

export interface DetectedPort {
	port: {
		address: string;
		label?: string;
		protocol: string;
		protocol_label?: string;
	};
	matching_boards?: Array<{ name: string; fqbn: string }>;
}

export function detectSerialPorts(
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

export async function pickSerialPort(
	channel: vscode.OutputChannel,
	action: string,
): Promise<string | undefined> {
	const ports = await detectSerialPorts(channel);
	if (ports === null) {
		return undefined;
	}

	if (ports.length === 0) {
		const msg = 'No ESP32 board detected. Please connect one via USB and try again.';
		channel.appendLine(msg);
		vscode.window.showErrorMessage(msg);
		return undefined;
	}

	const recognized = ports.filter(
		(p) => p.matching_boards && p.matching_boards.length > 0,
	);
	const unknown = ports.filter(
		(p) => !p.matching_boards || p.matching_boards.length === 0,
	);

	if (recognized.length === 1 && unknown.length === 0) {
		return recognized[0].port.address;
	}

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
		title: `Select port to ${action}`,
		placeHolder: `Choose which port to ${action}`,
	});
	return pick?.portAddress;
}
