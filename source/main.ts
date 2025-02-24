#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { retry } from "@oliversalzburg/js-utils/async/async.js";
import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { errorToString, unknownToError } from "@oliversalzburg/js-utils/errors/error-serializer.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/measurement/performance.js";
import { getPackagesRawXZ, parsePackages } from "./apt.js";
import { mergeToObservable } from "./observable.js";
import { repositories } from "./repositories.js";
import { writePackageMetadata } from "./tools.js";
import { Configuration } from "./types.js";

const BASE_ID_ONLY = process.env["BASE_ID_ONLY"];
const OBSERVE_ONLY = process.env["OBSERVE_ONLY"] ?? "" !== "";

const serializeConfiguration = () => {
  const tasks = new Array<Configuration>();
  for (const [id, repository] of Object.entries(repositories)) {
    if (!isNil(BASE_ID_ONLY) && id !== BASE_ID_ONLY) {
      continue;
    }

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
          rootRelease: release.includes("-") ? release.substring(0, release.indexOf("-")) : release,
          baseId: id.includes("-") ? id.substring(0, id.indexOf("-")) : id,
          repositoryId: id,
          root: repository.root,
          baseDir: repository.baseDir,
          targetRepository: repository.targetRepository,
        });
      }
    }
  }
  return tasks;
};

const toObservableTasks = (completedTasks: Array<Configuration>) => {
  const tasks = new Map<string, Array<Configuration>>();
  for (const task of completedTasks) {
    const key = `${task.targetRepository}/${task.baseId}/${task.rootRelease}/${task.component}`;
    if (!tasks.has(key)) {
      tasks.set(key, new Array<Configuration>());
    }

    mustExist(tasks.get(key)).push({
      architecture: "amd64",
      component: task.component,
      mirror: task.mirror,
      mirrorProtocol: task.mirrorProtocol,
      outputDirectory: task.outputDirectory,
      release: task.release,
      repositoryId: task.repositoryId,
      root: task.root,
      baseDir: task.baseDir,
      rootRelease: task.rootRelease,
      baseId: task.baseId,
      targetRepository: task.targetRepository,
    });
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

  const [, durationGenerate] = OBSERVE_ONLY
    ? [0, 0]
    : await measureAsync(() => Promise.all(Array(5).fill(tasks.entries()).map(runTask)));

  process.stderr.write(
    `Written '${formatCount(packageCount)}' package metadata files after ${formatMilliseconds(durationGenerate)}.\n`,
  );

  process.stderr.write(`Merging metadata files into observables...\n`);

  const mergeTasks = toObservableTasks(tasks);
  const [, durationMerge] = await measureAsync(() =>
    Promise.all(Array(2).fill(mergeTasks.entries()).map(mergeToObservable)),
  );

  process.stderr.write(
    `Observables successfully generated after ${formatMilliseconds(durationMerge)}.\n`,
  );
};

const entrypoint = async () => {
  const [, duration] = await measureAsync(() => main());
  process.stderr.write(`Completed successfully after ${formatMilliseconds(duration)}.\n`);
};

entrypoint().catch((maybeError: unknown) => {
  const error = unknownToError(maybeError);
  process.stderr.write(errorToString(error) + "\n");
  process.exit(1);
});
