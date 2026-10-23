#!/bin/bash
cd /Users/ajayvishwakarma/Desktop/expense_project/mobile_app

echo "Starting EAS Build (Production APK)..."
BUILD_JSON=$(npx eas-cli build -p android --profile production --non-interactive --json)
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

VIEWS_FILE="/Users/ajayvishwakarma/Desktop/expense_project/backend/tracker/views.py"
echo "Updating views.py LATEST_EXPO_APK_URL..."
python3 -c "
import re
with open('$VIEWS_FILE', 'r') as f:
    c = f.read()
c = re.sub(r'LATEST_EXPO_APK_URL\s*=\s*\"[^\"]+\"', f'LATEST_EXPO_APK_URL = \"$APK_URL\"', c)
with open('$VIEWS_FILE', 'w') as f:
    f.write(c)
"

cd /Users/ajayvishwakarma/Desktop/expense_project
git add "$DEST" "$VIEWS_FILE"
git commit -m "chore(release): update ExpenseTracker.apk and download redirect URL from latest Expo build"
git push origin main

echo "Done! APK built, views.py updated, and website/Render deployed."
