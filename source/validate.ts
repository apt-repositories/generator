#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd();

const validateJsonRecursive = async (root: string) => {
  const files = await readdir(root);
  let hasFailed = false;
  for (const file of files) {
    const path = join(root, file);
    const pathStat = await stat(path);
    if (pathStat.isDirectory()) {
      await validateJsonRecursive(path);
    } else {
      const content = await readFile(path);
      try {
        JSON.parse(content.toString());
      } catch (error) {
        console.error(`Failed to parse JSON file '${path}'`);
        hasFailed = true;
      }
    }
  }
  return hasFailed;
};

const main = async () => {
  const hasFailed = await validateJsonRecursive(OUTPUT_DIRECTORY);

  if (hasFailed) {
    throw new Error("Validation failed.");
  }

  console.log("Done.");
};

main().catch((error: unknown) => {
  throw error;
});
