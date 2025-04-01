class FishingApp {
    constructor(os, windowObject, appInfo) {
        this.os = os;   
        this.window = windowObject;
        this.appInfo = appInfo;
        this.contentEl = windowObject.body;
        this.elements = {}; // UI elements
        this.gameState = 'idle'; // idle, casting, waiting, reeling
        this.biteTimeout = null;
        // Define sprite dimensions and calculate background percentages
        const totalWidth = 1536;
        const totalHeight = 1024;
        const spriteWidth = totalWidth / 3; // 512
        const spriteHeight = totalHeight / 2; // 512

        // Function to calculate background position percentage for sprite sheets
        // Formula: (coordinate / (totalDimension - spriteDimension)) * 100
        // Handle edge case where totalDimension equals spriteDimension (single row/column)
        const calcBgPosPercent = (coord, totalDim, spriteDim) =>
            (totalDim === spriteDim) ? 0 : (coord / (totalDim - spriteDim)) * 100;

        this.fishTypes = [
            // Row 0
            { name: 'Bass', junk: false, bgX: calcBgPosPercent(0, totalWidth, spriteWidth), bgY: calcBgPosPercent(0, totalHeight, spriteHeight) }, // 0% 0%
            { name: 'Trout', junk: false, bgX: calcBgPosPercent(spriteWidth, totalWidth, spriteWidth), bgY: calcBgPosPercent(0, totalHeight, spriteHeight) }, // 50% 0%
            { name: 'Perch', junk: false, bgX: calcBgPosPercent(spriteWidth * 2, totalWidth, spriteWidth), bgY: calcBgPosPercent(0, totalHeight, spriteHeight) }, // 100% 0%
            // Row 1
            { name: 'Sunfish', junk: false, bgX: calcBgPosPercent(0, totalWidth, spriteWidth), bgY: calcBgPosPercent(spriteHeight, totalHeight, spriteHeight) }, // 0% 100%
            { name: 'Old Boot', junk: true, bgX: calcBgPosPercent(spriteWidth, totalWidth, spriteWidth), bgY: calcBgPosPercent(spriteHeight, totalHeight, spriteHeight) }, // 50% 100%
            { name: 'Seaweed', junk: true, bgX: calcBgPosPercent(spriteWidth * 2, totalWidth, spriteWidth), bgY: calcBgPosPercent(spriteHeight, totalHeight, spriteHeight) }, // 100% 100%
        ];
        // Store original sprite dimensions for max-size constraint
        this.spriteDimensions = { width: spriteWidth, height: spriteHeight };

        console.log(`Fishing App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("FishingApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Fishing App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return;

        this.setupDOM();
        this.setupStyles();
        this.setupEventListeners();

        // Set initial window size
        this.window.element.style.width = '300px';
        this.window.element.style.height = '250px';
        this.window.element.style.minWidth = '250px';
        this.window.element.style.minHeight = '200px';

        this.updateStatus("Ready to fish!");
    }

    setupDOM() {
        this.contentEl.innerHTML = `
            <div class="fishing-container">
                <div class="water">
                    <div class="fishing-line"></div>
                    <div class="caught-fish-display"></div> <!-- Element to show caught fish -->
                </div>
                <div class="controls">
                    <div class="status-bar">
                        <p class="status-bar-field fishing-status">Status: Ready</p>
                    </div>
                    <button class="fishing-button cast-button win95-button">Cast Line</button>
                    <button class="fishing-button reel-button win95-button" disabled>Reel In</button>
                </div>
            </div>
        `;
        this.elements.container = this.contentEl.querySelector('.fishing-container');
        this.elements.water = this.contentEl.querySelector('.water');
        this.elements.line = this.contentEl.querySelector('.fishing-line');
        this.elements.fishDisplay = this.contentEl.querySelector('.caught-fish-display'); // Get fish display element
        this.elements.statusBar = this.contentEl.querySelector('.fishing-status');
        this.elements.castButton = this.contentEl.querySelector('.cast-button');
        this.elements.reelButton = this.contentEl.querySelector('.reel-button');
    }

    setupStyles() {
        // Inject styles - could be moved to a separate CSS file
        const styleId = 'fishing-styles';
        if (document.getElementById(styleId)) return;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            .fishing-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background-color: var(--bg-color-window); /* Use variable */
                color: var(--text-color-default); /* Use variable */
            }
            .water {
                flex-grow: 1;
                background-color: #3366CC; /* Keep water blue */
                position: relative;
                border-bottom: 2px solid var(--border-color-dark); /* Use variable */
                overflow: hidden;
            }
            .caught-fish-display {
                display: none; /* Hidden by default */
                position: absolute;
                bottom: 15px; /* Position near bottom */
                left: 50%;
                transform: translateX(-50%);
                /* Remove fixed width/height, use relative sizing and aspect ratio */
                width: 40%; /* Example: Max 40% of water width */
                padding-bottom: 40%; /* Maintain aspect ratio (height = width) */
                height: 0; /* Height is controlled by padding-bottom */
                max-width: ${this.spriteDimensions.width}px; /* Don't exceed original sprite width */
                max-height: ${this.spriteDimensions.height}px; /* Don't exceed original sprite height */

                background-image: url('apps/fishing/fish.png'); /* Path relative to index.html */
                background-repeat: no-repeat;
                background-size: 300% 200%; /* Grid size: 3 columns, 2 rows */
                image-rendering: pixelated;
                image-rendering: crisp-edges;
            }
            .fishing-line {
                position: absolute;
                top: 0;
                left: 50%;
                width: 1px;
                height: 0; /* Initially hidden */
                background-color: var(--text-color-light); /* Use variable */
                transition: height 0.5s ease-out;
            }
            .fishing-line.casting {
                height: 80%; /* Animate line going down */
            }
            .fishing-line.biting {
                 animation: bite 0.5s infinite alternate;
            }
            @keyframes bite {
                from { transform: translateY(-2px); }
                to { transform: translateY(2px); }
            }
            .controls {
                padding: 5px;
                border-top: 1px solid var(--border-color-light); /* Use variable */
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
             /* Basic status bar styling */
             .status-bar { display: flex; border: 1px solid; border-color: var(--border-color-statusbar); margin-bottom: 5px; } /* Use variable */
             .status-bar-field { flex: 1; padding: 1px 4px; font-size: 11px; line-height: 16px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 50px; background: var(--bg-color-window); color: var(--text-color-default); } /* Use variables */
            .controls .fishing-button {
                min-width: 80px;
                /* Inherit button styles from main CSS */
            }
        `;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        if (this.elements.castButton) {
            this.elements.castButton.addEventListener('click', () => this.castLine());
        }
        if (this.elements.reelButton) {
            this.elements.reelButton.addEventListener('click', () => this.reelIn());
        }
    }

    updateStatus(message) {
        if (this.elements.statusBar) {
            this.elements.statusBar.textContent = `Status: ${message}`;
        }
    }

    castLine() {
        if (this.gameState !== 'idle') return;

        console.log("Casting line...");
        this.gameState = 'casting';
        this.updateStatus("Casting...");
        this.elements.castButton.disabled = true;
        this.elements.reelButton.disabled = true;
        this.elements.line.style.height = '0'; // Reset line animation
        this.elements.line.classList.remove('biting');
        if (this.elements.fishDisplay) { // Hide fish display
            this.elements.fishDisplay.style.display = 'none';
        }

        // Animate line going down
        requestAnimationFrame(() => { // Ensure style reset applies before adding class
            this.elements.line.classList.add('casting');
        });


        // Wait for the cast animation, then wait for bite
        setTimeout(() => {
            if (this.gameState === 'casting') { // Check if cancelled
                this.waitForBite();
            }
        }, 600); // Slightly longer than transition
    }

    waitForBite() {
        console.log("Waiting for bite...");
        this.gameState = 'waiting';
        this.updateStatus("Waiting for a bite...");

        const waitTime = Math.random() * 8000 + 2000; // 2-10 seconds
        this.biteTimeout = setTimeout(() => {
            if (this.gameState === 'waiting') { // Check if cancelled/reeled early
                this.handleBite();
            }
        }, waitTime);
    }

    handleBite() {
        console.log("Got a bite!");
        this.gameState = 'biting';
        this.updateStatus("Something's biting! Reel it in!");
        this.elements.reelButton.disabled = false;
        this.elements.line.classList.add('biting');
        // Clear the automatic bite timeout
        if (this.biteTimeout) clearTimeout(this.biteTimeout);
        this.biteTimeout = null;
    }

    reelIn() {
        if (this.gameState !== 'biting') return; // Can only reel when biting

        console.log("Reeling in...");
        this.gameState = 'reeling';
        this.updateStatus("Reeling...");
        this.elements.castButton.disabled = true;
        this.elements.reelButton.disabled = true;
        this.elements.line.classList.remove('biting');
        this.elements.line.classList.remove('casting'); // Retract line
        this.elements.line.style.height = '0';

        // Clear any pending bite timeout
        if (this.biteTimeout) clearTimeout(this.biteTimeout);
        this.biteTimeout = null;

        // Determine catch after a short delay
        setTimeout(() => {
            const caughtIndex = Math.floor(Math.random() * this.fishTypes.length);
            const caughtItem = this.fishTypes[caughtIndex];

            this.updateStatus(`You caught: ${caughtItem.name}!`);

            // Show the fish sprite
            if (this.elements.fishDisplay) {
                this.elements.fishDisplay.style.display = 'block';
                // Always set background image (needed for size calculation)
                this.elements.fishDisplay.style.backgroundImage = `url('apps/fishing/fish.png')`;
                if (!caughtItem.junk) {
                    // Set background position using calculated percentages
                    this.elements.fishDisplay.style.backgroundPosition = `${caughtItem.bgX}% ${caughtItem.bgY}%`;
                } else {
                    // For junk, show the junk sprite (e.g., Old Boot at 50% 100%)
                    const junkItem = this.fishTypes.find(f => f.name === 'Old Boot'); // Or pick randomly
                    if (junkItem) {
                         this.elements.fishDisplay.style.backgroundPosition = `${junkItem.bgX}% ${junkItem.bgY}%`;
                    } else {
                         this.elements.fishDisplay.style.backgroundImage = 'none'; // Fallback: hide if no junk sprite defined
                    }
                }
            }

            this.gameState = 'idle';
            this.elements.castButton.disabled = false;
        }, 1000); // Simulate reeling time
    }

    destroy() {
        console.log(`Fishing App (${this.appInfo.id}) destroying...`);
        if (this.biteTimeout) {
            clearTimeout(this.biteTimeout);
        }
        const styleElement = document.getElementById('fishing-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

export default FishingApp;
