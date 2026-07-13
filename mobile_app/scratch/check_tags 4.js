const fs = require('fs');

const content = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');

// Quick and dirty tag counter
let stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Naive tag extraction: match <Tag and </Tag>
    // This is just a rough diagnostic script
    const openMatches = line.match(/<([A-Z][a-zA-Z0-9]*)\b[^>]*?(?<!\/)>/g);
    const closeMatches = line.match(/<\/([A-Z][a-zA-Z0-9]*)>/g);
    
    if (openMatches) {
        for (const match of openMatches) {
            // Ignore self-closing tags
            if (match.endsWith('/>')) continue;
            const tag = match.match(/<([A-Z][a-zA-Z0-9]*)/)[1];
            stack.push({ tag, line: i + 1 });
        }
    }
    
    if (closeMatches) {
        for (const match of closeMatches) {
            const tag = match.match(/<\/([A-Z][a-zA-Z0-9]*)/)[1];
            if (stack.length > 0 && stack[stack.length - 1].tag === tag) {
                stack.pop();
            } else {
                console.log(`Mismatched close tag: ${tag} on line ${i + 1}`);
                if (stack.length > 0) {
                    console.log(`Expected close tag for: ${stack[stack.length - 1].tag} (opened on line ${stack[stack.length - 1].line})`);
                }
                process.exit(1);
            }
        }
    }
}

console.log("Remaining open tags:", stack);
