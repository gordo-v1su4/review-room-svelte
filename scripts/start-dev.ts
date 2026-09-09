import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT ?? "3000";
const isWindows = process.platform === "win32";
const command = isWindows ? "powershell.exe" : "bash";
const args = isWindows
  ? [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(scriptDir, "start-dev.ps1"),
      "-Port",
      port,
    ]
  : [join(scriptDir, "start-dev.sh"), port];

const child = spawn(command, args, {
  cwd: join(scriptDir, ".."),
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`Could not start dev server: ${error.message}`);
  process.exit(1);
});
