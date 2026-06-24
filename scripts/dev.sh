#!/usr/bin/env bash
# Wrapper som sørger for at Next-dev kjører på Node 20 (krav: >=18.17).
# preview_start kjører fra Claudes miljø hvor default node er 18.15.
set -e

NODE_BIN="/Users/janni.frederiksen.kalafatis@schibsted.com/.nvm/versions/node/v20.20.0/bin"

if [ ! -x "$NODE_BIN/node" ]; then
  echo "Fant ikke Node 20 på $NODE_BIN — installer med: nvm install 20" >&2
  exit 1
fi

export PATH="$NODE_BIN:$PATH"
exec "$NODE_BIN/npm" run dev
