#!/usr/bin/env node

import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/performance.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd();

const validateJsonRecursive = async (root: string): Promise<[boolean, number]> => {
  const files = await readdir(root);
  let hasFailed = false;
  let checkedCount = 0;
  for (const file of files) {
    const path = join(root, file);
    const pathStat = await stat(path);
    if (pathStat.isDirectory()) {
      const [subFailed, subCount] = await validateJsonRecursive(path);
      if (!hasFailed && subFailed) {
        hasFailed = true;
      }
      checkedCount += subCount;
      continue;
    }

    const content = await readFile(path);
    try {
      JSON.parse(content.toString());
    } catch (error) {
      console.error(`Failed to parse JSON file '${path}'`);
      hasFailed = true;
    }
    ++checkedCount;
  }

  return [hasFailed, checkedCount];
};

const main = async () => {
  console.log(`Validating all files in '${OUTPUT_DIRECTORY}' to be valid JSON...`);

  const [, duration] = await measureAsync(async () => {
    const [hasFailed, checkedCount] = await validateJsonRecursive(OUTPUT_DIRECTORY);

    console.log(`Checked '${checkedCount.toString()}' files in '${OUTPUT_DIRECTORY}'.`);

    if (hasFailed) {
      throw new Error("Validation failed.");
    }
  });

  console.log(`Done. (${formatMilliseconds(duration)})`);
};

main().catch((error: unknown) => {
  throw error;
});
