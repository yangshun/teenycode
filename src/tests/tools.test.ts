import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { tools, toOpenAITools } from "../tools.js";

function getTool(name: string) {
  const tool = tools.find((candidate) => candidate.name === name);

  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }

  return tool;
}

describe("tools", () => {
  const originalCwd = process.cwd();
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "teenycode-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { force: true, recursive: true });
  });

  it("creates and updates a file through edit_file", async () => {
    const editFile = getTool("edit_file");

    await expect(
      editFile.execute({ path: "note.txt", old_str: "", new_str: "hello" }),
    ).resolves.toBe("Created note.txt");
    await expect(readFile("note.txt", "utf8")).resolves.toBe("hello");

    await expect(
      editFile.execute({ path: "note.txt", old_str: "hello", new_str: "hello world" }),
    ).resolves.toBe("Edited note.txt");
    await expect(readFile("note.txt", "utf8")).resolves.toBe("hello world");
  });

  it("lists nested files relative to the provided path", async () => {
    const listFiles = getTool("list_files");

    await mkdir("nested", { recursive: true });
    await writeFile("nested/example.txt", "content");

    const result = await listFiles.execute({ path: "." });

    expect(JSON.parse(result)).toEqual(expect.arrayContaining(["nested/", "nested/example.txt"]));
  });

  it("rejects non-unique replacements", async () => {
    const editFile = getTool("edit_file");

    await writeFile("duplicate.txt", "same\nsame\n");

    await expect(
      editFile.execute({ path: "duplicate.txt", old_str: "same", new_str: "different" }),
    ).rejects.toThrow("must be unique");
  });

  it("exposes OpenAI-compatible function tools", () => {
    const openAITools = toOpenAITools(tools);

    expect(openAITools).toHaveLength(3);
    expect(openAITools.map((tool) => tool.function.name)).toEqual([
      "read_file",
      "list_files",
      "edit_file",
    ]);
  });
});
