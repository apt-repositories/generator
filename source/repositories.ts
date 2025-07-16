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
  architectures: ["amd64"],
  baseDir: "debian",
  components: DebianComponents,
  emptyComponents: {
    "bookworm-updates": ["contrib", "non-free", "non-free-firmware"],
    "bullseye-updates": ["contrib", "non-free"],
    "buster-updates": ["contrib", "non-free", "main"],
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
  mirror: "deb.debian.org",
  mirrorProtocol: "http",
  outputDirectory: "apt",
  releases: DebianReleases,
  root: "debian",
  targetRepository: "apt-repositories/debian",
};

export const RepositoryDebianSecurity: UserConfiguration<DebianReleaseSecurity> = {
  architectures: ["amd64"],
  baseDir: "debian-security",
  components: DebianComponents,
  excludedComponents: {
    "bookworm-security": ["non-free"],
    "bullseye-security": ["non-free-firmware"],
    "trixie-security": ["contrib", "main", "non-free", "non-free-firmware"],
  },
  mirror: "security.debian.org",
  mirrorProtocol: "http",
  outputDirectory: "apt",
  releases: DebianReleasesSecurity,
  root: "debian",
  targetRepository: "apt-repositories/debian",
};

export const RepositoryUbuntu: UserConfiguration<UbuntuRelease> = {
  architectures: ["amd64"],
  baseDir: "ubuntu",
  components: UbuntuComponents,
  emptyComponents: {
    "bionic-backports": ["multiverse", "restricted"],
    "focal-backports": ["multiverse", "restricted"],
    "jammy-backports": ["multiverse", "restricted"],
    "noble-backports": ["main", "multiverse", "restricted"],
    "oracular-backports": ["main", "multiverse", "restricted"],
    "trusty-backports": ["restricted"],
    "xenial-backports": ["multiverse", "restricted"],
  },
  gzipComponents: {
    trusty: ["main", "multiverse", "restricted", "universe"],
    "trusty-backports": ["main", "multiverse", "restricted", "universe"],
    "trusty-security": ["main", "multiverse", "restricted", "universe"],
    "trusty-updates": ["main", "multiverse", "restricted", "universe"],
  },
  mirror: "archive.ubuntu.com",
  mirrorProtocol: "http",
  outputDirectory: "apt",
  releases: UbuntuReleases,
  root: "ubuntu",
  targetRepository: "apt-repositories/ubuntu",
};

export const repositories: Record<
  string,
  UserConfiguration<DebianRelease | DebianReleaseSecurity | UbuntuRelease>
> = {
  debian: RepositoryDebian,
  "debian-security": RepositoryDebianSecurity,
  ubuntu: RepositoryUbuntu,
};
