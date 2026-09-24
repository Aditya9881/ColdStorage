#!/usr/bin/env node
/**
 * Batch-fix: Add inline insets.top override to all header style usages
 */
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

const fixes = [
  {
    file: 'app/book-storage.tsx',
    replacements: [
      {
        from: `<LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={styles.header}>`,
        to: `<LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={[styles.header, { paddingTop: insets.top + 12 }]}>`,
      },
    ],
  },
  {
    file: 'app/booking/[id].tsx',
    replacements: [
      {
        from: `<LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>`,
        to: `<LinearGradient colors={['#1B4332', '#2D6A4F']} style={[styles.header, { paddingTop: insets.top + 12 }]}>`,
      },
    ],
  },
  {
    file: 'app/owner-booking/weigh.tsx',
    replacements: [
      {
        from: `<LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>`,
        to: `<LinearGradient colors={['#4C1D95', '#7C3AED']} style={[styles.header, { paddingTop: insets.top + 12 }]}>`,
      },
    ],
  },
  {
    file: 'app/bookings.tsx',
    replacements: [
      {
        from: `<LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={styles.header}>`,
        to: `<LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={[styles.header, { paddingTop: insets.top + 12 }]}>`,
      },
    ],
  },
];

let count = 0;
for (const fix of fixes) {
  const filePath = path.join(BASE, fix.file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  SKIP: ${fix.file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const rep of fix.replacements) {
    if (content.includes(rep.from)) {
      content = content.replace(rep.from, rep.to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fix.file}`);
    count++;
  }
}
console.log(`\nFixed ${count} files`);
