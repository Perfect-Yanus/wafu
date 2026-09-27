import { Game } from './game';
import { asmrAudio } from './audio/AsmrAudioEngine';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiContainer = document.getElementById('ui-container') as HTMLElement;

  if (!canvas || !uiContainer) {
    console.error('Failed to locate canvas or ui-container elements');
    return;
  }

  // Initialize Game
  new Game(canvas, uiContainer);

  // Global user gesture unlock for audio (touch, click, pointer, key)
  const unlockGlobalAudio = () => {
    asmrAudio.unlock().then(() => {
      if (!asmrAudio.isBgmPlaying()) {
        asmrAudio.startBgm();
      }
    });
  };

  window.addEventListener('touchstart', unlockGlobalAudio, { passive: true, once: true });
  window.addEventListener('pointerdown', unlockGlobalAudio, { passive: true, once: true });
  window.addEventListener('mousedown', unlockGlobalAudio, { passive: true, once: true });
  window.addEventListener('click', unlockGlobalAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockGlobalAudio, { passive: true, once: true });
});
