import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";
import { retry } from "@oliversalzburg/js-utils/async/async.js";
import { isNil } from "@oliversalzburg/js-utils/data/nil.js";
import { errorToString, unknownToError } from "@oliversalzburg/js-utils/errors/error-serializer.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/measurement/performance.js";
import { getPackagesRawXZ, parsePackages } from "./apt.js";
import { repositories } from "./repositories.js";
import { writePackageMetadata } from "./tools.js";
import { Configuration } from "./types.js";

const serializeConfiguration = () => {
  const tasks = new Array<Configuration>();
  for (const [id, repository] of Object.entries(repositories)) {
    for (const release of repository.releases) {
      for (const component of repository.components) {
        if ((repository.excludedComponents?.[release] ?? []).includes(component)) {
          continue;
        }
        tasks.push({
          architecture: "amd64",
          component,
          mirror: repository.mirror,
          mirrorProtocol: repository.mirrorProtocol,
          outputDirectory: repository.outputDirectory,
          release,
          repositoryId: id,
          root: repository.root,
          targetRepository: repository.targetRepository,
        });
      }
    }
  }
  return tasks;
};

const main = async () => {
  process.stderr.write(`Generating tasks...\n`);
  const tasks = serializeConfiguration();

  process.stderr.write(`Generating metadata...\n`);
  let packageCount = 0;
  const runTask = async (taskIterator: ArrayIterator<[number, Configuration]>) => {
    for (const [_index, task] of taskIterator) {
      const [packagesText, headers] = await retry(() => getPackagesRawXZ(task), 10, 3);

      const outputDirectory = join(task.outputDirectory, task.root, task.release, task.component);

      // Even for empty components, we want to create the folder to produce a stable API.
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(join(outputDirectory, ".gitkeep"), "");

      let packageCountComponent = 0;
      for await (const repositoryPackage of parsePackages(packagesText, headers)) {
        if (repositoryPackage === null) {
          break;
        }

        await writePackageMetadata(outputDirectory, repositoryPackage);
        ++packageCount;
        ++packageCountComponent;
      }

      process.stderr.write(
        `  + Written '${formatCount(packageCountComponent)}' package metadata files for component '${task.root}/${task.release}/${task.component}' to '${outputDirectory}'.\n`,
      );
    }
  };

  const [, duration] = await measureAsync(() =>
    Promise.allSettled(Array(5).fill(tasks.entries()).map(runTask)),
  );

  process.stderr.write(
    `Written '${formatCount(packageCount)}' package metadata files after ${formatMilliseconds(duration)}.\n`,
  );
};

main().catch((maybeError: unknown) => {
  const error = unknownToError(maybeError);
  process.stderr.write(errorToString(error) + "\n");
  process.exit(1);
});
