#!/bin/sh

# Get the python version, but only Major and Minor
VERSION=$(python -c 'import sys; print "%d.%d" % sys.version_info[:2]')
echo ${VERSION}

npm pack
npm install python-virtualenv-0.0.1.tgz
tests/test.js
ls "node_modules/python-virtualenv/env/lib/python"${VERSION}"/site-packages/"