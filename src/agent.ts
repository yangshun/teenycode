import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { styleText } from "node:util";
import { toOpenAITools, type Tool } from "./tools.js";

// runAgent wires together:
// - terminal I/O via readline
// - the OpenAI Chat Completions API
// - the local tool implementations (read/list/edit files)
// and loops, letting the model call tools until it produces a final reply.
export async function runAgent(tools: Tool[]): Promise<void> {
  // OpenAI SDK client reads OPENAI_API_KEY from env.
  const client = new OpenAI();

  // Model selection: override with OPENAI_MODEL, else use a sensible default.
  const model = process.env.OPENAI_MODEL ?? "gpt-5";

  // Convert our internal Tool descriptors into OpenAI "function tools" schema.
  const toolSpecs = toOpenAITools(tools);

  // Quick lookup table from tool name -> implementation.
  const toolByName = new Map(tools.map((t) => [t.name, t]));

  // Conversation state we send to the API each turn.
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful coding agent with access to tools for reading, listing, and editing files in the user's working directory. Use the tools whenever they would let you answer more accurately than guessing. Prefer reading a file over asking the user to paste its contents. When editing, make the smallest change that satisfies the request. Keep replies short.",
    },
  ];

  // Interactive terminal prompt setup.
  const rl = readline.createInterface({ input, output });

  // Handle Ctrl-C gracefully: don't surface an error, just say goodbye and exit.
  rl.on("SIGINT", () => {
    console.log(styleText("yellowBright", "Goodbye!\n"));
    rl.close();
    process.exit(0);
  });

  console.log(`Chat with ${model} (type 'exit' or 'quit' or use Ctrl-C to quit)\n`);

  // Outer loop: read user input, then ask the model how to respond.
  while (true) {
    const userInput = await rl.question(`${styleText("blueBright", "You")}: `);

    // Exit shortcuts: "exit", "quit", vi-style ":q", or Ctrl-D (\u0004).
    if (["exit", "quit", ":q", "\u0004"].includes(userInput.trim().toLowerCase())) {
      console.log(styleText("yellowBright", "Goodbye!\n"));
      rl.close();
      return;
    }

    // Ignore empty lines to keep the log cleaner.
    if (userInput.trim() === "") {
      continue;
    }

    // Record the user's message in the running transcript.
    messages.push({ role: "user", content: userInput });
    console.log();

    // Inner loop: keep calling the model until it returns plain text.
    // If the model asks to call tools, we execute them and feed results back.
    while (true) {
      const res = await client.chat.completions.create({
        model,
        messages,
        tools: toolSpecs,
      });
      const msg = res.choices[0].message;

      // Save assistant message (either text or tool calls) to history.
      messages.push(msg);

      // If there are no tool calls, we have a final answer to display.
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        console.log(`${styleText("yellowBright", "Agent")}: ${msg.content ?? ""}\n`);
        break;
      }

      // Otherwise, execute each requested tool in sequence and send results back.
      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue; // defensive: we only support function tools

        const tool = toolByName.get(call.function.name);
        console.log(
          `${styleText("gray", "Tool")}: ${call.function.name}(${call.function.arguments})\n`,
        );

        let result: string;
        try {
          if (!tool) throw new Error(`Unknown tool: ${call.function.name}`);

          // Tool arguments are a JSON string — parse and validate in the tool.
          const args = JSON.parse(call.function.arguments);
          result = await tool.execute(args);
        } catch (err) {
          // Surface tool errors back to the model so it can recover.
          result = `ERROR: ${(err as Error).message}`;
          console.log(styleText("redBright", result + "\n"));
        }

        // Provide the tool's output to the model using the tool_call_id.
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }
  }
}
