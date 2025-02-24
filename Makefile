.PHONY: default
default: clean build

.PHONY: build
build: output

.PHONY: run
run: clean build
	node ./output/main.js

.PHONY: clean
clean:
	yarn run clean

.PHONY: reset
reset: clean
	rm -rf /tmp/debian || true

/tmp/debian:
	cd /tmp && git clone https://github.com/apt-repositories/debian.git

output:
	yarn run build

observe: /tmp/debian output
	node --enable-source-maps output/observe.js \
		--component=main \
		--observable=debian/bookworm \
		--observable=debian/bookworm-updates \
		--observable=debian-security/bookworm-security \
		--input=/tmp/debian \
		--output=/tmp/debian/apt/debian-observable/bookworm/main

.PHONE: pretty
pretty:
	yarn biome check --write --no-errors-on-unmatched
