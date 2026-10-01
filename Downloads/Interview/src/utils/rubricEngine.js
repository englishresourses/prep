import { CHECKERS_REGISTRY } from './checkers';
import listeningRubric from '../data/rubrics/listening.json';
import dialogsRubric from '../data/rubrics/dialogs.json';

const FLOAT_TOLERANCE = 1e-9;

/**
 * Validates a rubric JSON object against structural and arithmetic rules.
 * Rules:
 * 1. Parameter maxes must add up to totalMarks with float tolerance (1e-9).
 * 2. Every checker id must exist in the checkers registry.
 * 3. Bands in each parameter must be sorted by marks descending.
 * 4. Band ranges (if defined) must not overlap.
 *
 * @param {Object} rubric - Rubric JSON
 * @param {Object} registry - Checkers map (defaults to CHECKERS_REGISTRY)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRubric(rubric, registry = CHECKERS_REGISTRY) {
  const errors = [];

  if (!rubric || typeof rubric !== 'object') {
    errors.push('Rubric must be an object.');
    return { valid: false, errors };
  }

  const { id, title, totalMarks, parameters = [] } = rubric;

  if (!id || typeof id !== 'string') {
    errors.push('Rubric is missing a valid string id.');
  }

  // 1. Parameter maxes must add up to totalMarks if parameters are provided
  if (Array.isArray(parameters) && parameters.length > 0) {
    const sumOfMaxes = parameters.reduce((sum, p) => sum + (Number(p.max) || 0), 0);
    if (Math.abs(sumOfMaxes - totalMarks) > FLOAT_TOLERANCE) {
      errors.push(
        `Rubric "${id}" validation error: Parameter maxes (${sumOfMaxes}) must equal totalMarks (${totalMarks}).`
      );
    }

    // 2. Validate each parameter
    parameters.forEach((param, pIdx) => {
      // Checker existence
      if (!param.checker || typeof registry[param.checker] !== 'function') {
        errors.push(
          `Rubric "${id}" parameter "${param.id || pIdx}": Checker "${param.checker}" does not exist in registry.`
        );
      }

      // 3. Bands sorted by marks descending & range checks
      if (!Array.isArray(param.bands) || param.bands.length === 0) {
        errors.push(
          `Rubric "${id}" parameter "${param.id || pIdx}": Must provide a non-empty bands array.`
        );
      } else {
        for (let i = 0; i < param.bands.length - 1; i++) {
          const currentBand = param.bands[i];
          const nextBand = param.bands[i + 1];

          // Marks descending
          if (currentBand.marks < nextBand.marks) {
            errors.push(
              `Rubric "${id}" parameter "${param.id}": Bands must be sorted by marks descending. Found ${currentBand.marks} before ${nextBand.marks}.`
            );
            break;
          }

          // Range validation and non-overlapping check
          if (Array.isArray(currentBand.range) && Array.isArray(nextBand.range)) {
            const [curMin, curMax] = currentBand.range;
            const [nextMin, nextMax] = nextBand.range;

            if (curMin > curMax) {
              errors.push(
                `Rubric "${id}" parameter "${param.id}": Invalid range [${curMin}, ${curMax}]. Min cannot exceed max.`
              );
            }
            if (nextMin > nextMax) {
              errors.push(
                `Rubric "${id}" parameter "${param.id}": Invalid range [${nextMin}, ${nextMax}]. Min cannot exceed max.`
              );
            }

            // In descending order, currentBand min should be >= nextBand max (ranges do not overlap)
            if (curMin < nextMax - FLOAT_TOLERANCE) {
              errors.push(
                `Rubric "${id}" parameter "${param.id}": Band ranges overlap between [${curMin}, ${curMax}] and [${nextMin}, ${nextMax}].`
              );
            }
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    console.error(`[Rubric Validation Error in "${rubric.id}"]:`, errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates all standard application rubrics on initialization.
 */
export function validateAllRubrics() {
  const rubrics = [listeningRubric, dialogsRubric];
  let allValid = true;

  rubrics.forEach(rubric => {
    const result = validateRubric(rubric);
    if (!result.valid) {
      allValid = false;
    }
  });

  return allValid;
}

// Perform startup validation
try {
  validateAllRubrics();
} catch (e) {
  console.error('[Rubric Startup Validation Exception]:', e);
}

/**
 * Helper to match a score to a parameter band.
 * Priority: If band has range: [min, max], checks if min <= marks <= max (with float tolerance).
 * Otherwise fallback to exact marks match, or nearest lower band.
 */
