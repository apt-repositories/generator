import esbuild from "esbuild";

esbuild
  .build({
    bundle: true,
    entryPoints: [
      "./source/main.ts",
      "./source/make-observable-debian.ts",
      "./source/make-observable-ubuntu.ts",
    ],
    external: ["xz-decompress"],
    format: "esm",
    outdir: "./output",
    platform: "node",
    target: "node20",
  })
  .catch(console.error);
