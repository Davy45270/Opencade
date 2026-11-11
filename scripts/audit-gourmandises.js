import { validateCampaign } from './gourmandises-validation.js';

// Offline exhaustive campaign: all 240 levels, all five original seeds.
await validateCampaign(Array.from({ length: 240 }, (_, index) => index), { audit: true });
