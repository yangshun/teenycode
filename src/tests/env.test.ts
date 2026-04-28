import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { loadEnvFromCurrentWorkingDirectory } from "../env.js";

describe("loadEnvFromCurrentWorkingDirectory", () => {
  const originalCwd = process.cwd();
  const envKey = "TEENYCODE_ENV_TEST_VALUE";
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "teenycode-"));
    delete process.env[envKey];
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    delete process.env[envKey];
    await rm(tempDir, { force: true, recursive: true });
  });

  it("loads a .env file from the current working directory", async () => {
    await writeFile(".env", `${envKey}=from-file\n`);

    const envFilePath = loadEnvFromCurrentWorkingDirectory();

    expect(envFilePath).toBe(path.join(process.cwd(), ".env"));
    expect(process.env[envKey]).toBe("from-file");
  });

  it("does nothing when the current working directory has no .env file", () => {
    expect(loadEnvFromCurrentWorkingDirectory()).toBeNull();
    expect(process.env[envKey]).toBeUndefined();
  });

  it("does not override an existing shell environment variable", async () => {
    process.env[envKey] = "from-shell";
    await writeFile(".env", `${envKey}=from-file\n`);

    loadEnvFromCurrentWorkingDirectory();

    expect(process.env[envKey]).toBe("from-shell");
  });
});
