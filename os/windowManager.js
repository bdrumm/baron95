let zIndexCounter = 10; // Start z-index for windows
const windows = {}; // Store window elements and state
let currentFocusedWindowId = null; // Track the focused window ID

function initializeWindowManager() {
    console.log("Window Manager Initialized");
    // Add a global listener to handle clicks outside windows (defocus)
    document.addEventListener('mousedown', handleDefocus, true); // Use capture phase
    // Potentially add global listeners for drag/resize if needed later
    return {
        createWindow,
        closeWindow,
        focusWindow,
        getWindowContentElement,
        // Expose maximize/restore toggle
        toggleMaximizeWindow,
        // Expose function to get current focused window ID (needed for input handling)
        getCurrentFocusedWindowId: () => currentFocusedWindowId
    };
}

function createWindow(appInfo) {
    const windowId = `window-${appInfo.id}-${Date.now()}`;
    const windowEl = document.createElement('div');
    windowEl.id = windowId;
    windowEl.dataset.appId = appInfo.id; // Store appId on the element
    windowEl.dataset.isMaximized = 'false'; // Track maximized state
    windowEl.dataset.restoreX = ''; // Store pre-maximize position/size
    windowEl.dataset.restoreY = '';
    windowEl.dataset.restoreW = '';
    windowEl.dataset.restoreH = '';
    windowEl.className = 'app-window';
    windowEl.style.position = 'absolute';
    // Random initial position for demonstration
    windowEl.style.left = `${Math.random() * 200 + 50}px`;
    windowEl.style.top = `${Math.random() * 150 + 50}px`;
    windowEl.style.width = '640px'; // Default size, app can override
    windowEl.style.height = '480px';
    // Set min dimensions directly for JS access if needed, also set in CSS
    windowEl.style.minWidth = '200px';
    windowEl.style.minHeight = '150px';
    windowEl.style.zIndex = zIndexCounter++;
    windowEl.style.backgroundColor = '#c0c0c0'; // Win95 grey
    // Border styling will be handled by CSS
    windowEl.style.boxShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    windowEl.style.display = 'flex';
    windowEl.style.flexDirection = 'column';
    windowEl.style.overflow = 'hidden'; // Important: Prevents handle spill

    // --- Title Bar ---
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';

    // Container for icon and text
    const titleTextContainer = document.createElement('div');
    titleTextContainer.className = 'title-bar-text'; // Use class for styling

    // Icon placeholder
    const titleIcon = document.createElement('div');
    titleIcon.className = 'title-bar-icon';
    // Optionally set specific icon based on appInfo.icon here if needed,
    // otherwise it uses the CSS default.
    if (appInfo.icon && appInfo.icon.startsWith('data:image/')) {
         // Use data URI directly for icon if available
         titleIcon.style.backgroundImage = `url("${appInfo.icon}")`;
    } else if (appInfo.icon) {
         // Construct path for file-based icons
         const cleanIconName = appInfo.icon.replace(/^\/+|\/+$/g, '');
         const finalIconPath = `os/ui/icons/${cleanIconName}`;
         titleIcon.style.backgroundImage = `url("${finalIconPath}")`;
    } // Else, relies on default CSS background

    // Text content span
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title-bar-text-content';
    titleSpan.textContent = appInfo.name || 'Untitled';

    titleTextContainer.appendChild(titleIcon);
    titleTextContainer.appendChild(titleSpan);
    titleBar.appendChild(titleTextContainer); // Add icon+text container first

     // Double click title bar to maximize/restore
     titleBar.addEventListener('dblclick', (e) => {
        // Prevent double-click interfering with button clicks
        if (e.target === titleBar || e.target === titleSpan) { // Allow dblclick on text too
            toggleMaximizeWindow(windowId);
        }
    });


    // --- Title Bar Buttons ---
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'title-bar-buttons'; // Class for styling container

    // Minimize Button
    const minimizeButton = document.createElement('button');
    // minimizeButton.innerHTML = '_'; // Remove text content, use CSS background
    minimizeButton.className = 'window-button minimize-button';
    minimizeButton.title = 'Minimize';
    minimizeButton.onclick = (e) => {
        e.stopPropagation();
        minimizeWindow(windowId);
    };

    // Maximize/Restore Button
    const maximizeButton = document.createElement('button');
    // maximizeButton.innerHTML = '&#9633;'; // Remove text content, use CSS background
    maximizeButton.className = 'window-button maximize-button';
    maximizeButton.title = 'Maximize';
    maximizeButton.onclick = (e) => {
        e.stopPropagation();
        toggleMaximizeWindow(windowId);
    };

    // Close Button
    const closeButton = document.createElement('button');
    // closeButton.innerHTML = 'X'; // Remove text content, use CSS background
    closeButton.className = 'window-button close-button';
    closeButton.title = 'Close';
        closeButton.onclick = (e) => {
            e.stopPropagation(); // Prevent drag start
            // Retrieve the appId from the window element
            const closedAppId = windowEl.dataset.appId;
            // Notify the OS core *before* removing the window element
            // The OS core will handle calling the app's destroy method
            if (window.os && typeof window.os.notifyAppClosed === 'function') {
                window.os.notifyAppClosed(closedAppId);
            } else {
                 // Fallback if OS notification fails, just close the window
                 console.warn("OS notifyAppClosed function not found. Closing window directly.");
                 closeWindow(windowId);
            }
            // Note: closeWindow is now implicitly called by the OS after app destruction
        };

    buttonsContainer.appendChild(minimizeButton);
    buttonsContainer.appendChild(maximizeButton);
    buttonsContainer.appendChild(closeButton);
    titleBar.appendChild(buttonsContainer); // Add buttons container

    // --- Content Area ---
    const contentArea = document.createElement('div');
    contentArea.className = 'window-content';
    // Styles handled by CSS

    windowEl.appendChild(titleBar);
    windowEl.appendChild(contentArea);

    // --- Add Resize Handle ---
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    // Style this with CSS
    windowEl.appendChild(resizeHandle);


    // --- Make window draggable ---
    makeDraggable(windowEl, titleBar);

    // --- Make window resizable ---
    makeResizable(windowEl, resizeHandle);

    // --- Bring window to front on click ---
    windowEl.addEventListener('mousedown', () => focusWindow(windowId));

    document.body.appendChild(windowEl);
    windows[windowId] = windowEl; // Store the main element for internal management

    // Define a setTitle method for this window instance
    const setTitle = (newTitle) => {
        // Use the specific titleSpan element
        if (titleSpan) {
            titleSpan.textContent = newTitle;
        } else { // Fallback should target the container's text if span missing
            titleTextContainer.textContent = newTitle;
        }
    };
    // Set initial title using the new method
    setTitle(appInfo.name || 'Untitled');


    focusWindow(windowId); // Focus new window immediately
    console.log(`[WM] Window created: ${windowId} for ${appInfo.name}`);

    // Construct the object to return
    const windowInterface = {
        id: windowId,
        element: windowEl, // The main window div
        body: contentArea, // The content area div
        setTitle: setTitle, // Method to change the title
        // Add other methods like focus(), close(), minimize() if needed later
    };

    console.log("[WM] Returning windowInterface:", windowInterface); // Log the object before returning
    return windowInterface;
}

