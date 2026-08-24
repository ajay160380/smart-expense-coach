while true; do
  OUTPUT=$(curl -s https://smart-expense-coach.onrender.com/api/trigger-test-push/)
  if echo "$OUTPUT" | grep -q "success"; then
    echo "Success! Response: $OUTPUT"
    break
  else
    echo "Response: $OUTPUT... waiting 10s"
    sleep 10
  fi
done
