import * as path from "@std/path";

class Logger extends TransformStream<Uint8Array, Uint8Array> {
  constructor(logPath: string) {
    const logFile = Deno.create(logPath);
    super({
      transform(chunk, controller) {
        logFile.then((file) => file.write(chunk));
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

export async function prox(targetPath: string, args: string[]) {
  const targetName = path.basename(targetPath);

  const target = new Deno.Command(targetPath, {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const tempDir = await Deno.realPath((() => {
    if (Deno.build.os === "windows") {
      return Deno.env.get("TMP") || Deno.env.get("TEMP") ||
        Deno.env.get("USERPROFILE") || Deno.env.get("SystemRoot") || "";
    }

    return "/tmp";
  })());

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
}

if (import.meta.main) {
  const targetPath = Deno.args[0];
  if (!targetPath) {
    throw new Error("No target specified");
  }
  Deno.exit(0);
}
