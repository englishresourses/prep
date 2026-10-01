import { tokenize } from '../normalize';

/**
 * Checker for Fluency & Response Latency
 * Generalized to support latency tiers, filler deductions/caps, restarts, and backward compatibility.
 */
export function latencyFluency(config = {}, context = {}) {
  const rawTranscript = context.transcript || '';
  const tokens = tokenize(rawTranscript);

  // Abandoned or empty turn
  const abandonedMarks = config.abandonedMarks !== undefined ? config.abandonedMarks : 0;
  if (tokens.length === 0) {
    return { marks: abandonedMarks };
  }

  // Calculate latency in seconds
  let latencySec = 1.0;
  if (typeof context.latencySec === 'number') {
    latencySec = context.latencySec;
  } else if (context.timing?.firstResultTime && context.timing?.micStartTime) {
    latencySec = (context.timing.firstResultTime - context.timing.micStartTime) / 1000;
  }

  // Build latency tiers
  let tiers = config.latencyTiers;
  if (!tiers || tiers.length === 0) {
    const full = config.fullMarksLatencyBelowSec || 2;
    const partial = config.partialMarksLatencyBelowSec || 4;
    tiers = [
      { belowSec: full, marks: 2 },
      { belowSec: partial, marks: 1 },
      { belowSec: 9999, marks: 0 }
    ];
  }

  // Find tier (tiers sorted by belowSec ascending)
  const sortedTiers = [...tiers].sort((a, b) => a.belowSec - b.belowSec);
  let marks = 0;
  for (const tier of sortedTiers) {
    if (latencySec < tier.belowSec) {
      marks = tier.marks;
      break;
    }
  }

  // Filler detection
  const fillers = config.fillers || ["um", "uh", "er", "like", "you know"];
  let fillerCount = 0;
  const lowerTranscript = rawTranscript.toLowerCase();
  fillers.forEach(filler => {
    let regex;
    if (filler === 'like') {
      // Avoid treating legitimate verbs ("would like", "like to") as fillers
      regex = /(?<!\b(?:would|'d)\s+)\blike\b(?!\s+to)/gi;
    } else {
      regex = new RegExp(`\\b${filler}\\b`, 'gi');
    }
    const matches = lowerTranscript.match(regex);
    if (matches) {
      fillerCount += matches.length;
    }
  });

  // Apply filler modifiers
  if (fillerCount === 1) {
    if (config.fillerDeduction !== undefined) {
      marks -= config.fillerDeduction;
    } else {
      marks = Math.min(marks, 1);
    }
  } else if (fillerCount >= 2) {
    if (config.multipleFillersCapMarks !== undefined) {
      marks = Math.min(marks, config.multipleFillersCapMarks);
    } else {
      marks = Math.min(marks, 1);
    }
  }

  // Repeated words / false starts detection
  if (config.detectRepeatedWords) {
    let hasRestart = false;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i] === tokens[i - 1] && isNaN(Number(tokens[i]))) {
        hasRestart = true;
        break;
      }
    }
    if (hasRestart) {
      if (config.restartCapMarks !== undefined) {
        marks = Math.min(marks, config.restartCapMarks);
      } else {
        marks = Math.min(marks, 1);
      }
    }
  }

  // Mid-speech gap check
  if (config.midSpeechGapSec && config.midSpeechGapCapMarks !== undefined) {
    const timestamps = context.timing?.resultTimestamps || [];
    let hasLongGap = false;
    for (let i = 1; i < timestamps.length; i++) {
      const gapSec = (timestamps[i] - timestamps[i - 1]) / 1000;
      if (gapSec > config.midSpeechGapSec) {
        hasLongGap = true;
        break;
      }
    }
    if (hasLongGap) {
      marks = Math.min(marks, config.midSpeechGapCapMarks);
    }
  }

  // Never drop below 0, round to 0.5 step
  marks = Math.max(0, marks);
  marks = Math.round(marks * 2) / 2;

  return { marks };
}
