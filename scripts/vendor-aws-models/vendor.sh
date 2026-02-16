#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_FILE="$SCRIPT_DIR/build/smithy/source/model/model.json"
DEST_FILE="$REPO_ROOT/vendor/aws-model.json"

if ! command -v smithy >/dev/null 2>&1; then
  echo "Error: required command 'smithy' was not found in PATH." >&2
  exit 1
fi

cd "$SCRIPT_DIR"
smithy build

cp "$SOURCE_FILE" "$DEST_FILE"
