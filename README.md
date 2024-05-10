# APT Package Metadata

Provides APT package metadata for commonly used repositories as JSON-structured data.

For binary metadata, only `amd64` architecture is supported.

## Support

| Distribution | Version | Type         | Repository          |
| ------------ | ------- | ------------ | ------------------- |
| Debian       | 14      | unstable     | apt/debian/sid      |
| Debian       | 13      | testing      | apt/debian/trixie   |
| Debian       | 12      | stable       | apt/debian/bookworm |
| Debian       | 11      | oldstable    | apt/debian/bullseye |
| Debian       | 10      | oldoldstable | apt/debian/buster   |
| Ubuntu       | 24.10   |              | apt/ubuntu/oracular |
| Ubuntu       | 24.04   | LTS          | apt/ubuntu/noble    |
| Ubuntu       | 23.10   |              | apt/ubuntu/mantic   |
| Ubuntu       | 23.04   |              | apt/ubuntu/lunar    |
| Ubuntu       | 22.04   | LTS          | apt/ubuntu/jammy    |
| Ubuntu       | 20.04   | LTS          | apt/ubuntu/focal    |
| Ubuntu       | 18.04   | LTS          | apt/ubuntu/bionic   |
| Ubuntu       | 16.04   | LTS          | apt/ubuntu/xenial   |
| Ubuntu       | 14.04   | LTS          | apt/ubuntu/trusty   |

## Further reading

-   https://wiki.debian.org/SourcesList
-   https://wiki.debian.org/DebianRepository/Format
-   https://help.ubuntu.com/community/Repositories
