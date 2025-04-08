#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export const validateJsonRecursive = async (root: string): Promise<[boolean, number, number]> => {
  const files = await readdir(root);
  let hasFailed = false;
  let checkedBytes = 0;
  let checkedCount = 0;
  for (const file of files) {
    const path = join(root, file);

    if (file === ".gitkeep") {
      process.stderr.write(`  Ignoring '${path}'.\n`);
      checkedCount++;
      continue;
    }

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
