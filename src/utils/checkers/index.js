import { keywordRecall } from './keywordRecall';
import { turnMatch } from './turnMatch';
import { syntaxRules } from './syntaxRules';
import { latencyFluency } from './latencyFluency';
import { recognitionConfidence } from './recognitionConfidence';

export const CHECKERS_REGISTRY = {
  keywordRecall,
  turnMatch,
  syntaxRules,
  latencyFluency,
  recognitionConfidence,
};

export function getChecker(checkerId) {
  return CHECKERS_REGISTRY[checkerId];
}
