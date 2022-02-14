import { tempDirectory } from "./utils.ts";
import * as path from "https://deno.land/std@0.125.0/path/mod.ts";

const CONTROL_LOG = Deno.createSync(
  path.join(tempDirectory, "control_trace.log") || "/tmp/control_trace.log",
);
const PUPPET_LOG = Deno.createSync(
  path.join(tempDirectory, "puppet_trace.log") || "/tmp/puppet_trace.log",
);

async function log(text: string, log: Deno.File) {
  await log.write(new TextEncoder().encode(text));
}

const PUPPET = Deno.run({
  cmd: [...Deno.args],
  stdin: "piped",
  stdout: "piped",
  stderr: "piped",
});

async function readFromPuppetAndWriteToControl() {
  const buf = new Uint8Array(512);
  while (true) {
    // Read from puppet
    const n = await Promise.race([
      PUPPET.stdout.read(buf),
      PUPPET.stderr.read(buf),
    ]);
    const input = buf.slice(0, n!);
    // Log puppet msg
    await log(
      new TextDecoder().decode(input),
      PUPPET_LOG,
    );
    // Write to control
    await Deno.stdout.write(input);
  }
}

async function readFromControlAndWriteToPuppet() {
  const buf = new Uint8Array(512);
  while (true) {
    // Read from control
    const n = await Deno.stdin.read(buf);
    const input = buf.slice(0, n!);
    // log control msg
    await log(
      new TextDecoder().decode(input),
      CONTROL_LOG,
    );
    // Write to puppet
    await PUPPET.stdin.write(input);
  }
}

await Promise.all([
  readFromPuppetAndWriteToControl(),
  readFromControlAndWriteToPuppet(),
]);
