import { formatBytes } from "@oliversalzburg/js-utils/format/bytes.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { Package } from "apt-parser";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { gunzipSync } from "node:zlib";
import xz from "xz-decompress";
import { writePackageMetadata } from "./tools.js";

export interface DebianConfiguration {
  mirrorProtocol: string;
  mirror: string;
  release: string;
  root: string;
  component: string;
  architecture: string;
}

const getPackagesTextFromGZ = (packagesRaw: ArrayBuffer) => {
  const packagesDeflated = gunzipSync(packagesRaw);
  const packagesText = new TextDecoder().decode(packagesDeflated);
  return packagesText;
};

const getPackagesTextFromXZ = async (packagesRaw: ArrayBuffer) => {
  const packagesDeflated = await new Response(
    new xz.XzReadableStream(
      ReadableStream.from(Readable.from(Buffer.from(packagesRaw))),
    ) as ReadableStream,
  ).arrayBuffer();
  const packagesText = new TextDecoder().decode(packagesDeflated);
  return packagesText;
};

export const debianMetadata = async (outputDirectory: string, config: DebianConfiguration) => {
  const debianMirrorUrl = new URL(
    `${config.mirrorProtocol}://${config.mirror}/${config.root}/dists/${config.release}/${config.component}`,
  );
  let packagesUrl = new URL(
    `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.xz`,
  );

  console.log(`  Processing '${packagesUrl.toString()}'...`);

  let packagesResponse = await fetch(packagesUrl);
  let responsePayload: ArrayBuffer;
  let packagesText: string;
  if (packagesResponse.status === 200) {
    responsePayload = await packagesResponse.arrayBuffer();
    packagesText = await getPackagesTextFromXZ(responsePayload);
  } else if (packagesResponse.status === 404) {
    packagesUrl = new URL(
      `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.gz`,
    );
    console.warn(
      `  HTTP ${packagesResponse.status.toString()} response received. Retrying with .gz fallback '${packagesUrl.toString()}'...`,
    );

    packagesResponse = await fetch(packagesUrl);
    if (packagesResponse.status !== 200) {
      throw new Error(
        `Received status ${packagesResponse.status.toString()} response for fallback. Failed.`,
      );
    }

    responsePayload = await packagesResponse.arrayBuffer();
    packagesText = getPackagesTextFromGZ(responsePayload);
  } else {
    throw new Error(`Received status ${packagesResponse.status.toString()} response. Failed.`);
  }

  console.log(
    `  HTTP ${packagesResponse.status.toString()} response received. (${formatBytes(responsePayload.byteLength)})`,
  );

  const cleanedData = packagesText
    .replaceAll(/\r\n|\r|\n/g, "\n")
    .replaceAll(/\0/g, "")
    .normalize()
    .trim();
  const packageChunks = cleanedData.split("\n\n");
  const packages = packageChunks
    .map(chunk => {
      return chunk.trim().length > 0 ? new Package(chunk) : null;
    })
    .filter(Boolean) as Array<Package>;

  for (const deb of packages) {
    await writePackageMetadata(outputDirectory, deb);
  }

  console.log(
    `  Written '${formatCount(packages.length)}' package metadata files for component '${config.component}' to '${outputDirectory}'.`,
  );
};
