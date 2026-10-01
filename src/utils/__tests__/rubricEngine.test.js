import { describe, it, expect, vi } from 'vitest';
import { validateRubric, evaluate, calculateAggregateScore } from '../rubricEngine';
import listeningRubric from '../../data/rubrics/listening.json';
import dialogsRubric from '../../data/rubrics/dialogs.json';

describe('Rubric Validation', () => {
  it('validates the official listening.json rubric successfully', () => {
    const result = validateRubric(listeningRubric);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates the official dialogs.json rubric successfully', () => {
    const result = validateRubric(dialogsRubric);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails validation when parameter maxes do not add up to totalMarks', () => {
    const invalidRubric = {
      id: 'bad-math',
      totalMarks: 10,
      parameters: [
        {
          id: 'p1',
          label: 'Param 1',
          max: 4,
          checker: 'keywordRecall',
          bands: [{ marks: 4, label: 'Full' }, { marks: 0, label: 'Zero' }]
        },
        {
          id: 'p2',
          label: 'Param 2',
          max: 4, // 4 + 4 = 8 != 10
          checker: 'syntaxRules',
          bands: [{ marks: 4, label: 'Full' }, { marks: 0, label: 'Zero' }]
        }
      ]
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = validateRubric(invalidRubric);
    spy.mockRestore();

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Parameter maxes (8) must equal totalMarks (10)'))).toBe(true);
  });

  it('fails validation when a checker is missing from the registry', () => {
    const invalidRubric = {
      id: 'missing-checker',
      totalMarks: 4,
      parameters: [
        {
          id: 'p1',
          label: 'Param 1',
          max: 4,
          checker: 'nonExistentChecker',
          bands: [{ marks: 4, label: 'Full' }, { marks: 0, label: 'Zero' }]
        }
      ]
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = validateRubric(invalidRubric);
    spy.mockRestore();

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('does not exist in registry'))).toBe(true);
  });

  it('fails validation when bands are not sorted by marks descending', () => {
    const invalidRubric = {
      id: 'unsorted-bands',
      totalMarks: 4,
      parameters: [
        {
          id: 'p1',
          label: 'Param 1',
          max: 4,
          checker: 'keywordRecall',
          bands: [
            { marks: 0, label: 'Low' },
            { marks: 4, label: 'High' }
          ]
        }
      ]
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = validateRubric(invalidRubric);
    spy.mockRestore();

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Bands must be sorted by marks descending'))).toBe(true);
  });

  it('fails validation when band ranges overlap', () => {
    const invalidRubric = {
      id: 'overlapping-ranges',
      totalMarks: 4,
      parameters: [
        {
          id: 'p1',
          label: 'Param 1',
          max: 4,
          checker: 'keywordRecall',
          bands: [
            { marks: 4, range: [2.0, 4.0], label: 'High' },
            { marks: 2, range: [2.5, 3.0], label: 'Overlap' } // Overlaps [2.0, 4.0]
          ]
        }
      ]
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = validateRubric(invalidRubric);
    spy.mockRestore();

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ranges overlap'))).toBe(true);
  });
});

describe('Listening Rubric Evaluation (Backward Compatibility)', () => {
  const sampleQuestionContext = {
    item: {
      q: 'What day of the week do you shop for groceries?',
      modelAnswer: 'I shop for groceries every Wednesday evening.',
      keywords: [['wednesday']]
    }
  };

  it('evaluates short direct answer "Wednesday" with full marks (10/10)', () => {
    const context = {
      ...sampleQuestionContext,
      transcript: 'Wednesday',
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(listeningRubric, context);

    expect(result.rubricId).toBe('listening');
    expect(result.total).toBe(10);
    expect(result.max).toBe(10);
    expect(result.parameters).toHaveLength(4);

    const comp = result.parameters.find(p => p.id === 'comprehension');
    expect(comp.marks).toBe(4);
    expect(comp.band).toBe('Exemplary');
  });

  it('evaluates silence or empty response with 0 marks', () => {
    const context = {
      ...sampleQuestionContext,
      transcript: '',
      confidence: 0,
      latencySec: 5.0
    };

    const result = evaluate(listeningRubric, context);
    expect(result.total).toBe(0);
  });

  it('penalizes failure to shift pronouns (e.g. saying "you" instead of "I")', () => {
    const context = {
      ...sampleQuestionContext,
      transcript: 'You shop for groceries every Wednesday evening',
      confidence: 0.9,
      latencySec: 1.0
    };

    const result = evaluate(listeningRubric, context);
    const syntax = result.parameters.find(p => p.id === 'syntax');
    expect(syntax.marks).toBe(1);
    expect(syntax.band).toBe('Partially accurate');
  });
});

describe('Situational Dialog Rubric Evaluation', () => {
  const sampleTurnContext = {
    turn: {
      n: 1,
      prompt: 'Good afternoon! How can I assist you today?',
      response: 'Good afternoon, I would like to check in under my name for a three-day stay.',
      keywords: ['good', 'afternoon', 'like', 'check', 'under', 'name', 'three', 'day', 'stay']
    }
  };

  it('evaluates a perfect reply with full marks (10/10)', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, I would like to check in under my name for a three-day stay.',
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);

    expect(result.rubricId).toBe('dialogs');
    expect(result.total).toBe(10);
    expect(result.max).toBe(10);

    const pragmatic = result.parameters.find(p => p.id === 'pragmatic');
    expect(pragmatic.marks).toBe(3.0);
    expect(pragmatic.band).toBe('Exemplary');

    const syntax = result.parameters.find(p => p.id === 'syntax');
    expect(syntax.marks).toBe(2.5);
    expect(syntax.band).toBe('Exemplary');

    const fluency = result.parameters.find(p => p.id === 'fluency');
    expect(fluency.marks).toBe(2.5);
    expect(fluency.band).toBe('Exemplary');

    const pron = result.parameters.find(p => p.id === 'pronunciation');
    expect(pron.marks).toBe(2.0);
    expect(pron.band).toBe('Crisp');
  });

  it('evaluates missing detail (partial keyword coverage)', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, I would like to check in please.',
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const pragmatic = result.parameters.find(p => p.id === 'pragmatic');
    expect(pragmatic.marks).toBeLessThan(3.0);
    expect(pragmatic.band).not.toBe('Exemplary');
  });

  it('penalizes run-on replies with conjunctions (singleSentenceRequired / length)', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, I would like to check in under my name for a three-day stay, and then I want to visit the beach and then have lunch and so I need the keys.',
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const pragmatic = result.parameters.find(p => p.id === 'pragmatic');
    expect(pragmatic.marks).toBeLessThan(3.0);
  });

  it('caps too-short replies at terseCapMarks and fragmentCap', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Check in',
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const pragmatic = result.parameters.find(p => p.id === 'pragmatic');
    expect(pragmatic.marks).toBeLessThanOrEqual(1.5); // terseCapMarks

    const syntax = result.parameters.find(p => p.id === 'syntax');
    expect(syntax.marks).toBeLessThanOrEqual(0.5); // fragmentCap
  });

  it('penalizes wrong verb tense against reference', () => {
    const context = {
      turn: {
        n: 2,
        prompt: 'Did you bring the required identification documents with you?',
        response: 'Yes, I brought my national identity card and my college admission slip as verification.',
        keywords: ['yes', 'brought', 'national', 'identity', 'card', 'college', 'admission', 'slip', 'verification']
      },
      transcript: 'Yes, I bring my national identity card and my college admission slip as verification.', // "bring" instead of "brought"
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const syntax = result.parameters.find(p => p.id === 'syntax');
    expect(syntax.marks).toBeLessThan(2.5);
    expect(syntax.band).toBe('Competent');
  });

  it('penalizes I/we pronoun agreement mismatch', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, we would like to check in under my name for a three-day stay.', // "we" instead of "I"
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const syntax = result.parameters.find(p => p.id === 'syntax');
    expect(syntax.marks).toBe(2.0); // minor slip deduction of 0.5
    expect(syntax.band).toBe('Competent');
  });

  it('penalizes missing article vs reference', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, I would like to check in under my name for three-day stay.', // missing "a"
      confidence: 0.95,
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const syntax = result.parameters.find(p => p.id === 'syntax');
    expect(syntax.marks).toBe(2.0); // minor slip deduction of 0.5
  });

  it('evaluates silence or empty response as 0 marks', () => {
    const context = {
      ...sampleTurnContext,
      transcript: '',
      confidence: 0,
      latencySec: 5.0
    };

    const result = evaluate(dialogsRubric, context);
    expect(result.total).toBe(0);
  });

  it('evaluates latency across tiers: 1s, 2s, 4s', () => {
    const base = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, I would like to check in under my name for a three-day stay.',
      confidence: 0.95
    };

    const res1s = evaluate(dialogsRubric, { ...base, latencySec: 1.0 });
    const f1s = res1s.parameters.find(p => p.id === 'fluency');
    expect(f1s.marks).toBe(2.5); // < 1.5s
    expect(f1s.band).toBe('Exemplary');

    const res2s = evaluate(dialogsRubric, { ...base, latencySec: 2.0 });
    const f2s = res2s.parameters.find(p => p.id === 'fluency');
    expect(f2s.marks).toBe(2.0); // 1.5 to 2.5s
    expect(f2s.band).toBe('Competent');

    const res4s = evaluate(dialogsRubric, { ...base, latencySec: 4.0 });
    const f4s = res4s.parameters.find(p => p.id === 'fluency');
    expect(f4s.marks).toBe(0.5); // > 3.0s
    expect(f4s.band).toBe('Deficient');
  });

  it('evaluates one filler vs many fillers', () => {
    const base = {
      ...sampleTurnContext,
      confidence: 0.95,
      latencySec: 1.2
    };

    // One filler
    const resOne = evaluate(dialogsRubric, {
      ...base,
      transcript: 'Um good afternoon, I would like to check in under my name for a three-day stay.'
    });
    const fOne = resOne.parameters.find(p => p.id === 'fluency');
    expect(fOne.marks).toBe(2.0); // 2.5 - 0.5 = 2.0
    expect(fOne.band).toBe('Competent');

    // Many fillers
    const resMany = evaluate(dialogsRubric, {
      ...base,
      transcript: 'Um uh like good afternoon, I would like to check in under my name for a three-day stay.'
    });
    const fMany = resMany.parameters.find(p => p.id === 'fluency');
    expect(fMany.marks).toBeLessThanOrEqual(1.0); // multipleFillersCapMarks
  });

  it('evaluates low recognition confidence', () => {
    const context = {
      ...sampleTurnContext,
      transcript: 'Good afternoon, I would like to check in under my name for a three-day stay.',
      confidence: 0.55, // Between 0.4 and 0.65 -> 0.5 marks
      latencySec: 1.2
    };

    const result = evaluate(dialogsRubric, context);
    const pron = result.parameters.find(p => p.id === 'pronunciation');
    expect(pron.marks).toBe(0.5);
    expect(pron.band).toBe('Unintelligible');
  });

  it('calculates aggregate dialog session mean score correctly', () => {
    const turn1 = { total: 10.0, parameters: [{ id: 'pragmatic', marks: 3.0, max: 3.0 }] };
    const turn2 = { total: 8.0, parameters: [{ id: 'pragmatic', marks: 2.0, max: 3.0 }] };

    const summary = calculateAggregateScore(dialogsRubric, [turn1, turn2]);
    expect(summary.overallScore).toBe(9.0); // (10 + 8) / 2
    expect(summary.maxScore).toBe(10);
    expect(summary.percentage).toBe(90);
    expect(summary.parameterAverages[0].averageMarks).toBe(2.5); // (3 + 2) / 2
  });
});
