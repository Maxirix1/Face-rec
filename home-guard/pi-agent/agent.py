#!/usr/bin/env python3
"""Minimal Pi agent: send unknown-person alerts to VPS home-guard.

Face matching can call into your existing face profiles later.
For now this posts a manual/test alert and can be wired to OpenCV/face-api.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import urllib.request


def post_alert(base_url: str, token: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/alerts",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Home Guard Pi alert agent")
    parser.add_argument("--url", default=os.environ.get("GUARD_URL", "https://guard.effecttier.com"))
    parser.add_argument("--token", default=os.environ.get("PI_TOKEN", ""))
    parser.add_argument("--label", default="คนแปลกหน้า")
    parser.add_argument("--message", default="ตรวจพบบุคคลที่ไม่ใช่คนในบ้าน")
    parser.add_argument("--snapshot", default="", help="path to jpg/png snapshot")
    args = parser.parse_args()
    if not args.token:
        raise SystemExit("Set PI_TOKEN or pass --token")

    payload = {
        "type": "unknown",
        "label": args.label,
        "message": args.message,
        "streamPath": "cam1",
    }
    if args.snapshot:
        with open(args.snapshot, "rb") as f:
            raw = f.read()
        mime = "image/png" if args.snapshot.lower().endswith(".png") else "image/jpeg"
        payload["snapshotBase64"] = f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")

    result = post_alert(args.url, args.token, payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
