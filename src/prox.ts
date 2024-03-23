import * as path from "@std/path";
import { tempDir } from "./utils.ts";

class Logger extends TransformStream<Uint8Array, Uint8Array> {
  constructor(logPath: string) {
    const logFile = Deno.createSync(logPath);
    super({
      transform(chunk, controller) {
        logFile.write(chunk);
        controller.enqueue(chunk);
      },
    });
  }
}

interface Target {
  target: Deno.ChildProcess;
  logPath: string;
}

async function spyStatus(target: Deno.ChildProcess) {
  await target.status;
}

async function spyStdin({ target, logPath }: Target) {
  await Deno.stdin.readable.pipeThrough(
    new Logger(
      logPath,
    ),
  )
    .pipeTo(target.stdin);
}

async function spyStdout({ target, logPath }: Target) {
  await target.stdout.pipeThrough(
    new Logger(logPath),
  ).pipeTo(Deno.stdout.writable);
}

async function spyStderr({ target, logPath }: Target) {
  await target.stderr.pipeThrough(
    new Logger(logPath),
  ).pipeTo(Deno.stderr.writable);
}

if (import.meta.main) {
  const target_path = Deno.args[0];
  if (!target_path) {
    throw new Error("No target specified");
  }
  const targetName = path.basename(target_path);

  const target = new Deno.Command(target_path, {
    args: Deno.args.slice(1),
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  await Promise.any([
    spyStatus(target),
    Promise.allSettled([
      spyStdin({
        target,
        logPath: path.join(tempDir, `${targetName}_stdin.log`) ||
          `/tmp/${targetName}_stdin.log`,
      }),
      spyStdout({
        target,
        logPath: path.join(tempDir, `${targetName}_stdout.log`) ||
          `/tmp/${targetName}_stdout.log`,
      }),
      spyStderr({
        target,
        logPath: path.join(tempDir, `${targetName}_stderr.log`) ||
          `/tmp/${targetName}_stderr.log`,
      }),
    ]),
  ]);

  Deno.exit(0);
}
