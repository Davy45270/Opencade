import { test } from 'vitest';
import { checkSignatureIdentity, checkSignatureMechanics, signatureBalance, checkSignatureCampaign, signatureIds, checkSignatureBoundaries } from './essaim-signature-checks';
test('S-essaim-01 identité et charge',checkSignatureIdentity);
test('S-essaim-02 cinq mécaniques exactes',checkSignatureMechanics);
test('S-essaim-02 frontières',checkSignatureBoundaries);
test('S-essaim-03 budget sur trois formations',()=>{ signatureBalance(); });
for (const id of signatureIds) for (const level of [0,9,19,29]) test(`S-essaim-04 ${id} niveau ${String(level+1)}`,()=>{ checkSignatureCampaign([id],[level]); });
