import { formatBytes } from "@oliversalzburg/js-utils/format/bytes.js";
import { formatCount } from "@oliversalzburg/js-utils/format/count.js";
import { Package } from "apt-parser";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { gunzipSync } from "node:zlib";
import { outdent } from "outdent";
import { request } from "undici";
import xz from "xz-decompress";
import { writePackageMetadata } from "./tools.js";

/**
 * Defines a source of a single Debian APT component.
 */
export interface DebianConfiguration {
  /**
   * The protocol through which we can reach the mirror.
   * @example https
   */
  mirrorProtocol: string;

  /**
   * The hostname of the mirror where we can fetch packages from.
   * @example deb.debian.org
   */
  mirror: string;

  /**
   * The release we're referring to. This is usually a codename of Debian release.
   * @example bookworm
   */
  release: string;

  /**
   * The root directory on the mirror.
   * @example debian
   */
  root: string;

  /**
   * The component we're referring to.
   * @example main
   */
  component: string;

  /**
   * The architecture we're referring to.
   * @example amd64
   */
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

/**
 * Download the latest metadata for the given configuration and write it to disk.
 * @param outputDirectory - The directory to write the new metadata to.
 * @param config - The configuration to process.
 */
export const debianMetadata = async (outputDirectory: string, config: DebianConfiguration) => {
  const debianMirrorUrl = new URL(
    `${config.mirrorProtocol}://${config.mirror}/${config.root}/dists/${config.release}/${config.component}`,
  );
  let packagesUrl = new URL(
    `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.xz`,
  );

  process.stderr.write(`  Processing '${packagesUrl.toString()}'...\n`);

  let packagesResponse = await request(packagesUrl, {
    headers: {
      accept: "*/*",
      "user-agent": "apt-repositories-generator/v0 (https://github.com/apt-repositories/generator)",
    },
  });

  let responsePayload: ArrayBuffer;
  let packagesText: string;

  if (packagesResponse.statusCode === 200) {
    responsePayload = await packagesResponse.body.arrayBuffer();
    process.stderr.write(
      `  HTTP ${packagesResponse.statusCode.toString()} response received. (${formatBytes(responsePayload.byteLength, { space: false })})\n`,
    );
    packagesText = await getPackagesTextFromXZ(responsePayload);
  } else if (packagesResponse.statusCode === 404) {
    packagesUrl = new URL(
      `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.gz`,
    );
    process.stderr.write(
      `  HTTP ${packagesResponse.statusCode.toString()} response received. Retrying with .gz fallback '${packagesUrl.toString()}'...\n`,
    );

    packagesResponse = await request(packagesUrl, {
      headers: {
        accept: "*/*",
        "user-agent":
          "apt-repositories-generator/v0 (https://github.com/apt-repositories/generator)",
      },
    });
    if (packagesResponse.statusCode !== 200) {
      throw new Error(
        `Received status ${packagesResponse.statusCode.toString()} response for fallback. Failed.`,
      );
    }

    responsePayload = await packagesResponse.body.arrayBuffer();
    process.stderr.write(
      `  HTTP ${packagesResponse.statusCode.toString()} response received. (${formatBytes(responsePayload.byteLength, { space: false })})\n`,
    );
    packagesText = getPackagesTextFromGZ(responsePayload);
  } else {
    throw new Error(`Received status ${packagesResponse.statusCode.toString()} response. Failed.`);
  }

  const cleanedData = packagesText
    .replaceAll(/\r\n|\r|\n/g, "\n")
    .replaceAll(/\0/g, "")
    .normalize()
    .trim();
  const packageChunks = cleanedData.split("\n\n");
  const packages = packageChunks
    .map(chunk => {
      if (chunk.includes("Connection: close")) {
        process.stderr.write(outdent`
          Received status 200 response from '${config.mirror}', but the response payload contained unexpected HTTP response fragments.
          This is potentially caused by an invalid CDN node cache entry, but requires further analysis.
          This problematic chunk will be ignored. Parsing continues with the next chunk.

          Response headers:
          ${Object.entries(packagesResponse.headers)
            .map(([name, value], _index) => `< ${name}: ${String(value)}`)
            .join("\n")}

          Chunks extracted from XZ/GZ response payload:
          ${packageChunks.join("\n---CHUNK---\n")}
          `);
        return false;
      }

      try {
        return chunk.trim().length > 0 ? new Package(chunk) : null;
      } catch (error) {
        process.stderr.write(`Error while parsing chunk: '${chunk}'`);
        throw error;
      }
    })
    .filter(Boolean) as Array<Package>;

  for (const deb of packages) {
    await writePackageMetadata(outputDirectory, deb);
  }

  process.stderr.write(
    `  Written '${formatCount(packages.length)}' package metadata files for component '${config.component}' to '${outputDirectory}'.\n`,
  );
};
