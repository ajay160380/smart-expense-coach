#!/bin/bash
set -e

runtimes=("1.3.1" "1.3.2" "1.3.5")

for rv in "${runtimes[@]}"; do
  echo ">>> Publishing update for runtime: $rv"
  node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    app.expo.runtimeVersion = '$rv';
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
  "
  npx eas-cli update --branch production --environment production --message "multi-runtime live sync $rv" --non-interactive
done

# Finally leave app.json on 1.3.2
node -e "
  const fs = require('fs');
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  app.expo.runtimeVersion = '1.3.2';
  fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
"
echo ">>> All runtimes published successfully!"

