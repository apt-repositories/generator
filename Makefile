.PHONY: default build clean docs git-hook pretty lint test run

default: clean build

build: output

clean:
	rm --force --recursive apt node_modules output

docs:
	@echo "This project has no documentation."

git-hook:
	echo "make pretty" > .git/hooks/pre-commit

pretty: node_modules
	npm exec -- biome check --write --no-errors-on-unmatched
	npm pkg fix

lint: node_modules
	npm exec -- biome check .
	npm exec -- tsc --noEmit

test:
	@echo "This project has no tests."

run: build
	node ./output/main.js


node_modules:
	npm install

output: node_modules
	node build.js
