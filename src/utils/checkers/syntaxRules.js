import { tokenize, normalizeText } from '../normalize';

const COMMON_AUXILIARIES = ['am', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'would', 'will', 'can', 'could', 'do', 'does', 'did', 'should', 'must'];
const COMMON_ARTICLES = ['a', 'an', 'the'];
const COMMON_PREPOSITIONS = ['in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from', 'into', 'under', 'near', 'along', 'about', 'through'];

// Common tense pairs (present vs past/participle)
const TENSE_PAIRS = [
  ['bring', 'brought'],
  ['take', 'took'],
  ['reserve', 'reserved'],
  ['purchase', 'purchased'],
  ['see', 'saw'],
  ['stop', 'stopped'],
  ['restart', 'restarted'],
  ['come', 'came'],
  ['visit', 'visited'],
  ['arrive', 'arrived'],
  ['leave', 'left'],
  ['find', 'found'],
  ['like', 'liked']
];

/**
 * Checker for Syntactic Precision
 * Supports both Listening (pronoun shifts) and Dialog (reference sentence concord & auxiliary checks).
 */
export function syntaxRules(config, context) {
  const rawTranscript = context.transcript || '';
  const tokens = tokenize(rawTranscript);

  // No response or silence -> 0
  if (tokens.length === 0) {
    return { marks: 0 };
  }

  // -------------------------------------------------------------
  // DIALOG MODE (when startMarks is configured)
  // -------------------------------------------------------------
  if (config && config.startMarks !== undefined) {
    const {
      startMarks = 2.5,
      minorSlipDeduction = 0.5,
      minorSlipFloor = 1.5,
      structuralErrorCap = 1.0,
      fragmentCap = 0.5,
      minWordsForSentence = 4,
      pronounAgreementPairs = [["i", "we"], ["my", "our"], ["me", "us"]],
      checkTenseAgainstReference = true,
      checkArticlesAgainstReference = true,
      checkAuxiliariesAgainstReference = true
    } = config;

    // Check sentence fragment (fewer than minWordsForSentence words)
    if (tokens.length < minWordsForSentence) {
      return { marks: fragmentCap };
    }

    const turn = context.turn || context.item || {};
    const targetResponse = turn.response || '';
    const targetTokens = tokenize(targetResponse);

    let marks = startMarks;
    let minorSlipsCount = 0;

    // 1. Article mismatch vs reference (a/an/the missing, extra or swapped)
    if (checkArticlesAgainstReference && targetTokens.length > 0) {
      const targetArticles = targetTokens.filter(t => COMMON_ARTICLES.includes(t));
      const studentArticles = tokens.filter(t => COMMON_ARTICLES.includes(t));
      
      const articlesDiffer = 
        targetArticles.length !== studentArticles.length ||
        targetArticles.some((art, idx) => studentArticles[idx] !== art);

      if (articlesDiffer) {
        minorSlipsCount++;
      }
    }

    // 2. Pronoun agreement mismatch (I vs we, my vs our, me vs us)
    if (pronounAgreementPairs && pronounAgreementPairs.length > 0) {
      for (const [p1, p2] of pronounAgreementPairs) {
        const targetHasP1 = targetTokens.includes(p1);
        const targetHasP2 = targetTokens.includes(p2);
        const studentHasP1 = tokens.includes(p1);
        const studentHasP2 = tokens.includes(p2);

        if ((targetHasP1 && studentHasP2) || (targetHasP2 && studentHasP1)) {
          minorSlipsCount++;
          break;
        }
      }
    }

    // 3. Preposition mismatch vs reference
    const targetPrepositions = targetTokens.filter(t => COMMON_PREPOSITIONS.includes(t));
    const studentPrepositions = tokens.filter(t => COMMON_PREPOSITIONS.includes(t));
    if (targetPrepositions.length > 0) {
      const missingPrep = targetPrepositions.some(p => !studentPrepositions.includes(p));
      if (missingPrep) {
        minorSlipsCount++;
      }
    }

    // 4. Tense mismatch against reference
    if (checkTenseAgainstReference && targetTokens.length > 0) {
      for (const [pres, past] of TENSE_PAIRS) {
        const targetHasPast = targetTokens.includes(past);
        const studentHasPres = tokens.includes(pres);
        const targetHasPres = targetTokens.includes(pres);
        const studentHasPast = tokens.includes(past);

        if ((targetHasPast && studentHasPres) || (targetHasPres && studentHasPast)) {
          minorSlipsCount++;
          break;
        }
      }
    }

    // Apply minor slips deductions down to minorSlipFloor
    for (let i = 0; i < minorSlipsCount; i++) {
      marks = Math.max(minorSlipFloor, marks - minorSlipDeduction);
    }

    // 5. Missing auxiliary verb vs reference -> structuralErrorCap
    if (checkAuxiliariesAgainstReference && targetTokens.length > 0) {
      const targetAuxiliaries = targetTokens.filter(t => COMMON_AUXILIARIES.includes(t));
      const studentAuxiliaries = tokens.filter(t => COMMON_AUXILIARIES.includes(t));

      const missingAux = targetAuxiliaries.some(aux => !studentAuxiliaries.includes(aux));
      if (missingAux) {
        marks = Math.min(marks, structuralErrorCap);
      }
    }

    marks = Math.max(0, Math.round(marks * 2) / 2);
    return { marks };
  }

  // -------------------------------------------------------------
  // LISTENING MODE
  // -------------------------------------------------------------
  const {
    pronounShifts = [["you", "i"], ["your", "my"], ["yours", "mine"]],
    minWordsForSentence = 3,
    allowShortNounPhraseAnswers = true
  } = config || {};

  // Check pronoun shift failures (e.g. student says "you" or "your" instead of "I" or "my")
  let hasPronounSlip = false;
  pronounShifts.forEach(([incorrectPronoun]) => {
    if (tokens.includes(incorrectPronoun.toLowerCase())) {
      hasPronounSlip = true;
    }
  });

  if (hasPronounSlip) {
    return { marks: 1 };
  }

  // Check subject-verb concord slips (e.g. "I has", "he have", "they was", "we was")
  const concordErrorPatterns = [
    /\bi\s+(?:is|are|has)\b/i,
    /\b(?:he|she|it)\s+(?:have|do|were)\b/i,
    /\b(?:they|we|you)\s+was\b/i
  ];
  const hasConcordError = concordErrorPatterns.some(pat => pat.test(rawTranscript));
  if (hasConcordError) {
    return { marks: 1 };
  }

  // Check if utterance contains at least one verb / predicate
  const commonVerbs = new Set([
    ...COMMON_AUXILIARIES,
    'buy', 'buys', 'bought', 'shop', 'shops', 'shopped', 'visit', 'visits', 'visited',
    'live', 'lives', 'lived', 'grab', 'grabs', 'grabbed', 'relax', 'relaxes', 'relaxed',
    'water', 'waters', 'watering', 'watered', 'find', 'finds', 'found', 'like', 'likes', 'liked',
    'take', 'takes', 'took', 'taken', 'bring', 'brings', 'brought', 'make', 'makes', 'made',
    'get', 'gets', 'got', 'gotten', 'go', 'goes', 'went', 'gone', 'see', 'sees', 'saw', 'seen',
    'work', 'works', 'worked', 'stay', 'stays', 'stayed', 'pay', 'pays', 'paid', 'help', 'helps', 'helped',
    'carry', 'carries', 'carried', 'need', 'needs', 'needed', 'want', 'wants', 'wanted'
  ]);

  const hasVerb = tokens.some(t => 
    commonVerbs.has(t) || 
    t.endsWith('ed') || 
    t.endsWith('ing')
  );

  // Short answers: e.g. "Wednesday" (exact single-entity answer to "What day...?")
  if (tokens.length < minWordsForSentence) {
    // If exact single-token target entity (e.g. "Wednesday") and allowed:
    const keywords = context.item?.keywords || [];
    const isExactSingleEntity = keywords.some(group => 
      group.some(alt => tokenize(alt).length === 1 && tokenize(alt)[0] === tokens[0])
    );

    if (allowShortNounPhraseAnswers && isExactSingleEntity && tokens.length === 1) {
      return { marks: 2 }; // Direct target entity
    }

    // Bare fragments with unmentioned modifiers or no verb (e.g. "tea powder") get 1 mark
    return { marks: 1 };
  }

  // Utterance with 3+ words: must contain a verb to be a complete sentence
  if (!hasVerb) {
    return { marks: 1 }; // Noun phrase fragment without a predicate
  }

  return { marks: 2 }; // Complete sentence with proper concord and shifted pronouns
}
