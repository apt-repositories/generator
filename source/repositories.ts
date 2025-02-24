import {
  AptRepository,
  DebianComponents,
  DebianReleases,
  DebianReleasesSecurity,
  UbuntuComponents,
  UbuntuReleases,
} from "./types.js";

export const repositories: Record<string, AptRepository> = {
  debian: {
    outputDirectory: "/tmp/apt",
    targetRepository: "apt-repositories/debian",
    mirror: "deb.debian.org",
    mirrorProtocol: "http",
    root: "debian",
    baseDir: "debian",
    architectures: ["amd64"],
    releases: DebianReleases,
    components: DebianComponents,
    excludedComponents: {
      bullseye: ["non-free-firmware"],
      "bullseye-backports": ["non-free-firmware"],
      "bullseye-updates": ["non-free-firmware"],
      buster: ["non-free-firmware"],
      "buster-updates": ["non-free-firmware"],
    },
  },
  "debian-security": {
    outputDirectory: "/tmp/apt",
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
    outputDirectory: "/tmp/apt",
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
