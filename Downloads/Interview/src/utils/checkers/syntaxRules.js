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
  // LISTENING MODE (Existing behavior intact)
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

  // Short answers allowed if direct and accurate (e.g. "Wednesday" or "Gate 45")
  if (allowShortNounPhraseAnswers && tokens.length < minWordsForSentence) {
    if (hasPronounSlip) {
      return { marks: 1 };
    }
    return { marks: 2 };
  }

  // Sentence level evaluation
  if (hasPronounSlip) {
    return { marks: 1 };
  }

  if (tokens.length >= minWordsForSentence) {
    return { marks: 2 };
  }

  return { marks: 1 };
}
