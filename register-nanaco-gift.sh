#!/usr/bin/env bash
set -euo pipefail

# Thin wrapper for convenience on macOS/Linux.
# Required env vars:
#   - NANACO_PASSWORD or NANACO_CARD_NUMBER (exactly one)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/register-nanaco-gift.mjs" "$@"
