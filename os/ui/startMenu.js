let startMenuElement = null;
let isVisible = false;
let osRef = null; // Store OS reference

function initializeStartMenu(os) {
    console.log("Start Menu Initialized");
    osRef = os; // Store reference to OS
    startMenuElement = document.createElement('div');
    startMenuElement.id = 'start-menu';
    // Styles applied via CSS

    // Build the static part of the menu structure
    startMenuElement.innerHTML = `
        <div class="start-menu-sidebar"></div>
        <ul class="start-menu-main">
            <li data-action="programs">Programs ▶</li>
            <li data-action="documents">Documents</li>
            <li data-action="settings">Settings</li>
            <li data-action="find">Find</li>
            <li data-action="help">Help</li>
            <li data-action="run">Run...</li>
            <li class="separator"></li>
            <li data-action="shutdown">Shut Down...</li>
        </ul>
        <div id="programs-submenu" class="submenu"></div>
    `; // Added sidebar, main list, and programs submenu container

    document.body.appendChild(startMenuElement); // Add to body, initially hidden

    // Add listener to close menu when clicking outside
    document.addEventListener('mousedown', handleClickOutside, true);

    return {
        toggle,
        hide, // Expose hide function
    };
}

function toggle() {
    if (!startMenuElement) return;
    isVisible = !isVisible;
    startMenuElement.style.display = isVisible ? 'flex' : 'none'; // Use flex for layout
    if (isVisible) {
        populateProgramsMenu();
        // Add click listeners to main menu items
        addMainMenuListeners();
    } else {
        // Hide any open submenus when hiding the main menu
        hideSubmenus();
    }
    console.log(`Start Menu ${isVisible ? 'shown' : 'hidden'}`);
}

function hide() {
     if (!startMenuElement || !isVisible) return;
     isVisible = false;
     startMenuElement.style.display = 'none';
     hideSubmenus(); // Also hide submenus
     console.log("Start Menu hidden");
}

function populateProgramsMenu() {
    const programsSubmenu = document.getElementById('programs-submenu');
    if (!programsSubmenu || !osRef || !osRef.apps) return;

    programsSubmenu.innerHTML = ''; // Clear previous items
    const ul = document.createElement('ul');

    Object.values(osRef.apps).forEach(appInfo => {
        const li = document.createElement('li');
        li.textContent = appInfo.name;
        li.dataset.appId = appInfo.id; // Store app ID
        // Set icon if available
        if (appInfo.icon) {
            // Construct the path relative to index.html, using the os/ui/icons base
            const iconPath = `os/ui/icons/${appInfo.icon}`;
            // Add style to the ::before pseudo-element (requires CSS changes or direct style manipulation)
            // For simplicity, let's add a class or data attribute and handle in CSS
             li.style.setProperty('--icon-url', `url('${iconPath}')`);
        }

        li.addEventListener('click', (e) => {
            e.stopPropagation();
            osRef.launchApp(appInfo.id);
            hide(); // Hide menu after launching
        });
        ul.appendChild(li);
    });
    programsSubmenu.appendChild(ul);
}

function addMainMenuListeners() {
    const mainMenuItems = startMenuElement.querySelectorAll('.start-menu-main > li');
    mainMenuItems.forEach(item => {
        // Remove old listener before adding new one to prevent duplicates
        item.removeEventListener('click', handleMainMenuItemClick);
        item.addEventListener('click', handleMainMenuItemClick);

        // Handle hover for submenu display
        item.removeEventListener('mouseenter', handleMainMenuHover);
        item.addEventListener('mouseenter', handleMainMenuHover);
    });
}

function handleMainMenuItemClick(event) {
     event.stopPropagation();
     const action = event.currentTarget.dataset.action;
     console.log(`Start Menu Action: ${action}`);

     switch (action) {
         case 'programs':
             // Handled by hover now
             break;
         case 'settings':
             // Launch settings app if available
             if (osRef.apps['settings']) {
                 osRef.launchApp('settings');
             } else {
                 alert("Settings app not found.");
             }
             hide();
             break;
         case 'shutdown':
             // Placeholder action
             alert("Shutting down is not implemented in this simulation.");
             hide();
             break;
         // Add cases for other actions later
         default:
             // For items without specific actions yet
             alert(`Action "${action}" not implemented.`);
             hide();
             break;
     }
}

function handleMainMenuHover(event) {
    hideSubmenus(); // Hide other submenus first
    const action = event.currentTarget.dataset.action;
    if (action === 'programs') {
        const programsSubmenu = document.getElementById('programs-submenu');
        if (programsSubmenu) {
            programsSubmenu.style.display = 'block';
            // Position submenu next to the 'Programs' item (basic positioning)
            const mainItemRect = event.currentTarget.getBoundingClientRect();
            const menuRect = startMenuElement.getBoundingClientRect();
            programsSubmenu.style.left = `${menuRect.width - 4}px`; // Adjust based on borders/padding
            programsSubmenu.style.top = `${mainItemRect.top - menuRect.top}px`;
        }
    }
}

function hideSubmenus() {
    const submenus = startMenuElement.querySelectorAll('.submenu');
    submenus.forEach(submenu => submenu.style.display = 'none');
}


function handleClickOutside(event) {
    if (!startMenuElement || !isVisible) return;

    const startButton = document.getElementById('start-button');
    // Check if the click was outside the menu AND outside the start button
    if (!startMenuElement.contains(event.target) && event.target !== startButton && !startButton.contains(event.target)) {
        hide();
    }
}

// Cleanup listener on unload (optional but good practice)
window.addEventListener('unload', () => {
    document.removeEventListener('mousedown', handleClickOutside, true);
});


export { initializeStartMenu };
