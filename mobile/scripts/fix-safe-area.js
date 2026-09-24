#!/usr/bin/env node
/**
 * Batch-fix: Replace hardcoded Platform.OS paddingTop/height spacers 
 * with useSafeAreaInsets() in all mobile screens.
 * 
 * Strategy:
 * 1. For each file with hardcoded Platform padding:
 *    - Add `import { useSafeAreaInsets } from 'react-native-safe-area-context';` if not present
 *    - Add `const insets = useSafeAreaInsets();` in the component if not present
 *    - Replace inline spacer `{ height: Platform.OS === 'ios' ? XX : YY }` with `{ height: insets.top + 8 }`
 *    - Replace style paddingTop with inline override
 */
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

// Files and their fixes
const fixes = [
  // (tabs)/profile.tsx
  {
    file: 'app/(tabs)/profile.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "height: Platform.OS === 'ios' ? 58 : 34,", to: "height: insets.top + 8," },
      { from: "<View style={{ height: Platform.OS === 'ios' ? 112 : 42 }} />", to: "<View style={{ height: insets.top + 54 }} />" },
    ]
  },
  // (tabs)/marketplace.tsx
  {
    file: 'app/(tabs)/marketplace.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "height: Platform.OS === 'ios' ? 62 : 24,", to: "height: insets.top + 8," },
    ]
  },
  // notifications.tsx
  {
    file: 'app/notifications.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 58 : 22,", to: "paddingTop: 12, // overridden inline with insets" },
    ],
    styleOverride: { styleName: 'header', inlineReplace: true }
  },
  // bookings.tsx (shared)
  {
    file: 'app/bookings.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 58 : 22,", to: "paddingTop: 12," },
    ]
  },
  // booking/[id].tsx
  {
    file: 'app/booking/[id].tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16, paddingHorizontal: 20,", to: "paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20," },
    ]
  },
  // book-storage.tsx
  {
    file: 'app/book-storage.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 58 : 22,", to: "paddingTop: 12," },
    ]
  },
  // orders/[id].tsx
  {
    file: 'app/orders/[id].tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 56 : 38,", to: "paddingTop: 12," },
    ]
  },
  // orders/index.tsx
  {
    file: 'app/orders/index.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 54 : 34 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // owner-booking/weigh.tsx
  {
    file: 'app/owner-booking/weigh.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16, paddingHorizontal: 20,", to: "paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20," },
    ]
  },
  // (auth)/register.tsx
  {
    file: 'app/(auth)/register.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "scroll: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },", to: "scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }," },
    ]
  },
  // discover.tsx (standalone)
  {
    file: 'app/discover.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "paddingTop: Platform.OS === 'ios' ? 57 : 39,", to: "paddingTop: 12," },
    ]
  },
  // settings.tsx
  {
    file: 'app/settings.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "height: Platform.OS === 'ios' ? 58 : 34,", to: "height: insets.top + 8," },
    ]
  },
  // receipts/index.tsx
  {
    file: 'app/receipts/index.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 58 : 22 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // receipts/[id].tsx
  {
    file: 'app/receipts/[id].tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 58 : 22 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // invoices/index.tsx
  {
    file: 'app/invoices/index.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 58 : 22 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // invoices/[id].tsx
  {
    file: 'app/invoices/[id].tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 58 : 22 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // facility/[id].tsx
  {
    file: 'app/facility/[id].tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 48 : 20 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // market-prices/index.tsx
  {
    file: 'app/market-prices/index.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "height: Platform.OS === 'ios' ? 62 : 24,", to: "height: insets.top + 8," },
    ]
  },
  // (buyer)/index.tsx
  {
    file: 'app/(buyer)/index.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 50 : 30 }} />", to: "<View style={{ height: insets.top + 8 }} />", all: true },
    ]
  },
  // (buyer)/watchlist.tsx
  {
    file: 'app/(buyer)/watchlist.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 48 : 20 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // (buyer)/profile.tsx
  {
    file: 'app/(buyer)/profile.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 48 : 20 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // (buyer)/orders.tsx
  {
    file: 'app/(buyer)/orders.tsx',
    importAfter: "} from 'react-native';",
    importLine: "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    hookPattern: /export default function \w+\(\)\s*\{/,
    hookInsert: '\n  const insets = useSafeAreaInsets();',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 48 : 20 }} />", to: "<View style={{ height: insets.top + 8 }} />" },
    ]
  },
  // (tabs)/index.tsx — remaining scroll spacer
  {
    file: 'app/(tabs)/index.tsx',
    replacements: [
      { from: "<View style={{ height: Platform.OS === 'ios' ? 112 : 90 }} />", to: "<View style={{ height: insets.top + 54 }} />" },
    ]
  },
];

let successCount = 0;
let failCount = 0;

for (const fix of fixes) {
  const filePath = path.join(BASE, fix.file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  SKIP (not found): ${fix.file}`);
    failCount++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import if needed
  if (fix.importLine && !content.includes('useSafeAreaInsets')) {
    const idx = content.indexOf(fix.importAfter);
    if (idx !== -1) {
      const insertPos = idx + fix.importAfter.length;
      content = content.slice(0, insertPos) + '\n' + fix.importLine + content.slice(insertPos);
      changed = true;
    }
  }

  // Add hook if needed
  if (fix.hookPattern && fix.hookInsert && !content.includes('useSafeAreaInsets()')) {
    const match = content.match(fix.hookPattern);
    if (match) {
      const insertPos = match.index + match[0].length;
      content = content.slice(0, insertPos) + fix.hookInsert + content.slice(insertPos);
      changed = true;
    }
  }

  // Apply replacements
  for (const rep of fix.replacements) {
    if (rep.all) {
      while (content.includes(rep.from)) {
        content = content.replace(rep.from, rep.to);
        changed = true;
      }
    } else if (content.includes(rep.from)) {
      content = content.replace(rep.from, rep.to);
      changed = true;
    } else {
      console.log(`⚠️  Pattern not found in ${fix.file}: "${rep.from.substring(0, 50)}..."`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${fix.file}`);
    successCount++;
  } else {
    console.log(`— No changes: ${fix.file}`);
  }
}

console.log(`\nDone: ${successCount} files fixed, ${failCount} skipped`);
