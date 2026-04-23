// Entry point for the TeenyCode CLI.
//
// - Loads the agent and the built-in filesystem tools
// - Verifies your OpenAI API key is available
// - Starts an interactive chat loop
//
// Quickstart:
//   1) cp .env.example .env && edit OPENAI_API_KEY
//   2) pnpm tsx src/index.ts
// Optional: set OPENAI_MODEL to override the default model.

import { runAgent } from "./agent.js";
import { tools } from "./tools.js";

// Ensure the OpenAI API key is available before starting.
// You can also `export OPENAI_API_KEY=...` in your shell.
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in, or export it in your shell.\n",
  );
  process.exit(1);
}

// Boot the agent with our toolset. Any unhandled errors are logged and we exit
// with a non-zero code so shells/CI can detect failure.
runAgent(tools).catch((err) => {
  console.error(err);
  console.error(); // extra newline for readability
  process.exit(1);
});
