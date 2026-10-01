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

  let satisfiedGroups = 0;
  for (const group of keywordGroups) {
    let groupSatisfied = false;
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
          break;
        }
      } else {
        // Multi-word keyword phrase check
        const phraseNorm = altTokens.join(' ');
        if (normalizedTranscript.includes(phraseNorm)) {
          groupSatisfied = true;
          break;
        }
      }
    }
    if (groupSatisfied) {
      satisfiedGroups++;
    }
  }

  const matchRatio = satisfiedGroups / keywordGroups.length;

  // Check self-correction markers
  const hasSelfCorrection = selfCorrectionMarkers.some(marker => 
    rawTranscript.toLowerCase().includes(marker.toLowerCase())
  );

  // Check length ratio against model answer
  const modelAnswerTokens = tokenize(context.item?.modelAnswer || '');
  const isPadded = modelAnswerTokens.length > 0 && 
    (studentTokens.length > modelAnswerTokens.length * maxLengthRatio);

  // 3. Assign marks according to rubric criteria
  if (matchRatio === 1.0) {
    if (!hasSelfCorrection && !isPadded) {
      return { marks: 4 }; // Exemplary: exact entity, direct, no extra narrative
    }
    return { marks: 3 }; // Proficient: correct entity but padded or self-corrected
  } else if (matchRatio > 0) {
    return { marks: 2 }; // Developing: partially accurate / subset of entities
  } else {
    return { marks: 1 }; // Minimal: primary entity missing / irrelevant tokens spoken
  }
}
