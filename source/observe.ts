#!/usr/bin/env node

import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/performance.js";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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

    // Maps packages to versions to file locations.
    const debCatalog = new Map<string, Map<string, string>>();

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

      for (const deb of debs) {
        const catalogEntry = debCatalog.get(deb) ?? new Map<string, string>();
        debCatalog.set(deb, catalogEntry);

        const observedPathDeb = join(observedPathDebs, deb);
        const content = await readFile(observedPathDeb, "utf-8");
        const { version: contentVersion } = JSON.parse(content) as { version: string };
        catalogEntry.set(contentVersion, deb);
      }
    }

    process.stderr.write(
      `Writing '${formatCount(debCatalog.size)}' entries to '${OUTPUT_DIRECTORY}'...\n`,
    );
    for (const [deb, versions] of debCatalog.entries()) {
      const targetPath = join(OUTPUT_DIRECTORY, deb);
      const debContents = await Promise.all(
        [...versions.values()].map(version => readFile(version, "utf-8")),
      );
      const debBundle = `[${debContents.join(",")}]`;
      await writeFile(targetPath, debBundle);
    }
  });

  process.stderr.write(`Done. (${formatMilliseconds(duration)})\n`);
};

main().catch((error: unknown) => {
  throw error;
});
