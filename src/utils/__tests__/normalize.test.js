import { describe, it, expect } from 'vitest';
import { normalizeText, tokenize } from '../normalize';

describe('normalizeText', () => {
  it('converts to lowercase and strips punctuation', () => {
    expect(normalizeText('Hello, World! How are you?')).toBe('hello world how are you');
  });

  it('treats hyphens and underscores as spaces', () => {
    expect(normalizeText('whole-wheat and four-wheeler')).toBe('whole wheat and 4 wheeler');
  });

  it('converts number words to digits', () => {
    expect(normalizeText('I have six apples and forty five books')).toBe('i have 6 apples and 45 books');
    expect(normalizeText('He ran five kilometers at six in the morning')).toBe('he ran 5 kilometers at 6 in the morning');
  });

  it('handles optional o\'clock removal', () => {
    expect(normalizeText('At five o\'clock this evening')).toBe('at 5 this evening');
  });
});

describe('tokenize', () => {
  it('splits normalized text into clean token array', () => {
    expect(tokenize('Gate 45 at London')).toEqual(['gate', '45', 'at', 'london']);
  });
});
