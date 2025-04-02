import { initializeWindowManager } from './windowManager.js';
import { initializeDesktop } from './ui/desktop.js';
import { initializeTaskbar } from './ui/taskbar.js';
import { initializeStartMenu } from './ui/startMenu.js';
import { initializeContextMenu } from './ui/contextMenu.js'; // Import Context Menu

class OperatingSystem {
    constructor() {
        this.apps = {}; // Store loaded app metadata
        this.runningApps = {}; // Store instances of running apps
        this.windowManager = null;
        this.desktop = null;
        this.taskbar = null;
        this.startMenu = null;
        this.contextMenu = null; // Add contextMenu property
        this.eventListeners = {}; // For pub/sub
    }

    // --- Event System ---
    subscribe(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
        console.log(`[OS Core] Subscription added for event: ${eventName}`);
    }

    unsubscribe(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            return;
        }
        this.eventListeners[eventName] = this.eventListeners[eventName].filter(
            listener => listener !== callback
        );
        console.log(`[OS Core] Subscription removed for event: ${eventName}`);
    }

    publish(eventName, ...args) {
        if (!this.eventListeners[eventName]) {
            return;
        }
        console.log(`[OS Core] Publishing event: ${eventName} with args:`, ...args);
        this.eventListeners[eventName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[OS Core] Error in event listener for ${eventName}:`, error);
            }
        });
    }
    // --- End Event System ---


    async boot() {
        console.log("OS Booting...");

        // Apply theme preference early
        this.applySavedTheme();

        // Initialize core components
        this.windowManager = initializeWindowManager(this); // Pass OS ref if needed by WM
        this.desktop = initializeDesktop(this);
        this.taskbar = initializeTaskbar(this);
        this.startMenu = initializeStartMenu(this);
        this.contextMenu = initializeContextMenu(); // Initialize Context Menu

        // Discover and register available applications
        await this.discoverApps();

        // Render desktop icons for available apps
        this.desktop.renderIcons(this.apps);

        // Launch autostart apps
        console.log("[OS Core] Checking for autostart apps...");
        for (const appId in this.apps) {
            if (this.apps[appId].autostart) {
                console.log(`[OS Core] Autostarting app: ${appId}`);
                // Use await here to ensure apps are launched sequentially if needed,
                // though parallel might be fine too. Await is safer for now.
                await this.launchApp(appId);
            }
        }

        console.log("OS Boot Complete.");

        // Hide loading screen after a short delay
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                // Optional: Remove the element completely after transition
                // loadingScreen.addEventListener('transitionend', () => loadingScreen.remove());
            }
        }, 1000); // Updated delay to 1 second (1000 ms)
    }

    async discoverApps() {
        // In a real scenario, this might scan the /apps directory using a server-side
        // endpoint or a build step that generates a list.
        // For now, we'll hardcode the known app directories.
        const appDirs = ['mechCombat', 'notepad', 'settings', 'about', 'weather', 'clippy', 'fishing', 'calculator', 'encarta', 'fsn']; // Added 'fsn'

        for (const dir of appDirs) {
            const appManifestUrl = `apps/${dir}/manifest.json`;
            try {
                const response = await fetch(appManifestUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch manifest: ${response.statusText}`);
                }
                const manifest = await response.json();
                const appId = dir; // Use directory name as the app ID
                this.apps[appId] = { ...manifest, id: appId, path: `apps/${appId}/` };
                console.log(`Discovered App: ${manifest.name} (ID: ${appId})`);
            } catch (error) {
                console.error(`Error discovering app (${appManifestUrl}):`, error);
            }
        }
    }

    async launchApp(appId) {
        if (!this.apps[appId]) {
            console.error(`[OS Core] App ${appId} not found.`);
            return;
        }
        if (this.runningApps[appId]) {
            console.log(`[OS Core] App ${appId} is already running. Focusing window...`);
            // Attempt to focus the existing window if the instance and window exist
            if (this.runningApps[appId].windowId) {
                 this.windowManager.focusWindow(this.runningApps[appId].windowId);
            } else {
                console.warn(`[OS Core] Could not focus window for already running app ${appId}. No windowId found.`);
            }
            return;
        }

        const appInfo = this.apps[appId];
        console.log(`[OS Core] Launching App: ${appInfo.name} (ID: ${appId})`);

        // Create a window for the app using WindowManager
        if (!this.windowManager) {
            console.error("[OS Core] WindowManager is not initialized. Cannot create window.");
            return;
        }
        console.log(`[OS Core] Requesting window creation for ${appId}...`);
        const windowObject = this.windowManager.createWindow(appInfo); // Expecting window manager to return the window interface object
        console.log("[OS Core] Received windowObject from WindowManager:", windowObject); // Log what we received

        if (!windowObject || !windowObject.body) { // Check if windowObject and its body exist
             console.error(`[OS Core] WindowManager did not return a valid window object with a body for ${appId}. Aborting launch. Received:`, windowObject);
             // Attempt cleanup if window partially created
             if (windowObject && windowObject.id) {
                 this.windowManager.closeWindow(windowObject.id);
             }
             return;
        }
        console.log(`[OS Core] Window created for ${appId} with ID: ${windowObject.id}`);


        // Determine the script URL (default to app.js if entry is not specified)
        const entryScript = appInfo.entry || 'app.js';
        // Construct absolute URL relative to the document's base URI for dynamic import()
        const appScriptUrl = new URL(`${appInfo.path}${entryScript}`, document.baseURI).href;

        try {
            console.log(`[OS Core] Attempting to import module: ${appScriptUrl}`);
            const module = await import(appScriptUrl);
            console.log(`[OS Core] Module ${appId} imported successfully.`);

            if (module.default && typeof module.default === 'function') {
                console.log(`[OS Core] Found default export class for ${appId}. Attempting instantiation...`);
                // Instantiate the app class, passing the OS reference, the window object, AND appInfo
                const appInstance = new module.default(this, windowObject, appInfo);
                console.log(`[OS Core] App ${appId} instantiated successfully.`);

                // Store instance and window ID *before* calling init/run
                this.runningApps[appId] = { instance: appInstance, windowId: windowObject.id };
                console.log(`[OS Core] Stored running instance for ${appId}.`);

                // Update taskbar *after* storing instance
                this.taskbar.addRunningApp(appInfo);
                console.log(`[OS Core] Added ${appId} to taskbar.`);

                // Optional: Call an init or run method if the app has one
                if (typeof appInstance.init === 'function') {
                    console.log(`[OS Core] Calling init() method for ${appId}...`);
                    appInstance.init();
                    console.log(`[OS Core] init() method for ${appId} completed.`);
                } else if (typeof appInstance.run === 'function') {
                    // Call run() if it exists (covers WeatherApp and others)
                    console.log(`[OS Core] Calling run() method for ${appId}...`);
                    await appInstance.run(); // Allow async run
                    console.log(`[OS Core] run() method for ${appId} completed.`);
                }

                // Publish event after successful launch and init/run
                this.publish('appLaunched', appId);

            } else {
                console.error(`[OS Core] App ${appId} entry script (${entryScript}) does not have a valid default export class.`);
                this.windowManager.closeWindow(windowObject.id); // Clean up window
            }
        } catch (error) {
            console.error(`[OS Core] Error loading or running app ${appId} script (${appScriptUrl}):`, error);
            // Clean up if necessary
            this.windowManager.closeWindow(windowObject.id); // Clean up window
            delete this.runningApps[appId]; // Remove from running list
            this.taskbar.removeRunningApp(appId); // Also remove from taskbar on error
        }
    }


    // Method called by WindowManager when an app window's close event is finalized,
    // or potentially by the app itself if it has an internal exit mechanism.
    notifyAppClosed(appId) {
        const runningApp = this.runningApps[appId];
        if (runningApp && runningApp.instance) {
            console.log(`[OS Core] OS notified that app ${appId} has closed.`);

            // 1. Call the app's cleanup method (destroy or cleanup) if it exists
            const cleanupMethod = runningApp.instance.destroy || runningApp.instance.cleanup;
            if (typeof cleanupMethod === 'function') {
                try {
                    cleanupMethod.call(runningApp.instance); // Call in context of instance
                    console.log(`[OS Core] Called cleanup method for ${appId}.`);
                } catch (error) {
                    console.error(`[OS Core] Error during ${appId} cleanup method:`, error);
                }
            } else {
                console.log(`[OS Core] App ${appId} does not have a standard destroy/cleanup method.`);
            }

            // 2. Update UI (Taskbar) *before* deleting reference
            this.taskbar.removeRunningApp(appId);

            // 3. Remove from running apps list
            const windowIdToClose = this.runningApps[appId]?.windowId; // Get window ID before deleting
            delete this.runningApps[appId];
            console.log(`[OS Core] Removed ${appId} from running apps list.`);

            // 4. Tell WindowManager to close the actual window element
            if (this.windowManager && typeof this.windowManager.closeWindow === 'function' && windowIdToClose) {
                this.windowManager.closeWindow(windowIdToClose);
                console.log(`[OS Core] Requested WindowManager to close window: ${windowIdToClose}`);
            } else {
                console.error(`[OS Core] Could not request window closure for ${appId}. WM or windowId missing.`);
            }

            console.log(`[OS Core] App ${appId} cleanup process complete.`);

        } else {
            console.warn(`[OS Core] notifyAppClosed called but app instance or info for ${appId} not found in runningApps.`);
        }
    }

    applySavedTheme() {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'enabled') {
            document.body.classList.add('dark-mode');
            console.log("[OS Core] Applied saved dark mode theme.");
        } else {
            document.body.classList.remove('dark-mode'); // Ensure light mode if not explicitly enabled
        }
    }

    // Add more OS-level methods here (e.g., file system access, notifications)
}

// Initialize and boot the OS
const os = new OperatingSystem();
window.os = os; // Make OS instance globally accessible (optional, for debugging)
os.boot();
