export const DebianReleasesSecurity = [
  "bookworm-security",
  "bullseye-security",
  "trixie-security",
] as const;
export type DebianReleaseSecurity = (typeof DebianReleasesSecurity)[number];

export const DebianReleases = [
  "bookworm-updates",
  "bookworm",
  "bullseye-updates",
  "bullseye",
  "forky",
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
  "questioning-backports",
  "questioning-security",
  "questioning-updates",
  "questioning",
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

export interface UserConfiguration<
  TReleases extends DebianRelease | DebianReleaseSecurity | UbuntuRelease,
  TComponents extends DebianComponent | UbuntuComponent = TReleases extends UbuntuRelease
    ? UbuntuComponent
    : DebianComponent,
> {
  outputDirectory: string;
  targetRepository: string;
  mirror: string;
  mirrorProtocol: "http" | "https";
  root: string;
  baseDir: string;
  architectures: Array<"amd64">;
  releases: ReadonlyArray<TReleases>;
  components: ReadonlyArray<TComponents>;

  /**
   * Components that are known to contain 0 packages.
   * These components will not be requested from the mirror, but are still
   * created in the filesystem.
   */
  emptyComponents?: Partial<Record<TReleases, ReadonlyArray<TComponents>>>;

  /**
   * Components that don't exist for a release.
   * These components are entirely ignored and no filesystem entries for them
   * will be created.
   * @example non-free-firmware wasn't available before bookworm.
   */
  excludedComponents?: Partial<Record<TReleases, ReadonlyArray<TComponents>>>;

  gzipComponents?: Partial<Record<TReleases, ReadonlyArray<TComponents>>>;
}

export interface MirrorConfiguration {
  /**
   * The architecture we're referring to.
   * @example amd64
   */
  architecture: "amd64";
  /**
   * The root directory on the mirror.
   * @example debian
   */
  baseDir: string;
  /**
   * The component we're referring to.
   * @example main
   */
  component: DebianComponent | UbuntuComponent;
  isEmpty: boolean;
  isGzip: boolean;
  /**
   * The hostname of the mirror where we can fetch packages from.
   * @example deb.debian.org
   */
  mirror: string;
  /**
   * The protocol through which we can reach the mirror.
   * @example https
   */
  mirrorProtocol: "http" | "https";
  outputDirectory: string;
  /**
   * The release we're referring to.
   * @example bookworm-updates
   */
  release: DebianRelease | DebianReleaseSecurity | UbuntuRelease;
  repositoryId: string;
  /**
   * The name of the main distribution. If we target 'debian-security', the baseId is 'debian'.
   * @example debian
   */
  root: string;
  /**
   * The release we're referring to.  This is usually a codename of Debian release.
   * @example bookworm
   */
  rootRelease: string;
  targetRepository: string;
}
