// Owner direction effective 2026-10-08; platform-native labels are separate.
const generationCredit = /\b(?:AI|artificial intelligence)[\s\p{Pd}_]*(?:assisted|generated|created|produced)\b|\b(?:generated|created|produced|made|illustrated|drawn|rendered)\s+(?:by|with|using)\s+(?:AI|artificial intelligence)\b/iu;

export const hasGenerationCredit = text => typeof text === "string" && generationCredit.test(text);
