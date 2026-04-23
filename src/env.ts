import path from "node:path";

const ENV_FILE_NAME = ".env";

export function loadEnvFromCurrentWorkingDirectory() {
  const envFilePath = path.join(process.cwd(), ENV_FILE_NAME);

  try {
    process.loadEnvFile(envFilePath);
    return envFilePath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
