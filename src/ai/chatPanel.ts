import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from './apiKey';

export class ChatPanel {
	private static current: ChatPanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly context: vscode.ExtensionContext;
	private disposables: vscode.Disposable[] = [];
	private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

	static createOrShow(context: vscode.ExtensionContext): void {
		if (ChatPanel.current) {
			ChatPanel.current.panel.reveal(vscode.ViewColumn.Beside);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'esp32-copilot.chat',
			'ESP32 Copilot — Ask AI',
			vscode.ViewColumn.Beside,
			{ enableScripts: true, retainContextWhenHidden: true },
		);

		ChatPanel.current = new ChatPanel(panel, context);
	}

	private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
		this.panel = panel;
		this.context = context;
		this.panel.webview.html = this.getHtml();

		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		this.panel.webview.onDidReceiveMessage(
			async (msg) => {
				if (msg.type === 'clear') {
					const choice = await vscode.window.showWarningMessage(
						'Clear conversation history?',
						{ modal: true },
						'Clear',
						'Cancel',
					);
					if (choice === 'Clear') {
						this.messages = [];
						this.panel.webview.postMessage({ type: 'cleared' });
					}
					return;
				}

				if (msg.type === 'ask') {
					const apiKey = await getApiKey(this.context);
					if (!apiKey) {
						this.panel.webview.postMessage({
							type: 'reply',
							id: msg.id,
							text: 'No API key set. Run "ESP32: Set API Key" from the command palette.',
						});
						return;
					}

					try {
						let userContent: string;
						if (this.messages.length === 0) {
							const sketch = await this.readSketchContext();
							userContent = sketch
								? `Here is my current sketch (test-sketch.ino):\n\n\`\`\`cpp\n${sketch}\n\`\`\`\n\n${msg.text}`
								: msg.text;
						} else {
							userContent = msg.text;
						}
						this.messages.push({ role: 'user', content: userContent });

						const client = new Anthropic({ apiKey });
						const stream = client.messages.stream({
							model: 'claude-sonnet-4-5',
							max_tokens: 1024,
							system:
								'You are an expert ESP32 embedded systems engineer helping a developer with their Arduino sketch. The user\'s sketch may be attached as context — only reference it when they ask code-related questions. For greetings, vague messages, or general questions, respond naturally and concisely without volunteering code analysis. Be accurate about ESP32-specific behavior (GPIO strapping pins, dual-core scheduling, WiFi/BLE coexistence, voltage levels). Give working code examples only when the user clearly wants code. Keep responses focused and proportional to the question — don\'t pad short answers with extra suggestions or follow-up prompts unless the user asks.',
							messages: this.messages,
						});

						let assistantText = '';
						stream.on('text', (chunk: string) => {
							assistantText += chunk;
							this.panel.webview.postMessage({ type: 'chunk', id: msg.id, text: chunk });
						});

						await stream.finalMessage();
						this.messages.push({ role: 'assistant', content: assistantText });
						this.panel.webview.postMessage({ type: 'done', id: msg.id });
					} catch (err) {
						console.error('ESP32 Copilot: Anthropic API error', err);
						if (
							this.messages.length > 0 &&
							this.messages[this.messages.length - 1].role === 'user'
						) {
							this.messages.pop();
						}
						this.panel.webview.postMessage({
							type: 'reply',
							id: msg.id,
							text: 'Error: ' + (err instanceof Error ? err.message : String(err)),
						});
					}
				}
			},
			null,
			this.disposables,
		);
	}

	private dispose(): void {
		ChatPanel.current = undefined;
		this.panel.dispose();
		while (this.disposables.length) {
			const d = this.disposables.pop();
			if (d) {
				d.dispose();
			}
		}
	}

	private async readSketchContext(): Promise<string | null> {
		const matches = await vscode.workspace.findFiles('**/*.ino', null, 1);
		if (matches.length === 0) {
			return null;
		}
		const data = await vscode.workspace.fs.readFile(matches[0]);
		return Buffer.from(data).toString('utf-8');
	}

	private getHtml(): string {
		return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ESP32 Copilot — Ask AI</title>
<style>
	html, body {
		height: 100%;
		margin: 0;
		padding: 0;
		background: var(--vscode-editor-background);
		color: var(--vscode-editor-foreground);
		font-family: var(--vscode-font-family);
		font-size: var(--vscode-font-size);
	}
	#root {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		box-sizing: border-box;
	}
	#messages {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.bubble {
		max-width: 90%;
		padding: 8px 12px;
		border-radius: 6px;
		white-space: pre-wrap;
		word-wrap: break-word;
		font-family: var(--vscode-editor-font-family, monospace);
		font-size: var(--vscode-editor-font-size, 13px);
		line-height: 1.4;
		border: 1px solid var(--vscode-panel-border);
	}
	.bubble.user {
		align-self: flex-end;
		background: var(--vscode-button-background);
		color: var(--vscode-button-foreground);
	}
	.bubble.assistant {
		align-self: flex-start;
		background: var(--vscode-input-background);
		color: var(--vscode-input-foreground);
	}
	.bubble.assistant.streaming:empty::after {
		content: '...';
		opacity: 0.6;
	}
	#input-row {
		display: flex;
		gap: 8px;
		padding: 8px;
		border-top: 1px solid var(--vscode-panel-border);
		background: var(--vscode-editor-background);
	}
	#prompt {
		flex: 1;
		resize: none;
		min-height: 36px;
		max-height: 160px;
		padding: 6px 8px;
		background: var(--vscode-input-background);
		color: var(--vscode-input-foreground);
		border: 1px solid var(--vscode-panel-border);
		border-radius: 4px;
		font-family: var(--vscode-editor-font-family, monospace);
		font-size: var(--vscode-editor-font-size, 13px);
	}
	#send {
		padding: 0 14px;
		background: var(--vscode-button-background);
		color: var(--vscode-button-foreground);
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	#send:hover {
		background: var(--vscode-button-hoverBackground);
	}
	#clear {
		padding: 0 10px;
		background: var(--vscode-button-secondaryBackground, transparent);
		color: var(--vscode-button-secondaryForeground, var(--vscode-editor-foreground));
		border: 1px solid var(--vscode-panel-border);
		border-radius: 4px;
		cursor: pointer;
		opacity: 0.75;
		font-size: 0.9em;
	}
	#clear:hover {
		opacity: 1;
		background: var(--vscode-button-secondaryHoverBackground, var(--vscode-input-background));
	}
