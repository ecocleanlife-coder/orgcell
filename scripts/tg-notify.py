#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Telegram notification helper for orgcell updates.
Usage: python scripts/tg-notify.py "message text"
"""
import sys
import os
import json
import urllib.request

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


def send(message: str) -> bool:
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    payload = json.dumps(
        {"chat_id": CHAT_ID, "text": message, "parse_mode": "HTML"},
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json; charset=utf-8"}
    )
    try:
        resp = urllib.request.urlopen(req)
        return resp.status == 200
    except Exception as e:
        print(f"Telegram send failed: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tg-notify.py 'message'", file=sys.stderr)
        sys.exit(1)
    msg = " ".join(sys.argv[1:])
    ok = send(msg)
    sys.exit(0 if ok else 1)
