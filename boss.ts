import * as path from "https://deno.land/std@0.125.0/path/mod.ts";
import dir from "https://deno.land/x/dir/mod.ts";

const SPY_FOLDER = path.join(dir("cache")!, "spy-boss");
const DB = path.join(SPY_FOLDER, "db.txt");

//  Make sure spy folder ,bin dir(holds prox binary) and db exist
Deno.mkdirSync(path.join(SPY_FOLDER, "bin"), {
  recursive: true,
});
if (!Deno.statSync(DB).isFile) {
  Deno.createSync(DB);
}

switch (Deno.args.length) {
  case 0:
    for (const line of Deno.readTextFileSync(DB).split("\n")) {
      console.log(line);
    }
    break;
  case 1: {
    const target = Deno.args[0];
    // 1- Save target
    const originTarget = path.join(SPY_FOLDER, path.basename(target));
    if (!Deno.statSync(originTarget).isFile) {
      Deno.copyFileSync(target, originTarget);
    }
    // 2- spy
    try {
      await spy({ target, originTarget });
      saveToDb({ target, originTarget });
    } catch {
      // In case of any failure, restore original target
      Deno.copyFileSync(originTarget, target);
    }
    break;
  }
  case 2: {
    if (Deno.args[0] == "restore") {
      const target = Deno.args[1];
      const originTarget = path.join(SPY_FOLDER, path.basename(target));
      Deno.copyFileSync(originTarget, target);
      removeFromDb({ target, originTarget });
    }
    break;
  }
  default:
    break;
}

async function spy(
  { target, originTarget }: { target: string; originTarget: string },
) {
  const proxPath = Deno.env.get("PROX") || path.resolve("./prox.ts");
  const proxBinPath = path.join(SPY_FOLDER, "bin/prox");

  // 3- Compile prox
  const proxS = await Deno.run({
    cmd: [
      "deno",
      "compile",
      "-o",
      proxBinPath,
      "-A",
      proxPath,
    ],
  }).status();
  if (!proxS.success) {
    return;
  }

  const wrapper = `
import * as path from "https://deno.land/std@0.125.0/path/mod.ts";

await Deno.run({
  cmd: ["${proxBinPath}", "${originTarget}", ...Deno.args],
}).status();
`;
  const wrapperFile = Deno.makeTempFileSync({ suffix: ".ts" });
  Deno.writeFileSync(wrapperFile, new TextEncoder().encode(wrapper));

  // 4- Compile wrapper as a spy
  console.log(`compiling ${wrapperFile} to ${target}`);
  Deno.removeSync(target);
  await Deno.run({
    cmd: ["deno", "compile", "-o", target, "-A", wrapperFile],
  }).status();
}

function saveToDb(
  { target, originTarget }: { target: string; originTarget: string },
) {
  const entry = `${target}\t=>\t${originTarget}\n`;
  if (
    Deno.readTextFileSync(DB).includes(entry)
  ) {
    return;
  }
  Deno.writeFileSync(
    DB,
    new TextEncoder().encode(entry),
    { append: true },
  );
}

function removeFromDb(
  { target, originTarget }: { target: string; originTarget: string },
) {
  const entry = `${target}\t=>\t${originTarget}`; // no new line here
  const newDb = Deno.readTextFileSync(DB).split("\n").filter((line) =>
    line != entry
  ).join("\n");
  Deno.writeFileSync(DB, new TextEncoder().encode(newDb));
}
