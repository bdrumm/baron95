// Removed direct import of getWindowContentElement as it's passed via windowObject

class MechCombatApp {
    constructor(os, windowObject, appInfo) { // Changed windowEl to windowObject
        this.os = os;
        this.windowObject = windowObject; // Store the whole object
        this.appInfo = appInfo;
        // The content element is directly available as windowObject.body
        this.contentEl = windowObject.body;

        // App-specific state
        this.gl = null;
        this.shaderProgram = null;
        this.buffers = {};
        this.locations = {};
        this.gameRunning = false;
        this.score = 0;
        this.player = {
            position: [0, 0.5, 0], // Use arrays directly
            angle: 0,
            fireCooldown: 0
        };
        this.enemies = [];
        this.projectiles = [];
        this.keys = {};
        this.lastTime = 0;
        this.animationFrameId = null;

        // DOM elements within the window
        this.canvas = null;
        this.hud = null;
        this.message = null;

        console.log(`Mech Combat App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("MechCombatApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Mech Combat App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return; // Don't proceed if body is missing

        this.setupDOM();
        this.setupWebGL();
        this.setupInputListeners();
        this.resetGame(); // Initial setup
        // Show initial message
        this.message.textContent = "Press ENTER inside window to Start";
        this.message.style.display = 'block';
        // Start the game loop, but it will only update/render if gameRunning is true
        this.gameLoop(0);
    }

    setupDOM() {
        if (!this.contentEl) return; // Guard against missing content element
        // Create elements *inside* the window's content area
        this.contentEl.style.position = 'relative'; // Needed for absolute positioning of HUD/message
        this.contentEl.style.overflow = 'hidden'; // Prevent canvas spill
        this.contentEl.style.padding = '0'; // Remove default padding
        this.contentEl.style.backgroundColor = '#000'; // Black background for the game area

        this.canvas = document.createElement('canvas');
        this.canvas.id = `mech-canvas-${this.appInfo.id}`;
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.contentEl.appendChild(this.canvas);

        this.hud = document.createElement('div');
        this.hud.id = `mech-hud-${this.appInfo.id}`;
        this.hud.style.position = 'absolute';
        this.hud.style.top = '5px';
        this.hud.style.left = '5px';
        this.hud.style.color = '#fff';
        this.hud.style.fontFamily = 'monospace';
        this.hud.style.fontSize = '16px';
        this.hud.style.zIndex = '10';
        this.hud.style.pointerEvents = 'none';
        this.hud.textContent = "Score: 0";
        this.contentEl.appendChild(this.hud);

        this.message = document.createElement('div');
        this.message.id = `mech-message-${this.appInfo.id}`;
        this.message.style.position = 'absolute';
        this.message.style.top = '50%';
        this.message.style.left = '50%';
        this.message.style.transform = 'translate(-50%, -50%)';
        this.message.style.color = '#fff';
        this.message.style.fontFamily = 'monospace';
        this.message.style.fontSize = '24px';
        this.message.style.textAlign = 'center';
        this.message.style.zIndex = '20';
        this.message.style.display = 'none';
        this.message.style.pointerEvents = 'none';
        this.contentEl.appendChild(this.message);

        // Adjust canvas size initially and on window resize
        // Use ResizeObserver for general resizing (like maximize/restore)
        this.resizeObserver = new ResizeObserver(entries => {
             // Debounce or throttle this if performance becomes an issue
             this.resizeCanvas();
        });
        this.resizeObserver.observe(this.contentEl);

        // Listen for the custom event dispatched after manual resize (use main element)
        this.boundResizeCanvas = this.resizeCanvas.bind(this); // Bind 'this' for the listener
        this.windowObject.element.addEventListener('window-resize-end', this.boundResizeCanvas);

        this.resizeCanvas(); // Initial size
    }

    resizeCanvas() {
        const displayWidth = this.contentEl.clientWidth;
        const displayHeight = this.contentEl.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            if (this.gl) {
                this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
                console.log(`Mech Combat Canvas resized to: ${displayWidth}x${displayHeight}`);
            }
        }
    }

    setupWebGL() {
        this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
        if (!this.gl) {
            this.message.textContent = "WebGL not supported!";
            this.message.style.display = 'block';
            console.error("WebGL context creation failed for Mech Combat");
            return;
        }
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.05, 0.05, 0.1, 1); // Moved clear color here

        // --- Shaders (Keep the source strings as they were) ---
        const vsSource = `
          attribute vec3 aPosition;
          attribute vec3 aNormal;
          uniform mat4 uModel;
          uniform mat4 uView;
          uniform mat4 uProjection;
          varying vec3 vNormal;
          varying vec3 vFragPos;
          void main(void) {
            vec4 worldPos = uModel * vec4(aPosition, 1.0);
            vFragPos = worldPos.xyz;
            vNormal = mat3(uModel) * aNormal; // Assumes uniform scaling
            gl_Position = uProjection * uView * worldPos;
          }
        `;
        const fsSource = `
          precision mediump float;
          varying vec3 vNormal;
          varying vec3 vFragPos;
          uniform vec3 uColor;
          uniform vec3 uLightDir;
          void main(void) {
            vec3 normal = normalize(vNormal);
            float diff = max(dot(normal, normalize(uLightDir)), 0.0);
            vec3 ambient = 0.2 * uColor;
            vec3 diffuse = 0.8 * diff * uColor;
            gl_FragColor = vec4(ambient + diffuse, 1.0);
          }
        `;

        // --- Compile and Link ---
        const vertexShader = this.compileShader(vsSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fsSource, gl.FRAGMENT_SHADER);
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            console.error("Shader program failed to link:", gl.getProgramInfoLog(this.shaderProgram));
            this.message.textContent = "Shader Error!";
            this.message.style.display = 'block';
            return;
        }
        gl.useProgram(this.shaderProgram);

        // --- Get Locations ---
        this.locations.aPositionLoc = gl.getAttribLocation(this.shaderProgram, "aPosition");
        this.locations.aNormalLoc = gl.getAttribLocation(this.shaderProgram, "aNormal");
        this.locations.uModelLoc = gl.getUniformLocation(this.shaderProgram, "uModel");
        this.locations.uViewLoc = gl.getUniformLocation(this.shaderProgram, "uView");
        this.locations.uProjectionLoc = gl.getUniformLocation(this.shaderProgram, "uProjection");
        this.locations.uColorLoc = gl.getUniformLocation(this.shaderProgram, "uColor");
        this.locations.uLightDirLoc = gl.getUniformLocation(this.shaderProgram, "uLightDir");

        // --- Geometry (Keep data arrays as they were) ---
         const cubePositions = new Float32Array([ -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5, -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5,   0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5, -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5,  0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5, 0.5, 0.5,   0.5,-0.5, 0.5, -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5, ]);
         const cubeNormals = new Float32Array([ 0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, ]);
         const cubeIndices = new Uint16Array([ 0, 1, 2,   0, 2, 3,  4, 5, 6,   4, 6, 7,  8, 9,10,   8,10,11,  12,13,14,  12,14,15, 16,17,18,  16,18,19, 20,21,22,  20,22,23 ]);

        // --- Create Buffers ---
        this.buffers.cubePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubePositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cubePositions, gl.STATIC_DRAW);
        this.buffers.cubeNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);
        this.buffers.cubeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);
        this.buffers.cubeIndexCount = cubeIndices.length; // Store count

        console.log("WebGL Setup Complete for Mech Combat");
    }

    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Shader compile error (${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'}):`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    setupInputListeners() {
        // Listen on the document, but check if the window is focused
        this.keydownListener = (e) => {
            // Check if the currently focused window in the OS matches this app's window
            const focusedWindowId = this.os.windowManager.getCurrentFocusedWindowId ? this.os.windowManager.getCurrentFocusedWindowId() : null; // Need WM to expose this
            // Fallback: check if active element is within this window's content area
            const isActive = document.activeElement === this.contentEl || this.contentEl.contains(document.activeElement);

            // if (focusedWindowId !== this.windowObject.id && !isActive) {
            // Simplified check: only process if contentEl has focus
            if (document.activeElement !== this.contentEl) {
                 // return;
             }

            this.keys[e.code] = true;
            if (!this.gameRunning && e.code === "Enter") {
                this.gameRunning = true;
                this.message.style.display = "none";
                this.resetGame(); // Start fresh
            }
             // Prevent default browser actions for keys used by the game (like spacebar scrolling)
             if (e.code === "Space" || e.code === "KeyW" || e.code === "KeyS" || e.code === "KeyA" || e.code === "KeyD") {
                 e.preventDefault();
             }
        };
        this.keyupListener = (e) => {
            this.keys[e.code] = false;
        };

        // Add listeners to the document - they check internally if the game should react
        document.addEventListener("keydown", this.keydownListener);
        document.addEventListener("keyup", this.keyupListener);

         // Make the content area focusable so it can potentially receive key events directly
         this.contentEl.setAttribute('tabindex', '0'); // Make content area focusable
         this.contentEl.style.outline = 'none'; // Hide focus ring

         // Focus the content area when the window is clicked (use main element)
         this.windowObject.element.addEventListener('mousedown', (e) => {
             // Don't steal focus from title bar elements
             if (!e.target.closest('.title-bar')) {
                 this.contentEl.focus();
             }
         });
    }

    resetGame() {
        this.player.position = [0, 0.5, 0];
        this.player.angle = 0;
        this.player.fireCooldown = 0;
        this.enemies.length = 0;
        this.projectiles.length = 0;
        this.score = 0;
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }
        if (this.hud) {
            this.hud.textContent = "Score: " + this.score;
        }
    }

    spawnEnemy() {
        const spawnEnemyDistance = 15;
        const enemySpeed = 1.5;
        const angle = Math.random() * Math.PI * 2;
        const pos = [
            Math.cos(angle) * spawnEnemyDistance,
            0.5,
            Math.sin(angle) * spawnEnemyDistance
        ];
        this.enemies.push({ position: pos, speed: enemySpeed });
    }

    gameLoop(time) {
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));

