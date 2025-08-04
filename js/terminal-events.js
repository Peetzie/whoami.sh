import { handleCommand, commandList, getAutocompleteSuggestions, getCurrentDirectory } from './terminal-logic.js';

export let commandHistory = []; 
let historyIndex = -1;   
let autocompleteSuggestions = [];
let autocompleteIndex = -1;
let autocompleteBaseInput = '';


export function resetCommandHistory() {
  commandHistory = [];
  historyIndex = -1;
}

// Helper function to create prompt with current directory
function createPromptHTML(currentDirectory, includeInput = true) {
  const dirDisplay = currentDirectory === '/' ? '~' : `~${currentDirectory}`;
  const inputSpan = includeInput ? '<span id="user-input"></span><span class="cursor">|</span>' : '';
  // The space is now outside the span, right before the input area
  return `<span class="prompt-user">guest</span>@<span class="prompt-host">peetzie</span>:<span class="prompt-dir">${dirDisplay}</span><span class="prompt-symbol">$</span> ${inputSpan}`;
}

// Initialize input handling for the terminal interface
export function setupInput(hiddenInput, terminal) {
  // Focus the hidden input when the terminal is clicked
  terminal.addEventListener('click', (e) => {
    // Only focus if not clicking on a link or interactive element
    if (!e.target.closest('a, button')) {
      hiddenInput.focus();
    }
  });

  // Update the visible user input span to reflect typed characters in real time
  hiddenInput.addEventListener('input', () => {
    const userInputSpan = document.getElementById('user-input');
    if (userInputSpan) {
      userInputSpan.textContent = hiddenInput.value;
    }
    resetAutocompleteState();
  });

  // Handle keydown for arrows and Enter 
  hiddenInput.addEventListener('keydown', async (e) => {
    const userInputSpan = document.getElementById('user-input');

    // Enhanced autocomplete with Ctrl+U cycling
    if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      const currentInput = hiddenInput.value.trim();
      if (!currentInput) return;

      // Check if we're continuing an autocomplete session, if so we can resume the cycle
      if (autocompleteSuggestions.length > 0 && autocompleteBaseInput === getBaseInput(currentInput)) {
        cycleToNextSuggestion(hiddenInput, userInputSpan);
      } else {
        startNewAutocompleteSession(currentInput, hiddenInput, userInputSpan, terminal);
      }
      return;
    }

    // Reset autocomplete on any other key (except Ctrl+U)
    if (!e.ctrlKey || e.key.toLowerCase() !== 'u') {
      resetAutocompleteState();
    }

    // Clear screen shortcut -- Normal UNIX style cmd line. 
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      
      // Reset autocomplete state first
      resetAutocompleteState();
      
      // Clear input
      terminal.innerHTML = '';
      const prompt = document.createElement('div');
      prompt.className = 'line prompt';
      prompt.innerHTML = createPromptHTML(getCurrentDirectory());
      terminal.appendChild(prompt);
      hiddenInput.value = '';
      
      const userInputSpan = document.getElementById('user-input');
      if (userInputSpan) userInputSpan.textContent = '';
      
      hiddenInput.focus();
      return;
    }

    // History navigation (up/down arrows)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        historyIndex++;
        const historicalCommand = commandHistory[commandHistory.length - 1 - historyIndex];
        hiddenInput.value = historicalCommand;
        if (userInputSpan) userInputSpan.textContent = historicalCommand;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        const historicalCommand = commandHistory[commandHistory.length - 1 - historyIndex];
        hiddenInput.value = historicalCommand;
        if (userInputSpan) userInputSpan.textContent = historicalCommand;
      } else if (historyIndex === 0) {
        historyIndex = -1;
        hiddenInput.value = '';
        if (userInputSpan) userInputSpan.textContent = '';
      }
    }

    // Enter key - execute command
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Clear any autocomplete displays before executing command
      resetAutocompleteState();
      
      const command = hiddenInput.value.trim();
      
      if (command) {
        commandHistory.push(command);
        historyIndex = -1;

        // Edge Case handling for clear command - don't show command echo
        if (command.toLowerCase() === 'clear') {
          // Just execute the command without showing it
          try {
            const result = await handleCommand(command, terminal);
            if (result && result.clear) {
              // Clear was successful, don't add new prompt
              hiddenInput.value = '';
              hiddenInput.focus();
              return;
            }
          } catch (error) {
            console.error('Command execution error:', error);
          }
          return;
        }

        // Create command echo for all other commands
        const commandEcho = document.createElement('div');
        commandEcho.className = 'line';
        commandEcho.innerHTML = createPromptHTML(getCurrentDirectory(), false) + command;
        
        // Insert before current prompt
        const currentPrompt = userInputSpan.closest('.prompt');
        if (currentPrompt) {
          currentPrompt.insertAdjacentElement('beforebegin', commandEcho);
          // Remove the old prompt completely
          currentPrompt.remove();
        } else {
          terminal.appendChild(commandEcho);
        }

        // Execute command
        try {
          const result = await handleCommand(command, terminal);
          if (result && result.clear) {
            // If clear was called, don't add a new prompt
            return;
          }
        } catch (error) {
          console.error('Command execution error:', error);
          const errorDiv = document.createElement('div');
          errorDiv.className = 'line';
          errorDiv.style.color = 'var(--red)';
          errorDiv.textContent = 'Error executing command.';
          terminal.appendChild(errorDiv);
        }

        // Create new prompt with consistent spacing
        const newPrompt = document.createElement('div');
        newPrompt.className = 'line prompt';
        newPrompt.innerHTML = createPromptHTML(getCurrentDirectory());
        terminal.appendChild(newPrompt);
        hiddenInput.value = '';
        
        terminal.scrollTop = terminal.scrollHeight;
        

        hiddenInput.focus();
      }
    }
  });

  // -- Helper functions for autocomplete cycling -- 
  function resetAutocompleteState() {
    autocompleteSuggestions = [];
    autocompleteIndex = -1;
    autocompleteBaseInput = '';
    
    // Remove any existing completion displays when resetting
    const existingCompletions = terminal.querySelectorAll('.completion-suggestions, .completion-indicator');
    existingCompletions.forEach(el => el.remove());
  }

  function getBaseInput(input) {
    const parts = input.trim().split(' ');
    if (parts.length === 1) {
      return ''; // For command completion
    } else {
      return parts.slice(0, -1).join(' ');
    }
  }

  function startNewAutocompleteSession(currentInput, hiddenInput, userInputSpan, terminal) {
    (async () => {
      const suggestions = await getAutocompleteSuggestions(currentInput);
      
      if (suggestions.length === 0) {
        // No matches
        showNoMatchesMessage(terminal, userInputSpan);
        return;
      }

      // Initialize autocomplete session
      autocompleteSuggestions = suggestions;
      autocompleteIndex = 0;
      autocompleteBaseInput = getBaseInput(currentInput);

      if (suggestions.length === 1) {
        // Single match: complete it immediately
        applyCompletion(hiddenInput, userInputSpan, suggestions[0]);
        resetAutocompleteState(); 
      } else {
        // Multiple matches: show first one and display all options, use logic above (up and down to reference)
        applyCompletion(hiddenInput, userInputSpan, suggestions[0]);
        showCompletionOptions(terminal, userInputSpan, suggestions, 0);
      }
    })();
  }

  function cycleToNextSuggestion(hiddenInput, userInputSpan) {
    if (autocompleteSuggestions.length === 0) return;

    autocompleteIndex = (autocompleteIndex + 1) % autocompleteSuggestions.length;
    applyCompletion(hiddenInput, userInputSpan, autocompleteSuggestions[autocompleteIndex]);
    
    // Update the completion display with new index
    showCompletionOptions(terminal, userInputSpan, autocompleteSuggestions, autocompleteIndex);
  }

  function applyCompletion(hiddenInput, userInputSpan, completion) {
    const parts = hiddenInput.value.trim().split(' ');
    
    if (parts.length === 1) {
      hiddenInput.value = completion + ' ';
    } else {
      parts[parts.length - 1] = completion;
      hiddenInput.value = parts.join(' ') + ' ';
    }
    
    if (userInputSpan) userInputSpan.textContent = hiddenInput.value;
    setTimeout(() => hiddenInput.setSelectionRange(hiddenInput.value.length, hiddenInput.value.length), 0);
  }

  function showCompletionOptions(terminal, userInputSpan, suggestions, currentIndex) {
    // Remove any existing completion displays
    const existingCompletions = terminal.querySelectorAll('.completion-suggestions, .completion-indicator');
    existingCompletions.forEach(el => el.remove());

    // Show all suggestions from autosuggest
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'line completion-suggestions';
    suggestionsDiv.style.color = 'var(--cyan)';
    suggestionsDiv.textContent = suggestions.join('   ');
    
    // Show current selection indicator
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'line completion-indicator';
    indicatorDiv.style.color = 'var(--yellow)';
    indicatorDiv.innerHTML = `[${currentIndex + 1}/${suggestions.length}] <span class="cmd">${suggestions[currentIndex]}</span> - Press Ctrl+U to cycle`;
    
    const currentPrompt = userInputSpan.closest('.prompt');
    if (currentPrompt) {
      // Insert AFTER the current prompt, not before
      currentPrompt.insertAdjacentElement('afterend', suggestionsDiv);
      suggestionsDiv.insertAdjacentElement('afterend', indicatorDiv);
    } else {
      terminal.appendChild(suggestionsDiv);
      terminal.appendChild(indicatorDiv);
    }
    
    terminal.scrollTop = terminal.scrollHeight;
  }

  function showNoMatchesMessage(terminal, userInputSpan) {
    const noMatchDiv = document.createElement('div');
    noMatchDiv.className = 'line';
    noMatchDiv.style.color = 'var(--comment)';
    noMatchDiv.textContent = 'No completions found';
    
    const currentPrompt = userInputSpan.closest('.prompt');
    if (currentPrompt) {
      // Insert AFTER the current prompt, not before
      currentPrompt.insertAdjacentElement('afterend', noMatchDiv);
    } else {
      terminal.appendChild(noMatchDiv);
    }
    terminal.scrollTop = terminal.scrollHeight;
  }

  // Initially focus the hidden input
  hiddenInput.focus();
}
