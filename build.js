import esbuild from "esbuild";

esbuild
  .build({
    bundle: true,
    entryPoints: ["./source/main.ts"],
    external: ["xz-decompress"],
    format: "esm",
    inject: ["source/cjs-shim.ts"],
    outdir: "./output",
    packages: "bundle",
    platform: "node",
    sourcemap: true,
    target: "node20",
  })
  .catch(process.stderr.write);
