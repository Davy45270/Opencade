import { validateCampaign } from './gourmandises-validation.js';

// Offline exhaustive campaign: all 180 levels, all five original seeds.
await validateCampaign(Array.from({ length: 180 }, (_, index) => index), { audit: true });
