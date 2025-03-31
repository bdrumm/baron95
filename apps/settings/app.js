class SettingsApp {
    constructor(os, windowObject, appInfo) { // Changed windowEl to windowObject
        this.os = os;
        this.windowObject = windowObject; // Store the whole object
        this.appInfo = appInfo;
        // The content element is directly available as windowObject.body
        this.contentEl = windowObject.body;

        console.log(`Settings App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("SettingsApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Settings App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return; // Don't proceed if body is missing

        this.setupDOM();
        // Adjust window size for settings using the main element
        this.windowObject.element.style.width = '400px';
        this.windowObject.element.style.height = '300px';
        this.windowObject.element.style.minWidth = '350px';
        this.windowObject.element.style.minHeight = '250px';
    }

    setupDOM() {
        if (!this.contentEl) return; // Guard against missing content element
        this.contentEl.style.padding = '10px';
        this.contentEl.style.fontFamily = '"Tahoma", "Geneva", sans-serif';
        this.contentEl.style.fontSize = '12px';
        this.contentEl.style.backgroundColor = '#c0c0c0'; // Match window background

        this.contentEl.innerHTML = `
            <fieldset style="border: 1px solid #808080; padding: 10px; margin-bottom: 10px;">
                <legend>Desktop Background</legend>
                <label for="bgColor-${this.appInfo.id}">Color:</label>
                <select id="bgColor-${this.appInfo.id}">
                    <option value="#008080">Teal (Default)</option>
                    <option value="#000000">Black</option>
                    <option value="#808080">Gray</option>
                    <option value="#000080">Dark Blue</option>
                    <option value="#550055">Purple</option>
                </select>
            </fieldset>

             <div style="text-align: right; margin-top: 15px;">
                 <button id="settings-apply-${this.appInfo.id}" style="padding: 3px 10px; margin-right: 5px; border: 2px outset #fff; background-color: #c0c0c0;">Apply</button>
                 <button id="settings-ok-${this.appInfo.id}" style="padding: 3px 10px; margin-right: 5px; border: 2px outset #fff; background-color: #c0c0c0;">OK</button>
                 <button id="settings-cancel-${this.appInfo.id}" style="padding: 3px 10px; border: 2px outset #fff; background-color: #c0c0c0;">Cancel</button>
            </div>
        `;

        // Add event listeners
        const colorSelect = this.contentEl.querySelector(`#bgColor-${this.appInfo.id}`);
        const applyButton = this.contentEl.querySelector(`#settings-apply-${this.appInfo.id}`);
        const okButton = this.contentEl.querySelector(`#settings-ok-${this.appInfo.id}`);
        const cancelButton = this.contentEl.querySelector(`#settings-cancel-${this.appInfo.id}`);

        // Set initial select value based on current desktop color
        const currentBgColor = document.getElementById('desktop')?.style.backgroundColor || '#008080';
        if (colorSelect) colorSelect.value = currentBgColor;


        if (applyButton) {
            applyButton.onclick = () => this.applySettings();
        }
        if (okButton) {
            okButton.onclick = () => {
                this.applySettings();
                this.closeWindow();
            };
        }
        if (cancelButton) {
            cancelButton.onclick = () => this.closeWindow();
        }
    }

    applySettings() {
        const colorSelect = this.contentEl.querySelector(`#bgColor-${this.appInfo.id}`);
        if (colorSelect) {
            const newColor = colorSelect.value;
            const desktopElement = document.getElementById('desktop');
            if (desktopElement) {
                desktopElement.style.backgroundColor = newColor;
                console.log(`Desktop background color changed to: ${newColor}`);
            }
            // In a real app, save this setting (e.g., localStorage)
        }
    }

    closeWindow() {
        // Close the window by notifying the OS
        if (this.os && typeof this.os.notifyAppClosed === 'function') {
            this.os.notifyAppClosed(this.appInfo.id);
        } else {
            console.warn("OS notifyAppClosed function not found.");
        }
    }

    // Cleanup method when the app is closed
    destroy() {
        console.log(`Settings App (${this.appInfo.id}) destroying...`);
        // Content is automatically removed when window closes.
    }
}

// The OS core will import this default export
export default SettingsApp;