export function findMatchingBand(bands = [], marks) {
  if (!Array.isArray(bands) || bands.length === 0) return null;

  // 1. Check range matches first
  for (const band of bands) {
    if (Array.isArray(band.range) && band.range.length === 2) {
      const [min, max] = band.range;
      if (marks >= min - FLOAT_TOLERANCE && marks <= max + FLOAT_TOLERANCE) {
        return band;
      }
    }
  }

  // 2. Exact marks match
  const exact = bands.find(b => Math.abs(b.marks - marks) <= FLOAT_TOLERANCE);
  if (exact) return exact;

  // 3. Fallback: highest band whose marks <= marks
  return bands.find(b => b.marks <= marks + FLOAT_TOLERANCE) || bands[bands.length - 1];
}

/**
 * Generic evaluation engine: Evaluates a student response context against a rubric.
 * Supports half marks (0.5 steps), range mapping, scope, and aggregation metadata.
 *
 * @param {Object} rubric - Rubric JSON definition
 * @param {Object} context - { transcript, confidence, timing, item / turn }
 * @returns {{ total: number, max: number, rubricId: string, rubricVersion: number, scope: string, aggregation: string, parameters: Array }}
 */
export function evaluate(rubric, context = {}) {
  if (!rubric) {
    throw new Error('evaluate() requires a rubric definition.');
  }

  const { 
    id: rubricId, 
    version: rubricVersion = 1, 
    totalMarks = 10, 
    scope = 'question', 
    aggregation = 'sum',
    parameters = [] 
  } = rubric;

  let total = 0;
  const evaluatedParameters = [];

  for (const param of parameters) {
    const checkerFn = CHECKERS_REGISTRY[param.checker];
    if (typeof checkerFn !== 'function') {
      console.warn(`Checker "${param.checker}" not found in registry. Defaulting to 0.`);
      evaluatedParameters.push({
        id: param.id,
        label: param.label,
        marks: 0,
        max: param.max,
        band: 'Unavailable',
        tip: 'Checker not found',
        descriptor: '',
        estimated: Boolean(param.estimated)
      });
      continue;
    }

    // Run checker
    const checkerResult = checkerFn(param.config || {}, context);
    let assignedMarks = Number(checkerResult.marks);
    if (isNaN(assignedMarks)) assignedMarks = 0;

    // Support half marks: round to nearest 0.5 step
    assignedMarks = Math.round(assignedMarks * 2) / 2;

    // Clamp marks to [0, param.max]
    assignedMarks = Math.max(0, Math.min(param.max, assignedMarks));
    total += assignedMarks;

    // Find band by range or marks
    const matchedBand = findMatchingBand(param.bands, assignedMarks);

    evaluatedParameters.push({
      id: param.id,
      label: param.label,
      marks: assignedMarks,
      max: param.max,
      band: matchedBand ? matchedBand.label : '',
      descriptor: matchedBand ? matchedBand.descriptor : '',
      tip: (matchedBand && matchedBand.tip) ? matchedBand.tip : '',
      estimated: Boolean(param.estimated)
    });
  }

  // Round total to 1 decimal place
  total = Number(total.toFixed(1));

  return {
    rubricId,
    rubricVersion,
    scope,
    aggregation,
    total,
    max: totalMarks,
    parameters: evaluatedParameters
  };
}

/**
 * Calculates aggregate score across multiple items or turns according to rubric aggregation rule.
 * For dialogs: aggregation = "mean", score is mean of turns rounded to 1 decimal place.
 *
 * @param {Object} rubric - Rubric JSON
 * @param {Array} itemEvaluations - Array of evaluate() results
 * @returns {{ overallScore: number, maxScore: number, parameterAverages: Array }}
 */
export function calculateAggregateScore(rubric, itemEvaluations = []) {
  if (!itemEvaluations || itemEvaluations.length === 0) {
    return {
      overallScore: 0,
      maxScore: rubric.totalMarks,
      parameterAverages: []
    };
  }

  const count = itemEvaluations.length;
  const isMean = rubric.aggregation === 'mean';

  // Overall score
  const totalSum = itemEvaluations.reduce((sum, item) => sum + (item.total || item.score || 0), 0);
  const overallScore = isMean
    ? Number((totalSum / count).toFixed(1))
    : Number(totalSum.toFixed(1));

  const maxScore = isMean
    ? rubric.totalMarks
    : (rubric.totalMarks * count);

  // Per-parameter averages
  const paramMap = {};
  itemEvaluations.forEach(item => {
    (item.parameters || []).forEach(p => {
      if (!paramMap[p.id]) {
        paramMap[p.id] = {
          id: p.id,
          label: p.label,
          max: p.max,
          marksSum: 0,
          estimated: p.estimated
        };
      }
      paramMap[p.id].marksSum += p.marks;
    });
  });

  const parameterAverages = Object.values(paramMap).map(p => ({
    id: p.id,
    label: p.label,
    max: p.max,
    averageMarks: Number((p.marksSum / count).toFixed(1)),
    percentage: Math.round(((p.marksSum / count) / p.max) * 100),
    estimated: p.estimated
  }));

  return {
    overallScore,
    maxScore,
    percentage: Math.round((overallScore / maxScore) * 100),
    parameterAverages
  };
}
