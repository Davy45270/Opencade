import process from 'node:process';
// Explicit offline search; --record updates replay inputs, --report updates the report.
process.argv.push('--measure');
await import('./validate-bombercade.js');
