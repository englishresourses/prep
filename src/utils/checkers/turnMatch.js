import { normalizeText, tokenize } from '../normalize';
import { isFuzzyMatch } from '../fuzzy';

/**
 * Checker for Pragmatic Appropriateness & Task Completion (Situational Dialog)
 * Evaluates target keyword coverage, response length ratio, and run-on / terse replies.
 */
export function turnMatch(config, context) {
  const {
    coverageTiers = [],
    fuzzyMaxDistance = 1,
    fuzzyMinWordLength = 5,
    minLengthRatio = 0.5,
    maxLengthRatio = 1.6,
    lengthPenalty = 0.5,
    terseCapMarks = 1.5,
    singleSentenceRequired = true
  } = config || {};

  const transcript = context.transcript || '';
  const studentTokens = tokenize(transcript);
  const normalizedTranscript = normalizeText(transcript);

  // 1. Silence or empty transcript -> 0
  if (studentTokens.length === 0) {
    return { marks: 0 };
  }

  const turn = context.turn || context.item || {};
  const targetResponse = turn.response || '';
  const keywords = turn.keywords || [];

  // 2. Keyword coverage
  let matchedKeywordsCount = 0;
  if (keywords.length > 0) {
    keywords.forEach((kw) => {
      const normKw = normalizeText(kw);
      const kwTokens = tokenize(normKw);

      if (kwTokens.length === 1) {
        const target = kwTokens[0];
        const found = studentTokens.some(t => 
          isFuzzyMatch(t, target, fuzzyMaxDistance, fuzzyMinWordLength)
        );
        if (found) matchedKeywordsCount++;
      } else if (kwTokens.length > 1) {
        if (normalizedTranscript.includes(normKw)) {
          matchedKeywordsCount++;
        }
      }
    });
  }

  const coverage = keywords.length > 0 
    ? (matchedKeywordsCount / keywords.length) 
    : 1.0;

  // 3. Match marks from coverageTiers (sorted by minCoverage descending)
  const sortedTiers = [...coverageTiers].sort((a, b) => b.minCoverage - a.minCoverage);
  let marks = 0;
  for (const tier of sortedTiers) {
    if (coverage >= tier.minCoverage - 1e-9) {
      marks = tier.marks;
      break;
    }
  }

  // 4. Length check against target response
  const responseTokens = tokenize(targetResponse);
  if (responseTokens.length > 0) {
    const ratio = studentTokens.length / responseTokens.length;

    // Terse cap
    if (ratio < minLengthRatio) {
      marks = Math.min(marks, terseCapMarks);
    }
    // Run-on penalty
    else if (ratio > maxLengthRatio) {
      marks -= lengthPenalty;
    }
  }

  // 5. Conjunction / Run-on sentence clause check
  if (singleSentenceRequired) {
    const lowerRaw = transcript.toLowerCase();
    const hasConjunctionRunOn = 
      lowerRaw.includes('and then') ||
      /\bso\s+(?:i|we|it|then)\b/i.test(lowerRaw) ||
      /[.!?]\s+[A-Za-z]/.test(transcript.trim()); // multiple sentence punctuation

    if (hasConjunctionRunOn) {
      marks -= lengthPenalty;
    }
  }

  // Never go below 0, round to nearest 0.5
  marks = Math.max(0, marks);
  marks = Math.round(marks * 2) / 2;

  return { marks };
}
