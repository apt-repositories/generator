export const DebianReleasesSecurity = [
  "bookworm-security",
  "bullseye-security",
  "trixie-security",
] as const;
export type DebianReleaseSecurity = (typeof DebianReleasesSecurity)[number];

export const DebianReleases = [
  "bookworm-backports",
  "bookworm-updates",
  "bookworm",
  "bullseye-backports",
  "bullseye-updates",
  "bullseye",
  "buster-updates",
  "buster",
  "sid",
  "trixie-backports",
  "trixie-updates",
  "trixie",
] as const;
export type DebianRelease = (typeof DebianReleases)[number];

export const DebianComponents = ["main", "contrib", "non-free", "non-free-firmware"] as const;
export type DebianComponent = (typeof DebianComponents)[number];

export const UbuntuReleases = [
  "bionic-backports",
  "bionic-security",
  "bionic-updates",
  "bionic",
  "focal-backports",
  "focal-security",
  "focal-updates",
  "focal",
  "jammy-backports",
  "jammy-security",
  "jammy-updates",
  "jammy",
  "noble-backports",
  "noble-security",
  "noble-updates",
  "noble",
  "oracular-backports",
  "oracular-security",
  "oracular-updates",
  "oracular",
  "trusty-backports",
  "trusty-security",
  "trusty-updates",
  "trusty",
  "xenial-backports",
  "xenial-security",
  "xenial-updates",
  "xenial",
] as const;
export type UbuntuRelease = (typeof UbuntuReleases)[number];

export const UbuntuComponents = ["main", "multiverse", "restricted", "universe"] as const;
export type UbuntuComponent = (typeof UbuntuComponents)[number];

export interface AptRepository {
  outputDirectory: string;
  targetRepository: string;
  mirror: string;
  mirrorProtocol: "http" | "https";
  root: string;
  baseDir: string;
  architectures: Array<"amd64">;
  releases: ReadonlyArray<DebianRelease | DebianReleaseSecurity | UbuntuRelease>;
  components: ReadonlyArray<DebianComponent | UbuntuComponent>;
  excludedComponents?: Partial<
    Record<
      DebianRelease | DebianReleaseSecurity | UbuntuRelease,
      ReadonlyArray<DebianComponent | UbuntuComponent>
    >
  >;
}

export interface Configuration {
  repositoryId: string;
  outputDirectory: string;
  targetRepository: string;
  mirror: string;
  mirrorProtocol: "http" | "https";
  root: string;
  baseDir: string;
  baseId: string;
  architecture: "amd64";
  rootRelease: string;
  release: DebianRelease | DebianReleaseSecurity | UbuntuRelease;
  component: DebianComponent | UbuntuComponent;
}
