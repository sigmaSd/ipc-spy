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
