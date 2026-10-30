/* global console */
import './ts-loader.js';
const checks = await import('../tests/essaim-signature-checks.ts');
checks.checkSignatureIdentity(); checks.checkSignatureMechanics(); checks.checkSignatureBoundaries();
console.log(checks.signatureBalance()); checks.checkSignatureCampaign();
console.log('S-essaim-01..04 signatures: OK');
