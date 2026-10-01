/**
 * Text normalization utilities for speech recognition transcripts & model answers
 */

const NUMBER_WORDS_MAP = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
  hundred: '100',
  'two hundred': '200',
  'forty five': '45',
  'forty-five': '45',
  'ten thirty': '10:30',
  'four thirty': '4:30',
  'eleven thirty': '11:30'
};

/**
 * Normalizes a text string:
 * - Converts to lowercase
 * - Replaces hyphens with spaces
 * - Strips punctuation
 * - Normalizes number words to digits
 * - Strips optional o'clock
 * - Collapses extra whitespace
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  let normalized = text.toLowerCase();

  // Normalize o'clock / o clock
  normalized = normalized.replace(/\b(?:o['’]clock|o\s+clock)\b/gi, '');
  normalized = normalized.replace(/[-_]/g, ' ');

  // Remove punctuation except basic letters and numbers
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\_`~()?\"'<>@\[\]\\|]/g, ' ');

  // Normalize multi-word number phrases first
  Object.keys(NUMBER_WORDS_MAP).forEach((word) => {
    if (word.includes(' ')) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      normalized = normalized.replace(regex, NUMBER_WORDS_MAP[word]);
    }
  });

  // Tokenize to replace individual number words
  const tokens = normalized.trim().split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((token) => NUMBER_WORDS_MAP[token] || token);

  return normalizedTokens.join(' ').trim();
}

/**
 * Split normalized text into array of clean word tokens
 */
export function tokenize(text) {
  const norm = normalizeText(text);
  return norm ? norm.split(/\s+/).filter(Boolean) : [];
}
