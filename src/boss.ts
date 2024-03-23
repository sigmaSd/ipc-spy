import * as path from "@std/path";
import { cacheDir } from "./utils.ts";

const SPY_FOLDER = path.join(cacheDir()!, "spy-boss");
const DB = path.join(SPY_FOLDER, "db.txt");

//  Make sure spy folder ,bin dir(holds prox binary) and db exist
Deno.mkdirSync(path.join(SPY_FOLDER, "bin"), {
  recursive: true,
});
if (!fileExists(DB)) {
  Deno.createSync(DB);
}

switch (Deno.args.length) {
  case 0:
    for (const line of Deno.readTextFileSync(DB).split("\n")) {
      console.log(line);
    }
    break;
  case 1: {
    const target = path.resolve(Deno.args[0]);
    // 1- Save target
    const originTarget = path.join(SPY_FOLDER, path.basename(target));
    if (!fileExists(originTarget)) {
      Deno.copyFileSync(target, originTarget);
    }
    // 2- spy
    try {
      await spy({ target, originTarget });
      saveToDb({ target, originTarget });
    } catch {
      // In case of any failure, restore original target
      console.error("failed to spy on target, restoring files..");
      Deno.copyFileSync(originTarget, target);
    }
    break;
  }
  case 2: {
    if (Deno.args[0] == "restore") {
      const target = path.resolve(Deno.args[1]);
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
  const proxBinPath = path.join(SPY_FOLDER, "bin/prox");

  // 3- Compile prox
  const proxS = await new Deno.Command(
    "deno",
    {
      args: [
        "compile",
        "--no-check",
        "-o",
        proxBinPath,
        "-A",
        import.meta.resolve("./prox.ts"),
      ],
    },
  ).spawn().status;
  if (!proxS.success) {
    return;
  }

  const wrapper = `\
await new Deno.Command("${proxBinPath}", {
  args: ["${originTarget}", ...Deno.args],
}).spawn().status;
`;
  const wrapperFile = Deno.makeTempFileSync({ suffix: ".ts" });
  Deno.writeTextFile(wrapperFile, wrapper);

  // 4- Compile wrapper as a spy
  console.log(`compiling ${wrapperFile} to ${target}`);
  Deno.removeSync(target);

  await new Deno.Command("deno", {
    args: ["compile", "--no-check", "-o", target, "-A", wrapperFile],
  }).spawn().status;
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
  Deno.writeTextFileSync(
    DB,
    entry,
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
  Deno.writeTextFileSync(DB, newDb);
}

// function to check if a file exists
function fileExists(filePath: string): boolean {
  try {
    Deno.statSync(filePath);
    return true;
    // catch deno not found instance
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false;
    }
    throw e;
  }
}
