import { describe, it, expect, beforeEach } from 'vitest';
import { WafuMaker } from '../src/studio/WafuMaker';

describe('WafuMaker DIY ASMR System', () => {
  let maker: WafuMaker;

  beforeEach(() => {
    maker = new WafuMaker();
  });

  it('should initialize with default fillings and shell', () => {
    expect(maker.getSelectedShell()).toBe('silicone');
    expect(maker.getSelectedFillings()).toContain('orbeez');
  });

  it('should toggle fillings and update sound profile', () => {
    maker.toggleFilling('floam');
    expect(maker.getSelectedFillings()).toContain('floam');

    const sound = maker.getPrimaryTouchSound();
    expect(['floam', 'orbeez', 'squish']).toContain(sound);
  });

  it('should switch outer shell types', () => {
    maker.setShell('clay');
    expect(maker.getSelectedShell()).toBe('clay');
    expect(maker.getShellInfo('clay').hasBrittleCrust).toBe(true);
  });
});
