import { promises as fs } from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// A Tool is a capability the agent can invoke. Each tool declares:
// - a name (used by the model to call it)
// - a natural-language description (helps the model decide when to use it)
// - a Zod schema for validated inputs
// - an async execute(input) function that returns a string result
export type Tool = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  execute: (input: unknown) => Promise<string>;
};

// -------------------------
// read_file implementation
// -------------------------
const readFileInput = z.object({
  path: z.string().describe("The relative path of a file in the working directory."),
});

const readFile: Tool = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  schema: readFileInput,
  execute: async (input) => {
    // Validate and coerce the raw input using Zod.
    const { path: p } = readFileInput.parse(input);
    // Return the file contents as UTF-8 text.
    return await fs.readFile(p, "utf8");
  },
};

// -------------------------
// list_files implementation
// -------------------------
const listFilesInput = z.object({
  path: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional relative path to list files from. Defaults to the current directory if not provided.",
    ),
});

const listFiles: Tool = {
  name: "list_files",
  description:
    "List files and directories at a given path. If no path is provided, lists files in the current directory.",
  schema: listFilesInput,
  execute: async (input) => {
    const { path: p } = listFilesInput.parse(input);

    // Default to current directory when path is not provided or is null.
    const root = p && p !== null ? p : ".";

    // Node 20+ supports 'recursive' + 'withFileTypes' to walk a tree.
    const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });

    // Emit a flat list of relative paths; suffix directories with '/'.
    const out: string[] = [];
    for (const e of entries) {
      const rel = path.relative(root, path.join(e.parentPath ?? root, e.name));
      out.push(e.isDirectory() ? `${rel}/` : rel);
    }
    return JSON.stringify(out);
  },
};

// -------------------------
// edit_file implementation
// -------------------------
const editFileInput = z.object({
  // Path where we will edit or create a file.
  path: z.string().describe("The path to the file"),

  // If empty: create the file with new_str when it does not exist.
  // If non-empty: must appear exactly once in the target file and will be replaced.
  old_str: z
    .string()
    .describe(
      "Text to search for — must match exactly and must only have one match. Pass an empty string to create a new file with new_str as its contents.",
    ),

  // Replacement text or the initial content for a new file.
  new_str: z.string().describe("Text to replace old_str with"),
});

const editFile: Tool = {
  name: "edit_file",
  description:
    "Make edits to a text file. Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other. If the file specified with path doesn't exist and old_str is empty, it will be created with new_str as its contents.",
  schema: editFileInput,
  execute: async (input) => {
    const { path: p, old_str, new_str } = editFileInput.parse(input);

    // Sanity check to prevent accidental no-op writes.
    if (old_str === new_str) {
      throw new Error("old_str and new_str must be different");
    }

    let content: string;
    try {
      // Try to read the file. If it does not exist and old_str === "",
      // we'll create it below.
      content = await fs.readFile(p, "utf8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT" && old_str === "") {
        // Create parent directories as needed, then write new content.
        await fs.mkdir(path.dirname(p), { recursive: true });
        await fs.writeFile(p, new_str);
        return "OK";
      }
      // Propagate any other error (e.g., permissions).
      throw err;
    }

    // If the file exists, an empty old_str would be ambiguous — disallow it.
    if (old_str === "") {
      throw new Error(`file ${p} already exists; pass a non-empty old_str to edit it`);
    }

    // Ensure a unique match so the edit is predictable and reviewable.
    const occurrences = content.split(old_str).length - 1;
    if (occurrences === 0) throw new Error(`old_str not found in ${p}`);
    if (occurrences > 1)
      throw new Error(`old_str matched ${occurrences} times in ${p}; must be unique`);

    await fs.writeFile(p, content.replace(old_str, new_str));
    return "OK";
  },
};

// Export the built-in tool list the agent will load.
export const tools: Tool[] = [readFile, listFiles, editFile];

// Transform our Tool definitions into the structure the OpenAI client expects
// for "function tools". We also convert the Zod schema to an OpenAI-compatible
// JSON Schema using zod-to-json-schema so the model knows the input shape.
export function toOpenAITools(tools: Tool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToJsonSchema(t.schema, { target: "openAi" }) as Record<string, unknown>,
    },
  }));
}
