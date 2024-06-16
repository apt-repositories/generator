#!/usr/bin/env node

import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/performance.js";
import { mkdir } from "node:fs/promises";
import { argv } from "node:process";
import { debianMetadata } from "./debian.js";

const DEBIAN_MIRROR_PROTOCOL = process.env.DEBIAN_MIRROR_PROTOCOL ?? "http";
const DEBIAN_MIRROR = process.env.DEBIAN_MIRROR ?? "ftp.debian.org";
const DEBIAN_ROOT = process.env.DEBIAN_ROOT ?? "debian";
const DEBIAN_RELEASE = process.env.DEBIAN_RELEASE ?? "bookworm";
const DEBIAN_COMPONENT = process.env.DEBIAN_COMPONENT ?? "main";
const DEBIAN_ARCHITECTURE = process.env.DEBIAN_ARCHITECTURE ?? "amd64";
const OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd();

const main = async () => {
  process.stderr.write(`Generating metadata for '${DEBIAN_RELEASE}/${DEBIAN_COMPONENT}'...\n`);

  const [, duration] = await measureAsync(async () => {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    await debianMetadata(OUTPUT_DIRECTORY, {
      architecture: DEBIAN_ARCHITECTURE,
      component: DEBIAN_COMPONENT,
      mirror: DEBIAN_MIRROR,
      mirrorProtocol: DEBIAN_MIRROR_PROTOCOL,
      release: DEBIAN_RELEASE,
      root: DEBIAN_ROOT,
    });
  });

  process.stderr.write(`Done. (${formatMilliseconds(duration)})\n`);
};

main().catch((error: unknown) => {
  throw error;
});
