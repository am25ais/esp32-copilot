# ESP32 Copilot

> AI-assisted ESP32 development for Visual Studio Code — build, flash, monitor, and ask Claude about your code, all from a single sidebar.

ESP32 Copilot brings the things you actually do during ESP32 development into VS Code. Compile your sketch with arduino-cli, flash it to your board, watch the serial monitor — and when you get stuck, ask Claude a question. Claude can read your sketch, knows ESP32-specific quirks (strapping pins, dual-core scheduling, WiFi/BLE coexistence), and gives concrete answers about your code.

## Why this exists

PlatformIO and the official Arduino IDE handle the build/flash side well. They do not help when you are staring at a serial monitor wondering why your sensor reads garbage, or whether GPIO 12 is safe to use as an input.

ESP32 Copilot adds an AI layer on top of standard Arduino tooling — not generic chatbot help, but an assistant that understands ESP32 hardware constraints and can read the sketch you are working on.

## Features

- Build sketches with arduino-cli for any installed ESP32 variant (original, S2, S3, C3, C6, H2, P4)
- Flash to a connected board with smart port detection (handles the common Windows case where Bluetooth dongles register as serial ports)
- Serial Monitor with start/stop lifecycle, streaming output to VS Code output channel
- Ask AI — chat with Claude about your sketch, with streaming responses and conversation memory
- Board picker — switch between 300+ ESP32 board variants without editing config files
- Secure API key storage — your Anthropic API key is encrypted in your OS credential vault, never written to a file

## Quick start

1. Install the extension
2. Install arduino-cli and the ESP32 core (arduino-cli config init, then arduino-cli core install esp32:esp32 after adding the Espressif package URL)
3. Open a folder containing a .ino sketch
4. Click the ESP32 Copilot icon in the activity bar
5. Click Build — your sketch should compile
6. Optional: Run "ESP32: Set API Key" from the command palette and enter your Anthropic API key to enable Ask AI

## Requirements

- VS Code 1.116 or later
- arduino-cli installed and on PATH
- ESP32 core: arduino-cli core install esp32:esp32
- An ESP32 board via USB (only needed for Flash and Monitor — Build works without one)
- Anthropic API key (only needed for Ask AI — Build/Flash/Monitor work without one)

## Commands

All commands available from the command palette (Ctrl+Shift+P):

- ESP32: Build — compile the .ino in the current workspace
- ESP32: Flash — upload the compiled sketch to a connected board
- ESP32: Serial Monitor — open a streaming serial monitor at 115200 baud
- ESP32: Stop Serial Monitor — stop a running monitor
- ESP32: Ask AI — open the AI chat panel
- ESP32: Select Board — pick a target ESP32 variant
- ESP32: Set API Key — save your Anthropic API key securely
- ESP32: Clear API Key — remove the stored API key

## Settings

- esp32-copilot.fqbn (default: esp32:esp32:esp32) — Fully Qualified Board Name. Use "ESP32: Select Board" to change this interactively.

## Ask AI in detail

The AI chat panel sends your messages to Anthropic Claude API. On the first message of each conversation, your .ino sketch is included as context so Claude can reason about your specific code. Subsequent messages reuse the same conversation memory — you can have a real back-and-forth like "now make it blink twice as fast" or "add a button on GPIO 4" and Claude will respond appropriately.

Privacy: Your sketch and conversation are sent to Anthropic API only when you click Send. Nothing is stored by this extension other than your encrypted API key and per-session chat history, which is wiped when you close the panel or click Clear.

Cost: Claude API usage is billed by Anthropic. A typical question uses 1,000-3,000 input tokens.

## Known limitations

This is an early release (v0.1). Things that will improve over time:

- Only Arduino framework supported (ESP-IDF and MicroPython on the roadmap)
- Wokwi simulator not yet integrated
- Conversation history does not persist across panel close/reopen
- No syntax highlighting for code blocks in the chat panel
- Ask AI responds to greetings by referencing your sketch — minor cosmetic issue

## Roadmap

- ESP-IDF framework support
- MicroPython framework support
- Wokwi simulator integration
- Syntax-highlighted code blocks in chat
- Persistent chat history across sessions
- Quick-action buttons in chat (insert code into sketch)

## Contributing

Issues and pull requests welcome at github.com/am25ais/esp32-copilot

## Author

Built by Ahtisham (@am25ais).

## License

MIT — see LICENSE.