</style>
</head>
<body>
<div id="root">
	<div id="messages"></div>
	<div id="input-row">
		<textarea id="prompt" rows="2" placeholder="Ask about ESP32..."></textarea>
		<button id="clear" title="Clear conversation history">Clear</button>
		<button id="send">Send</button>
	</div>
</div>
<script>
	const vscode = acquireVsCodeApi();
	const messagesEl = document.getElementById('messages');
	const promptEl = document.getElementById('prompt');
	const sendEl = document.getElementById('send');
	const clearEl = document.getElementById('clear');

	let nextId = 1;

	function scrollToBottom() {
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	function appendBubble(role, text, dataId) {
		const el = document.createElement('div');
		el.className = 'bubble ' + role;
		el.textContent = text;
		if (dataId !== undefined) {
			el.setAttribute('data-id', String(dataId));
		}
		messagesEl.appendChild(el);
		scrollToBottom();
		return el;
	}

	function send() {
		const value = promptEl.value.trim();
		if (!value) {
			return;
		}
		const id = nextId++;
		appendBubble('user', value);
		promptEl.value = '';
		const bubble = appendBubble('assistant', '', id);
		bubble.classList.add('streaming');
		vscode.postMessage({ type: 'ask', id, text: value });
	}

	sendEl.addEventListener('click', send);
	clearEl.addEventListener('click', () => {
		vscode.postMessage({ type: 'clear' });
	});
	promptEl.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	});

	window.addEventListener('message', (event) => {
		const data = event.data;
		if (!data) {
			return;
		}
		if (data.type === 'cleared') {
			messagesEl.innerHTML = '';
			return;
		}
		const target = messagesEl.querySelector('.bubble.assistant[data-id="' + data.id + '"]');
		if (!target) {
			return;
		}
		if (data.type === 'chunk') {
			target.classList.remove('streaming');
			target.textContent = (target.textContent || '') + data.text;
			scrollToBottom();
		} else if (data.type === 'done') {
			target.classList.remove('streaming');
			scrollToBottom();
		} else if (data.type === 'reply') {
			target.classList.remove('streaming');
			target.textContent = data.text;
			scrollToBottom();
		}
	});
</script>
</body>
</html>`;
	}
}
