const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('src/screens/AIChatScreen.js', 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("No syntax errors found!");
} catch (e) {
  console.error("Syntax Error found at:", e.loc);
  console.error(e.message);
}
