#!/usr/bin/env bash
# scripts/setup-models.sh
# Run once after cloning the repo to fetch AWS API model files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR/api-models-aws"
MODELS_VERSION_FILE="$SCRIPT_DIR/models-version.txt"
REPO_URL="https://github.com/aws/api-models-aws.git"

# The services we care about — edit this list as needed
SERVICES=(
  models/s3
)

if [ ! -d "$MODELS_DIR/.git" ]; then
  echo "Cloning api-models-aws (sparse, blobless)..."
  git clone --filter=blob:none --no-checkout --sparse "$REPO_URL" "$MODELS_DIR"
  PINNED_SHA=$(cat "$MODELS_VERSION_FILE")
  cd "$MODELS_DIR"
  git sparse-checkout init --cone
  git sparse-checkout set "${SERVICES[@]}"

  git checkout "$PINNED_SHA"

  "$SCRIPT_DIR/vendor.sh"
else
  echo "Already set up at $MODELS_DIR — run update.sh to pull latest."
fi
