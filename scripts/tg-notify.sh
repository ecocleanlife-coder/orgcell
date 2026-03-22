#!/bin/bash
# Telegram notification wrapper — delegates to Python for UTF-8 support
# Usage: bash scripts/tg-notify.sh "message text"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/tg-notify.py" "$1" 2>/dev/null || python "$SCRIPT_DIR/tg-notify.py" "$1"
