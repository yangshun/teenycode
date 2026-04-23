# TeenyCode

A tiny code‑editing agent in TypeScript (200 LOC) — a minimal, hackable CLI that talks to OpenAI and can read, list, and edit files in your working directory.

This repository is for **educational purposes**, to demonstrate the core elements of a minimal CLI coding agent, adapted from [How to Build an Agent](https://ampcode.com/notes/how-to-build-an-agent) by Amp.

## Features

- Chat-based CLI that calls OpenAI and uses tool calls
- File tools: `read_file`, `list_files`, `edit_file` (single, unique replacement or create new file)
- Prefers reading files over guessing; makes the smallest edit that satisfies a request
- Minimal dependencies and simple code you can tweak

> [!NOTE]
> No `bash` tool is included because it can be risky and this repo is intended for educational use, but you can add it yourself if needed.

## Requirements

- Node.js 22+
- npm for `npx teenycode`, or Vite+ (`vp`) for local development
- An OpenAI API key

## Quickstart

```sh
export OPENAI_API_KEY=sk-...
npx teenycode
```

Or put `OPENAI_API_KEY=sk-...` in a `.env` file in the directory where you run `npx teenycode`.

If you prefer a one-liner:

```sh
OPENAI_API_KEY=sk-... npx teenycode
```

If `OPENAI_API_KEY` is missing, the CLI prints setup instructions and exits.

## Local development

```sh
vp install
cp .env.example .env
# edit .env and set your API key
vp run start
```

You'll see a prompt like `Chat with <model>`. Type your requests. Quit with `exit`, `quit`, `:q`, or Ctrl‑C.

## How it works (quick tour)

- `src/index.ts`: Entry point; checks `OPENAI_API_KEY`, starts the agent
- `src/agent.ts`: Chat loop, tool routing, and message state
- `src/tools.ts`: Three built-in tools implemented with Node `fs` APIs

The agent uses OpenAI Chat Completions with function/tool calling. Tool inputs are validated with Zod, and schemas are exported to JSON Schema for the model.

## Example

```sh
➜  teenycode git:(main) ✗ OPENAI_API_KEY=sk-... npx teenycode

Chat with gpt-5 (type 'exit' or 'quit' or use Ctrl-C to quit)

You: What is this repo about?

tool: list_files({"path": ""})

tool: read_file({"path":"README.md"})

tool: read_file({"path":"package.json"})

tool: read_file({"path":"src/index.ts"})

tool: read_file({"path":"src/agent.ts"})

tool: read_file({"path":"src/tools.ts"})

Agent: TeenyCode is a tiny, hackable CLI coding agent written in TypeScript (~200 LOC) for educational purposes. It chats with OpenAI and can operate on your local files via three tools:
- read_file: read a file’s contents
- list_files: list files/dirs at a path
- edit_file: make a single, unique text replacement or create a new file
```

## Tools

The agent exposes three file tools:

- `read_file` (`path: string`): Reads and returns the text contents of a file at a relative path.
- `list_files` (`path: string`): Lists files and directories at the given path (use "." for the current dir).
- `edit_file` (`path: string, old_str: string, new_str: string`): Replaces exactly one occurrence of old_str with new_str in the given file.

Conventions:

- All paths are relative to your current working directory.
- The agent prefers reading over guessing and aims to make the smallest possible change.

## Notes

- Edits are surgical by design. Keep your work in git and commit often.
- The agent operates relative to your current working directory.

## Quality checks

```sh
vp check
vp lint --fix
vp fmt
vp test
vp build
```

## Acknowledgements

Adapted from [How to Build an Agent](https://ampcode.com/notes/how-to-build-an-agent) by Amp.
