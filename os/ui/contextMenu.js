let contextMenuElement = null;
let isVisible = false;

function initializeContextMenu() {
    console.log("Context Menu Initialized");
    contextMenuElement = document.createElement('div');
    contextMenuElement.id = 'context-menu';
    // Styles applied via CSS

    // Basic structure (can be populated dynamically based on target)
    contextMenuElement.innerHTML = `
        <ul>
            <li>Arrange Icons</li>
            <li>Line up Icons</li>
            <li class="separator"></li>
            <li>Paste</li>
            <li>Paste Shortcut</li>
            <li class="separator"></li>
            <li>New</li>
            <li class="separator"></li>
            <li>Properties</li>
        </ul>
    `;

    document.body.appendChild(contextMenuElement); // Add to body, initially hidden

    // Add listener to close menu when clicking outside
    document.addEventListener('mousedown', handleClickOutsideContextMenu, true);

    return {
        show,
        hide,
    };
}

function show(x, y, targetElement) {
    if (!contextMenuElement) return;

    // TODO: Populate menu based on the targetElement (e.g., desktop vs icon)
    console.log("Showing context menu for target:", targetElement);

    contextMenuElement.style.left = `${x}px`;
    contextMenuElement.style.top = `${y}px`;
    contextMenuElement.style.display = 'block';
    isVisible = true;

    // Add temporary click listeners to items (replace with proper actions)
    contextMenuElement.querySelectorAll('li:not(.separator)').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            alert(`Action "${item.textContent}" not implemented.`);
            hide();
        };
    });
}

function hide() {
     if (!contextMenuElement || !isVisible) return;
     isVisible = false;
     contextMenuElement.style.display = 'none';
     // Remove temporary listeners if added dynamically
     contextMenuElement.querySelectorAll('li').forEach(item => item.onclick = null);
}

function handleClickOutsideContextMenu(event) {
    if (!contextMenuElement || !isVisible) return;

    // Check if the click was outside the context menu
    if (!contextMenuElement.contains(event.target)) {
        hide();
    }
}

// Cleanup listener on unload
window.addEventListener('unload', () => {
    document.removeEventListener('mousedown', handleClickOutsideContextMenu, true);
});


export { initializeContextMenu };
