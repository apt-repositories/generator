import esbuild from "esbuild";

esbuild
  .build({
    bundle: true,
    entryPoints: ["./source/generate.ts", "./source/observe.ts"],
    external: ["xz-decompress"],
    format: "esm",
    outdir: "./output",
    platform: "node",
    target: "node20",
  })
  .catch(console.error);
