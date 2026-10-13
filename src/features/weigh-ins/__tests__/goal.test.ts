import { goalStatus } from '../goal';

describe('goalStatus', () => {
  it('reports how far above or below the goal', () => {
    expect(goalStatus(152.3, 150)).toEqual({ state: 'above', difference: 2.3 });
    expect(goalStatus(148.8, 150)).toEqual({ state: 'below', difference: 1.2 });
  });

  it('treats float noise as on target', () => {
    expect(goalStatus(150.04, 150)).toEqual({ state: 'at' });
  });
});
