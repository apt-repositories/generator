#!/usr/bin/env node

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

const DEBIAN_COMPONENT = process.env.DEBIAN_COMPONENT ?? "main";
const DEBIAN_OBSERVABLES = process.env.DEBIAN_OBSERVABLES?.split("\n").filter(Boolean) ?? [];
const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd();

const main = async () => {
  console.log(
    `Merging '${DEBIAN_OBSERVABLES.length.toString()}' observables into '${OUTPUT_DIRECTORY}'...`,
  );

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  for (const observables of DEBIAN_OBSERVABLES) {
    const observedPathComponent = join("apt", observables);
    const observedPathDebs = join(observedPathComponent, DEBIAN_COMPONENT);
    const debs = await readdir(observedPathDebs).catch(() => []);
    console.log(
      `Component '${DEBIAN_COMPONENT}' of '${observables}' has '${debs.length.toString()}' packages.`,
    );
    for (const deb of debs) {
      const observedPathDeb = join(observedPathDebs, deb);
      const targetPath = join(OUTPUT_DIRECTORY, deb);
      await rm(targetPath).catch(() => {
        /* ignored */
      });
      await cp(observedPathDeb, targetPath);
    }
    console.log(`Component '${DEBIAN_COMPONENT}' of '${observables}' merged successfully.`);
  }

  console.log("Done");
};

main().catch((error: unknown) => {
  throw error;
});
