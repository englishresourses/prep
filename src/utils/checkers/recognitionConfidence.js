import { tokenize } from '../normalize';

/**
 * Checker for Pronunciation & Articulatory Clarity
 * Supports confidence tiers (sorted descending) with backward compatibility for listening keys.
 */
export function recognitionConfidence(config = {}, context = {}) {
  const transcript = (context.transcript || '').trim();
  if (!transcript) {
    return { marks: 0 };
  }

  const tokens = tokenize(transcript);

  // Resolve confidence score
  let confidenceVal = 0.92; // Default for typing fallback or unmetered speech
  if (typeof context.confidence === 'number') {
    confidenceVal = context.confidence;
  } else if (Array.isArray(context.confidence) && context.confidence.length > 0) {
    const sum = context.confidence.reduce((a, b) => a + b, 0);
    confidenceVal = sum / context.confidence.length;
  }

  // Build confidence tiers
  let tiers = config.confidenceTiers;
  if (!tiers || tiers.length === 0) {
    const full = config.fullMarksMinConfidence !== undefined ? config.fullMarksMinConfidence : 0.85;
    const partial = config.partialMarksMinConfidence !== undefined ? config.partialMarksMinConfidence : 0.6;
    tiers = [
      { minConfidence: full, marks: 2.0 },
      { minConfidence: partial, marks: 1.0 },
      { minConfidence: 0.0, marks: 0.0 }
    ];
  }

  // Sort tiers by minConfidence descending
  const sortedTiers = [...tiers].sort((a, b) => b.minConfidence - a.minConfidence);
  let marks = 0;
  for (const tier of sortedTiers) {
    if (confidenceVal >= tier.minConfidence - 1e-9) {
      marks = tier.marks;
      break;
    }
  }

  // Brief fragments (< 3 words) that are not an exact single-word target answer cannot demonstrate sustained pronunciation
  const keywords = context.item?.keywords || [];
  const isExactSingleEntity = tokens.length === 1 && keywords.some(group =>
    group.some(alt => tokenize(alt).length === 1 && tokenize(alt)[0] === tokens[0])
  );
  if (!isExactSingleEntity && tokens.length < 3) {
    marks = Math.min(marks, 1.0);
  }

  marks = Math.max(0, marks);
  marks = Math.round(marks * 2) / 2;

  return { marks };
}
