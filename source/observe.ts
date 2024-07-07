#!/usr/bin/env node

import { assertExists, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/measurement/performance.js";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

const args = argv.slice(2).reduce<Record<string, Array<string>>>((args, arg) => {
  if (!arg.startsWith("--")) {
    return args;
  }

  const [label, value] = arg.split("=");
  assertExists(label);
  assertExists(value);
  args[label] = args[label] ?? [];
  mustExist(args[label]).push(value);

  return args;
}, {});

const DEBIAN_COMPONENT = process.env.DEBIAN_COMPONENT ?? args["--component"]?.[0] ?? "main";
const DEBIAN_OBSERVABLES =
  process.env.DEBIAN_OBSERVABLES?.split("\n").filter(Boolean) ?? args["--observable"] ?? [];
const INPUT_DIRECTORY = process.env.INPUT_DIRECTORY ?? args["--input"]?.[0] ?? process.cwd();
const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? args["--output"]?.[0] ?? process.cwd();

const main = async () => {
  if (DEBIAN_OBSERVABLES.length <= 0) {
    process.stderr.write(`No 'DEBIAN_OBSERVABLES' provided. Nothing to do.\n`);
    return;
  }

  process.chdir(INPUT_DIRECTORY);

  process.stderr.write(
    `Merging '${formatCount(DEBIAN_OBSERVABLES.length)}' observables into '${OUTPUT_DIRECTORY}'...\n`,
  );

  const [, duration] = await measureAsync(async () => {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });

    // Maps packages to versions to file locations.
    const debCatalog = new Map<string, Map<string, string>>();

    for (const observable of DEBIAN_OBSERVABLES) {
      process.stderr.write(`Processing '${observable}'...\n`);

      const observedPathDebs = join("apt", observable, DEBIAN_COMPONENT);
      if (!existsSync(observedPathDebs)) {
        process.stderr.write(
          `  Observable '${observable}', expected at '${observedPathDebs}', was not found. Continuing...\n`,
        );
        continue;
      }

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

      for (const deb of debs) {
        const observedPathDeb = join(observedPathDebs, deb);
        if (deb === ".gitkeep") {
          process.stderr.write(`  Ignoring '${observedPathDeb}'.\n`);
          continue;
        }

        const catalogEntry = debCatalog.get(deb) ?? new Map<string, string>();
        debCatalog.set(deb, catalogEntry);

        const content = await readFile(observedPathDeb, "utf-8");
        const { version: contentVersion } = JSON.parse(content) as { version: string };
        catalogEntry.set(contentVersion, observedPathDeb);
      }
    }

    process.stderr.write(
      `Writing '${formatCount(debCatalog.size)}' entries to '${OUTPUT_DIRECTORY}'...\n`,
    );
    let countSingles = 0;
    let countBundles = 0;
    for (const [deb, versions] of debCatalog.entries()) {
      const targetPath = join(OUTPUT_DIRECTORY, deb);
      const debContents = await Promise.all(
        [...versions.values()].map(version => readFile(version, "utf-8")),
      );
      const debBundle = `[${debContents.join(",")}]`;
      await writeFile(targetPath, debBundle);

      if (debContents.length === 1) {
        countSingles++;
      } else {
        countBundles++;
      }
    }
    process.stderr.write(
      `Catalog contained '${formatCount(countBundles)}' version bundles and '${formatCount(countSingles)}' single-version packages.\n`,
    );
  });

  process.stderr.write(`Done. (${formatMilliseconds(duration)})\n`);
};

main().catch((error: unknown) => {
  throw error;
});
