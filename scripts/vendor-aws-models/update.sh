#!/usr/bin/env bash
# scripts/update-models.sh
# Pull latest changes for the services we track.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR/api-models-aws"
MODELS_VERSION_FILE="$SCRIPT_DIR/models-version.txt"

if [ ! -d "$MODELS_DIR/.git" ]; then
  echo "Models not set up yet. Run setup.sh first."
  exit 1
fi

cd "$MODELS_DIR"

BEFORE=$(git rev-parse HEAD)

git fetch origin main
AFTER=$(git rev-parse origin/main)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "Already up to date."
  exit 0
fi

git checkout "$AFTER"

echo ""
echo "Updated $BEFORE → $AFTER"
echo "Changed model files:"
git diff --name-only "$BEFORE" "$AFTER"

# Update the pinned version
echo "$AFTER" > "$MODELS_VERSION_FILE"
echo ""
echo "Updated models-version.txt — commit this to your repo."

"$SCRIPT_DIR/vendor.sh"
