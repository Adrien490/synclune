#!/usr/bin/env node

/**
 * Validate HTML structure in React components
 * 
 * Detects invalid HTML patterns that cause hydration errors:
 * - <p> containing <Link>, <a>, <div>, <button>
 * 
 * Usage: node scripts/validate-html-structure.cjs
 * Returns: Exit code 1 if issues found, 0 if clean
 */

const fs = require('fs');
const path = require('path');

const issues = [];
const EXCLUDED_DIRS = ['node_modules', '.next', 'dist', 'build'];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // ONLY check for <p> containing block or interactive elements
    // This is the main cause of HierarchyRequestError
    if (line.includes('<p') && line.includes('className')) {
      for (let j = i; j < Math.min(i + 15, lines.length); j++) {
        const nextLine = lines[j];
        
        // Look for problematic elements inside <p>
        if (nextLine.includes('<Link') || nextLine.includes('<a ') || 
            nextLine.includes('<a>') ||
            nextLine.includes('<div') || nextLine.includes('<button')) {
          issues.push({
            file: filePath.replace(process.cwd() + '/', ''),
            line: lineNum,
            type: 'p-with-block-element',
            snippet: lines.slice(i, Math.min(i + 8, lines.length))
              .map((l, idx) => `${lineNum + idx}: ${l}`)
              .join('\n'),
            severity: 'error'
          });
          break;
        }
        
        // Stop if we find closing </p>
        if (nextLine.includes('</p>')) break;
      }
    }
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (EXCLUDED_DIRS.includes(entry.name)) continue;
    
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  }
}

// Run scan
console.log('🔍 Scanning for invalid HTML structures...\n');
scanDir(process.cwd());

if (issues.length === 0) {
  console.log('✅ No invalid HTML structures found!');
  console.log('All <p> tags are valid and do not contain block elements.\n');
  process.exit(0);
} else {
  console.error(`❌ Found ${issues.length} invalid HTML structure(s):\n`);
  
  issues.forEach((issue, idx) => {
    console.error(`${idx + 1}. ${issue.file}:${issue.line}`);
    console.error(`   Type: ${issue.type}`);
    console.error(`   ${issue.snippet}\n`);
  });
  
  console.error('💡 Fix: Replace <p> with <div> for text containing links.\n');
  process.exit(1);
}
