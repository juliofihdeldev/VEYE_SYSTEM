#!/bin/bash
# Sign embedded frameworks (fixes "No code signature found" on device install).
# For Release: also strip bitcode (App Store rejects bitcode).
set -e

FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FULL_PRODUCT_NAME}/Frameworks"
[ ! -d "$FRAMEWORKS_DIR" ] && exit 0

# Use EXPANDED_CODE_SIGN_IDENTITY or fallback to CODE_SIGN_IDENTITY
IDENTITY="${EXPANDED_CODE_SIGN_IDENTITY:-$CODE_SIGN_IDENTITY}"
[ -z "$IDENTITY" ] || [ "$IDENTITY" = "-" ] && exit 0

find "$FRAMEWORKS_DIR" -type d -name "*.framework" | while read -r framework; do
  binary_name=$(basename "$framework" .framework)
  binary_path="$framework/$binary_name"
  [ ! -f "$binary_path" ] && continue

  # Strip bitcode only for Release (App Store rejects it)
  if [ "${CONFIGURATION}" = "Release" ]; then
    xcrun bitcode_strip -r "$binary_path" -o "$binary_path" 2>/dev/null || true
  fi

  # Re-sign (required for device install; stripping invalidates signature)
  codesign --force --sign "$IDENTITY" "$framework"
done