function closeWindow(windowId) {
    const windowEl = windows[windowId];
    if (windowEl) {
        windowEl.remove();
        delete windows[windowId];
        // If the closed window was focused, clear the focus
        if (currentFocusedWindowId === windowId) {
            currentFocusedWindowId = null;
        }
        console.log(`Window closed: ${windowId}`);
    }
}

function focusWindow(windowId) {
    if (currentFocusedWindowId === windowId) {
        // Already focused, just ensure it's on top if needed (e.g., after restore)
        const windowEl = windows[windowId];
        if (windowEl) windowEl.style.zIndex = zIndexCounter++;
        return;
    }

    // Defocus the previously focused window (if it exists)
    if (currentFocusedWindowId && windows[currentFocusedWindowId]) {
        windows[currentFocusedWindowId].classList.remove('focused');
        // Update taskbar state for the defocused window
        const defocusedAppId = windows[currentFocusedWindowId].dataset.appId;
        if (window.os && window.os.taskbar) {
             window.os.taskbar.setButtonState(defocusedAppId, 'active'); // Set to active, not focused
        }
    }

    // Focus the new window
    const windowEl = windows[windowId];
    if (windowEl) {
        windowEl.style.zIndex = zIndexCounter++;
        windowEl.classList.add('focused');
        currentFocusedWindowId = windowId;
        console.log(`[WM] Window focused: ${windowId}`);

        // Also update taskbar state if available
        const appId = windowEl.dataset.appId;
        if (window.os && window.os.taskbar) {
             window.os.taskbar.setButtonState(appId, 'focused');
        }
        // Publish the windowFocused event
        if (window.os && typeof window.os.publish === 'function') {
            window.os.publish('windowFocused', windowId, appId);
        }
    } else {
        // If window doesn't exist, clear focus
        currentFocusedWindowId = null;
    }
}

function minimizeWindow(windowId) {
    const windowEl = windows[windowId];
    if (windowEl) {
        windowEl.style.display = 'none'; // Hide the window
        // If the minimized window was focused, clear the focus
        if (currentFocusedWindowId === windowId) {
            currentFocusedWindowId = null;
            // Optionally set focus to the next available window or desktop
        }
        // Update taskbar button state
        const appId = windowEl.dataset.appId;
        if (window.os && window.os.taskbar) {
             window.os.taskbar.setButtonState(appId, 'minimized');
        }
        console.log(`Window minimized: ${windowId}`);
    }
}

function restoreWindow(windowId) {
    const windowEl = windows[windowId];
    if (windowEl) {
        windowEl.style.display = 'flex'; // Restore display (assuming flex)
        focusWindow(windowId); // Bring to front and set focus state
        // Taskbar state is updated within focusWindow
        console.log(`Window restored: ${windowId}`);
    }
}

