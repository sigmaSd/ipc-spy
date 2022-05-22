import { tempDirectory } from "./utils.ts";
import { mergeReadableStreams } from "https://deno.land/std@0.140.0/streams/merge.ts";
import * as path from "https://deno.land/std@0.125.0/path/mod.ts";

const CONTROL_LOG = Deno.createSync(
  path.join(tempDirectory, "control_trace.log") || "/tmp/control_trace.log",
);
const PUPPET_LOG = Deno.createSync(
  path.join(tempDirectory, "puppet_trace.log") || "/tmp/puppet_trace.log",
);

async function log(text: string, log: Deno.FsFile) {
  await log.write(new TextEncoder().encode(text));
}

const PUPPET = Deno.spawnChild(Deno.args[0], {
  args: Deno.args.slice(1),
  stdin: "piped",
  stdout: "piped",
  stderr: "piped",
});

class Logger extends TransformStream<Uint8Array, Uint8Array> {
  constructor(logFile: Deno.FsFile) {
    super({
      transform(chunk, controller) {
        log(new TextDecoder().decode(chunk), logFile);
        controller.enqueue(chunk);
      },
    });
  }
}
async function readFromPuppetAndWriteToControl() {
  await PUPPET.stdout.pipeThrough(
    new Logger(PUPPET_LOG),
  ).pipeTo(Deno.stdout.writable);
}

async function readFromControlAndWriteToPuppet() {
  await Deno.stdin.readable.pipeThrough(new Logger(CONTROL_LOG)).pipeTo(
    PUPPET.stdin,
  );
}

await Promise.all([
  readFromPuppetAndWriteToControl(),
  readFromControlAndWriteToPuppet(),
]);
