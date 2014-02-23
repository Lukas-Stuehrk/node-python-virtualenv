#!/bin/sh

# Get the python version, but only Major and Minor
VERSION=$(python -c 'import sys; print "%d.%d" % sys.version_info[:2]')
# Get the package's version.
PACKAGE_VERSION=$(python -c 'from json import load;print(load(open("package.json"))["version"])')

npm pack
npm install python-virtualenv-${PACKAGE_VERSION}.tgz
tests/test.js
ls "node_modules/python-virtualenv/env/lib/python"${VERSION}"/site-packages/"