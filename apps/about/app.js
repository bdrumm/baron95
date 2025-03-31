class AboutApp {
    constructor(os, windowObject, appInfo) { // Changed windowEl to windowObject
        this.os = os;
        this.windowObject = windowObject; // Store the whole object
        this.appInfo = appInfo;
        // The content element is directly available as windowObject.body
        this.contentEl = windowObject.body;

        console.log(`About App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("AboutApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`About App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return; // Don't proceed if body is missing

        this.setupDOM();
        // Make the window non-resizable and smaller by default (use windowObject.element)
        this.windowObject.element.style.width = '350px';
        this.windowObject.element.style.height = '200px';
        this.windowObject.element.style.minWidth = '300px';
        this.windowObject.element.style.minHeight = '150px';
        // Hide maximize/resize controls for a dialog-like feel (use windowObject.element)
        const maximizeButton = this.windowObject.element.querySelector('.maximize-button');
        const resizeHandle = this.windowObject.element.querySelector('.resize-handle');
        if (maximizeButton) maximizeButton.style.display = 'none';
        if (resizeHandle) resizeHandle.style.display = 'none';

    }

    setupDOM() {
        if (!this.contentEl) return; // Guard against missing content element
        this.contentEl.style.padding = '15px';
        this.contentEl.style.fontFamily = '"Tahoma", "Geneva", sans-serif';
        this.contentEl.style.fontSize = '12px';
        this.contentEl.style.textAlign = 'center';
        this.contentEl.style.backgroundColor = '#c0c0c0'; // Match window background

        this.contentEl.innerHTML = `
            <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 14px;">Win95 Web Simulation</h2>
            <p>Version 0.1.0</p>
            <p>Created by Cline (AI Software Engineer)</p>
            <p style="margin-top: 20px;">
                <button id="about-ok-button-${this.appInfo.id}" style="padding: 3px 15px; border: 2px outset #fff; background-color: #c0c0c0;">OK</button>
            </p>
        `;

        // Add event listener for the OK button
        const okButton = this.contentEl.querySelector(`#about-ok-button-${this.appInfo.id}`);
        if (okButton) {
            okButton.onclick = () => {
                // Close the window by notifying the OS
                if (this.os && typeof this.os.notifyAppClosed === 'function') {
                    this.os.notifyAppClosed(this.appInfo.id);
                } else {
                    console.warn("OS notifyAppClosed function not found.");
                    // Fallback: try closing directly via window manager if possible (less ideal)
                    // Use the window ID from the windowObject
                    if (this.os.windowManager && typeof this.os.windowManager.closeWindow === 'function') {
                         this.os.windowManager.closeWindow(this.windowObject.id);
                    }
                }
            };
            // Set focus to OK button initially
            okButton.focus();
        }
    }

    // Cleanup method when the app is closed
    destroy() {
        console.log(`About App (${this.appInfo.id}) destroying...`);
        // Content is automatically removed when window closes, no specific cleanup needed here.
    }
}

// The OS core will import this default export
export default AboutApp;
