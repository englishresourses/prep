import { evaluate } from './rubricEngine';
import listeningRubric from '../data/rubrics/listening.json';

/**
 * Evaluates a student's answer to a listening comprehension question using the JSON-driven rubric.
 *
 * @param {Object} context - {
 *   transcript: string,
 *   confidence?: number,
 *   timing?: { micStartTime: number, firstResultTime: number },
 *   item: { q: string, modelAnswer: string, keywords: Array<Array<string>> }
 * }
 * @returns {{ total: number, max: number, rubricId: string, rubricVersion: number, parameters: Array }}
 */
export function scoreListeningAnswer(context) {
  return evaluate(listeningRubric, context);
}
