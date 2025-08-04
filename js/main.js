import { centerWindow, setupWindowControls } from './terminal-ui.js';
import { setupInput } from './terminal-events.js';
import { resetTerminal } from './terminal-logic.js';
import { loadSavedTheme } from './theme-manager.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing terminal UI...');

  loadSavedTheme();

  // Get all DOM elements
  const windowEl = document.querySelector('.window');
  const titleBar = windowEl.querySelector('.title-bar');
  const terminal = document.getElementById('terminal');
  const maximizeBtn = document.getElementById('maximize-btn');
  const hiddenInput = document.getElementById('hidden-input');

  // --- Initial Setup ---
  centerWindow(windowEl);
  resetTerminal(terminal);
  setupInput(hiddenInput, terminal);
  setupWindowControls(windowEl, null, null, maximizeBtn, null);

  // --- Event Listeners ---

  // Recenter on resize
  window.addEventListener('resize', () => {
    if (!windowEl.classList.contains('maximized')) {
      centerWindow(windowEl);
    }
  });

  console.log('Terminal UI setup complete. Ready for commands!');
});