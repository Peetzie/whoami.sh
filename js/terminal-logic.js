import { showWelcomeMessage, typeAnimatedText } from './terminal-ui.js';
import { resetCommandHistory, commandHistory } from './terminal-events.js';
import { themes, getCurrentTheme, setTheme, getThemesList } from './theme-manager.js';

// Dynamic file system cache for autocomplete
export const fileSystemStructure = new Map();

// Get autocomplete suggestions for commands and files
export async function getAutocompleteSuggestions(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  const arg = parts[1] || '';

  // Command autocomplete
  if (parts.length === 1) {
    const allCommands = commandList.map(c => c.cmd);
    return allCommands.filter(c => c.startsWith(command));
  }

  // File/theme autocomplete for specific commands
  if (parts.length === 2) {
    switch (command) {
      case 'cat':
        return await getFileCompletions(arg);
      case 'themes':
        return getThemeCompletions(arg);
      case 'cd':
        return await getDirectoryCompletions(arg);
      default:
        return [];
    }
  }

  return [];
}

// -- Autocomplete Helper Functions --
async function getFileCompletions(partial) {
  const contents = await getDirectoryContents(currentDirectory);
  if (!contents) return [];
  
  return contents
    .filter(item => item.type === 'file' && item.name.startsWith(partial))
    .map(item => item.name);
}

function getThemeCompletions(partial) {
  const themeKeys = Object.keys(themes);
  return themeKeys.filter(t => t.startsWith(partial));
}

async function getDirectoryCompletions(partial) {
  const contents = await getDirectoryContents(currentDirectory);
  if (!contents) return [];
  
  const directories = contents
    .filter(item => item.type === 'dir' && item.name.startsWith(partial))
    .map(item => item.name);
  
  // Add special '..' completion if not in root
  if (currentDirectory !== '/' && '..'.startsWith(partial)) {
    directories.unshift('..');
  }
  
  return directories;
}

// Centralized command list for help and autocomplete
export const commandList = [
  { cmd: '.', desc: 'Open the source code repository from current directory' },
  { cmd: 'about', desc: 'Learn about me and my background' },
  { cmd: 'cat', desc: 'Display content of a file (e.g., cat README.md)' },
  { cmd: 'cd', desc: 'Change directory (e.g., cd js, cd ..)' },
  { cmd: 'clear', desc: 'Clear the terminal' },
  { cmd: 'echo', desc: 'Print text to the terminal' },
  { cmd: 'education', desc: 'Show my educational background' },
  { cmd: 'email', desc: 'Open your email client to contact me' },
  { cmd: 'github', desc: 'Open my GitHub profile' },
  { cmd: 'help', desc: 'Show this help message' },
  { cmd: 'history', desc: 'Show command history' },
  { cmd: 'linkedin', desc: 'Open my LinkedIn profile' },
  { cmd: 'ls', desc: 'List directory contents' },
  { cmd: 'pwd', desc: 'Print current working directory' },
  { cmd: 'themes', desc: 'Change the terminal theme (coming soon)' },
  { cmd: 'welcome', desc: 'Display the welcome message' },
  { cmd: 'whoami', desc: 'Display the current user' },
];

let currentDirectory = '/'; // Initial directory - Simulating standard Home directory of UNIX systems
const fileSystemCache = new Map(); // Save responses

// Export current directory getter
export function getCurrentDirectory() {
  return currentDirectory;
}

