const getDirectory = () => {
  if (Deno.build.os === "windows") {
    return Deno.env.get("TMP") || Deno.env.get("TEMP") ||
      Deno.env.get("USERPROFILE") || Deno.env.get("SystemRoot") || "";
  }

  return "/tmp";
};
export const tempDirectory = Deno.realPathSync(getDirectory());
