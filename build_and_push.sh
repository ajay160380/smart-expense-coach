#!/bin/bash
cd /Users/ajayvishwakarma/Desktop/expense_project/mobile_app

echo "Starting EAS Build..."
BUILD_JSON=$(npx eas-cli build -p android --profile preview --non-interactive --json)
echo "Build complete. Output:"
echo "$BUILD_JSON"

APK_URL=$(echo "$BUILD_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['artifacts']['buildUrl'])" 2>/dev/null)

if [ -z "$APK_URL" ] || [ "$APK_URL" = "None" ]; then
    echo "Failed to extract APK URL from build output."
    exit 1
fi

echo "APK URL: $APK_URL"

DEST="/Users/ajayvishwakarma/Desktop/expense_project/backend/tracker/static/downloads/ExpenseTracker.apk"
echo "Downloading APK to $DEST..."
curl -L -o "$DEST" "$APK_URL"

cd /Users/ajayvishwakarma/Desktop/expense_project
git add "$DEST"
git commit -m "Update ExpenseTracker.apk from latest Expo build"
git push origin main

echo "Done! APK built and website updated."
