let osRef = null;
let taskbarElement = null;
let runningAppsContainer = null; // Element to hold running app buttons

function initializeTaskbar(os) {
    console.log("Taskbar Initialized");
    osRef = os;
    taskbarElement = document.getElementById('taskbar');
    if (!taskbarElement) {
        console.error("Taskbar element not found in HTML!");
        return null;
    }

    // Basic taskbar styling (enhance in CSS)
    taskbarElement.style.position = 'absolute';
    taskbarElement.style.bottom = '0';
    taskbarElement.style.left = '0';
    taskbarElement.style.width = '100%';
    taskbarElement.style.height = '30px'; // Standard taskbar height
    taskbarElement.style.backgroundColor = '#c0c0c0'; // Win95 grey
    taskbarElement.style.borderTop = '2px outset #fff';
    taskbarElement.style.zIndex = '100'; // Keep above most elements
    taskbarElement.style.display = 'flex';
    taskbarElement.style.alignItems = 'center';
    taskbarElement.style.padding = '2px'; // Adjust padding slightly
    taskbarElement.style.boxSizing = 'border-box';

    // --- Start Button ---
    const startButton = document.createElement('button');
    startButton.id = 'start-button';
    startButton.innerHTML = '<b>Start</b>'; // Basic bold text
    // Apply Win95 button styles via CSS later
    startButton.style.height = 'calc(100% - 4px)'; // Fit vertically
    startButton.style.marginRight = '5px';
    startButton.style.cursor = 'pointer';
    startButton.onclick = (e) => {
        e.stopPropagation(); // Prevent click bubbling to document listener
        if (osRef && osRef.startMenu) {
            osRef.startMenu.toggle();
        } else {
            console.error("Start Menu not initialized on OS object.");
        }
    };
    taskbarElement.appendChild(startButton);


    // --- Container for running app buttons ---
    runningAppsContainer = document.createElement('div');
    runningAppsContainer.className = 'running-apps';
    runningAppsContainer.style.display = 'flex';
    runningAppsContainer.style.height = '100%';
    runningAppsContainer.style.marginLeft = '5px'; // Space from start button
    runningAppsContainer.style.flexGrow = '1'; // Allow it to take available space
    taskbarElement.appendChild(runningAppsContainer);

    // --- Clock/System Tray Area ---
    const sysTray = document.createElement('div');
    sysTray.id = 'system-tray';
    sysTray.style.border = '1px inset #fff'; // Sunken effect
    sysTray.style.boxShadow = 'inset 1px 1px 0 #808080';
    sysTray.style.padding = '2px 5px';
    sysTray.style.marginLeft = 'auto'; // Push to the right
    sysTray.style.height = 'calc(100% - 4px)';
    sysTray.style.display = 'flex';
    sysTray.style.alignItems = 'center';

    const clockElement = document.createElement('span');
    clockElement.id = 'clock';
    sysTray.appendChild(clockElement);
    taskbarElement.appendChild(sysTray);

    // Update clock every second
    updateClock(clockElement);
    setInterval(() => updateClock(clockElement), 1000);


    return {
        addRunningApp,
        removeRunningApp,
        setButtonState, // Expose state setting
    };
}

function updateClock(element) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    element.textContent = timeString;
}

function addRunningApp(appInfo) {
    if (!runningAppsContainer) return;

    // Check if button already exists
    if (runningAppsContainer.querySelector(`#taskbar-btn-${appInfo.id}`)) {
        return; // Already added
    }

    const appButton = document.createElement('button');
    appButton.id = `taskbar-btn-${appInfo.id}`;
    appButton.className = 'taskbar-button';
    appButton.textContent = appInfo.name;
    // Basic styling (enhance in CSS)
    appButton.style.marginLeft = '3px';
    appButton.style.padding = '2px 8px';
    appButton.style.height = 'calc(100% - 6px)'; // Fit within taskbar padding
    appButton.style.border = '2px outset #fff';
    appButton.style.backgroundColor = '#c0c0c0';
    appButton.style.cursor = 'pointer';
    appButton.style.whiteSpace = 'nowrap';
    appButton.style.overflow = 'hidden';
    appButton.style.textOverflow = 'ellipsis';
    appButton.style.maxWidth = '150px'; // Prevent overly long buttons
    appButton.dataset.appId = appInfo.id; // Store appId for reference

    appButton.onclick = () => {
        const windowId = osRef.runningApps[appInfo.id]?.windowId;
        const windowEl = windowId ? document.getElementById(windowId) : null;

        // If window exists and is minimized (hidden), restore it
        if (windowEl && windowEl.style.display === 'none') {
             if (osRef.windowManager && typeof osRef.windowManager.restoreWindow === 'function') {
                 osRef.windowManager.restoreWindow(windowId);
             } else {
                 console.error("restoreWindow function not found on windowManager");
             }
        }
        // If window exists and is visible, just focus it
        else if (windowEl) {
             osRef.windowManager.focusWindow(windowId);
        }
        // If window doesn't exist (e.g., button lingered after error), try launching
        else {
            console.warn(`Window for ${appInfo.id} not found, attempting re-launch.`);
            osRef.launchApp(appInfo.id);
        }
    };

    runningAppsContainer.appendChild(appButton);
    setButtonState(appInfo.id, 'active'); // Initial state
}

function removeRunningApp(appId) {
    if (!runningAppsContainer) return;
    const appButton = runningAppsContainer.querySelector(`#taskbar-btn-${appId}`);
    if (appButton) {
        appButton.remove();
    }
}

// Function to update taskbar button appearance (e.g., pressed in when minimized)
function setButtonState(appId, state) {
    const appButton = runningAppsContainer.querySelector(`#taskbar-btn-${appId}`);
    if (!appButton) return;

    // Remove existing state classes/styles
    appButton.classList.remove('minimized', 'active', 'focused');
    appButton.style.borderStyle = 'outset'; // Default

    // Apply new state
    if (state === 'minimized') {
        appButton.classList.add('minimized');
        appButton.style.borderStyle = 'inset'; // Pressed in look
    } else if (state === 'active' || state === 'focused') {
        // Could differentiate between active and focused later
        appButton.classList.add(state);
        // Maybe add a stronger border or different background if focused
    }
}


export { initializeTaskbar };
