import { Package } from "apt-parser";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export const writePackageMetadata = (targetDirectory: string, deb: Package) =>
  writeFile(join(targetDirectory, `${deb.package}.json`), JSON.stringify(deb));
