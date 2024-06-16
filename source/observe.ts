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
  process.stderr.write(
    `Merging '${formatCount(DEBIAN_OBSERVABLES.length)}' observables into '${OUTPUT_DIRECTORY}'...\n`,
  );

  const [, duration] = await measureAsync(async () => {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });

    for (const observable of DEBIAN_OBSERVABLES) {
      process.stderr.write(`Processing '${observable}'...\n`);
      const observedPathDebs = join("apt", observable, DEBIAN_COMPONENT);

      process.stderr.write(`  Reading contents of '${observedPathDebs}'...\n`);
      const debs = await readdir(observedPathDebs).catch(() => []);

      if (debs.length === 0) {
        process.stderr.write(
          `  Component '${DEBIAN_COMPONENT}' of '${observable}' contains zero packages and is skipped.\n`,
        );
        continue;
      }

      process.stderr.write(
        `  Component '${DEBIAN_COMPONENT}' of '${observable}' contains '${formatCount(debs.length)}' packages.\n`,
      );
      process.stderr.write(`  Merging '${observedPathDebs}' into '${OUTPUT_DIRECTORY}'...\n`);
      for (const deb of debs) {
        const observedPathDeb = join(observedPathDebs, deb);
        const targetPath = join(OUTPUT_DIRECTORY, deb);
        await rm(targetPath).catch(() => {
          /* ignored */
        });
        await cp(observedPathDeb, targetPath);
      }
      process.stderr.write(
        `  Component '${DEBIAN_COMPONENT}' of '${observable}' merged successfully.\n`,
      );
    }
  });

  process.stderr.write(`Done. (${formatMilliseconds(duration)})\n`);
};

main().catch((error: unknown) => {
  throw error;
});
