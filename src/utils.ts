const getDirectory = () => {
  if (Deno.build.os === "windows") {
    return Deno.env.get("TMP") || Deno.env.get("TEMP") ||
      Deno.env.get("USERPROFILE") || Deno.env.get("SystemRoot") || "";
  }

  return "/tmp";
};
export const tempDir = Deno.realPathSync(getDirectory());

// https://deno.land/x/dir@v1.2.0/cache_dir/mod.ts
export function cacheDir(): string | null {
  switch (Deno.build.os) {
    case "linux": {
      const xdg = Deno.env.get("XDG_CACHE_HOME");
      if (xdg) return xdg;
      const home = Deno.env.get("HOME");
      if (home) return `${home}/.cache`;
      break;
    }
    case "darwin": {
      const home = Deno.env.get("HOME");
      if (home) return `${home}/Library/Caches`;
      break;
    }
    case "windows":
      return Deno.env.get("LOCALAPPDATA") ?? null;
  }
  return null;
}
