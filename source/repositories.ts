import {
  DebianComponents,
  DebianRelease,
  DebianReleaseSecurity,
  DebianReleases,
  DebianReleasesSecurity,
  UbuntuComponents,
  UbuntuRelease,
  UbuntuReleases,
  UserConfiguration,
} from "./types.js";

export const RepositoryDebian: UserConfiguration<DebianRelease> = {
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
    "bookworm-updates": ["contrib", "non-free", "non-free-firmware"],
    "bullseye-updates": ["contrib", "non-free"],
    "buster-updates": ["contrib", "non-free"],
    "trixie-backports": ["contrib", "main", "non-free", "non-free-firmware"],
    "trixie-updates": ["contrib", "main", "non-free", "non-free-firmware"],
  },
  excludedComponents: {
    bullseye: ["non-free-firmware"],
    "bullseye-backports": ["non-free-firmware"],
    "bullseye-updates": ["non-free-firmware"],
    buster: ["non-free-firmware"],
    "buster-updates": ["non-free-firmware"],
  },
};

export const RepositoryDebianSecurity: UserConfiguration<DebianReleaseSecurity> = {
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
    "bookworm-security": ["non-free"],
    "bullseye-security": ["non-free-firmware"],
    "trixie-security": ["contrib", "main", "non-free", "non-free-firmware"],
  },
};

export const RepositoryUbuntu: UserConfiguration<UbuntuRelease> = {
  outputDirectory: "apt",
  targetRepository: "apt-repositories/ubuntu",
  mirror: "archive.ubuntu.com",
  mirrorProtocol: "http",
  root: "ubuntu",
  baseDir: "ubuntu",
  architectures: ["amd64"],
  releases: UbuntuReleases,
  components: UbuntuComponents,
  emptyComponents: {
    "bionic-backports": ["multiverse", "restricted"],
    "focal-backports": ["multiverse", "restricted"],
    "jammy-backports": ["multiverse", "restricted"],
    "noble-backports": ["main", "multiverse", "restricted"],
    "oracular-backports": ["main", "multiverse", "restricted"],
  },
  gzipComponents: {
    "trusty-backports": ["main", "multiverse", "restricted", "universe"],
    "trusty-security": ["main", "multiverse", "restricted", "universe"],
    "trusty-updates": ["main", "multiverse", "restricted", "universe"],
    trusty: ["main", "multiverse", "restricted", "universe"],
  },
};

export const repositories: Record<
  string,
  UserConfiguration<DebianRelease | DebianReleaseSecurity | UbuntuRelease>
> = {
  debian: RepositoryDebian,
  "debian-security": RepositoryDebianSecurity,
  ubuntu: RepositoryUbuntu,
};
