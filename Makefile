.PHONY: default build clean docs pretty lint test run

default: clean build

build: output

clean:
	rm -rf ./output

docs:
	@echo "This project has no documentation."

pretty:
	yarn biome check --write --no-errors-on-unmatched

lint:
	yarn biome check .
	yarn tsc --noEmit

test:
	@echo "This project has no tests."

run: clean build
	node ./output/main.js


node_modules:
	yarn install

output: node_modules
	node build.js
