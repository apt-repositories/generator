import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";
import { assertExists, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/measurement/performance.js";
import { Configuration } from "./types.js";

export const mergeToObservable = async (
  taskIterator: ArrayIterator<[string, Array<Configuration>]>,
) => {
  for (const [_index, task] of taskIterator) {
    let outputDirectory: string | undefined;
    let target: string | undefined;
    // Maps packages to versions to file locations.
    const debCatalog = new Map<string, Map<string, string>>();
    for (const release of task) {
      // All releases in this task are expected to share the same output directory.
      outputDirectory = join(
        release.outputDirectory,
        `${release.baseId}-observable`,
        release.rootRelease,
        release.component,
      );
      if (target === undefined) {
        target = `${release.baseId}/${release.rootRelease}/${release.component}`;
        process.stderr.write(`  ? ${target}: Generating catalog...\n`);
      }

      const observable = `${release.root}/${release.release}`;
      const observedPathDebs = join(release.outputDirectory, observable, release.component);

      const files = await readdir(observedPathDebs);
      const debs = files.filter(file => file !== ".gitkeep");

      if (debs.length === 0) {
        process.stderr.write(
          `    . ${target}: '${observable}/${release.component}' contains zero packages and is skipped.\n`,
        );
        continue;
      }

      process.stderr.write(
        `    . ${target}: '${observable}/${release.component}' contributes ${formatCount(debs.length)} packages.\n`,
      );

      for (const deb of debs) {
        const observedPathDeb = join(observedPathDebs, deb);
        if (deb === ".gitkeep") {
          continue;
        }

        const catalogEntry = debCatalog.get(deb) ?? new Map<string, string>();
        debCatalog.set(deb, catalogEntry);

        const content = await readFile(observedPathDeb, "utf-8");
        const { version: contentVersion } = JSON.parse(content) as { version: string };
        catalogEntry.set(contentVersion, observedPathDeb);
      }
    }

    if (outputDirectory === undefined) {
      throw new Error("No output directory found.");
      return;
    }

    await mkdir(outputDirectory, { recursive: true });

    let countSingles = 0;
    let countBundles = 0;
    for (const [deb, versions] of debCatalog.entries()) {
      const targetPath = join(outputDirectory, deb);
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
      `  ? ${target}: Complete. Catalog contained ${formatCount(countBundles)} version bundles and ${formatCount(countSingles)} single-version packages.\n`,
    );
  }
};
