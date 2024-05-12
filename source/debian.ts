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

  console.log(`Processing '${packagesUrl.toString()}'...`);

  let packagesResponse = await fetch(packagesUrl);
  let packagesText: string;
  if (packagesResponse.status === 200) {
    packagesText = await getPackagesTextFromXZ(await packagesResponse.arrayBuffer());
  } else if (packagesResponse.status === 404) {
    packagesUrl = new URL(
      `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.gz`,
    );
    console.warn(
      `Received status 404 response. Retrying with .gz fallback '${packagesUrl.toString()}'...`,
    );

    packagesResponse = await fetch(packagesUrl);
    if (packagesResponse.status !== 200) {
      throw new Error(
        `Received status ${packagesResponse.status.toString()} response for fallback. Failed.`,
      );
    }

    packagesText = getPackagesTextFromGZ(await packagesResponse.arrayBuffer());
  } else {
    throw new Error(`Received status ${packagesResponse.status.toString()} response. Failed.`);
  }

  console.log(`Successful response received. (${packagesText.length.toString()} bytes)`);

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
    `Written '${packages.length.toString()}' package metadata files for component '${config.component}'.`,
  );
};
