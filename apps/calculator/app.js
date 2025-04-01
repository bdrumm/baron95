class CalculatorApp {
    constructor(os, windowObject, appInfo) {
        this.os = os;
        this.window = windowObject;
        this.appInfo = appInfo;
        this.contentEl = windowObject.body;
        this.elements = {}; // UI elements

        // Calculator state
        this.currentInput = '0';
        this.previousInput = null;
        this.operation = null;
        this.shouldResetDisplay = false;

        console.log(`Calculator App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("CalculatorApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Calculator App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return;

        this.setupDOM();
        this.setupStyles();
        this.setupEventListeners();

        // Adjust window size
        this.window.element.style.width = '220px';
        this.window.element.style.height = '280px';
        this.window.element.style.minWidth = '200px';
        this.window.element.style.minHeight = '250px';
        // Make non-resizable? (Optional)
        // const resizeHandle = this.window.element.querySelector('.resize-handle');
        // if (resizeHandle) resizeHandle.style.display = 'none';
    }

    setupDOM() {
        this.contentEl.innerHTML = `
            <div class="calculator-container">
                <div class="calc-display">0</div>
                <div class="calc-buttons">
                    <button data-action="clear">C</button>
                    <button data-action="sign">+/-</button>
                    <button data-action="percent">%</button>
                    <button data-action="operator" data-value="/">/</button>

                    <button data-action="digit" data-value="7">7</button>
                    <button data-action="digit" data-value="8">8</button>
                    <button data-action="digit" data-value="9">9</button>
                    <button data-action="operator" data-value="*">*</button>

                    <button data-action="digit" data-value="4">4</button>
                    <button data-action="digit" data-value="5">5</button>
                    <button data-action="digit" data-value="6">6</button>
                    <button data-action="operator" data-value="-">-</button>

                    <button data-action="digit" data-value="1">1</button>
                    <button data-action="digit" data-value="2">2</button>
                    <button data-action="digit" data-value="3">3</button>
                    <button data-action="operator" data-value="+">+</button>

                    <button data-action="digit" data-value="0" class="zero">0</button>
                    <button data-action="decimal">.</button>
                    <button data-action="equals">=</button>
                </div>
            </div>
        `;
        this.elements.container = this.contentEl.querySelector('.calculator-container');
        this.elements.display = this.contentEl.querySelector('.calc-display');
        this.elements.buttons = this.contentEl.querySelector('.calc-buttons');
    }

    setupStyles() {
        const styleId = 'calculator-styles';
        if (document.getElementById(styleId)) return;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            .calculator-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background-color: var(--bg-color-window); /* Use variable */
                padding: 5px;
                box-sizing: border-box;
            }
            .calc-display {
                background-color: var(--bg-color-input); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                border: 1px solid; /* Use variable */
                border-color: var(--border-color-dark) var(--border-color-light) var(--border-color-light) var(--border-color-dark); /* Sunken */
                /* box-shadow: inset 1px 1px 0 #000; */ /* Replaced by border */
                padding: 3px 5px;
                text-align: right;
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 16px;
                margin-bottom: 5px;
                overflow: hidden;
                white-space: nowrap;
            }
            .calc-buttons {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
                flex-grow: 1;
            }
            .calc-buttons button {
                font-family: var(--font-primary); /* Use variable */
                font-size: 12px;
                background-color: var(--bg-color-button); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                border: 1px solid;
                border-color: var(--border-color-button-outset); /* Use variable */
                box-shadow: 1px 1px 0px var(--shadow-color-button); /* Use variable */
                cursor: pointer;
                min-height: 30px;
            }
            .calc-buttons button:active {
                border-color: var(--border-color-button-inset); /* Use variable */
                box-shadow: none;
                background-color: var(--bg-color-button-active); /* Use variable */
            }
            .calc-buttons button.zero {
                grid-column: span 2; /* Make 0 button wider */
            }
            /* Style operator buttons differently? */
            .calc-buttons button[data-action="operator"],
            .calc-buttons button[data-action="equals"] {
                /* background-color: #a0a0a0; */
            }
        `;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        if (this.elements.buttons) {
            this.elements.buttons.addEventListener('click', (event) => {
                if (event.target.tagName === 'BUTTON') {
                    const action = event.target.dataset.action;
                    const value = event.target.dataset.value;
                    this.handleInput(action, value);
                }
            });
        }
    }

    updateDisplay() {
        if (this.elements.display) {
            // Basic formatting (limit length)
            let displayValue = this.currentInput;
            if (displayValue.length > 15) { // Limit display length
                displayValue = parseFloat(displayValue).toExponential(9);
            }
            this.elements.display.textContent = displayValue;
        }
    }

    handleInput(action, value) {
        switch (action) {
            case 'digit':
                this.inputDigit(value);
                break;
            case 'decimal':
                this.inputDecimal();
                break;
            case 'operator':
                this.handleOperator(value);
                break;
            case 'equals':
                this.calculate();
                break;
            case 'clear':
                this.clear();
                break;
            case 'sign':
                this.toggleSign();
                break;
            case 'percent':
                this.calculatePercent();
                break;
        }
        this.updateDisplay();
    }

    inputDigit(digit) {
        if (this.shouldResetDisplay) {
            this.currentInput = digit;
            this.shouldResetDisplay = false;
        } else {
            this.currentInput = this.currentInput === '0' ? digit : this.currentInput + digit;
        }
    }

    inputDecimal() {
        if (this.shouldResetDisplay) {
            this.currentInput = '0.';
            this.shouldResetDisplay = false;
            return;
        }
        if (!this.currentInput.includes('.')) {
            this.currentInput += '.';
        }
    }

    handleOperator(nextOperator) {
        const inputValue = parseFloat(this.currentInput);

        if (this.operation && this.previousInput !== null && !this.shouldResetDisplay) {
            // Perform previous operation if user chains operators
            const result = this.performCalculation();
            this.currentInput = String(result);
            this.previousInput = result;
        } else {
            this.previousInput = inputValue;
        }

        this.operation = nextOperator;
        this.shouldResetDisplay = true; // Ready for next number
    }

    calculate() {
        if (this.operation === null || this.previousInput === null) {
            return; // Nothing to calculate
        }
        const result = this.performCalculation();
        this.currentInput = String(result);
        this.operation = null;
        this.previousInput = null;
        this.shouldResetDisplay = true; // Display result, next digit clears
    }

    performCalculation() {
        const prev = this.previousInput;
        const current = parseFloat(this.currentInput);
        let result = 0;

        switch (this.operation) {
            case '+': result = prev + current; break;
            case '-': result = prev - current; break;
            case '*': result = prev * current; break;
            case '/': result = (current === 0) ? NaN : prev / current; break; // Handle division by zero
            default: return current; // Should not happen
        }
        // Handle potential floating point inaccuracies (simple rounding)
        // result = parseFloat(result.toPrecision(12));
        return result;
    }

    clear() {
        this.currentInput = '0';
        this.previousInput = null;
        this.operation = null;
        this.shouldResetDisplay = false;
    }

    toggleSign() {
        this.currentInput = String(parseFloat(this.currentInput) * -1);
    }

    calculatePercent() {
        // Behavior depends on context, simple percentage for now
        this.currentInput = String(parseFloat(this.currentInput) / 100);
        this.shouldResetDisplay = true; // Treat as end of input
    }

    destroy() {
        console.log(`Calculator App (${this.appInfo.id}) destroying...`);
        const styleElement = document.getElementById('calculator-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

export default CalculatorApp;
