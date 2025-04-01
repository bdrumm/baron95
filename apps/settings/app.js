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
        // Adjust window size for settings
        this.windowObject.element.style.width = '450px'; // Slightly wider
        this.windowObject.element.style.height = '350px'; // Slightly taller
        this.windowObject.element.style.minWidth = '400px';
        this.windowObject.element.style.minHeight = '300px';
        this.windowObject.setTitle("Control Panel"); // Update title
    }

    setupDOM() {
        if (!this.contentEl) return; // Guard against missing content element
        this.contentEl.style.padding = '10px';
        this.contentEl.style.fontFamily = '"Tahoma", "Geneva", sans-serif';
        this.contentEl.style.fontSize = '12px';
        this.contentEl.style.backgroundColor = '#c0c0c0'; // Match window background

        // Add some basic Win95 control styles inline for simplicity
        const inputStyle = `style="border: 1px solid #808080; box-shadow: inset 1px 1px 0 #000; padding: 2px;"`;
        const buttonStyle = `style="padding: 3px 10px; margin-left: 5px; border: 1px solid; border-color: #fff #808080 #808080 #fff; box-shadow: 1px 1px 0 #000; background-color: #c0c0c0;"`;
        const buttonActiveStyle = `:active { border-color: #808080 #fff #fff #808080; box-shadow: none; background-color: #b0b0b0; padding: 4px 9px 2px 11px; }`; // Add to a style tag later if needed

        this.contentEl.innerHTML = `
            <fieldset style="border: 1px solid #808080; padding: 10px; margin-bottom: 10px;">
                <legend>Desktop Background</legend>
                <div>
                    <label for="bgMode-${this.appInfo.id}" style="margin-right: 5px;">Mode:</label>
                    <select id="bgMode-${this.appInfo.id}" ${inputStyle}>
                        <option value="color">Solid Color</option>
                        <option value="ai">AI Generated (Simulated)</option>
                    </select>
                </div>
                <div id="bgColorDiv-${this.appInfo.id}" style="margin-top: 8px;">
                    <label for="bgColor-${this.appInfo.id}" style="margin-right: 5px;">Color:</label>
                    <select id="bgColor-${this.appInfo.id}" ${inputStyle}>
                        <option value="#008080">Teal (Default)</option>
                        <option value="#000000">Black</option>
                        <option value="#808080">Gray</option>
                        <option value="#000080">Dark Blue</option>
                        <option value="#550055">Purple</option>
                    </select>
                </div>
                 <div id="bgAIDiv-${this.appInfo.id}" style="margin-top: 8px; display: none;">
                     <label for="bgPrompt-${this.appInfo.id}" style="display: block; margin-bottom: 3px;">Prompt:</label>
                     <input type="text" id="bgPrompt-${this.appInfo.id}" ${inputStyle} style="width: calc(100% - 70px); margin-right: 5px;">
                     <button id="generateBgBtn-${this.appInfo.id}" ${buttonStyle}>Generate</button>
                     <p id="aiStatus-${this.appInfo.id}" style="font-size: 10px; margin-top: 3px; height: 1em;"></p>
                 </div>
            </fieldset>

            <fieldset style="border: 1px solid #808080; padding: 10px; margin-bottom: 10px;">
                <legend>Appearance</legend>
                 <div>
                     <input type="checkbox" id="darkMode-${this.appInfo.id}" style="vertical-align: middle;">
                     <label for="darkMode-${this.appInfo.id}" style="vertical-align: middle;">Enable Dark Mode</label>
                 </div>
            </fieldset>

             <div style="text-align: right; margin-top: 15px;">
                 <button id="settings-apply-${this.appInfo.id}" ${buttonStyle}>Apply</button>
                 <button id="settings-ok-${this.appInfo.id}" ${buttonStyle}>OK</button>
                 <button id="settings-cancel-${this.appInfo.id}" ${buttonStyle}>Cancel</button>
            </div>
        `;

        // Add event listeners
        const modeSelect = this.contentEl.querySelector(`#bgMode-${this.appInfo.id}`);
        const colorDiv = this.contentEl.querySelector(`#bgColorDiv-${this.appInfo.id}`);
        const aiDiv = this.contentEl.querySelector(`#bgAIDiv-${this.appInfo.id}`);
        const colorSelect = this.contentEl.querySelector(`#bgColor-${this.appInfo.id}`);
        const generateBtn = this.contentEl.querySelector(`#generateBgBtn-${this.appInfo.id}`);
        const darkModeCheckbox = this.contentEl.querySelector(`#darkMode-${this.appInfo.id}`); // Get checkbox
        const applyButton = this.contentEl.querySelector(`#settings-apply-${this.appInfo.id}`);
        const okButton = this.contentEl.querySelector(`#settings-ok-${this.appInfo.id}`);
        const cancelButton = this.contentEl.querySelector(`#settings-cancel-${this.appInfo.id}`);

        // Toggle UI based on mode selection
        if (modeSelect && colorDiv && aiDiv) {
            modeSelect.addEventListener('change', (e) => {
                const isColorMode = e.target.value === 'color';
                colorDiv.style.display = isColorMode ? 'block' : 'none';
                aiDiv.style.display = isColorMode ? 'none' : 'block';
            });
            // Initial setup based on current style (simplified check)
            const desktopElement = document.getElementById('desktop');
            if (desktopElement?.style.backgroundImage && desktopElement.style.backgroundImage !== 'none') {
                 modeSelect.value = 'ai'; // Assume AI if background image exists
                 colorDiv.style.display = 'none';
                 aiDiv.style.display = 'block';
            } else {
                 modeSelect.value = 'color';
                 colorDiv.style.display = 'block';
                 aiDiv.style.display = 'none';
                 // Set initial color select value
                 const currentBgColor = desktopElement?.style.backgroundColor || '#008080';
                 if (colorSelect) colorSelect.value = currentBgColor;
            }
            // Set initial dark mode checkbox state
            if (darkModeCheckbox) {
                 darkModeCheckbox.checked = document.body.classList.contains('dark-mode');
            }
        }

        if (generateBtn) {
            generateBtn.onclick = () => this.generateBackground();
        }
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
        const modeSelect = this.contentEl.querySelector(`#bgMode-${this.appInfo.id}`);
        const desktopElement = document.getElementById('desktop');
        if (!desktopElement || !modeSelect) return;

        if (modeSelect.value === 'color') {
            const colorSelect = this.contentEl.querySelector(`#bgColor-${this.appInfo.id}`);
            if (colorSelect) {
                const newColor = colorSelect.value;
                desktopElement.style.backgroundImage = 'none'; // Remove image
                desktopElement.style.backgroundColor = newColor;
                console.log(`Desktop background color changed to: ${newColor}`);
            }
        } else {
            // For AI mode, the background is applied during generation simulation
            console.log("Apply clicked in AI mode (background applied on generation).");
        }

        // Apply Dark Mode setting
        const darkModeCheckbox = this.contentEl.querySelector(`#darkMode-${this.appInfo.id}`);
        if (darkModeCheckbox) {
            const enableDarkMode = darkModeCheckbox.checked;
            if (enableDarkMode) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'enabled');
                console.log("Dark Mode enabled");
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'disabled');
                console.log("Dark Mode disabled");
            }
        }
    }

    generateBackground() {
        const promptInput = this.contentEl.querySelector(`#bgPrompt-${this.appInfo.id}`);
        const statusP = this.contentEl.querySelector(`#aiStatus-${this.appInfo.id}`);
        const desktopElement = document.getElementById('desktop');
        if (!promptInput || !statusP || !desktopElement) return;

        const prompt = promptInput.value.trim();
        console.log(`Simulating AI background generation for prompt: "${prompt}"`);
        statusP.textContent = "Generating...";

        // Simulate API call delay
        setTimeout(() => {
            // --- Simulation Logic ---
            // Cycle through a few predefined images or patterns
            const simulatedImages = [
                'url("https://source.unsplash.com/random/1024x768?nature")', // Example using Unsplash
                'url("https://source.unsplash.com/random/1024x768?abstract")',
                'url("https://source.unsplash.com/random/1024x768?space")',
                'linear-gradient(to bottom right, #ffcc00, #cc00ff)' // Example gradient
            ];
            // Simple cycling based on prompt length (just for variety)
            const imageIndex = prompt.length % simulatedImages.length;
            const selectedBg = simulatedImages[imageIndex];

            desktopElement.style.backgroundColor = ''; // Clear solid color
            desktopElement.style.backgroundImage = selectedBg;
            desktopElement.style.backgroundSize = 'cover'; // Ensure it covers
            desktopElement.style.backgroundPosition = 'center';
            statusP.textContent = "Background applied!";
            console.log(`Applied simulated background: ${selectedBg}`);

            // Clear status after a bit
            setTimeout(() => { statusP.textContent = ''; }, 2000);

        }, 2000); // Simulate 2 second generation time
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
