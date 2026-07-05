#!/usr/bin/env node
/**
 * One-off: split shared/types/src/lib/api-types.ts into domain model files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'shared/types/src/lib/api-types.ts');
const lines = fs.readFileSync(sourcePath, 'utf8').split('\n');

/** @type {Array<[string, Array<[number, number]>]>} */
const SPLITS = [
  ['platform/contracts/src/index.ts', [[3, 56]]],
  ['core/product/src/model/legacy.types.ts', [[58, 220]]],
  ['platform/session/src/model/auth.types.ts', [[93, 192]]],
  ['core/analytics/src/model/types.ts', [[221, 382], [1835, 2023]]],
  ['core/reminders/src/model/types.ts', [[383, 480]]],
  ['core/user/src/model/shop.types.ts', [[481, 594]]],
  [
    'core/product/src/model/types.ts',
    [[595, 1333], [1403, 1630], [2180, 2214]],
  ],
  ['core/credit/src/model/types.ts', [[1335, 1401]]],
  ['core/user/src/model/party.types.ts', [[1631, 1834]]],
  ['core/plan/src/model/types.ts', [[2024, 2120]]],
  ['platform/shell/src/model/types.ts', [[2121, 2179], [3023, 3033]]],
  ['core/pricing/src/model/types.ts', [[2215, 2269]]],
  ['core/taxation/src/model/types.ts', [[2270, 2767]]],
  ['core/accounting/src/model/types.ts', [[2768, 3021]]],
];

const CONTRACTS_IMPORT =
  "import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';\n\n";

for (const [relPath, ranges] of SPLITS) {
  const chunks = ranges.map(([start, end]) =>
    lines.slice(start - 1, end).join('\n')
  );
  let body = chunks.join('\n\n');

  const needsContracts =
    relPath !== 'platform/contracts/src/index.ts' &&
    /\b(PaymentMethod|PaymentSplit|PaginatedResponse|ApiResponse|ApiError)\b/.test(
      body
    );

  if (needsContracts) {
    const used = [];
    if (/\bPaymentMethod\b/.test(body)) used.push('PaymentMethod');
    if (/\bPaymentSplit\b/.test(body)) used.push('PaymentSplit');
    if (/\bPaginatedResponse\b/.test(body)) used.push('PaginatedResponse');
    if (/\bApiResponse\b/.test(body)) used.push('ApiResponse');
    if (/\bApiError\b/.test(body)) used.push('ApiError');
    body = `import type { ${used.join(', ')} } from '@inventory-platform/contracts';\n\n${body}`;
  }

  const outPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body + '\n');
  console.log('wrote', relPath);
}
