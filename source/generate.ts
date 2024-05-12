#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { argv } from "node:process";
import { debianMetadata } from "./debian.js";

const DEBIAN_MIRROR_PROTOCOL = process.env.DEBIAN_MIRROR_PROTOCOL ?? "http";
const DEBIAN_MIRROR = process.env.DEBIAN_MIRROR ?? "ftp.debian.org";
const DEBIAN_ROOT = process.env.DEBIAN_ROOT ?? "debian";
const DEBIAN_RELEASE = process.env.DEBIAN_RELEASE ?? "bookworm";
const DEBIAN_COMPONENT = process.env.DEBIAN_COMPONENT ?? "main";
const DEBIAN_ARCHITECTURE = process.env.DEBIAN_ARCHITECTURE ?? "amd64";
const OUTPUT_DIRECTORY = resolve(process.env.OUTPUT_DIRECTORY ?? argv[2] ?? process.cwd());

const main = async () => {
  console.log(`Generating metadata for '${DEBIAN_RELEASE}/${DEBIAN_COMPONENT}'...`);

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  await debianMetadata(OUTPUT_DIRECTORY, {
    architecture: DEBIAN_ARCHITECTURE,
    component: DEBIAN_COMPONENT,
    mirror: DEBIAN_MIRROR,
    mirrorProtocol: DEBIAN_MIRROR_PROTOCOL,
    release: DEBIAN_RELEASE,
    root: DEBIAN_ROOT,
  });

  console.log("Done.");
};

main().catch((error: unknown) => {
  throw error;
});
