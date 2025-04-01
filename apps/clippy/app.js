class ClippyApp {
    constructor(os, windowObject, appInfo) {
        this.os = os;
        this.window = windowObject;
        this.appInfo = appInfo;
        this.contentEl = windowObject.body;
        this.elements = {}; // To store UI elements
        this.chatHistory = [ // Store chat messages for context
            { role: 'system', content: 'You are a helpful, slightly snarky assistant in a Windows 95 simulation. Be concise.' }
        ];
        this.isChatting = false; // Track if chat interface is active

        console.log(`Clippy App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("ClippyApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Clippy App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return;

        this.setupDOM();
        this.setupStyles();
        this.setupEventListeners();

        // Make window slightly larger to accommodate chat
        this.window.element.style.width = '250px';
        this.window.element.style.height = '300px';
        this.window.element.style.minWidth = '200px';
        this.window.element.style.minHeight = '250px';

        // Subscribe to OS events
        if (this.os.subscribe) {
            // Bind 'this' context for the handlers
            this.boundHandleAppLaunch = this.handleAppLaunch.bind(this);
            this.boundHandleWindowFocus = this.handleWindowFocus.bind(this);
            this.os.subscribe('appLaunched', this.boundHandleAppLaunch);
            this.os.subscribe('windowFocused', this.boundHandleWindowFocus);
            console.log("Clippy subscribed to OS events.");
        } else {
            console.warn("Clippy: OS does not support event subscription.");
        }

        this.showInitialMessage();
    }

    setupDOM() {
        // Clear existing content first
        this.contentEl.innerHTML = '';
        this.contentEl.style.display = 'flex'; // Use flex for layout
        this.contentEl.style.flexDirection = 'column';
        this.contentEl.style.backgroundColor = '#c0c0c0'; // Match window background
        this.contentEl.style.padding = '3px'; // Add small padding

        // Main container
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'clippy-container';
        this.contentEl.appendChild(this.elements.container);

        // Image (always visible)
        this.elements.image = document.createElement('div');
        this.elements.image.className = 'clippy-image';
        this.elements.container.appendChild(this.elements.image);

        // Suggestion Bubble (initially visible)
        this.elements.bubble = document.createElement('div');
        this.elements.bubble.className = 'clippy-bubble';
        this.elements.bubble.innerHTML = `
            <p class="clippy-text">It looks like you're booting up!</p>
            <div class="clippy-options">
                 <button class="clippy-chat-button">Chat</button>
                 <button class="clippy-dismiss-button">Dismiss</button>
            </div>`;
        this.elements.container.appendChild(this.elements.bubble);
        // Store references within bubble
        this.elements.text = this.elements.bubble.querySelector('.clippy-text');
        this.elements.options = this.elements.bubble.querySelector('.clippy-options');
        this.elements.chatButton = this.elements.bubble.querySelector('.clippy-chat-button');
        this.elements.dismissButton = this.elements.bubble.querySelector('.clippy-dismiss-button');

        // Chat Interface (initially hidden)
        this.elements.chatInterface = document.createElement('div');
        this.elements.chatInterface.className = 'clippy-chat-interface';
        this.elements.chatInterface.style.display = 'none'; // Hidden initially
        this.elements.chatInterface.innerHTML = `
            <div class="clippy-chat-history"></div>
            <div class="clippy-chat-input-area">
                <input type="text" class="clippy-chat-input" placeholder="Ask me anything...">
                <button class="clippy-send-button">Send</button>
            </div>
        `;
        this.contentEl.appendChild(this.elements.chatInterface); // Append to main content area
        // Store references within chat interface
        this.elements.chatHistory = this.elements.chatInterface.querySelector('.clippy-chat-history');
        this.elements.chatInput = this.elements.chatInterface.querySelector('.clippy-chat-input');
        this.elements.sendButton = this.elements.chatInterface.querySelector('.clippy-send-button');
    }

    setupStyles() {
        const styleId = 'clippy-styles';
        if (document.getElementById(styleId)) return;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            .clippy-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 5px;
                box-sizing: border-box;
                background-color: var(--bg-color-window); /* Use variable */
                color: var(--text-color-default); /* Use variable */
            }
            .clippy-image {
                width: 64px;
                height: 64px;
                background-image: url('os/ui/icons/Help/Agent.ico'); /* Use manifest icon */
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                margin-bottom: 5px;
                flex-shrink: 0;
            }
            .clippy-bubble {
                background-color: var(--bg-color-tooltip); /* Use variable */
                border: 1px solid var(--border-color-black); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                padding: 8px;
                border-radius: 5px;
                font-size: 11px;
                text-align: left;
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 5px; /* Space before chat if shown */
            }
            .clippy-text { margin: 0 0 5px 0; }
            .clippy-options { text-align: right; }
            .clippy-options button {
                 font-size: 10px; padding: 1px 5px; margin-left: 5px;
                 background-color: var(--bg-color-button); /* Use variable */
                 color: var(--text-color-default); /* Use variable */
                 border: 1px solid;
                 border-color: var(--border-color-button-outset); /* Use variable */
                 box-shadow: 1px 1px 0px var(--shadow-color-button); /* Use variable */
                 cursor: pointer;
            }
             .clippy-options button:active {
                 border-color: var(--border-color-button-inset); /* Use variable */
                 box-shadow: none;
                 background-color: var(--bg-color-button-active); /* Use variable */
                 padding: 2px 4px 0px 6px;
             }
            /* Chat Interface Styles */
            .clippy-chat-interface {
                display: flex;
                flex-direction: column;
                flex-grow: 1; /* Take remaining space */
                width: 100%;
                overflow: hidden;
                border: 1px solid; /* Use variable */
                border-color: var(--border-color-window-content); /* Use variable */
                /* box-shadow: inset 1px 1px 0 #808080; */ /* Replaced by border */
                background-color: var(--bg-color-input); /* Use variable */
            }
            .clippy-chat-history {
                flex-grow: 1;
                overflow-y: auto;
                padding: 5px;
                font-size: 11px;
                line-height: 1.3;
                color: var(--text-color-default); /* Use variable */
            }
            .clippy-chat-history p { margin: 0 0 5px 0; }
            .clippy-chat-history .user-message { color: blue; text-align: right; } /* Keep user blue */
            .clippy-chat-history .assistant-message { color: var(--text-color-default); } /* Use variable */
            .clippy-chat-input-area {
                display: flex;
                border-top: 1px solid var(--border-color-dark); /* Use variable */
                padding: 3px;
                background-color: var(--bg-color-window); /* Use variable */
            }
            .clippy-chat-input {
                flex-grow: 1;
                border: 1px solid; /* Use variable */
                border-color: var(--border-color-dark) var(--border-color-light) var(--border-color-light) var(--border-color-dark); /* Sunken */
                /* box-shadow: inset 1px 1px 0 #000; */ /* Replaced by border */
                padding: 2px 4px;
                font-size: 11px;
                margin-right: 3px;
                background-color: var(--bg-color-input); /* Use variable */
                color: var(--text-color-default); /* Use variable */
            }
            .clippy-send-button {
                 font-size: 10px; padding: 1px 5px;
                 background-color: var(--bg-color-button); /* Use variable */
                 color: var(--text-color-default); /* Use variable */
                 border: 1px solid;
                 border-color: var(--border-color-button-outset); /* Use variable */
                 box-shadow: 1px 1px 0px var(--shadow-color-button); /* Use variable */
                 cursor: pointer;
                 flex-shrink: 0;
            }
             .clippy-send-button:active {
                 border-color: var(--border-color-button-inset); /* Use variable */
                 box-shadow: none;
                 background-color: var(--bg-color-button-active); /* Use variable */
                 padding: 2px 4px 0px 6px;
             }
        `;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        if (this.elements.chatButton) {
            this.elements.chatButton.addEventListener('click', () => this.startChat());
        }
        if (this.elements.dismissButton) {
            this.elements.dismissButton.addEventListener('click', () => this.dismissMessage());
        }
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        }
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default form submission/newline
                    this.sendMessage();
                }
            });
        }
    }

    showInitialMessage() {
        this.showMessage("It looks like you're booting up the OS! Need any help?");
    }

    showMessage(text) {
        if (this.isChatting) return; // Don't show suggestions if chat is active
        if (this.elements.text) {
            this.elements.text.textContent = text;
            this.elements.bubble.style.display = 'block';
            this.os.windowManager.focusWindow(this.window.id);
        }
    }

    dismissMessage() {
        if (this.elements.bubble) {
            this.elements.bubble.style.display = 'none';
        }
    }

    startChat() {
        this.isChatting = true;
        this.elements.bubble.style.display = 'none'; // Hide suggestion bubble
        this.elements.chatInterface.style.display = 'flex'; // Show chat UI
        this.elements.chatInput.focus();
        this.addMessageToHistory("Chat started. Ask me anything!", 'assistant');
    }

    sendMessage() {
        const messageText = this.elements.chatInput.value.trim();
        if (!messageText) return;

        this.addMessageToHistory(messageText, 'user');
        this.elements.chatInput.value = ''; // Clear input

        // Add user message to context for API call
        this.chatHistory.push({ role: 'user', content: messageText });

        // Call the backend
        this.callChatAPI();
    }

    addMessageToHistory(text, role) {
        if (!this.elements.chatHistory) return;
        const messageEl = document.createElement('p');
        messageEl.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
        messageEl.textContent = text;
        this.elements.chatHistory.appendChild(messageEl);
        // Scroll to bottom
        this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
    }

    async callChatAPI() {
        // Add a thinking indicator?
        this.addMessageToHistory("...", 'assistant'); // Thinking indicator

        // --- Simulate API Call ---
        // NOTE: Direct call to this.os.useTool is not possible from browser simulation.
        // Simulating a delayed response instead.
        const simulateApiCall = async () => {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

            // Remove thinking indicator
             const thinkingIndicator = this.elements.chatHistory.lastChild;
             if (thinkingIndicator && thinkingIndicator.textContent === "...") {
                 thinkingIndicator.remove();
             }

            // Placeholder response
            const simulatedResponse = "I'd love to chat, but my connection to the OpenAI servers isn't wired up in this simulation yet!";
            this.addMessageToHistory(simulatedResponse, 'assistant');
            // Add simulated response to history (optional, could get repetitive)
            // this.chatHistory.push({ role: 'assistant', content: simulatedResponse });
        };

        simulateApiCall();
    }


    // --- OS Event Handlers ---
    handleAppLaunch(appId) {
        if (this.isChatting) return; // Don't interrupt chat
        console.log(`Clippy received event: appLaunched - ${appId}`);
        const appName = this.os.apps[appId]?.name || appId;
        let message = `It looks like you're trying to use ${appName}!`;
        switch(appId) {
            case 'notepad': message += " Need help writing something?"; break;
            case 'settings': message += " Want to change the background?"; break;
            case 'weather': message += " Checking the (simulated) weather?"; break;
            case 'mechCombat': message += " Ready for some retro action?"; break;
            default: message += " Need some assistance?"; break;
        }
        this.showMessage(message);
    }

    handleWindowFocus(windowId, appId) {
        if (this.isChatting) return; // Don't interrupt chat
        console.log(`Clippy received event: windowFocused - ${appId} (${windowId})`);
        if (appId === this.appInfo.id) return;
        // Maybe show a generic message or hide? For now, do nothing on focus.
    }

    // --- Cleanup ---
    destroy() {
        console.log(`Clippy App (${this.appInfo.id}) destroying...`);
        if (this.os.unsubscribe) {
            // Use the bound references for unsubscribing
            if (this.boundHandleAppLaunch) this.os.unsubscribe('appLaunched', this.boundHandleAppLaunch);
            if (this.boundHandleWindowFocus) this.os.unsubscribe('windowFocused', this.boundHandleWindowFocus);
        }
        const styleElement = document.getElementById('clippy-styles');
        if (styleElement) styleElement.remove();
    }
}

export default ClippyApp;
