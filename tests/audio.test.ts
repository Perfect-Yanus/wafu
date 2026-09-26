import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AsmrAudioEngine } from '../src/audio/AsmrAudioEngine';

describe('AsmrAudioEngine', () => {
  let audioEngine: AsmrAudioEngine;

  beforeEach(() => {
    // Mock AudioContext for headless test environment
    const createMockNode = () => ({
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      Q: { setValueAtTime: vi.fn() },
      buffer: null,
      loop: false,
    });

    const mockAudioContext = {
      state: 'suspended',
      currentTime: 0,
      resume: vi.fn().mockResolvedValue(undefined),
      createOscillator: vi.fn(createMockNode),
      createGain: vi.fn(createMockNode),
      createBiquadFilter: vi.fn(createMockNode),
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(44100)),
      })),
      createBufferSource: vi.fn(createMockNode),
      destination: {},
    };

    // @ts-expect-error Mocking window AudioContext
    global.AudioContext = vi.fn(() => mockAudioContext);
    // @ts-expect-error Mocking window webkitAudioContext
    global.webkitAudioContext = global.AudioContext;

    audioEngine = new AsmrAudioEngine();
  });

  it('should initialize with default volume and unlock on user gesture', async () => {
    expect(audioEngine.getMasterVolume()).toBe(0.8);
    expect(audioEngine.isMuted()).toBe(false);

    await audioEngine.unlock();
    expect(audioEngine.isUnlocked()).toBe(true);
  });

  it('should set master volume within valid [0, 1] range', () => {
    audioEngine.setMasterVolume(0.5);
    expect(audioEngine.getMasterVolume()).toBe(0.5);

    audioEngine.setMasterVolume(1.5);
    expect(audioEngine.getMasterVolume()).toBe(1.0);

    audioEngine.setMasterVolume(-0.2);
    expect(audioEngine.getMasterVolume()).toBe(0.0);
  });

  it('should toggle mute correctly', () => {
    audioEngine.setMuted(true);
    expect(audioEngine.isMuted()).toBe(true);

    audioEngine.setMuted(false);
    expect(audioEngine.isMuted()).toBe(false);
  });

  it('should play ASMR squish, crunch, crack, slice, and pop sounds without errors', () => {
    expect(() => audioEngine.playSquish(0.8)).not.toThrow();
    expect(() => audioEngine.playCrunch(0.9)).not.toThrow();
    expect(() => audioEngine.playCrack()).not.toThrow();
    expect(() => audioEngine.playSlice()).not.toThrow();
    expect(() => audioEngine.playPop()).not.toThrow();
    expect(() => audioEngine.playStretch(0.7)).not.toThrow();
    expect(() => audioEngine.playAbsorb(2)).not.toThrow();
  });

  it('should update roll rumble dynamically based on speed', () => {
    expect(() => audioEngine.updateRollRumble(15, 'pavement')).not.toThrow();
    expect(() => audioEngine.updateRollRumble(0, 'pavement')).not.toThrow();
  });
});
