import { axisScale } from '../chartScale';

function covers(values: number[]) {
  const { min, step, sections } = axisScale(values);
  return Math.min(...values) > min && Math.max(...values) < min + step * sections;
}

describe('axisScale', () => {
  it('hugs the data instead of starting at zero', () => {
    expect(axisScale([149.6, 150.2, 151])).toEqual({ min: 149, step: 1, sections: 4 });
    expect(axisScale([150, 150.4]).step).toBe(0.5);
  });

  it('always leaves headroom around the data', () => {
    expect(covers([150])).toBe(true);
    expect(covers([148, 152.3])).toBe(true);
    expect(covers([120, 175])).toBe(true);
  });

  it('uses friendly step sizes', () => {
    expect(axisScale([140, 160]).step).toBe(10);
  });

  it('handles no data', () => {
    expect(axisScale([])).toEqual({ min: 0, step: 1, sections: 4 });
  });
});
