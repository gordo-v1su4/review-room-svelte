import { expect, test } from 'bun:test';
import { annotationsEqual, createAnnotationState, transitionAnnotations, validateAnnotations } from './annotations';
const stroke = (id: string) => ({ id, color: '#ef4444', width: 4, points: [{ x: .1, y: .2 }, { x: .8, y: .9 }] });

test('annotation draft undo, clear and revert preserve saved work until explicitly saved', () => {
  const initial = createAnnotationState([stroke('saved')]);
  const replaced = transitionAnnotations(initial, { type: 'replace', strokes: [stroke('saved'), stroke('new')] });
  expect(annotationsEqual(replaced.saved, replaced.draft)).toBe(false);
  expect(transitionAnnotations(replaced, { type: 'undo' }).draft.map(s => s.id)).toEqual(['saved']);
  const saved = transitionAnnotations(replaced, { type: 'save' });
  expect(annotationsEqual(saved.saved, saved.draft)).toBe(true);
  const cleared = transitionAnnotations(saved, { type: 'clear' });
  expect(cleared.draft).toEqual([]);
  expect(transitionAnnotations(cleared, { type: 'revert' }).draft.map(s => s.id)).toEqual(['saved', 'new']);
  expect(initial.saved.map(s => s.id)).toEqual(['saved']);
});

test('validation owns data, clamps coordinates and matches backend width bounds', () => {
  const input = [{ ...stroke('a'), width: 20.2, points: [{ x: -1, y: 2 }, { x: .5, y: .6 }] }];
  const result = validateAnnotations(input);
  expect(result[0]!.points).toEqual([{ x: 0, y: 1 }, { x: .5, y: .6 }]);
  expect(result[0]!.width).toBe(18);
  input[0]!.points[1]!.x = .9;
  expect(result[0]!.points[1]!.x).toBe(.5);
  const state = createAnnotationState(input);
  input[0]!.points[0]!.x = .8;
  expect(state.saved[0]!.points[0]!.x).toBe(0);
  expect(state.saved[0]!.points).not.toBe(state.draft[0]!.points);
});

test('malformed strokes and backend limit overflow are rejected rather than dropped or truncated', () => {
  const a = stroke('a');
  for (const malformed of [null, {}, [null], [{ ...a, width: NaN }], [{ ...a, width: 0 }], [{ ...a, tool: 'unknown' }], [{ ...a, color: 'red' }], [{ ...a, id: '' }], [{ ...a, id: 'x'.repeat(81) }], [a, a], [{ ...a, points: [{ x: Infinity, y: .2 }, { x: .3, y: .4 }] }], [{ ...a, points: [{ x: NaN, y: .2 }, { x: .3, y: .4 }] }], [{ ...a, points: [{ x: .1, y: .2 }] }], [{ ...a, points: Array.from({ length: 1501 }, () => ({ x: .1, y: .2 })) }], Array.from({ length: 121 }, (_, i) => stroke(String(i)))]) {
    expect(() => validateAnnotations(malformed)).toThrow();
  }
});

test('replacement cannot retain caller references and equivalent default pen is clean', () => {
  const input = [stroke('draft')];
  const changed = transitionAnnotations(createAnnotationState(), { type: 'replace', strokes: input });
  input[0]!.color = '#000000'; input[0]!.points[0]!.x = .7;
  expect(changed.draft[0]!.color).toBe('#ef4444');
  expect(changed.draft[0]!.points[0]!.x).toBe(.1);
  expect(annotationsEqual([stroke('a')], [{ ...stroke('a'), tool: 'pen' }])).toBe(true);
  expect(annotationsEqual([stroke('a')], [{ ...stroke('a'), tool: 'rect' }])).toBe(false);
  const saved = transitionAnnotations(changed, { type: 'save' });
  expect(saved.saved[0]).not.toBe(saved.draft[0]);
  expect(saved.saved[0]!.points[0]).not.toBe(saved.draft[0]!.points[0]);
});
