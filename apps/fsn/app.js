import * as THREE from 'three';
// Import necessary addons for labels and controls
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class FSNApp {
    constructor(os, windowObject, appInfo) {
        this.os = os;
        this.window = windowObject;
        this.appInfo = appInfo;
        this.contentEl = windowObject.body;
        this.elements = {}; // UI elements

        // 3D Scene elements
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;
        this.controls = null;
        this.animationFrameId = null;
        this.raycaster = null; // For picking objects
        this.mouse = null; // For raycaster coordinates
        this.history = []; // Simple navigation history

        // Simulated file system data
        this.currentPath = '/home/user';
        this.fileSystem = {
            '/': { type: 'folder', children: ['home'] },
            '/home': { type: 'folder', children: ['user'] },
            '/home/user': { type: 'folder', children: ['docs', 'images', 'readme.txt'] },
            '/home/user/docs': { type: 'folder', children: ['report.doc'] },
            '/home/user/images': { type: 'folder', children: ['logo.png', 'photo.jpg'] },
            '/home/user/readme.txt': { type: 'file', size: 1024 },
            '/home/user/docs/report.doc': { type: 'file', size: 25600 },
            '/home/user/images/logo.png': { type: 'file', size: 5120 },
            '/home/user/images/photo.jpg': { type: 'file', size: 120400 },
        };
        this.objectsInScene = []; // Keep track of meshes

        console.log(`FSN App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("FSNApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`FSN App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return;

        this.setupDOM(); // Setup basic HTML structure first
        this.setupStyles();
        this.setupThreeJS();
        this.setupEventListeners();

        // Adjust window size
        this.window.element.style.width = '600px';
        this.window.element.style.height = '450px';
        this.window.element.style.minWidth = '400px';
        this.window.element.style.minHeight = '300px';
        this.window.setTitle(`FSN: ${this.currentPath}`);

        this.renderFileSystem(); // Initial render
        this.animate(); // Start render loop
    }

    setupDOM() {
        // Main container splits into controls and view
        this.contentEl.innerHTML = `
            <div class="fsn-container">
                <div class="fsn-controls-panel">
                    </div>
                <div class="fsn-main-view">
                    <div class="fsn-path-bar">Fsn: <span class="path-text">/</span></div>
                    <div class="fsn-info-bar"></div>
                    <div class="fsn-canvas-container"></div>
                    <div class="fsn-age-bar"></div>
                </div>
            </div>
        `;
        this.elements.container = this.contentEl.querySelector('.fsn-container');
        this.elements.controlsPanel = this.contentEl.querySelector('.fsn-controls-panel');
        this.elements.mainView = this.contentEl.querySelector('.fsn-main-view');
        this.elements.pathBar = this.contentEl.querySelector('.fsn-path-bar');
        this.elements.pathText = this.contentEl.querySelector('.path-text');
        this.elements.infoBar = this.contentEl.querySelector('.fsn-info-bar'); // Placeholder for file info
        this.elements.canvasContainer = this.contentEl.querySelector('.fsn-canvas-container');
        this.elements.ageBar = this.contentEl.querySelector('.fsn-age-bar'); // Placeholder for age legend

        // Populate controls panel (simplified placeholders)
        this.elements.controlsPanel.innerHTML = `
            <div class="fsn-control-group">
                <button>reset</button>
                <button>go back</button>
                <button>birds eye</button>
                <button>front view</button>
            </div>
            <div class="fsn-control-group">
                <label>Tilt</label><input type="range" min="0" max="100">
                <label>Height</label><input type="range" min="0" max="100">
            </div>
            <div class="fsn-control-group">
                <label>Search</label>
                <div>name <input type="text"></div>
                <div>size <input type="text"></div>
                <div>age <input type="text"></div>
            </div>
             <div class="fsn-control-group fsn-apply-cancel">
                 <button>OK</button>
                 <button>Apply</button>
                 <button>Cancel</button>
             </div>
             <div class="fsn-control-group fsn-marks">
                 <label>Marks</label>
                 <div class="marks-list"></div>
                 <button>go to</button>
                 <button>delete</button>
                 <button>mark</button>
             </div>
        `;
    }

     setupStyles() {
        const styleId = 'fsn-styles';
        if (document.getElementById(styleId)) return;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        // Add styles for two-panel layout and basic controls
        styleSheet.textContent = `
            .fsn-container {
                display: flex;
                flex-direction: row;
                height: 100%;
                background-color: var(--bg-color-window); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                overflow: hidden;
            }
            .fsn-controls-panel {
                width: 180px;
                flex-shrink: 0;
                border-right: 1px solid var(--border-color-dark); /* Use variable */
                box-shadow: inset -1px 0 0 var(--border-color-light); /* Use variable */
                padding: 5px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                overflow-y: auto;
                font-size: 11px;
                background-color: var(--bg-color-window); /* Match window */
            }
            .fsn-control-group {
                border: 1px solid var(--border-color-groupbox); /* Use variable */
                padding: 5px;
            }
            .fsn-control-group label { display: block; margin-bottom: 3px; font-weight: bold;}
            .fsn-control-group input[type="text"] {
                 width: 95%; margin-bottom: 3px;
                 border: 1px solid;
                 border-color: var(--border-color-dark) var(--border-color-light) var(--border-color-light) var(--border-color-dark); /* Sunken */
                 background-color: var(--bg-color-input);
                 color: var(--text-color-default);
                 padding: 1px 3px;
            }
            .fsn-control-group input[type="range"] { width: 95%; margin-bottom: 3px; } /* Basic range styling */
            .fsn-control-group button {
                font-size: 11px;
                padding: 2px 8px;
                margin: 2px;
                background-color: var(--bg-color-button); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                border: 1px solid;
                border-color: var(--border-color-button-outset); /* Use variable */
                box-shadow: 1px 1px 0px var(--shadow-color-button); /* Use variable */
                cursor: pointer;
            }
             .fsn-control-group button:active {
                 border-color: var(--border-color-button-inset); /* Use variable */
                 box-shadow: none;
                 background-color: var(--bg-color-button-active); /* Use variable */
             }
             .fsn-apply-cancel { text-align: right; }
             .fsn-marks .marks-list {
                 height: 50px;
                 background: var(--bg-color-input); /* Use variable */
                 border: 1px solid; /* Use variable */
                 border-color: var(--border-color-dark) var(--border-color-light) var(--border-color-light) var(--border-color-dark); /* Sunken */
                 margin-bottom: 5px;
                 overflow-y: auto;
             }

            .fsn-main-view {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .fsn-path-bar, .fsn-info-bar, .fsn-age-bar {
                padding: 2px 5px;
                background-color: var(--bg-color-window); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                border: 1px solid;
                border-color: var(--border-color-statusbar); /* Use variable */
                font-size: 11px;
                flex-shrink: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                height: 18px;
                line-height: 14px;
            }
             .fsn-info-bar { min-height: 18px; background: #f0f0f0; } /* Placeholder */
             .fsn-age-bar { min-height: 18px; background: #ddd; } /* Placeholder */

            .fsn-canvas-container {
                flex-grow: 1;
                position: relative;
                overflow: hidden;
            }
            .fsn-canvas-container canvas {
                display: block; /* Remove extra space below canvas */
            }
        `;
        document.head.appendChild(styleSheet);
    }

    setupThreeJS() {
        if (!this.elements.canvasContainer) return;

        const container = this.elements.canvasContainer;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x008080); // Teal background

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 5, 10); // Position camera
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5).normalize();
        this.scene.add(directionalLight);

        // Ground plane (like in the reference)
        const planeGeometry = new THREE.PlaneGeometry(50, 50);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        plane.position.y = -0.5; // Slightly below objects
        this.scene.add(plane);

        // Camera Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Optional: smooth camera movement
        this.controls.dampingFactor = 0.1;
        // this.controls.screenSpacePanning = false; // Optional: constrain panning
        // this.controls.maxPolarAngle = Math.PI / 2; // Optional: prevent camera going below ground

        // Raycaster for object picking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Add CSS2DRenderer for labels
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none'; // Don't interfere with 3D view clicks
        container.appendChild(this.labelRenderer.domElement);


        // Handle window resize
        this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
        this.resizeObserver.observe(container);
        this.window.element.addEventListener('window-resize-end', () => this.onWindowResize());
    }

    onWindowResize() {
        if (!this.renderer || !this.camera || !this.elements.canvasContainer) return;
        const container = this.elements.canvasContainer;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        if (this.labelRenderer) { // Resize label renderer too
            this.labelRenderer.setSize(width, height);
        }
    }

    setupEventListeners() {
        // Canvas double-click for navigation
        this.renderer.domElement.addEventListener('dblclick', (event) => this.onCanvasDoubleClick(event));

        // Control panel button clicks (using event delegation)
        this.elements.controlsPanel.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            // Basic placeholder actions
            const action = button.textContent.toLowerCase().replace(' ', '-'); // e.g., 'go-back'

            if (action === 'go-back') {
                this.navigateBack();
            } else if (action === 'reset') {
                this.resetView();
            } else if (action === 'birds-eye') {
                this.setCameraView('birds-eye');
            } else if (action === 'front-view') {
                this.setCameraView('front-view');
            } else {
                console.log(`FSN Control button clicked: ${button.textContent} (action '${action}' not implemented)`);
            }
        });
    }

    // --- Interaction Logic ---

    onCanvasDoubleClick(event) {
        if (!this.camera || !this.scene || !this.elements.canvasContainer) return;

        const rect = this.elements.canvasContainer.getBoundingClientRect();
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.objectsInScene);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            const userData = clickedObject.userData;
            console.log("Clicked:", userData);

            if (userData.type === 'folder') {
                this.navigateTo(userData.path);
            } else if (userData.type === 'file') {
                // Display file info
                if (this.elements.infoBar) {
                    const fileData = this.fileSystem[userData.path];
                    this.elements.infoBar.textContent = `${userData.name} - ${fileData?.size || '?'} bytes`;
                }
            }
        }
    }

    navigateTo(path) {
        if (!this.fileSystem[path] || this.fileSystem[path].type !== 'folder') {
            console.warn(`Cannot navigate to invalid path: ${path}`);
            return;
        }
        if (path === this.currentPath) return; // Already there

        // Add current path to history before navigating
        this.history.push(this.currentPath);

        this.currentPath = path;
        this.window.setTitle(`FSN: ${this.currentPath}`); // Update window title
        this.renderFileSystem(); // Re-render scene for the new path
        if (this.elements.infoBar) this.elements.infoBar.textContent = ''; // Clear info bar
    }

    navigateBack() {
        if (this.history.length > 0) {
            const previousPath = this.history.pop();
            // Don't push current path to history when going back
            this.currentPath = previousPath;
            this.window.setTitle(`FSN: ${this.currentPath}`);
            this.renderFileSystem();
            if (this.elements.infoBar) this.elements.infoBar.textContent = '';
        } else {
            console.log("FSN: No history to go back to.");
        }
    }


    // --- File System Logic ---

    renderFileSystem() {
        if (!this.scene) return;

        // Clear previous objects
        this.objectsInScene.forEach(obj => this.scene.remove(obj));
        this.objectsInScene = [];

        // Update path display
        if (this.elements.pathText) {
            this.elements.pathText.textContent = this.currentPath;
        }

        const currentDirData = this.fileSystem[this.currentPath];
        if (!currentDirData || currentDirData.type !== 'folder') {
            console.error(`Invalid current path or not a folder: ${this.currentPath}`);
            return;
        }

        // Simple grid layout
        const spacing = 3;
        const itemsPerRow = 5;
        let count = 0;

        // Add '..' entry if not at root
        if (this.currentPath !== '/') {
             const parentPath = this.currentPath.substring(0, this.currentPath.lastIndexOf('/')) || '/';
             this.createObjectRepresentation('..', 'folder', parentPath, count++, itemsPerRow, spacing);
        }

        // Add items in the current directory
        currentDirData.children.forEach(itemName => {
            const itemPath = (this.currentPath === '/' ? '' : this.currentPath) + '/' + itemName;
            const itemData = this.fileSystem[itemPath];
            if (itemData) {
                this.createObjectRepresentation(itemName, itemData.type, itemPath, count++, itemsPerRow, spacing);
            }
        });
    }

    createObjectRepresentation(name, type, path, index, itemsPerRow, spacing) {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1.5); // Simple block
        let color = 0xffffff;
        if (type === 'folder') {
            color = 0xffd700; // Yellow for folders
        } else if (name.endsWith('.txt') || name.endsWith('.doc')) {
            color = 0xeeeeee; // White-ish for docs
        } else if (name.endsWith('.png') || name.endsWith('.jpg')) {
            color = 0xcc99ff; // Purple-ish for images
        }

        const material = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);

        // Position in a grid
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        mesh.position.x = (col - (itemsPerRow - 1) / 2) * spacing;
        mesh.position.z = row * -spacing; // Move further away for next row
        mesh.position.y = 0; // Base height

        // Store metadata (could use userData)
        mesh.userData = { name, type, path };

        this.scene.add(mesh);
        this.objectsInScene.push(mesh);

        // Create and add label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'fsn-label';
        labelDiv.textContent = name;
        labelDiv.style.color = 'white';
        labelDiv.style.fontSize = '10px';
        labelDiv.style.textShadow = '1px 1px 2px black';
        labelDiv.style.pointerEvents = 'none'; // Labels shouldn't block clicks on objects

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, -0.5, 0); // Position below the mesh
        mesh.add(label); // Attach label to the mesh
        label.layers.set(0); // Render on default layer
    }

    // --- Animation Loop ---
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        if (!this.renderer || !this.scene || !this.camera) return;

        if (this.controls) this.controls.update(); // Update camera controls

        this.renderer.render(this.scene, this.camera);
        if (this.labelRenderer) { // Render labels
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    // --- Cleanup ---
    destroy() {
        console.log(`FSN App (${this.appInfo.id}) destroying...`);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
         this.window.element.removeEventListener('window-resize-end', () => this.onWindowResize()); // Clean up listener

        // Dispose Three.js resources
        // Dispose label renderer
        if (this.labelRenderer && this.labelRenderer.domElement.parentNode) {
            this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        if (this.scene) {
            // Dispose labels attached to meshes
            this.scene.traverse(object => {
                 if (object.children) {
                     // Filter CSS2DObjects specifically if needed, or just remove all children
                     const labels = object.children.filter(child => child instanceof CSS2DObject);
                     labels.forEach(label => object.remove(label)); // Remove label from parent mesh
                 }
            });
            // Dispose geometries, materials, textures
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        // Remove styles
        const styleElement = document.getElementById('fsn-styles');
        if (styleElement) {
            styleElement.remove();
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null; // Clear label renderer reference
        this.controls?.dispose(); // Dispose controls if they exist
        this.controls = null;
        this.contentEl.innerHTML = ''; // Clear content
    }

    // --- Camera Control Methods ---
    resetView() {
        if (!this.camera || !this.controls) return;
        this.camera.position.set(0, 5, 10);
        this.controls.target.set(0, 0, 0); // Look at origin
        this.controls.update();
        console.log("FSN View Reset");
    }

    setCameraView(viewType) {
        if (!this.camera || !this.controls) return;
        switch(viewType) {
            case 'birds-eye':
                this.camera.position.set(0, 20, 0.1); // High above, slightly tilted
                this.controls.target.set(0, 0, 0); // Look down at origin
                break;
            case 'front-view':
                 this.camera.position.set(0, 2, 15); // Further back, lower angle
                 this.controls.target.set(0, 0, 0); // Look towards origin center
                 break;
            default:
                this.resetView(); // Default to reset
                break;
        }
        this.controls.update(); // Apply changes
        console.log(`FSN View set to: ${viewType}`);
    }
}

export default FSNApp;
