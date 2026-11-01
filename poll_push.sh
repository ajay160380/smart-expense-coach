#!/bin/bash
# poll_push.sh: Polls for push notification trigger with bounded retries and secret auth.
set -e

MAX_RETRIES=5
COUNT=0
URL="${DJANGO_URL:-https://expense-coach-prxm.onrender.com}/api/send-admin-push/"
SECRET="${ADMIN_PUSH_SECRET:-}"

echo "Starting push poll with max $MAX_RETRIES attempts..."

while [ $COUNT -lt $MAX_RETRIES ]; do
  COUNT=$((COUNT + 1))
  echo "Attempt $COUNT of $MAX_RETRIES..."
  
  OUTPUT=$(curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "X-Internal-Secret: $SECRET" \
    -d "{\"secret\": \"$SECRET\", \"title\": \"Health Check\", \"body\": \"Automated check\"}") || true
    
  if echo "$OUTPUT" | grep -q '"status":"success"'; then
    echo "Push notification triggered successfully: $OUTPUT"
    exit 0
  else
    echo "Response: $OUTPUT... waiting 10s"
    sleep 10
  fi
done

echo "Exceeded max retries ($MAX_RETRIES). Exiting cleanly."
exit 0
