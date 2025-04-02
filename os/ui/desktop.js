let osRef = null; // Reference to the main OS instance
let desktopElement = null;
let currentSelectedIcon = null; // Track selected icon element

function initializeDesktop(os) {
    console.log("Desktop Initialized");
    osRef = os;
    desktopElement = document.getElementById('desktop');
    if (!desktopElement) {
        console.error("Desktop element not found in HTML!");
        return null;
    }
    // Add listener to desktop itself to handle deselection
    desktopElement.addEventListener('mousedown', (e) => {
        // If the click is directly on the desktop (not an icon), deselect
        if (e.target === desktopElement) {
            deselectIcon();
        }
    });
    // Add listener for right-click context menu
    desktopElement.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent default browser context menu
        // Hide start menu if open
        if (osRef.startMenu) osRef.startMenu.hide();
        // Show context menu at click position
        if (osRef.contextMenu) {
            osRef.contextMenu.show(e.clientX, e.clientY, e.target);
        }
    });

    // Add version number display
    const versionElement = document.createElement('div');
    versionElement.id = 'desktop-version';
    versionElement.textContent = 'v0.1.0'; // Placeholder version
    desktopElement.appendChild(versionElement);


    return {
        renderIcons,
    };
}

function renderIcons(apps) {
    if (!desktopElement) return;
    desktopElement.innerHTML = ''; // Clear existing icons

    Object.values(apps).forEach(appInfo => {
        const iconEl = document.createElement('div');
        iconEl.className = 'desktop-icon';
        iconEl.title = appInfo.name;
        // Basic styling for now, enhance in CSS
        iconEl.style.width = '75px';
        iconEl.style.height = '75px';
        iconEl.style.backgroundColor = 'transparent';
        iconEl.style.color = '#fff';
        iconEl.style.textAlign = 'center';
        iconEl.style.margin = '10px';
        iconEl.style.display = 'inline-block'; // Or use flex/grid layout
        iconEl.style.cursor = 'pointer';
        iconEl.style.overflow = 'hidden';
        iconEl.style.textOverflow = 'ellipsis';
        iconEl.style.fontSize = '11px'; // Match CSS

        // Icon Image div
        const iconImg = document.createElement('div');
        iconImg.className = 'icon-image'; // Use class for styling
        // Set background image if icon path exists
        if (appInfo.icon) {
            let finalIconPath;
            if (appInfo.icon.startsWith('data:image/')) {
                finalIconPath = appInfo.icon; // Use data URI directly
            } else {
                // Construct the path relative to index.html (root), using the os/ui/icons base
                // Ensure no leading/trailing slashes cause issues if appInfo.icon has them
                const cleanIconName = appInfo.icon.replace(/^\/+|\/+$/g, '');
                finalIconPath = `os/ui/icons/${cleanIconName}`;
            }
            // Use quotes for the URL string in backgroundImage
            iconImg.style.backgroundImage = `url("${finalIconPath}")`;
        } else {
             // Add a default icon look via CSS class or leave blank
             iconImg.classList.add('default-icon-image'); // Add a class for default styling
        }


        const iconLabel = document.createElement('div');
        iconLabel.className = 'icon-label'; // Use class for styling
        iconLabel.textContent = appInfo.name;

        iconEl.appendChild(iconImg);
        iconEl.appendChild(iconLabel);

        // Double-click to launch app
        iconEl.addEventListener('dblclick', () => {
            console.log(`Icon dblclick detected for app: ${appInfo.id}`); // Log click
            if (osRef) {
                console.log(`Calling osRef.launchApp for ${appInfo.id}`); // Log launch call
                osRef.launchApp(appInfo.id);
            } else {
                console.error("osRef is not available in desktop icon dblclick handler!"); // Log error
            }
        });

        // Single-click to select icon
        iconEl.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent desktop deselection
            selectIcon(iconEl);
        });


        desktopElement.appendChild(iconEl);
    });
}

function selectIcon(iconElement) {
    // Deselect previous icon if one was selected
    deselectIcon();

    // Select the new icon
    iconElement.classList.add('selected');
    // iconElement.focus(); // Optionally set focus for keyboard nav later
    currentSelectedIcon = iconElement;
}

function deselectIcon() {
    if (currentSelectedIcon) {
        currentSelectedIcon.classList.remove('selected');
        currentSelectedIcon = null;
    }
}

export { initializeDesktop };