        if (!this.gl) return; // Don't run if WebGL failed

        const delta = (time - this.lastTime) * 0.001;
        this.lastTime = time;

        if (this.gameRunning) {
            this.update(delta);
            this.render();
        }
    }

    update(delta) {
        // --- Minimal Math Lib (Vec3 part - Mat4 is complex, keep original if possible or use library) ---
        // Simple Vec3 operations needed for game logic
        const vec3 = {
            add: (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
            subtract: (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
            scale: (v, s) => [v[0]*s, v[1]*s, v[2]*s],
            length: (v) => Math.hypot(v[0], v[1], v[2]),
            normalize: (v) => {
                const len = Math.hypot(v[0], v[1], v[2]);
                return len > 0 ? [v[0]/len, v[1]/len, v[2]/len] : [0,0,0];
            }
        };

        // --- Player Movement ---
        const moveSpeed = 5;
        const rotateSpeed = 2.5;
        if (this.keys["KeyW"]) {
            this.player.position[0] += Math.sin(this.player.angle) * moveSpeed * delta;
            this.player.position[2] += -Math.cos(this.player.angle) * moveSpeed * delta;
        }
        if (this.keys["KeyS"]) {
            this.player.position[0] -= Math.sin(this.player.angle) * moveSpeed * delta;
            this.player.position[2] -= -Math.cos(this.player.angle) * moveSpeed * delta;
        }
        if (this.keys["KeyA"]) this.player.angle -= rotateSpeed * delta;
        if (this.keys["KeyD"]) this.player.angle += rotateSpeed * delta;

        // --- Shooting ---
        const projectileSpeed = 10;
        const projectileLife = 2.0;
        this.player.fireCooldown -= delta;
        if (this.keys["Space"] && this.player.fireCooldown <= 0) {
            const forwardVec = [Math.sin(this.player.angle), 0, -Math.cos(this.player.angle)];
            const projPos = vec3.add(this.player.position, vec3.scale(forwardVec, 0.7));
            const velocity = vec3.scale(forwardVec, projectileSpeed);
            this.projectiles.push({ position: projPos, velocity: velocity, life: projectileLife });
            this.player.fireCooldown = 0.3;
        }

        // --- Update Projectiles ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.position = vec3.add(p.position, vec3.scale(p.velocity, delta));
            p.life -= delta;
            if (p.life <= 0) this.projectiles.splice(i, 1);
        }

        // --- Update Enemies ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const toPlayer = vec3.subtract(this.player.position, enemy.position);
            const dist = vec3.length(toPlayer);
            if (dist > 0.01) { // Avoid division by zero if exactly on top
                 const dir = vec3.normalize(toPlayer);
                 enemy.position = vec3.add(enemy.position, vec3.scale(dir, enemy.speed * delta));
            }

            // Collision: Player vs Enemy
            if (dist < 1.0) {
                this.gameRunning = false;
                this.message.textContent = "Game Over!\nPress ENTER to Restart";
                this.message.style.display = "block";
                return; // Stop update on game over
            }

            // Collision: Projectile vs Enemy
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const proj = this.projectiles[j];
                const diff = vec3.subtract(enemy.position, proj.position);
                if (vec3.length(diff) < 0.7) {
                    this.enemies.splice(i, 1);
                    this.projectiles.splice(j, 1);
                    this.score += 10;
                    this.hud.textContent = "Score: " + this.score;
                    this.spawnEnemy();
                    break; // Enemy destroyed, move to next enemy
                }
            }
        }
    }

    render() {
        const gl = this.gl;
        if (!gl || !this.shaderProgram) return; // Don't render if WebGL setup failed

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- Minimal Matrix Lib (Use original mat4 or a proper library) ---
        // For now, let's assume the original mat4 object is available globally
        // or included/imported. THIS IS A TEMPORARY HACK.
        // A better solution is to include a minimal mat4 library or use gl-matrix.
        // We'll copy the necessary functions here for now.
        const mat4 = this.getMat4Lib(); // Get the matrix functions

        // --- Projection ---
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projMatrix = mat4.create();
        mat4.perspective(projMatrix, Math.PI / 3, aspect, 0.1, 100.0);
        gl.uniformMatrix4fv(this.locations.uProjectionLoc, false, projMatrix);

        // --- View ---
        const camDist = 8;
        const camHeight = 4;
        const camOffset = [Math.sin(this.player.angle) * -camDist, camHeight, -Math.cos(this.player.angle) * -camDist];
        const camPos = [this.player.position[0] + camOffset[0], this.player.position[1] + camOffset[1], this.player.position[2] + camOffset[2]];
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, camPos, this.player.position, [0, 1, 0]);
        gl.uniformMatrix4fv(this.locations.uViewLoc, false, viewMatrix);

        // --- Light ---
        const lightDir = [0.5, 1.0, 0.3]; // Example direction
        const normalizedLightDir = vec3.normalize(lightDir); // Use vec3 helper
        gl.uniform3fv(this.locations.uLightDirLoc, normalizedLightDir);


        // --- Draw Ground ---
        let model = mat4.create();
        mat4.identity(model);
        mat4.translate(model, model, [0, -0.001, 0]);
        mat4.scale(model, model, [50, 0.01, 50]);
        this.drawCube(model, [0.2, 0.2, 0.2]);

        // --- Draw Player ---
        model = mat4.create();
        mat4.identity(model);
        mat4.translate(model, model, this.player.position);
        mat4.rotateY(model, model, this.player.angle);
        // mat4.scale(model, model, [1, 1, 1]); // Default scale is 1
        this.drawCube(model, [0.0, 0.8, 0.0]); // Green

        // --- Draw Enemies ---
        for (const enemy of this.enemies) {
            model = mat4.create();
            mat4.identity(model);
            mat4.translate(model, model, enemy.position);
            const enemyDir = Math.atan2(this.player.position[0] - enemy.position[0], this.player.position[2] - enemy.position[2]);
            mat4.rotateY(model, model, enemyDir); // Face player
            this.drawCube(model, [0.8, 0.0, 0.0]); // Red
        }

        // --- Draw Projectiles ---
        for (const proj of this.projectiles) {
            model = mat4.create();
            mat4.identity(model);
            mat4.translate(model, model, proj.position);
            mat4.scale(model, model, [0.3, 0.3, 0.3]);
            this.drawCube(model, [1.0, 1.0, 0.0]); // Yellow
        }
    }

    drawCube(modelMatrix, color) {
        const gl = this.gl;
        gl.uniformMatrix4fv(this.locations.uModelLoc, false, modelMatrix);
        gl.uniform3fv(this.locations.uColorLoc, color);

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubePositionBuffer);
        gl.enableVertexAttribArray(this.locations.aPositionLoc);
        gl.vertexAttribPointer(this.locations.aPositionLoc, 3, gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeNormalBuffer);
        gl.enableVertexAttribArray(this.locations.aNormalLoc);
        gl.vertexAttribPointer(this.locations.aNormalLoc, 3, gl.FLOAT, false, 0, 0);

        // Bind index buffer and draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.buffers.cubeIndexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Minimal Vec3 (already in update) and Mat4 library (copied from original)
    // Ideally, import this from a shared utility or use a library like gl-matrix
    getMat4Lib() {
        // Copy-paste the mat4 object from the original index.html
        return {
            create: () => new Float32Array(16),
            identity: function(out) { out.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return out; },
            multiply: function(out, a, b) { const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15],b00=b[0],b01=b[1],b02=b[2],b03=b[3],b10=b[4],b11=b[5],b12=b[6],b13=b[7],b20=b[8],b21=b[9],b22=b[10],b23=b[11],b30=b[12],b31=b[13],b32=b[14],b33=b[15]; out[0]=a00*b00+a01*b10+a02*b20+a03*b30; out[1]=a00*b01+a01*b11+a02*b21+a03*b31; out[2]=a00*b02+a01*b12+a02*b22+a03*b32; out[3]=a00*b03+a01*b13+a02*b23+a03*b33; out[4]=a10*b00+a11*b10+a12*b20+a13*b30; out[5]=a10*b01+a11*b11+a12*b21+a13*b31; out[6]=a10*b02+a11*b12+a12*b22+a13*b32; out[7]=a10*b03+a11*b13+a12*b23+a13*b33; out[8]=a20*b00+a21*b10+a22*b20+a23*b30; out[9]=a20*b01+a21*b11+a22*b21+a23*b31; out[10]=a20*b02+a21*b12+a22*b22+a23*b32; out[11]=a20*b03+a21*b13+a22*b23+a23*b33; out[12]=a30*b00+a31*b10+a32*b20+a33*b30; out[13]=a30*b01+a31*b11+a32*b21+a33*b31; out[14]=a30*b02+a31*b12+a32*b22+a33*b32; out[15]=a30*b03+a31*b13+a32*b23+a33*b33; return out; },
            translate: function(out, a, v) { const x=v[0],y=v[1],z=v[2],a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11]; out[0]=a00;out[1]=a01;out[2]=a02;out[3]=a03; out[4]=a10;out[5]=a11;out[6]=a12;out[7]=a13; out[8]=a20;out[9]=a21;out[10]=a22;out[11]=a23; out[12]=a00*x+a10*y+a20*z+a[12]; out[13]=a01*x+a11*y+a21*z+a[13]; out[14]=a02*x+a12*y+a22*z+a[14]; out[15]=a03*x+a13*y+a23*z+a[15]; return out; },
            rotateY: function(out, a, rad) { const s=Math.sin(rad),c=Math.cos(rad),a00=a[0],a01=a[1],a02=a[2],a03=a[3],a08=a[8],a09=a[9],a10=a[10],a11=a[11]; if(a!==out){out[4]=a[4];out[5]=a[5];out[6]=a[6];out[7]=a[7];out[12]=a[12];out[13]=a[13];out[14]=a[14];out[15]=a[15];} out[0]=a00*c-a08*s; out[1]=a01*c-a09*s; out[2]=a02*c-a10*s; out[3]=a03*c-a11*s; out[8]=a00*s+a08*c; out[9]=a01*s+a09*c; out[10]=a02*s+a10*c; out[11]=a03*s+a11*c; return out; },
            scale: function(out, a, v) { const x=v[0],y=v[1],z=v[2]; out[0]=a[0]*x;out[1]=a[1]*x;out[2]=a[2]*x;out[3]=a[3]*x; out[4]=a[4]*y;out[5]=a[5]*y;out[6]=a[6]*y;out[7]=a[7]*y; out[8]=a[8]*z;out[9]=a[9]*z;out[10]=a[10]*z;out[11]=a[11]*z; out[12]=a[12];out[13]=a[13];out[14]=a[14];out[15]=a[15]; return out; },
            perspective: function(out, fovy, aspect, near, far) { const f=1.0/Math.tan(fovy/2),nf=1/(near-far); out[0]=f/aspect;out[1]=0;out[2]=0;out[3]=0; out[4]=0;out[5]=f;out[6]=0;out[7]=0; out[8]=0;out[9]=0;out[10]=(far+near)*nf;out[11]=-1; out[12]=0;out[13]=0;out[14]=(2*far*near)*nf;out[15]=0; return out; },
            lookAt: function(out, eye, center, up) { let x0,x1,x2,y0,y1,y2,z0,z1,z2,len,eyex=eye[0],eyey=eye[1],eyez=eye[2],upx=up[0],upy=up[1],upz=up[2],centerx=center[0],centery=center[1],centerz=center[2]; z0=eyex-centerx;z1=eyey-centery;z2=eyez-centerz;len=Math.hypot(z0,z1,z2);if(len===0){z2=1;}else{len=1/len;z0*=len;z1*=len;z2*=len;} x0=upy*z2-upz*z1;x1=upz*z0-upx*z2;x2=upx*z1-upy*z0;len=Math.hypot(x0,x1,x2);if(len===0){x0=0;x1=0;x2=0;}else{len=1/len;x0*=len;x1*=len;x2*=len;} y0=z1*x2-z2*x1;y1=z2*x0-z0*x2;y2=z0*x1-z1*x0; out[0]=x0;out[1]=y0;out[2]=z0;out[3]=0; out[4]=x1;out[5]=y1;out[6]=z1;out[7]=0; out[8]=x2;out[9]=y2;out[10]=z2;out[11]=0; out[12]=-(x0*eyex+x1*eyey+x2*eyez); out[13]=-(y0*eyex+y1*eyey+y2*eyez); out[14]=-(z0*eyex+z1*eyey+z2*eyez); out[15]=1; return out; }
        };
    }

    // Cleanup method when the app is closed
    destroy() {
        console.log(`Mech Combat App (${this.appInfo.id}) destroying...`);
        // Stop the game loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        // Remove event listeners
        document.removeEventListener("keydown", this.keydownListener);
        document.removeEventListener("keyup", this.keyupListener);
        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        // Remove custom event listener (use the bound function)
        if (this.boundResizeCanvas) {
            this.windowObject.element.removeEventListener('window-resize-end', this.boundResizeCanvas);
        }

        // Clean up WebGL resources (optional but good practice)
        if (this.gl) {
            Object.values(this.buffers).forEach(buffer => this.gl.deleteBuffer(buffer));
            if (this.shaderProgram) this.gl.deleteProgram(this.shaderProgram);
            // Shaders are deleted automatically when program is deleted
        }
        // Remove DOM elements created by the app (the window manager removes the main window)
        if (this.canvas) this.canvas.remove();
        if (this.hud) this.hud.remove();
        if (this.message) this.message.remove();

        console.log(`Mech Combat App (${this.appInfo.id}) destroyed.`);
    }
}

// The OS core will import this default export
export default MechCombatApp;
