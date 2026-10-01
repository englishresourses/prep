import { evaluate, calculateAggregateScore } from './rubricEngine';
import dialogsRubric from '../data/rubrics/dialogs.json';
import { tokenize, normalizeText } from './normalize';
import { isFuzzyMatch } from './fuzzy';

/**
 * Computes word-level diff alignment for situational dialog UI
 * (matched in green, missing in red)
 */
export function computeWordDiff(targetSentence = '', studentTranscript = '') {
  const targetTokens = tokenize(targetSentence);
  const studentTokens = tokenize(studentTranscript);

  const usedStudentIndices = new Set();
  const diff = [];

  targetTokens.forEach((targetWord) => {
    let matched = false;
    for (let i = 0; i < studentTokens.length; i++) {
      if (!usedStudentIndices.has(i)) {
        if (isFuzzyMatch(studentTokens[i], targetWord, 1, 5)) {
          matched = true;
          usedStudentIndices.add(i);
          break;
        }
      }
    }
    diff.push({ word: targetWord, matched });
  });

  return diff;
}

/**
 * Evaluates a single dialog turn using the official JSON-driven dialog rubric.
 *
 * @param {Object} context - {
 *   transcript: string,
 *   confidence?: number,
 *   latencySec?: number,
 *   timing?: { micStartTime, firstResultTime, resultTimestamps },
 *   turn: { n, prompt, response, keywords }
 * }
 * @returns {{ total: number, max: number, score: number, maxScore: number, diff: Array, parameters: Array }}
 */
export function evaluateDialogTurn(context = {}) {
  const turn = context.turn || context.item || {};
  const targetResponse = turn.response || '';
  const studentTranscript = context.transcript || '';

  // 1. Evaluate turn using the JSON rubric engine
  const evaluation = evaluate(dialogsRubric, {
    ...context,
    item: turn,
    turn: turn
  });

  // 2. Compute word diff for visual UI
  const diff = computeWordDiff(targetResponse, studentTranscript);

  return {
    ...evaluation,
    score: evaluation.total,
    maxScore: evaluation.max,
    diff
  };
}

/**
 * Calculates aggregate summary across all turns in a dialog scenario.
 * Follows aggregation = "mean" rule (mean total out of 10, mean per parameter).
 */
export function evaluateDialogSession(turnEvaluations = []) {
  return calculateAggregateScore(dialogsRubric, turnEvaluations);
}
