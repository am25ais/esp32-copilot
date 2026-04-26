import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { getOutputChannel } from '../output';
import { pickSerialPort } from '../ports';

let currentMonitor: ChildProcess | null = null;

export async function monitorCommand(context: vscode.ExtensionContext): Promise<void> {
	if (currentMonitor) {
		const choice = await vscode.window.showWarningMessage(
			'A serial monitor is already running. Stop it first?',
			{ modal: true },
			'Stop and restart',
			'Cancel',
		);
		if (choice !== 'Stop and restart') {
			return;
		}
		currentMonitor.kill();
		currentMonitor = null;
	}

	const channel = getOutputChannel(context);
	channel.show(true);

	const portAddress = await pickSerialPort(channel, 'monitor');
	if (!portAddress) {
		return;
	}

	channel.appendLine(
		`$ arduino-cli monitor --port ${portAddress} --config baudrate=115200`,
	);

	const proc = spawn('arduino-cli', [
		'monitor',
		'--port',
		portAddress,
		'--config',
		'baudrate=115200',
	]);

	let spawnFailed = false;
	currentMonitor = proc;

	proc.stdout?.on('data', (data: Buffer) => {
		channel.append(data.toString());
	});

	proc.stderr?.on('data', (data: Buffer) => {
		channel.append(data.toString());
	});

	proc.on('error', () => {
		spawnFailed = true;
		currentMonitor = null;
		const msg = 'arduino-cli not found. Install it from https://arduino.github.io/arduino-cli';
		channel.appendLine(`\n${msg}`);
		vscode.window.showErrorMessage(msg);
	});

	proc.on('exit', () => {
		if (spawnFailed) {
			return;
		}
		channel.appendLine('\n[ Monitor stopped ]');
		currentMonitor = null;
	});

	vscode.window.showInformationMessage(
		`Monitor started on ${portAddress}. Run "ESP32: Stop Serial Monitor" to stop.`,
	);
}

export function stopMonitorCommand(): void {
	if (!currentMonitor) {
		vscode.window.showInformationMessage('No serial monitor is running.');
		return;
	}
	currentMonitor.kill();
}
