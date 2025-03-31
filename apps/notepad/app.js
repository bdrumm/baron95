class NotepadApp {
    constructor(os, windowObject, appInfo) { // Changed windowEl to windowObject
        this.os = os;
        this.windowObject = windowObject; // Store the whole object
        this.appInfo = appInfo;
        // The content element is directly available as windowObject.body
        this.contentEl = windowObject.body;
        this.textarea = null;

        console.log(`Notepad App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("NotepadApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Notepad App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return; // Don't proceed if body is missing
        this.setupDOM();
        // No complex setup needed, just display the textarea
    }

    setupDOM() {
        if (!this.contentEl) return; // Guard against missing content element
        // Ensure content area is ready for a full-size textarea
        this.contentEl.style.padding = '0';
        this.contentEl.style.margin = '0'; // Override potential inherited margin
        this.contentEl.style.border = 'none'; // Override potential inherited border
        this.contentEl.style.boxShadow = 'none'; // Override potential inherited shadow
        this.contentEl.style.overflow = 'hidden'; // Textarea handles its own scroll

        this.textarea = document.createElement('textarea');
        this.textarea.style.width = '100%';
        this.textarea.style.height = '100%';
        this.textarea.style.border = 'none';
        this.textarea.style.resize = 'none'; // Disable browser textarea resize handle
        this.textarea.style.fontFamily = '"Courier New", Courier, monospace'; // Classic fixed-width font
        this.textarea.style.fontSize = '13px';
        this.textarea.style.boxSizing = 'border-box';
        this.textarea.style.outline = 'none'; // Remove focus outline

        this.contentEl.appendChild(this.textarea);

        // Focus the textarea when the window gets focus (use the main element)
        this.windowObject.element.addEventListener('focus', () => {
            if (this.textarea) this.textarea.focus();
        }, true); // Use capture phase maybe? Or just direct focus on window click

         // Focus textarea when window is clicked (use the main element)
         this.windowObject.element.addEventListener('mousedown', (e) => {
             // Don't steal focus if clicking title bar elements
             if (this.textarea && !e.target.closest('.title-bar')) {
                 this.textarea.focus();
             }
         }, true);
    }

    // Cleanup method when the app is closed
    destroy() {
        console.log(`Notepad App (${this.appInfo.id}) destroying...`);
        // Remove elements specific to this app
        if (this.textarea) {
            this.textarea.remove();
        }
        // No complex resources to release for this simple app
    }
}

// The OS core will import this default export
export default NotepadApp;
