/**
# IPC-Spy

Spy on inter process comunication(IPC)

## What does it do?

Spy on ipc communications, by replacing the binary that is spawned with a wrapper that logs all the communication while still forwarding the messages to the original processes.

This is for example useful to see what an lsp is sending exactly, or any other based ipc setup.

## Install

`deno install -A jsr:@sigmasd/ipc-spy`

## Usage

`ipc-spy $pathTotargetfile`

This will create a new executable with `-spy` suffix appeneded to it in the current directory.

The next step is to run the new program `$pathTotargetfile-spy` or make another program call it (like a text editor in case of lsp).

Now the messages will be logged to `$tmp/${executable_name}_stdin.log`,
`$tmp/${executable_name_stdout}.log` and `$tmp/${executable_name_stderr}.log`

@example

[Screencast from 2024-03-23 17-06-44.webm](https://github.com/sigmaSd/ipc-spy/assets/22427111/40d4c5af-785f-42d3-9afe-4744952a4ad9)

@module
*/
import * as path from "@std/path";

if (import.meta.main) {
  const target = Deno.args[0];
  if (!target) throw new Error("no target specified");
  await spy(target);
}

async function spy(target: string) {
  let proxPath = import.meta.resolve("./prox.ts");
  // deno compile donsn't handle htts://jsr.io currently
  if (proxPath.startsWith("https://jsr.io")) {
    const version = proxPath.match(/@sigmasd\/ipc-spy\/(.*?)\//)?.at(1);
    if (version) {
      proxPath = "jsr:@sigmasd/ipc-spy@" + version;
    } else {
      proxPath = "jsr:@sigmasd/ipc-spy";
    }
    proxPath += "/_prox";
  }

  const wrapperFile = await Deno.makeTempFile({ suffix: ".ts" });
  await Deno.writeTextFile(
    wrapperFile,
    `\
import { prox } from "${proxPath}";

await prox("${target}", Deno.args);
Deno.exit(0);
`,
  );

  await new Deno.Command("deno", {
    args: [
      "compile",
      "--no-check",
      "-o",
      path.basename(target) + "-spy",
      "-A",
      wrapperFile,
    ],
  }).spawn().status;
}
