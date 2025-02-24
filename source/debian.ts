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
