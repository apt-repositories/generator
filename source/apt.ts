import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { gunzipSync } from "node:zlib";
import { chunkify } from "@oliversalzburg/js-utils/data/array.js";
import { formatBytes } from "@oliversalzburg/js-utils/format/bytes.js";
import { Package } from "apt-parser";
import { outdent } from "outdent";
import { request } from "undici";
import { IncomingHttpHeaders } from "undici/types/header.js";
import xz from "xz-decompress";
import { MirrorConfiguration } from "./types.js";

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

export const getPackagesRawXZ = async (
  config: MirrorConfiguration,
): Promise<[string, IncomingHttpHeaders]> => {
  if (config.isGzip) {
    return getPackagesRawGZ(config);
  }

  const debianMirrorUrl = new URL(
    `${config.mirrorProtocol}://${config.mirror}/${config.baseDir}/dists/${config.release}/${config.component}`,
  );
  const packagesUrl = new URL(
    `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.xz`,
  );

  process.stderr.write(`  . Processing '${packagesUrl.toString()}'...\n`);

  const packagesResponse = await request(packagesUrl, {
    headers: {
      accept: "*/*",
      "user-agent": "apt-repositories-generator/v0 (https://github.com/apt-repositories/generator)",
    },
  });

  if (packagesResponse.statusCode === 200) {
    const responsePayload = await packagesResponse.body.arrayBuffer();
    // process.stderr.write(
    //   `  . Received HTTP ${packagesResponse.statusCode.toString()} response for '${packagesUrl}'. (${formatBytes(responsePayload.byteLength, { space: false })})\n`,
    // );
    return Promise.all([getPackagesTextFromXZ(responsePayload), packagesResponse.headers]).catch(
      error => {
        process.stderr.write(`  ! Response for '${packagesUrl}' failed to parse!\n`);
        process.stderr.write(outdent`
        Received HTTP 200 response from mirror, but the response payload could not be parsed as the expected file format.

        Response headers:
        ${Object.entries(packagesResponse.headers)
          .map(([name, value], _index) => `< ${name}: ${String(value)}`)
          .join("\n")}
        \n`);
        throw error;
      },
    );
  } else if (packagesResponse.statusCode === 404) {
    process.stderr.write(
      `  . Received HTTP ${packagesResponse.statusCode.toString()} response for '${packagesUrl}'. Retrying with .gz fallback...\n`,
    );
    process.stderr.write(
      outdent`
        ${outdent}
          !
          ! If it is reasonable to expect that this component will never be provided as a '.xz', mark the component as gzip in your configuration:
          !   gzipComponents: { "${config.release}": ["${config.component}"] }
          !` + "\n",
    );
    return getPackagesRawGZ(config);
  }

  throw new Error(
    `! Received HTTP ${packagesResponse.statusCode.toString()} response for '${packagesUrl}'. Failed.`,
  );
};

export const getPackagesRawGZ = async (
  config: MirrorConfiguration,
): Promise<[string, IncomingHttpHeaders]> => {
  const debianMirrorUrl = new URL(
    `${config.mirrorProtocol}://${config.mirror}/${config.baseDir}/dists/${config.release}/${config.component}`,
  );
  const packagesUrl = new URL(
    `${debianMirrorUrl.toString()}/binary-${config.architecture}/Packages.gz`,
  );

  process.stderr.write(`  . Processing '${packagesUrl.toString()}'...\n`);

  const packagesResponse = await request(packagesUrl, {
    headers: {
      accept: "*/*",
      "user-agent": "apt-repositories-generator/v0 (https://github.com/apt-repositories/generator)",
    },
  });

  if (packagesResponse.statusCode === 404) {
    process.stderr.write(
      outdent`
        ${outdent}
          !
          ! If it is reasonable to expect that this component will never be provided, mark the component as excluded in your configuration:
          !   excludedComponents: { "${config.release}": ["${config.component}"] }
          !` + "\n",
    );
    throw new Error(`! Received HTTP 404 response for '${packagesUrl}'. Failed.`);
  }

  if (packagesResponse.statusCode !== 200) {
    throw new Error(
      `! Received HTTP ${packagesResponse.statusCode?.toString()} response for '${packagesUrl}'. Failed.`,
    );
  }

  const responsePayload = await packagesResponse.body.arrayBuffer();
  process.stderr.write(
    `  . Received HTTP ${packagesResponse.statusCode.toString()} response for '${packagesUrl}'. (${formatBytes(responsePayload.byteLength, { space: false })})\n`,
  );
  const packagesText = getPackagesTextFromGZ(responsePayload);

  return [packagesText, packagesResponse.headers];
};

export const parsePackages = async function* (packagesRaw: string, headers: IncomingHttpHeaders) {
  const cleanedData = packagesRaw
    .replaceAll(/\r\n|\r|\n/g, "\n")
    .replaceAll(/\0/g, "")
    .normalize()
    .trim();

  const packageChunks = cleanedData.split("\n\n");

  for (const chunk of packageChunks) {
    if (chunk.includes("Connection: close")) {
      process.stderr.write(outdent`
        Received HTTP 200 response from mirror, but the response payload contained unexpected HTTP response fragments.
        This is potentially caused by an invalid CDN node cache entry, but requires further analysis.
        This problematic chunk will be ignored. Parsing continues with the next chunk.

        Response headers:
        ${Object.entries(headers)
          .map(([name, value], _index) => `< ${name}: ${String(value)}`)
          .join("\n")}

        Failed chunk from XZ/GZ response payload renders as:
        ${chunk}
        \n`);
      return false;
    }

    if (chunk.includes("Package: ") && !chunk.startsWith("Package: ")) {
      process.stderr.write(outdent`
        Found potentially unsafe chunk!

        Chunk renders as:
        ${chunk}

        Chunk hexdump:
        ${[
          ...chunkify(
            chunk.split("").map(char => char.charCodeAt(0).toString(16).padStart(2, "0")),
            16,
          ),
        ]
          .map(line => line.join(" "))
          .join("\n")}
        `);
    }

    try {
      yield chunk.trim().length > 0 ? new Package(chunk) : null;
    } catch (error) {
      process.stderr.write(`Error while parsing chunk: '${chunk}'`);
      throw error;
    }
  }
};
