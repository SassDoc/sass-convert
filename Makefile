SHELL   := /bin/bash
PATH    := $(shell npm bin):$(PATH)

TO5_FLAGS := --loose all --optional selfContained

# ES6 to ES5 compilation
# ======================

dist:
	rm -rf $@
	6to5 $(TO5_FLAGS) lib --out-dir $@

develop:
	6to5-node $(TO5_FLAGS) $@

# Code quality
# ============

lint:
	eslint --reset ./lib

test: dist
	tape test/*.test.js | faucet

cover: dist
	rm -rf coverage
	istanbul cover --report none --print detail test/*.test.js

view-cover:
	istanbul report html
	open coverage/index.html

travis: cover
	istanbul report lcovonly
	(cat coverage/lcov.info | coveralls) || exit 0
	rm -rf coverage


# Release, publish
# ================

# "patch", "minor", "major", "prepatch",
# "preminor", "premajor", "prerelease"
VERS ?= "patch"

release: dist test
	npm version $(VERS) -m "Release %s"
	npm publish
	git push --follow-tags


# Tools
# =====

rebuild:
	rm -rf node_modules
	npm install


.PHONY: dist develop test
.SILENT: dist develop cover travis
