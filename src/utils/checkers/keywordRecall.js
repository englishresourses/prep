import { normalizeText, tokenize } from '../normalize';
import { isFuzzyMatch } from '../fuzzy';

/**
 * Checker for Comprehension & Entity Recall
 * Evaluates keyword group satisfaction, self-correction, length ratio, and no-response markers.
 */
export function keywordRecall(config, context) {
  const {
    maxLengthRatio = 2.5,
    fuzzyMaxDistance = 1,
    fuzzyMinWordLength = 5,
    noResponsePhrases = [],
    selfCorrectionMarkers = []
  } = config || {};

  const rawTranscript = context.transcript || '';
  const normalizedTranscript = normalizeText(rawTranscript);
  const studentTokens = tokenize(rawTranscript);

  // 1. Check for silence or explicit no-response phrases
  if (studentTokens.length === 0) {
    return { marks: 0 };
  }

  const isNoResponse = noResponsePhrases.some(phrase => 
    normalizedTranscript.includes(normalizeText(phrase))
  );
  if (isNoResponse) {
    return { marks: 0 };
  }

  // 2. Keyword Group matching
  const keywordGroups = context.item?.keywords || [];
  if (keywordGroups.length === 0) {
    return { marks: 4 };
  }

  // Collect reference vocabulary to detect foreign/confused words
  const referenceText = [
    context.item?.passage || '',
    context.item?.q || '',
    context.item?.modelAnswer || '',
    keywordGroups.flat().join(' ')
  ].join(' ');
  const referenceTokens = new Set(tokenize(referenceText));

  // Common functional words that don't constitute confused entities
  const commonStopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    'of', 'from', 'into', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'that', 'this', 'there', 'because', 'so',
    'today', 'every', 'when', 'what', 'why', 'where', 'how', 'yes', 'no'
  ]);

  let satisfiedGroups = 0;
  let fullySpecificGroups = 0;

  for (const group of keywordGroups) {
    if (!group || group.length === 0) continue;
    const primaryTokens = tokenize(group[0]);
    const primaryLen = primaryTokens.length;
    let groupSatisfied = false;
    let matchedSpecific = false;

    for (const alt of group) {
      const altTokens = tokenize(alt);
      if (altTokens.length === 0) continue;

      if (altTokens.length === 1) {
        // Single word keyword check
        const target = altTokens[0];
        const found = studentTokens.some(token => 
          isFuzzyMatch(token, target, fuzzyMaxDistance, fuzzyMinWordLength)
        );
        if (found) {
          groupSatisfied = true;
          // If primary was also 1 word, then matching this 1-word target is fully specific
          if (primaryLen <= 1) {
            matchedSpecific = true;
          }
          break;
        }
      } else {
        // Multi-word keyword phrase check
        const phraseNorm = altTokens.join(' ');
        if (normalizedTranscript.includes(phraseNorm)) {
          groupSatisfied = true;
          matchedSpecific = true;
          break;
        }
      }
    }

    if (groupSatisfied) {
      satisfiedGroups++;
      if (matchedSpecific) {
        fullySpecificGroups++;
      }
    }
  }

  const matchRatio = satisfiedGroups / keywordGroups.length;

  // Detect unmentioned / confused details (e.g. saying "tea powder" when passage was "organic green tea")
  let hasConfusedDetail = false;
  if (studentTokens.length > 0 && referenceTokens.size > 0) {
    const unmentionedTokens = studentTokens.filter(t => 
      !commonStopWords.has(t) && !referenceTokens.has(t)
    );
    // If student introduced unmentioned content words (like "powder"), flag as adjacent/confused detail
    if (unmentionedTokens.length > 0) {
      hasConfusedDetail = true;
    }
  }

  // Check self-correction markers
  const hasSelfCorrection = selfCorrectionMarkers.some(marker => 
    rawTranscript.toLowerCase().includes(marker.toLowerCase())
  );

  // Check length ratio against model answer
  const modelAnswerTokens = tokenize(context.item?.modelAnswer || '');
  const isPadded = modelAnswerTokens.length > 0 && 
    (studentTokens.length > modelAnswerTokens.length * maxLengthRatio);

  // 3. Assign marks according to rubric criteria
  // Band 4 (Exemplary): Exact target entity, direct answer, no extra narrative, no confused details
  // Band 3 (Proficient): Correct entity but partial specificity, padded with background, or self-corrected
  // Band 2 (Developing): Partially accurate / subset of entities / adjacent or confused detail (e.g. "tea powder")
  // Band 1 (Minimal): Primary entity missing / irrelevant tokens spoken
  if (matchRatio === 1.0) {
    if (hasConfusedDetail) {
      return { marks: 2 }; // Partially accurate; adjacent or confused detail
    }
    if (fullySpecificGroups === keywordGroups.length && !hasSelfCorrection && !isPadded) {
      return { marks: 4 }; // Exemplary: exact entity, direct, no extra narrative
    }
    return { marks: 3 }; // Proficient: correct entity but partial specificity, padded or self-corrected
  } else if (matchRatio > 0) {
    return { marks: 2 }; // Developing: subset of entities satisfied
  } else {
    return { marks: 1 }; // Minimal: primary entity missing / irrelevant tokens spoken
  }
}
