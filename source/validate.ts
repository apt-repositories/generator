#!/usr/bin/env node

import { formatBytes } from "@oliversalzburg/js-utils/format/bytes.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/performance.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd();

const validateJsonRecursive = async (root: string): Promise<[boolean, number, number]> => {
  const files = await readdir(root);
  let hasFailed = false;
  let checkedBytes = 0;
  let checkedCount = 0;
  for (const file of files) {
    const path = join(root, file);
    const pathStat = await stat(path);
    if (pathStat.isDirectory()) {
      const [subFailed, subBytes, subCount] = await validateJsonRecursive(path);
      if (!hasFailed && subFailed) {
        hasFailed = true;
      }
      checkedBytes += subBytes;
      checkedCount += subCount;
      continue;
    }

    checkedBytes += pathStat.size;
    const content = await readFile(path, "utf-8");
    try {
      JSON.parse(content);
    } catch (_error) {
      process.stderr.write(`Failed to parse JSON file '${path}'\n`);
      hasFailed = true;
    }
    ++checkedCount;
  }

  return [hasFailed, checkedBytes, checkedCount];
};

const main = async () => {
  process.stderr.write(`Validating all files in '${OUTPUT_DIRECTORY}' to be valid JSON...\n`);

  const [, duration] = await measureAsync(async () => {
    const [hasFailed, checkedBytes, checkedCount] = await validateJsonRecursive(OUTPUT_DIRECTORY);

    process.stderr.write(
      `Checked '${formatCount(checkedCount)}' files totalling '${formatBytes(checkedBytes, { space: false })}' in '${OUTPUT_DIRECTORY}'.\n`,
    );

    if (hasFailed) {
      throw new Error("Validation failed.");
    }
  });

  process.stderr.write(`Done. (${formatMilliseconds(duration)})\n`);
};

main().catch((error: unknown) => {
  throw error;
});
