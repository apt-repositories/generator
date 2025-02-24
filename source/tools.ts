import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Package } from "apt-parser";

/**
 * Writes package metadata to a target directory.
 * @param targetDirectory - The directory to write to.
 * @param deb - The package information to persist.
 * @returns The result of the `writeFile` call.
 */
export const writePackageMetadata = (targetDirectory: string, deb: Package) =>
  writeFile(join(targetDirectory, `${deb.package}.json`), JSON.stringify(deb, undefined, "\t"));
