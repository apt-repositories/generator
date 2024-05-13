#!/usr/bin/env node

import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/performance.js";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { argv } from "node:process";

const DEBIAN_COMPONENT = process.env.DEBIAN_COMPONENT ?? "main";
const DEBIAN_OBSERVABLES = process.env.DEBIAN_OBSERVABLES?.split("\n").filter(Boolean) ?? [];
const OUTPUT_DIRECTORY = resolve(process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd());

const main = async () => {
  console.log(
    `Merging '${DEBIAN_OBSERVABLES.length.toString()}' observables into '${OUTPUT_DIRECTORY}'...`,
  );

  const [, duration] = await measureAsync(async () => {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });

    for (const observable of DEBIAN_OBSERVABLES) {
      console.log(`Processing '${observable}'...`);
      const observedPathDebs = resolve(join("apt", observable, DEBIAN_COMPONENT));

      console.log(`  Reading contents of '${observedPathDebs}'...`);
      const debs = await readdir(observedPathDebs).catch(() => []);

      console.log(
        `  Component '${DEBIAN_COMPONENT}' of '${observable}' has '${debs.length.toString()}' packages.`,
      );
      console.log(`  Merging '${observedPathDebs}' into '${OUTPUT_DIRECTORY}'...`);
      for (const deb of debs) {
        const observedPathDeb = join(observedPathDebs, deb);
        const targetPath = join(OUTPUT_DIRECTORY, deb);
        await rm(targetPath).catch(() => {
          /* ignored */
        });
        await cp(observedPathDeb, targetPath);
      }
      console.log(`  Component '${DEBIAN_COMPONENT}' of '${observable}' merged successfully.`);
    }
  });

  console.log(`Done. (${formatMilliseconds(duration)})`);
};

main().catch((error: unknown) => {
  throw error;
});
