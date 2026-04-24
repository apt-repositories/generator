.PHONY: default build clean docs git-hook pretty lint test run

default: clean build

build: ./output/main.js

clean:
	rm --force --recursive apt node_modules output

docs:
	@echo "This project has no documentation."

git-hook:
	echo "make pretty" > .git/hooks/pre-commit

pretty: node_modules/.package-lock.json
	npm exec -- biome check --write --no-errors-on-unmatched
	npm pkg fix

lint: node_modules/.package-lock.json
	npm exec -- biome check .
	npm exec -- tsc --noEmit

test:
	@echo "This project has no tests."

run: ./output/main.js
	node ./output/main.js


package-lock.json: package.json
node_modules/.package-lock.json: package-lock.json
	npm install

output/%.js &: node_modules/.package-lock.json
	node build.js
