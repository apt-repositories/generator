#!/usr/bin/env node

import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/performance.js";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

const DEBIAN_COMPONENT = process.env.DEBIAN_COMPONENT ?? "main";
const DEBIAN_OBSERVABLES = process.env.DEBIAN_OBSERVABLES?.split("\n").filter(Boolean) ?? [];
const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd();

const main = async () => {
  console.log(
    `Merging '${formatCount(DEBIAN_OBSERVABLES.length)}' observables into '${OUTPUT_DIRECTORY}'...`,
  );

  const [, duration] = await measureAsync(async () => {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });

    for (const observable of DEBIAN_OBSERVABLES) {
      console.log(`Processing '${observable}'...`);
      const observedPathDebs = join("apt", observable, DEBIAN_COMPONENT);

      console.log(`  Reading contents of '${observedPathDebs}'...`);
      const debs = await readdir(observedPathDebs).catch(() => []);

      if (debs.length === 0) {
        console.log(
          `  Component '${DEBIAN_COMPONENT}' of '${observable}' contains zero packages and is skipped.`,
        );
        continue;
      }

      console.log(
        `  Component '${DEBIAN_COMPONENT}' of '${observable}' contains '${formatCount(debs.length)}' packages.`,
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