// --- GitHub API Helper ---
async function getDirectoryContents(path) {
  if (fileSystemCache.has(path)) {
    return fileSystemCache.get(path);
  }
  try {
    const response = await fetch(`https://api.github.com/repos/Peetzie/whoami.sh/contents${path}`);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const data = await response.json();
    fileSystemCache.set(path, data);
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getFileContent(path) {
  if (fileSystemCache.has(path)) {
    const cachedData = fileSystemCache.get(path);
    // Ensure we're not returning directory data from cache
    if (cachedData.content) {
      try {
        return atob(cachedData.content);
      } catch (e) {
        console.error('Error decoding cached content:', e);
        return 'Error: Could not decode file content.';
      }
    }
  }
  try {
    const response = await fetch(`https://api.github.com/repos/Peetzie/whoami.sh/contents${path}`);
    if (!response.ok) {
      return null; // File not found or other error
    }
    const data = await response.json();
    if (data.type !== 'file' || !data.content) {
      return null; // It's a directory or has no content
    }
    fileSystemCache.set(path, data);
    return atob(data.content); // Decode base64 content
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function resetTerminal(terminal) {
  // Clear existing content
  terminal.innerHTML = '';
  showWelcomeMessage(terminal);
  resetCommandHistory();
  
  // Reset directory state
  currentDirectory = '/';
  fileSystemCache.clear();
  
  // Create the initial prompt
  const prompt = document.createElement('div');
  prompt.className = 'line prompt';
  prompt.innerHTML = `
    <span class="prompt-user">guest</span>@<span class="prompt-host">peetzie</span>:<span class="prompt-dir">~</span><span class="prompt-symbol">$</span> <span id="user-input"></span><span class="cursor">|</span>
  `;
  terminal.appendChild(prompt);
}

// Main navigation based on commands
export async function handleCommand(input, terminal) {
  const trimmedInput = input.trim();
  const [command, ...args] = trimmedInput.split(' ');
  const normalizedCommand = command.toLowerCase();

  // --- Main Command Switch ---
  switch (normalizedCommand) {
    case '.':
      const repoResponse = document.createElement('div');
      repoResponse.className = 'line';
      repoResponse.textContent = `Opening directory '${currentDirectory}' in repository...`;
      terminal.appendChild(repoResponse);
      // Construct the URL based on the current directory
      const repoUrl = `https://github.com/Peetzie/whoami.sh/tree/main${currentDirectory}`;
      setTimeout(() => window.open(repoUrl, '_blank'), 700);
      break;

    case 'ls':
      const contents = await getDirectoryContents(currentDirectory);
      if (contents) {
        contents.forEach(item => {
          const itemLine = document.createElement('div');
          itemLine.className = 'line';
          if (item.type === 'dir') {
            itemLine.innerHTML = `<span class="dir">${item.name}</span>`;
          } else {
            itemLine.textContent = item.name;
          }
          terminal.appendChild(itemLine);
        });
      } else {
        const errorLine = document.createElement('div');
        errorLine.className = 'line';
        errorLine.textContent = 'Error: Could not list directory contents.';
        terminal.appendChild(errorLine);
      }
      break;

    case 'cat':
      const filename = args[0];
      if (!filename) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'line';
        errorDiv.innerHTML = `❌ Usage: <span class="cmd">cat &lt;filename&gt;</span>`;
        terminal.appendChild(errorDiv);
        
        const tipDiv = document.createElement('div');
        tipDiv.className = 'line pro-tip';
        tipDiv.innerHTML = `💡 Try: <span class="cmd">cat README.md</span> or <span class="cmd">ls</span> to see available files`;
        terminal.appendChild(tipDiv);
        break;
      }

      // Construct the full file path
      const filePath = currentDirectory === '/' ? `/${filename}` : `${currentDirectory}/${filename}`;
      
      // Fetch file content from GitHub API
      const fileContent = await getFileContent(filePath);
      
      if (fileContent !== null) {
        const fileDiv = document.createElement('pre');
        fileDiv.className = 'line file-content';
        fileDiv.style.whiteSpace = 'pre-wrap';
        fileDiv.style.color = 'var(--foreground)';
        fileDiv.style.marginLeft = '0';
        fileDiv.style.fontFamily = 'inherit';
        fileDiv.style.maxHeight = '400px';
        fileDiv.style.overflow = 'auto';
        fileDiv.textContent = fileContent;
        terminal.appendChild(fileDiv);
      } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'line';
        errorDiv.innerHTML = `❌ File '<span class="cmd">${filename}</span>' not found or cannot be read.`;
        terminal.appendChild(errorDiv);
        
        // Show available files in current directory
        const contents = await getDirectoryContents(currentDirectory);
        if (contents) {
          const availableFiles = contents.filter(item => item.type === 'file').map(item => item.name);
          if (availableFiles.length > 0) {
            const tipDiv = document.createElement('div');
            tipDiv.className = 'line pro-tip';
            tipDiv.innerHTML = `💡 Available files: ${availableFiles.map(f => `<span class="cmd">${f}</span>`).join(', ')}`;
            terminal.appendChild(tipDiv);
          }
        }
      }
      break;

    case 'cd':
      const targetDir = args[0] || '/';
      let newPath;

      if (targetDir === '..') {
        newPath = currentDirectory.substring(0, currentDirectory.lastIndexOf('/')) || '/';
      } else if (targetDir.startsWith('/')) {
        newPath = targetDir;
      } else {
        newPath = currentDirectory === '/' ? `/${targetDir}` : `${currentDirectory}/${targetDir}`;
      }

      // Verify the new path is a directory
      const parentPath = newPath.substring(0, newPath.lastIndexOf('/')) || '/';
      const dirName = newPath.substring(newPath.lastIndexOf('/') + 1);
      const parentContents = await getDirectoryContents(parentPath);
      const targetIsDirectory = parentContents && parentContents.find(item => item.name === dirName && item.type === 'dir');

      if (newPath === '/' || targetIsDirectory) {
        currentDirectory = newPath;
      } else {
        const errorLine = document.createElement('div');
        errorLine.className = 'line';
        errorLine.textContent = `cd: no such file or directory: ${targetDir}`;
        terminal.appendChild(errorLine);
      }
      break;

    case 'clear':
      terminal.innerHTML = '';
      const prompt = document.createElement('div');
      prompt.className = 'line prompt';
      const dirDisplay = currentDirectory === '/' ? '~' : `~${currentDirectory}`;
      prompt.innerHTML = `
        <span class="prompt-user">guest</span>@<span class="prompt-host">peetzie</span>:<span class="prompt-dir">${dirDisplay}</span><span class="prompt-symbol">$</span> <span id="user-input"></span><span class="cursor">|</span>
      `;
      terminal.appendChild(prompt);
      return { clear: true };

    case 'help':
      const title = document.createElement('div');
      title.className = 'line';
      title.textContent = 'Available commands:';
      terminal.appendChild(title);
      terminal.appendChild(document.createElement('br')); 

      commandList.forEach(({ cmd, desc }) => {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'line help-line';
        helpDiv.innerHTML = `
          <span class="cmd">${cmd}</span>
          <span class="cmd-desc">* ${desc}</span>
        `;
        terminal.appendChild(helpDiv);
      });

      const tipContainer = document.createElement('div');
      tipContainer.className = 'line';
      tipContainer.style.marginTop = '1em'; 
      tipContainer.innerHTML = `
        <div class="line pro-tip">✨ Pro-Tip: Use <span class="cmd">Ctrl+L</span> to clear the terminal screen.</div>
        <div class="line pro-tip">✨ Pro-Tip: Use <span class="cmd">Ctrl+U</span> to autocomplete commands.</div>
      `;
      terminal.appendChild(tipContainer);
      
      break;

    case 'history':
      commandHistory.forEach((cmd, i) => {
        const historyLine = document.createElement('div');
        historyLine.className = 'line';
        historyLine.innerHTML = `<span style="color: var(--comment);">${i + 1}</span>&nbsp;&nbsp;${cmd}`;
        terminal.appendChild(historyLine);
      });
      break;

    case 'github':
      const githubResponse = document.createElement('div');
      githubResponse.className = 'line';
      githubResponse.textContent = 'Opening GitHub profile in a new window...';
      terminal.appendChild(githubResponse);
      setTimeout(() => window.open('https://github.com/Peetzie', '_blank'), 700);
      break;

    case 'linkedin':
      const linkedInResponse = document.createElement('div');
      linkedInResponse.className = 'line';
      linkedInResponse.textContent = 'Opening LinkedIn profile...';
      terminal.appendChild(linkedInResponse);
      setTimeout(() => window.open('https://www.linkedin.com/in/frederikpeetzschoularsen/', '_blank'), 700);
      break;

    case 'pwd':
      const pwdLine = document.createElement('div');
      pwdLine.className = 'line';
      pwdLine.textContent = `/home/guest${currentDirectory === '/' ? '' : currentDirectory}`;
      terminal.appendChild(pwdLine);
      break;

    case 'themes':
      // Inspect input, to evlauate to either change theme or list themes 
      const themeArg = args[0];
      
      if (!themeArg) {
        // List all available themes
        const currentTheme = getCurrentTheme();
        const themesList = getThemesList();
        
        const themeTitle = document.createElement('div');
        themeTitle.className = 'line';
        themeTitle.innerHTML = `🎨 Available Themes (Current: <span class="cmd">${themes[currentTheme].name}</span>):`;
        terminal.appendChild(themeTitle);
        
        terminal.appendChild(document.createElement('br'));
        
        themesList.forEach(({ key, name, description }) => {
          const themeDiv = document.createElement('div');
          themeDiv.className = 'line help-line';
          const isActive = key === currentTheme ? ' ✓' : '';
          themeDiv.innerHTML = `
            <span class="cmd">${key}${isActive}</span>
            <span class="cmd-desc">${description}</span>
          `;
          terminal.appendChild(themeDiv);
        });
        
        const usageDiv = document.createElement('div');
        usageDiv.className = 'line';
        usageDiv.style.marginTop = '1em';
        usageDiv.innerHTML = `
          <div class="line pro-tip">💡 Usage: <span class="cmd">themes &lt;theme-name&gt;</span> to switch themes</div>
          <div class="line pro-tip">💡 Examples:</div>
          <div class="line pro-tip">   • <span class="cmd">themes catppuccin-mocha</span> - Switch to dark Catppuccin theme</div>
          <div class="line pro-tip">   • <span class="cmd">themes catppuccin-latte</span> - Switch to light theme</div>
          <div class="line pro-tip">   • <span class="cmd">themes gruvbox</span> - Switch to retro Gruvbox theme</div>
          <div class="line pro-tip">   • <span class="cmd">themes matrix</span> - Switch to Matrix green theme</div>
        `;
        terminal.appendChild(usageDiv);
        
      } else {
        // Set the specified theme
        const success = setTheme(themeArg);
        
        if (success) {
          const successDiv = document.createElement('div');
          successDiv.className = 'line';
          successDiv.innerHTML = `✨ Theme changed to <span class="cmd">${themes[themeArg].name}</span>! ${themes[themeArg].description}`;
          terminal.appendChild(successDiv);
        } else {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'line';
          errorDiv.innerHTML = `❌ Theme '<span class="cmd">${themeArg}</span>' not found. Use <span class="cmd">themes</span> to see available themes.`;
          terminal.appendChild(errorDiv);
        }
      }
      break;

    case 'welcome':
      showWelcomeMessage(terminal);
      break;

    case 'whoami':
      const whoamiLine = document.createElement('div');
      whoamiLine.className = 'line';
      whoamiLine.textContent = 'guest';
      terminal.appendChild(whoamiLine);
      break;

    case 'about':
      const age = calculateAge('1996-10-17');
      const aboutText = 
        `👋 Hey there! I'm a ${age}-year-old tech enthusiast from Denmark\n` +
        `🎓 I hold a Bachelor's in Software Technology and recently completed my Master's in Human-Centered AI with a focus on big data analytics.\n\n` +
        `💼 Currently working at PwC for over a year, specializing in the intersection of data science and IT auditing (ISAE 3402/3000). I love bridging the gap between complex data insights and practical business solutions! 📊\n\n` +
        `🏠 Based in Hedehusene, when I'm not coding or crunching data, you'll find me:\n` +
        `🏃‍♂️ Running through scenic Danish landscapes\n` +
        `👨‍🍳 Experimenting with new recipes in the kitchen\n` +
        `🍻 Enjoying good times with friends and family\n\n` +
        `💡 Always curious about emerging tech and passionate about creating meaningful digital experiences! ✨`;
      
      const aboutLine = document.createElement('pre');
      aboutLine.className = 'line';
      aboutLine.style.whiteSpace = 'pre-wrap';
      aboutLine.style.lineHeight = '1.6';
      aboutLine.textContent = aboutText;
      terminal.appendChild(aboutLine);
      break;

    case 'education':
      const educationText = 
        `🎓 Educational Journey:\n\n` +
        `🎯 Master of Science in Human-Centered AI (2023-2024) 🤖\n` +
        `   📍 Specialization: Big Data Analytics\n` +
        `   📝 Thesis: Relationship Extraction using Large Language Models\n` +
        `   🔍 Focus Areas: Neural Networks, ML Ops, Image & Video Analysis\n` +
        `   🛠️ Technologies: PyTorch, PyTorch Lightning, HuggingFace, Weights & Biases, Python\n` +
        `   💡 Bridging the gap between AI research and practical applications\n\n` +
        `💻 Bachelor of Science in Software Technology (2020-2023) 🚀\n` +
        `   📍 Foundation: Full-stack development & system architecture\n` +
        `   🛠️ Technologies: Java, Python, JavaScript, SQL databases\n` +
        `   🔐 Bachelor Project: Cybersecurity-focused local HaveIBeenPwned implementation\n` +
        `   🏗️ Tech Stack: Java with Maven, Redis, SQL databases\n\n` +
        `📚 Continuous Learning & Professional Development:\n` +
        `   🤖 Advanced machine learning techniques\n` +
        `   📊 PowerBI for business intelligence & data visualization\n` +
        `   🔧 Alteryx for data preparation and analytics\n` +
        `   ☁️ Databricks for large-scale data processing\n` +
        `   🔐 Cybersecurity frameworks and audit methodologies\n\n` +
        `🏆 Always expanding expertise to tackle complex data challenges! 🌟`;
      
      const educationLine = document.createElement('pre');
      educationLine.className = 'line';
      educationLine.style.whiteSpace = 'pre-wrap';
      educationLine.style.lineHeight = '1.6';
      educationLine.textContent = educationText;
      terminal.appendChild(educationLine);
      break;

    case 'email':
      const emailResponse = document.createElement('div');
      emailResponse.className = 'line';
      emailResponse.textContent = 'Opening email client...';
      terminal.appendChild(emailResponse);
      setTimeout(() => window.open('mailto:flarsen.uphold283@simplelogin.com', '_self'), 700); // Use _self to prevent new window and use client. 
      break;

    case 'echo':
      const echoText = args.join(' ');
      const echoLine = document.createElement('div');
      echoLine.className = 'line';
      echoLine.textContent = echoText || '';
      terminal.appendChild(echoLine);
      break;

    default:
      // Handle multi-word commands
      if (trimmedInput.toLowerCase() === 'about me') {
        const age = calculateAge('1996-10-17');
        const aboutText =
          `I'm ${age} years old with a Bachelor in Software Technology and a Master's in Human-Centered AI focused on big data. ` +
          `I have over a year of experience at PwC, working at the intersection of data science and IT audits (ISAE 3402/3000). ` +
          `Based in Hedehusene, I enjoy running, cooking, and value an active social life.`;
        typeAnimatedText(terminal, aboutText);
        break;
      }
      // Handle unknown commands
      const defaultResponse = document.createElement('div');
      defaultResponse.className = 'line';
      defaultResponse.textContent = `Command not found: ${trimmedInput}`;
      terminal.appendChild(defaultResponse);
      break;
  }

  // Return the outcome and the current state of the directory
  return { clear: false, currentDirectory };
}

// Helper function to calculate age for the about me function, to ensure its updated as per todays date. 
function calculateAge(birthDateString) {
  const birth = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}