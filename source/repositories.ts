import {
  DebianComponents,
  DebianReleases,
  DebianReleasesSecurity,
  UbuntuComponents,
  UbuntuReleases,
  UserConfiguration,
} from "./types.js";

export const repositories: Record<string, UserConfiguration> = {
  debian: {
    outputDirectory: "apt",
    targetRepository: "apt-repositories/debian",
    mirror: "deb.debian.org",
    mirrorProtocol: "http",
    root: "debian",
    baseDir: "debian",
    architectures: ["amd64"],
    releases: DebianReleases,
    components: DebianComponents,
    emptyComponents: {
      "trixie-backports": ["main"],
    },
    excludedComponents: {
      bullseye: ["non-free-firmware"],
      "bullseye-backports": ["non-free-firmware"],
      "bullseye-updates": ["non-free-firmware"],
      buster: ["non-free-firmware"],
      "buster-updates": ["non-free-firmware"],
    },
  },
  "debian-security": {
    outputDirectory: "apt",
    targetRepository: "apt-repositories/debian",
    mirror: "security.debian.org",
    mirrorProtocol: "http",
    root: "debian",
    baseDir: "debian-security",
    architectures: ["amd64"],
    releases: DebianReleasesSecurity,
    components: DebianComponents,
    excludedComponents: {
      "bullseye-security": ["non-free-firmware"],
    },
  },
  ubuntu: {
    outputDirectory: "apt",
    targetRepository: "apt-repositories/ubuntu",
    mirror: "archive.ubuntu.com",
    mirrorProtocol: "http",
    root: "ubuntu",
    baseDir: "ubuntu",
    architectures: ["amd64"],
    releases: UbuntuReleases,
    components: UbuntuComponents,
  },
};
