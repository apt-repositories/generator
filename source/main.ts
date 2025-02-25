#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { retry } from "@oliversalzburg/js-utils/async/async.js";
import { isNil, mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { errorToString, unknownToError } from "@oliversalzburg/js-utils/errors/error-serializer.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";
import { measureAsync } from "@oliversalzburg/js-utils/measurement/performance.js";
import { outdent } from "outdent";
import { getPackagesRawXZ, parsePackages } from "./apt.js";
import { mergeToObservable } from "./observable.js";
import { repositories } from "./repositories.js";
import { writePackageMetadata } from "./tools.js";
import { MirrorConfiguration } from "./types.js";
import { validateJsonRecursive } from "./validate.js";

const BASE_ID_ONLY = process.env["BASE_ID_ONLY"];
const OBSERVE_ONLY = (process.env["OBSERVE_ONLY"] ?? "") !== "";
const VALIDATE_ONLY = (process.env["VALIDATE_ONLY"] ?? "") !== "";

const serializeConfiguration = () => {
  const tasks = new Array<MirrorConfiguration>();
  for (const [id, repository] of Object.entries(repositories)) {
    if (!isNil(BASE_ID_ONLY) && repository.root !== BASE_ID_ONLY) {
      continue;
    }

    for (const release of repository.releases) {
      for (const component of repository.components) {
        if ((repository.excludedComponents?.[release] ?? []).includes(component)) {
          continue;
        }

        const isEmpty = (repository.emptyComponents?.[release] ?? []).includes(component);

        tasks.push({
          architecture: "amd64",
          baseDir: repository.baseDir,
          component,
          isEmpty,
          mirror: repository.mirror,
          mirrorProtocol: repository.mirrorProtocol,
          outputDirectory: repository.outputDirectory,
          release,
          repositoryId: id,
          root: repository.root,
          rootRelease: release.includes("-") ? release.substring(0, release.indexOf("-")) : release,
          targetRepository: repository.targetRepository,
        });
      }
    }
  }
  return tasks;
};

const toObservableTasks = (completedTasks: Array<MirrorConfiguration>) => {
  const tasks = new Map<string, Array<MirrorConfiguration>>();
  for (const task of completedTasks) {
    const key = `${task.targetRepository}/${task.root}/${task.rootRelease}/${task.component}`;
    if (!tasks.has(key)) {
      tasks.set(key, new Array<MirrorConfiguration>());
    }

    mustExist(tasks.get(key)).push({
      architecture: "amd64",
      baseDir: task.baseDir,
      component: task.component,
      isEmpty: task.isEmpty,
      mirror: task.mirror,
      mirrorProtocol: task.mirrorProtocol,
      outputDirectory: task.outputDirectory,
      release: task.release,
      repositoryId: task.repositoryId,
      root: task.root,
      rootRelease: task.rootRelease,
      targetRepository: task.targetRepository,
    });
  }

  return tasks;
};

const validate = () => {
  for (const [, repository] of Object.entries(repositories)) {
    if (!isNil(BASE_ID_ONLY) && repository.root !== BASE_ID_ONLY) {
      continue;
    }
    return validateJsonRecursive(repository.outputDirectory);
  }
};

const main = async () => {
  if (VALIDATE_ONLY) {
    return validate();
  }

  process.stderr.write(`Generating tasks...\n`);
  const tasks = serializeConfiguration();

  process.stderr.write(`Generating metadata...\n`);
  let packageCount = 0;
  const runTask = async (taskIterator: ArrayIterator<[number, MirrorConfiguration]>) => {
    for (const [_index, task] of taskIterator) {
      const [packagesText, headers] = task.isEmpty
        ? ["", {}]
        : await retry(() => getPackagesRawXZ(task), 10, 3);

      const outputDirectory = join(task.outputDirectory, task.root, task.release, task.component);

      // Even for empty components, we want to create the folder to produce a stable API.
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(join(outputDirectory, ".gitkeep"), "");

      let packageCountComponent = 0;
      if (!task.isEmpty) {
        for await (const repositoryPackage of parsePackages(packagesText, headers)) {
          if (repositoryPackage === null) {
            break;
          }

          await writePackageMetadata(outputDirectory, repositoryPackage);
          ++packageCount;
          ++packageCountComponent;
        }
      }

      process.stderr.write(
        `  + Written ${formatCount(packageCountComponent)} package metadata files for component '${task.root}/${task.release}/${task.component}' to '${outputDirectory}'.\n`,
      );

      if (0 === packageCountComponent) {
        process.stderr.write(
          "\n" +
            outdent`
              ${outdent}
              ! If it is reasonable to expect that this component will never have any entries, mark the component as empty in your configuration:
              !   emptyComponents: { "${task.release}": ["${task.component}"] }` +
            "\n",
        );
      }
    }
  };

  const [, durationGenerate] = OBSERVE_ONLY
    ? [0, 0]
    : await measureAsync(() => Promise.all(Array(5).fill(tasks.entries()).map(runTask)));

  process.stderr.write(
    `Written ${formatCount(packageCount)} package metadata files after ${formatMilliseconds(durationGenerate)}.\n`,
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
