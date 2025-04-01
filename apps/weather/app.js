class WeatherApp {
    constructor(os, windowObject, appInfo) { // Accept windowObject and appInfo
        this.os = os;
        this.window = windowObject; // Use the passed window object
        this.appInfo = appInfo; // Store appInfo for consistency
        this.durationInterval = null;
        this.connectionStartTime = null;
        this.isConnecting = false; // Track connection state
        this.dialupAudio = null;
        this.DEFAULT_SIMULATION_TIME = 15;
        this.RAS_SERVICE_NAME = "WeatherNET RAS";
        this.dialUpTextSteps = ["Dialing...", "Connecting...", "Logging on to network...", "Connected!"];
        this.elements = {}; // To store references to DOM elements
    }

    // run() method is now called *after* the window is created by os/core.js
    async run() {
        // Window is already created and assigned in constructor
        // Set initial title (might be redundant if WM sets it)
        this.window.setTitle("WeatherNET 95 - Idle");

        // Inject content and styles into the existing window body
        this.window.body.innerHTML = this.getAppHTML();
        this.injectStyles(); // Styles might need adjustment if they rely on specific window structure not present initially
        this.initDOMElements(); // Find elements within the injected HTML
        this.setupEventListeners(); // Add listeners to the elements
        this.resetWeatherWindowUI(); // Initial UI state
        this.prepareConnection();
    }

    getAppHTML() {
        // Extracted HTML structure for the window body
        return `
            <div id="weather-app-container">
                <div id="connection-status">
                    <div id="connection-icon-area">
                        <svg id="connection-svg-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <rect x="5" y="10" width="22" height="15" fill="#C0C0C0" stroke="#000" stroke-width="1"/><rect x="8" y="13" width="16" height="9" fill="#FFF" stroke="#808080" stroke-width="1"/>
                            <rect x="37" y="10" width="22" height="15" fill="#C0C0C0" stroke="#000" stroke-width="1"/><rect x="40" y="13" width="16" height="9" fill="#FFF" stroke="#808080" stroke-width="1"/>
                            <rect x="18" y="30" width="28" height="10" fill="#C0C0C0" stroke="#000" stroke-width="1"/><circle cx="23" cy="35" r="1.5" fill="#808080"/><circle cx="28" cy="35" r="1.5" fill="#808080"/><circle cx="33" cy="35" r="1.5" fill="#808080"/><circle cx="38" cy="35" r="1.5" fill="#808080"/><circle cx="43" cy="35" r="1.5" fill="#808080"/>
                            <g id="connection-line" stroke="#000080" stroke-width="1.5"><line x1="16" y1="25" x2="22" y2="30"/><line x1="48" y1="25" x2="42" y2="30"/><line x1="22" y1="30" x2="42" y2="30" stroke-dasharray="3 3"/> </g>
                            <g id="connection-error" display="none" stroke="red" stroke-width="2"><line x1="25" y1="45" x2="39" y2="59"/><line x1="39" y1="45" x2="25" y2="59"/></g>
                            <g id="connection-waves" display="none" stroke="#0000FF" stroke-width="1.5" fill="none"><path d="M 24 45 Q 28 42, 32 45 T 40 45" /><path d="M 24 50 Q 28 47, 32 50 T 40 50" /><path d="M 24 55 Q 28 52, 32 55 T 40 55" /></g>
                        </svg>
                    </div>
                    <div id="connection-details-area">
                        <div id="connection-text-area"><p id="connection-status-line">Status: <span>Initializing...</span></p> <div id="connected-info"><p>Connected at <span id="connection-speed">57600</span> bps</p><p>Duration: <span id="connection-duration">000:00:00</span></p></div></div>
                        <div id="connection-button-area"><button id="cancel-button" class="win95-button">Cancel</button><button id="disconnect-button" class="win95-button">Disconnect</button><button id="details-button" class="win95-button details-button">Details >></button></div>
                    </div>
                </div>
                <div id="weather-display">
                    <h2><svg class="weather-icon" id="weather-condition-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M41.5 21C39.51 14.84 33.27 10 26 10c-7.73 0-14 6.27-14 14 0 .76.07 1.51.21 2.24C6.79 27.2 2 32.28 2 38.5 2 45.4 7.6 51 14.5 51h31C52.95 51 59 44.95 59 37.5c0-6.97-5.16-12.74-11.94-13.75C45.38 22.4 43.6 21.34 41.5 21z" fill="#B0B0B0" stroke="#808080" stroke-width="2"/></svg> Weather Report</h2>
                    <p><strong>Location:</strong> <span id="location">Loading...</span></p><p><strong>Date:</strong> <span id="weather-date">Loading...</span></p>
                    <div class="status-bar"> <p class="status-bar-field" id="condition">Condition: --</p><p class="status-bar-field" id="temp">Temp: --°F</p><p class="status-bar-field" id="humidity">Humidity: --%</p></div>
                    <p id="data-notice" class="notice">*Specific historical weather data for 1995 is based on researched records, not a live API.</p>
                </div>
                <div class="main-status"> <p class="status-bar-field" id="app-status">Idle</p></div>
                <audio id="dialup-audio" src="https://www.soundjay.com/communication/sounds/dial-up-modem-01.mp3" preload="auto" style="display: none;"></audio>
            </div>
        `;
    }

    injectStyles() {
        // Inject app-specific styles into the document's head
        // Scoped to the app container to avoid conflicts
        const styleId = 'weather-app-styles';
        if (document.getElementById(styleId)) return; // Avoid duplicate styles

        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            #weather-app-container { height: 100%; display: flex; flex-direction: column; background-color: var(--bg-color-window); color: var(--text-color-default); }
            #connection-status { display: flex; align-items: flex-start; padding: 15px 10px; margin-bottom: 10px; border: none; background: none; }
            #connection-icon-area { width: 64px; height: 64px; margin-right: 15px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            #connection-icon-area svg rect[fill="#C0C0C0"] { fill: var(--bg-color-window); } /* Update SVG colors */
            #connection-icon-area svg rect[fill="#FFF"] { fill: var(--bg-color-input); }
            #connection-icon-area svg rect[stroke="#808080"] { stroke: var(--border-color-dark); }
            #connection-icon-area svg circle[fill="#808080"] { fill: var(--border-color-dark); }
            #connection-icon-area svg g[stroke="#000080"] line { stroke: var(--bg-color-title-active); }
            #connection-icon-area svg g[stroke="#0000FF"] path { stroke: blue; } /* Keep waves blue */
            #connection-details-area { flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 64px; }
            #connection-text-area { margin-bottom: 10px; }
            #connection-status-line, #connected-info p { margin: 3px 0; font-family: var(--font-primary); font-size: 11px; }
            #connected-info { display: none; }
            #connection-button-area { align-self: flex-end; display: flex; gap: 5px; }
            #disconnect-button, #details-button { display: none; }
            /* Ensure buttons inherit general styles */
            #connection-button-area button { font-family: var(--font-primary); font-size: 11px; }

            #weather-display { display: none; flex-grow: 1; padding-top: 10px; }
            #weather-display h2 { margin-top: 0; font-size: 13px; border-bottom: 1px dotted var(--border-color-dark); padding-bottom: 5px; margin-bottom: 10px; display: flex; align-items: center; }
            .weather-icon { width: 24px; height: 24px; margin-right: 8px; }
            #weather-display p { margin: 8px 0; font-size: 11px; }
            .status-bar { display: flex; border-top: 1px solid var(--border-color-dark); margin-top: 10px; }
            .status-bar-field { flex: 1; margin: 0 1px; padding: 1px 4px; border: 1px solid; border-color: var(--border-color-statusbar); font-size: 11px; line-height: 16px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 50px; background: var(--bg-color-window); }
            .notice { font-size: 10px; color: var(--text-color-disabled); margin-top: 15px; text-align: center; }
            .error-notice { color: #8B0000; font-weight: bold; } /* Keep error red */
            .main-status { height: 20px; box-sizing: border-box; border: 1px solid; border-color: var(--border-color-statusbar); padding: 1px 2px; display: flex; background-color: var(--bg-color-window); margin-top: auto; /* Push to bottom */ }
            .main-status .status-bar-field { border: none; background: none; padding: 0 4px; }
            /* Update focus style if needed, maybe use outline */
            .details-button:focus {
                 outline: 1px dotted var(--text-color-default);
                 outline-offset: -3px;
                 /* box-shadow: 1px 1px 0px 1px #000000, inset 0 0 0 1px #C0C0C0, inset 1px 1px 0 1px #000; */
                 /* border: 1px dotted #000; outline: none; padding: 3px 12px; */
            }
        `;
        document.head.appendChild(styleSheet);
    }

    initDOMElements() {
        const body = this.window.body; // Reference the window body provided by the OS
        if (!body) {
            console.error("WeatherApp: Cannot initialize DOM elements, window body is missing.");
            return;
        }
        this.elements = {
            connectionStatusLineSpan: body.querySelector('#connection-status-line span'),
            connectedInfoDiv: body.querySelector('#connected-info'),
            connectionDurationSpan: body.querySelector('#connection-duration'),
            cancelButton: body.querySelector('#cancel-button'),
            disconnectButton: body.querySelector('#disconnect-button'),
            detailsButton: body.querySelector('#details-button'),
            svgIcon: body.querySelector('#connection-svg-icon'),
            svgLine: body.querySelector('#connection-line'),
            svgError: body.querySelector('#connection-error'),
            svgWaves: body.querySelector('#connection-waves'),
            weatherDisplayDiv: body.querySelector('#weather-display'),
            appStatus: body.querySelector('#app-status'),
            weatherConditionIcon: body.querySelector('#weather-condition-icon'),
            locationSpan: body.querySelector('#location'),
            weatherDateSpan: body.querySelector('#weather-date'),
            conditionSpan: body.querySelector('#condition'),
            tempSpan: body.querySelector('#temp'),
            humiditySpan: body.querySelector('#humidity'),
            dialupAudio: body.querySelector('#dialup-audio')
        };
        this.dialupAudio = this.elements.dialupAudio; // Assign audio element
    }

    // Rewritten setupEventListeners
    setupEventListeners() {
        // Ensure elements exist before adding listeners
        if (this.elements.cancelButton) {
            this.elements.cancelButton.addEventListener('click', () => this.handleCancel());
        } else {
            console.error("WeatherApp: Cancel button not found.");
        }

        if (this.elements.disconnectButton) {
            this.elements.disconnectButton.addEventListener('click', () => this.handleDisconnect());
        } else {
            console.error("WeatherApp: Disconnect button not found.");
        }

        if (this.elements.detailsButton) {
            this.elements.detailsButton.addEventListener('click', () => console.log("Details clicked (Weather App)"));
        } else {
            console.error("WeatherApp: Details button not found.");
        }

        // Audio error handling - ensure audio element exists
        if (this.dialupAudio) {
            this.dialupAudio.addEventListener('error', (e) => this.handleAudioError(e, this.runSimulationSteps.bind(this)));
        } else {
             console.error("WeatherApp: Audio element not found.");
        }

        // We rely on the OS/WM to handle window close notifications via notifyAppClosed -> cleanup
        console.log("WeatherApp: setupEventListeners complete.");
    }

    prepareConnection() {
        if (!this.elements.cancelButton) { // Check if elements are ready
             console.error("WeatherApp: Cannot prepare connection, elements not initialized.");
             return;
        }
        this.isConnecting = true;
        this.updateAppStatus("Preparing...");
        this.window.setTitle(`Connecting to ${this.RAS_SERVICE_NAME}...`);
        this.updateConnectionIcon('idle');

        // Attempt audio load/play
        if (this.dialupAudio && this.dialupAudio.readyState >= 1) { // HAVE_METADATA or higher
            this.handleAudioLoad(this.runSimulationSteps.bind(this));
        } else if (this.dialupAudio) {
            const loadHandler = () => this.handleAudioLoad(this.runSimulationSteps.bind(this));
            const errorHandler = (e) => this.handleAudioError(e, this.runSimulationSteps.bind(this));
            const timeoutHandler = () => {
                if (this.dialupAudio.readyState < 1) {
                    this.dialupAudio.removeEventListener('loadedmetadata', loadHandler);
                    this.dialupAudio.removeEventListener('error', errorHandler);
                    this.handleAudioError(new Error("Timeout waiting for metadata"), this.runSimulationSteps.bind(this));
                }
            };
            this.dialupAudio.addEventListener('loadedmetadata', loadHandler, { once: true });
            this.dialupAudio.addEventListener('error', errorHandler, { once: true });
            setTimeout(timeoutHandler, 5000); // 5-second timeout
        } else {
             console.error("WeatherApp: Cannot prepare connection, audio element missing.");
             // Handle error appropriately, maybe show message in UI
             this.displayAudioError("Audio component failed to load.");
             this.updateConnectionIcon('error');
        }
    }

    handleAudioLoad(callback) {
        if (!this.dialupAudio) {
             console.error("WeatherApp: Cannot handle audio load, audio element missing.");
             callback(this.DEFAULT_SIMULATION_TIME); // Proceed with default timing on error
             return;
        }
        if (this.dialupAudio.duration && !isNaN(this.dialupAudio.duration)) {
            console.log(`Audio loaded. Duration: ${this.dialupAudio.duration} seconds.`);
            this.dialupAudio.play().then(() => {
                callback(this.dialupAudio.duration);
            }).catch(e => {
                console.error("Audio play failed:", e);
                this.displayAudioError("Could not play audio.");
                callback(this.DEFAULT_SIMULATION_TIME);
            });
        } else {
            console.warn("Audio duration not available.");
            this.displayAudioError("Could not get audio duration.");
            callback(this.DEFAULT_SIMULATION_TIME);
        }
    }

    handleAudioError(e, callback) {
        console.error("Error loading/playing audio:", e);
        this.displayAudioError("Failed to load dial-up sound.");
        this.updateConnectionIcon('error');
        callback(this.DEFAULT_SIMULATION_TIME);
    }

    displayAudioError(message) {
        if (this.elements.connectionStatusLineSpan) {
            this.elements.connectionStatusLineSpan.innerHTML = `<span class="error-notice">${message} Using default timing...</span>`;
        } else {
             console.error("WeatherApp: Cannot display audio error, status line span missing.");
        }
        this.updateAppStatus("Connection Error");
    }

    runSimulationSteps(duration) {
        if (!this.elements.connectionStatusLineSpan) {
             console.error("WeatherApp: Cannot run simulation steps, elements not initialized.");
             return;
        }
        console.log(`Starting simulation with duration: ${duration} seconds`);
        const stepInterval = (duration * 1000) / this.dialUpTextSteps.length;
        if (this.durationInterval) clearInterval(this.durationInterval);
        this.connectionStartTime = Date.now();
        this.updateConnectionIcon('dialing');
        this.window.setTitle(`Connecting to ${this.RAS_SERVICE_NAME}...`);
        this.elements.connectionStatusLineSpan.textContent = 'Initializing...';
        this.elements.connectedInfoDiv.style.display = 'none';
        this.elements.cancelButton.style.display = 'inline-flex';
        this.elements.disconnectButton.style.display = 'none';
        this.elements.detailsButton.style.display = 'none';
        this.elements.weatherDisplayDiv.style.display = 'none';

        this.dialUpTextSteps.forEach((text, index) => {
            setTimeout(() => {
                // Check elements exist before updating UI inside timeout
                if (!this.isConnecting || !this.window || !this.elements.connectionStatusLineSpan) return;
                console.log(`Displaying step ${index}: ${text}`);
                this.elements.connectionStatusLineSpan.textContent = text;
                this.updateAppStatus(text);
                if (text.includes("Connecting")) { this.updateConnectionIcon('connecting'); this.elements.svgLine.setAttribute('stroke-dasharray', '3 3'); }
                else if (text.includes("Logging on")) { this.updateConnectionIcon('connecting'); this.elements.svgLine.setAttribute('stroke-dasharray', '1 2'); }

                if (index === this.dialUpTextSteps.length - 1) { // "Connected!"
                    this.updateConnectionIcon('connected');
                    this.window.setTitle(`Connected to ${this.RAS_SERVICE_NAME}`);
                    this.updateAppStatus("Connected");
                    this.elements.connectionStatusLineSpan.textContent = ''; // Clear status line text
                    this.elements.connectedInfoDiv.style.display = 'block';
                    this.elements.cancelButton.style.display = 'none';
                    this.elements.disconnectButton.style.display = 'inline-flex';
                    this.elements.detailsButton.style.display = 'inline-flex';
                    this.durationInterval = setInterval(() => {
                        if (!this.window || !this.elements.connectionDurationSpan) { // Check elements exist
                            clearInterval(this.durationInterval);
                            return;
                        }
                        const elapsed = (Date.now() - this.connectionStartTime) / 1000;
                        this.elements.connectionDurationSpan.textContent = this.formatDuration(elapsed);
                    }, 1000);
                    setTimeout(() => this.fetchAndDisplayHistoricalWeather(), 500);
                }
            }, index * stepInterval);
        });
    }

    fetchAndDisplayHistoricalWeather() {
        if (!this.window || !this.elements.locationSpan) return; // Check elements exist
        const location = "New York, NY";
        const today = new Date();
        const historicalDate = new Date(today);
        historicalDate.setFullYear(1995);
        const formattedDate = historicalDate.toLocaleTimeString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const simulatedWeather = { condition: "Partly Cloudy, Cool", tempF: 50, humidity: 60 };

        this.updateWeatherIconUI(simulatedWeather.condition);
        this.elements.locationSpan.textContent = location;
        this.elements.weatherDateSpan.textContent = formattedDate;
        this.elements.conditionSpan.textContent = `Condition: ${simulatedWeather.condition}`;
        this.elements.tempSpan.textContent = `Temp: ${simulatedWeather.tempF}°F`;
        this.elements.humiditySpan.textContent = `Humidity: ${simulatedWeather.humidity}%`;
        this.elements.weatherDisplayDiv.style.display = 'block';
        this.updateAppStatus("Weather data loaded.");
    }

    updateWeatherIconUI(condition) {
        if (!this.elements.weatherConditionIcon) return; // Check element exists
        let iconSvg = '';
        const lowerCondition = condition.toLowerCase();
        if (lowerCondition.includes("cloudy")) iconSvg = `<path d="M41.7 21.3C39.7 15.1 33.5 10 26 10c-7.7 0-14 6.3-14 14 0 .8.1 1.5.2 2.2C6.8 27.2 2 32.3 2 38.5 2 45.4 7.6 51 14.5 51h31C52.9 51 59 45 59 37.5c0-7-5.2-12.7-11.9-13.8C45.4 22.4 43.6 21.3 41.7 21.3z" fill="#F0F0F0" stroke="#888" stroke-width="1.5"/><path d="M51.5 31.5c4.1 0 7.5 3.4 7.5 7.5s-3.4 7.5-7.5 7.5h-31C13.1 46.5 7 40.4 7 33c0-6.2 4.4-11.4 10.2-12.8.5-.1.9-.4 1.1-.9.6-1.2.9-2.5.9-3.8 0-5.5 4.5-10 10-10 5.1 0 9.4 3.8 9.9 8.8.1.7.6 1.2 1.3 1.3 5.2.7 9.1 5.1 9.1 10.4z" fill="#FFF" stroke="#AAA" stroke-width="1" transform="translate(-4, -4) scale(1.1)"/>`;
        else if (lowerCondition.includes("sunny") || lowerCondition.includes("clear")) iconSvg = `<circle cx="32" cy="32" r="12" fill="#FFD700" stroke="#FFA500" stroke-width="2"/><line x1="32" y1="8" x2="32" y2="14" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="50" x2="32" y2="56" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="56" y1="32" x2="50" y2="32" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="32" x2="8" y2="32" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="49.5" y1="14.5" x2="45.2" y2="18.8" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="18.8" y1="45.2" x2="14.5" y2="49.5" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="49.5" y1="49.5" x2="45.2" y2="45.2" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/><line x1="18.8" y1="18.8" x2="14.5" y2="14.5" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/>`;
        else if (lowerCondition.includes("rain") || lowerCondition.includes("showers")) iconSvg = `<path d="M41.7 21.3C39.7 15.1 33.5 10 26 10c-7.7 0-14 6.3-14 14 0 .8.1 1.5.2 2.2C6.8 27.2 2 32.3 2 38.5 2 45.4 7.6 51 14.5 51h31C52.9 51 59 45 59 37.5c0-7-5.2-12.7-11.9-13.8C45.4 22.4 43.6 21.3 41.7 21.3z" fill="#B0C4DE" stroke="#778899" stroke-width="1.5"/> <line x1="20" y1="42" x2="24" y2="52" stroke="#4682B4" stroke-width="2.5" stroke-linecap="round"/> <line x1="30" y1="44" x2="34" y2="54" stroke="#4682B4" stroke-width="2.5" stroke-linecap="round"/> <line x1="40" y1="42" x2="44" y2="52" stroke="#4682B4" stroke-width="2.5" stroke-linecap="round"/>`;
        else iconSvg = `<path d="M41.5 21C39.51 14.84 33.27 10 26 10c-7.73 0-14 6.27-14 14 0 .76.07 1.51.21 2.24C6.79 27.2 2 32.28 2 38.5 2 45.4 7.6 51 14.5 51h31C52.95 51 59 44.95 59 37.5c0-6.97-5.16-12.74-11.94-13.75C45.38 22.4 43.6 21.34 41.5 21z" fill="#B0B0B0" stroke="#808080" stroke-width="2"/>`;
        this.elements.weatherConditionIcon.innerHTML = iconSvg;
    }

    updateConnectionIcon(state) {
        if (!this.elements.svgLine) return; // Add checks for elements
        this.elements.svgLine.style.display = 'none';
        this.elements.svgError.style.display = 'none';
        this.elements.svgWaves.style.display = 'none';
        switch(state) {
            case 'dialing':
            case 'connecting':
                this.elements.svgLine.style.display = 'block';
                break;
            case 'error':
                this.elements.svgError.style.display = 'block';
                break;
            case 'connected':
                this.elements.svgWaves.style.display = 'block';
                break;
            case 'idle':
            default:
                this.elements.svgLine.style.display = 'block';
                this.elements.svgLine.setAttribute('stroke-dasharray', 'none');
                break;
        }
    }

    formatDuration(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const hhh = String(hours).padStart(3, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        return `${hhh}:${mm}:${ss}`;
    }

    updateAppStatus(statusText) {
        if (this.elements.appStatus) {
            this.elements.appStatus.textContent = statusText;
        }
    }

    resetWeatherWindowUI() {
        if (!this.elements.connectionStatusLineSpan) return; // Add checks
        this.elements.connectionStatusLineSpan.textContent = 'Initializing...';
        this.elements.connectedInfoDiv.style.display = 'none';
        this.elements.cancelButton.style.display = 'inline-flex';
        this.elements.disconnectButton.style.display = 'none';
        this.elements.detailsButton.style.display = 'none';
        this.elements.weatherDisplayDiv.style.display = 'none';
        this.updateAppStatus("Idle");
        this.window.setTitle("WeatherNET 95 - Idle");
        this.updateConnectionIcon('idle');
    }

    handleCancel() {
        console.log("Cancel clicked (Weather App)");
        this.isConnecting = false; // Stop connection process
        // Notify OS to close the window instead of calling close() directly
        if (this.os && typeof this.os.notifyAppClosed === 'function') {
            // Use the appInfo stored in the instance if available
            const appIdToClose = this.appInfo ? this.appInfo.id : null;
            if (appIdToClose) {
                 this.os.notifyAppClosed(appIdToClose);
            } else {
                 console.error("WeatherApp: Cannot notify OS, appInfo.id is missing.");
            }
        } else {
            console.warn("WeatherApp: OS notifyAppClosed function not found.");
        }
    }

    handleDisconnect() {
        console.log("Disconnect clicked (Weather App)");
        if (this.durationInterval) clearInterval(this.durationInterval);
        this.durationInterval = null;
        this.isConnecting = false;
        this.updateConnectionIcon('idle');
        this.window.setTitle("WeatherNET 95 - Idle");
        this.updateAppStatus("Disconnected");
        if(this.elements.disconnectButton) this.elements.disconnectButton.style.display = 'none';
        if(this.elements.detailsButton) this.elements.detailsButton.style.display = 'none';
        if(this.elements.cancelButton) this.elements.cancelButton.style.display = 'inline-flex';
        if(this.elements.connectedInfoDiv) this.elements.connectedInfoDiv.style.display = 'none';
        if(this.elements.weatherDisplayDiv) this.elements.weatherDisplayDiv.style.display = 'none';
        if(this.dialupAudio) {
            this.dialupAudio.pause();
            this.dialupAudio.currentTime = 0;
        }
    }

    cleanup() {
        console.log("Cleaning up Weather App");
        this.isConnecting = false;
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
        if (this.dialupAudio) {
            this.dialupAudio.pause();
            this.dialupAudio.src = ''; // Release audio source
            this.dialupAudio.load();
            this.dialupAudio = null;
        }
        // Remove injected styles if necessary (optional, depends on OS architecture)
        const styleElement = document.getElementById('weather-app-styles');
        if (styleElement) {
            styleElement.remove(); // Remove styles on cleanup
        }
        this.window = null; // Release window reference
        this.elements = {}; // Clear element references
    }
}

// Export the class for the OS to use
export default WeatherApp;
