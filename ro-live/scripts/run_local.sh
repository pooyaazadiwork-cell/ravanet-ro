#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../server"
echo "Ro local — http://127.0.0.1:${PORT:-8787}"
node server.mjs
