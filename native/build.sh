#!/bin/zsh
set -euo pipefail
ROOT="${0:A:h:h}"
APP="$ROOT/DesktopRoach.app"
mkdir -p "$APP/Contents/MacOS"
swiftc -O -parse-as-library -swift-version 5 -target arm64-apple-macosx13.0 \
  -framework AppKit -framework QuartzCore \
  "$ROOT/native/DesktopRoach.swift" -o "$APP/Contents/MacOS/DesktopRoach"
codesign --force --sign - "$APP"
