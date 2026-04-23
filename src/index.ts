// Entry point for the TeenyCode CLI.
//
// - Loads the agent and the built-in filesystem tools
// - Verifies your OpenAI API key is available
// - Starts an interactive chat loop
//
// Quickstart:
//   1) export OPENAI_API_KEY=sk-...
//   2) npx teenycode
// Optional: set OPENAI_MODEL to override the default model.

import { runAgent } from "./agent.js";
import { tools } from "./tools.js";

// Ensure the OpenAI API key is available before starting.
// You can also `export OPENAI_API_KEY=...` in your shell.
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is not set.\n\nRun:\n  export OPENAI_API_KEY=sk-...\n  npx teenycode\n\nFor local development, you can also copy .env.example to .env and run `vp run start`.\n",
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
