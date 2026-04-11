#!/bin/bash
# iOS setup script - run this if pod install times out
set -e
cd "$(dirname "$0")/.."

echo "Installing pods (this may take 10-20 min)..."
cd ios && pod install

echo "Done! Run: npm run ios"
