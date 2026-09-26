import { Game } from './game';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiContainer = document.getElementById('ui-container') as HTMLElement;

  if (!canvas || !uiContainer) {
    console.error('Failed to locate canvas or ui-container elements');
    return;
  }

  // Initialize Game
  new Game(canvas, uiContainer);
});
