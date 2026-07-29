for i in {1..40}; do
  OUTPUT=$(curl -s https://ajay160380-paisa-mitra.hf.space/api/trigger-test-push/)
  if echo "$OUTPUT" | grep -q "success"; then
    echo "Success! Response: $OUTPUT"
    break
  else
    echo "Response: $OUTPUT... waiting 10s"
    sleep 10
  fi
done
