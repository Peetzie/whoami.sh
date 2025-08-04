// Theme management
export const themes = {
  'catppuccin-mocha': {
    name: 'Catppuccin Mocha',
    description: '🍫 The darkest Catppuccin flavor with rich, deep colors'
  },
  'gruvbox': {
    name: 'Gruvbox',
    description: '🍂 Retro groove colors with warm earth tones'
  },
  'matrix': {
    name: 'Matrix',
    description: '💊 Green on black like the Matrix terminal'
  },
  'catppuccin-latte': {
    name: 'Catppuccin Latte',
    description: '☕ A warm, light theme perfect for daytime coding'
  }
};

let currentTheme = 'catppuccin-mocha'; // Default theme

export function getCurrentTheme() {
  return currentTheme;
}

export function setTheme(themeName) {
  if (!themes[themeName]) {
    return false;
  }
  
  currentTheme = themeName;
  
  // Apply theme to document
  if (themeName === 'catppuccin-mocha') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }
  
  // Save to localStorage, for adding the same theme when upon re-visits. 
  localStorage.setItem('terminal-theme', themeName);
  
  return true;
}

export function loadSavedTheme() {
  const savedTheme = localStorage.getItem('terminal-theme');
  if (savedTheme && themes[savedTheme]) {
    setTheme(savedTheme);
  }
}

export function getThemesList() {
  return Object.entries(themes).map(([key, theme]) => ({
    key,
    name: theme.name,
    description: theme.description
  }));
}