function toggleMaximizeWindow(windowId) {
    const windowEl = windows[windowId];
    if (!windowEl) return;

    const isMaximized = windowEl.dataset.isMaximized === 'true';
    const maximizeButton = windowEl.querySelector('.maximize-button'); // Find the button
    const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 30;

    if (isMaximized) {
        // Restore
        windowEl.style.left = windowEl.dataset.restoreX;
        windowEl.style.top = windowEl.dataset.restoreY;
        windowEl.style.width = windowEl.dataset.restoreW;
        windowEl.style.height = windowEl.dataset.restoreH;
        windowEl.dataset.isMaximized = 'false';
        // No need to change innerHTML, CSS handles icon via class/attribute
        windowEl.style.transition = 'none'; // Remove transition after restore
        console.log(`Window restored: ${windowId}`);
    } else {
        // Maximize
        // Store current position/size
        windowEl.dataset.restoreX = windowEl.style.left;
        windowEl.dataset.restoreY = windowEl.style.top;
        windowEl.dataset.restoreW = windowEl.style.width;
        windowEl.dataset.restoreH = windowEl.style.height;
        // Apply maximized dimensions (fill screen minus taskbar)
        windowEl.style.transition = 'left 0.1s ease-out, top 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out'; // Optional: Add transition
        windowEl.style.left = '0px';
        windowEl.style.top = '0px';
        windowEl.style.width = '100%';
        windowEl.style.height = `calc(100% - ${taskbarHeight}px)`;
        windowEl.dataset.isMaximized = 'true';
        // No need to change innerHTML, CSS handles icon via class/attribute
        console.log(`Window maximized: ${windowId}`);
    }
    focusWindow(windowId); // Ensure it's focused after toggle
}


function getWindowContentElement(windowId) {
    const windowEl = windows[windowId];
    return windowEl ? windowEl.querySelector('.window-content') : null;
}


function makeDraggable(element, handle) {
    let isDragging = false;
    let offsetX, offsetY;

    handle.addEventListener('mousedown', (e) => {
        // Prevent dragging if clicking on a button inside the handle or if maximized
        if (e.target.tagName === 'BUTTON' || element.dataset.isMaximized === 'true') return;

        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        element.style.cursor = 'grabbing';
        // Bring to front when starting drag
        focusWindow(element.id);
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        element.style.left = `${e.clientX - offsetX}px`;
        element.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'move';
            document.body.style.userSelect = ''; // Re-enable text selection
        }
    });

    // Prevent drag initiation from interfering with content interaction
    element.addEventListener('mousedown', (e) => {
        if (e.target !== handle && !e.target.closest('.title-bar-buttons')) { // Ensure not clicking buttons
             focusWindow(element.id); // Still focus if clicking content/title bar itself
        }
    });
}

function makeResizable(element, handle) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener('mousedown', (e) => {
        // Prevent resizing if maximized
        if (element.dataset.isMaximized === 'true') return;

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
        element.style.cursor = 'nwse-resize'; // Or 'se-resize' depending on handle position
        document.body.style.userSelect = 'none'; // Prevent text selection
        // Bring to front when starting resize
        focusWindow(element.id);
        e.stopPropagation(); // Prevent drag initiation
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = startWidth + e.clientX - startX;
        const newHeight = startHeight + e.clientY - startY;
        // Apply minimum size constraints from CSS potentially
        const minWidth = parseInt(element.style.minWidth) || 150;
        const minHeight = parseInt(element.style.minHeight) || 100;

        element.style.width = `${Math.max(minWidth, newWidth)}px`;
        element.style.height = `${Math.max(minHeight, newHeight)}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            element.style.cursor = 'default'; // Reset cursor
            document.body.style.userSelect = ''; // Re-enable text selection

            // Dispatch a custom event to notify the app content that resize finished
            const resizeEndEvent = new CustomEvent('window-resize-end', {
                bubbles: true, // Allow event to bubble up if needed
                cancelable: false
            });
            element.dispatchEvent(resizeEndEvent);
        }
    });
}


// Function to handle clicks outside of any window (defocus)
function handleDefocus(event) {
    // Check if the click target is outside all known windows and not on the taskbar
    const clickedWindow = event.target.closest('.app-window');
    const clickedTaskbar = event.target.closest('#taskbar');
    const clickedResizeHandle = event.target.closest('.resize-handle'); // Don't defocus when clicking handle

    if (!clickedWindow && !clickedTaskbar && !clickedResizeHandle && currentFocusedWindowId) {
        // Clicked outside any window, taskbar, or resize handle, and a window is currently focused
        if (windows[currentFocusedWindowId]) {
            windows[currentFocusedWindowId].classList.remove('focused');
             // Update taskbar state if available
             const appId = windows[currentFocusedWindowId].dataset.appId;
             if (window.os && window.os.taskbar) {
                 window.os.taskbar.setButtonState(appId, 'active'); // Set to active, not focused
             }
        }
        console.log(`Window defocused: ${currentFocusedWindowId}`);
        currentFocusedWindowId = null;
    }
}


export { initializeWindowManager, getWindowContentElement, minimizeWindow, restoreWindow, toggleMaximizeWindow }; // Export new functions
