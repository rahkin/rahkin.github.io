export class PerformanceOptimizer {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Performance metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            drawCalls: 0,
            triangles: 0,
            objects: 0
        };

        // Optimization levels
        this.currentLevel = 'high';
        this.levels = {
            high: {
                shadowMapSize: 2048,
                particleCount: 1000,
                maxLights: 8,
                antiAlias: true,
                renderDistance: 100
            },
            medium: {
                shadowMapSize: 1024,
                particleCount: 500,
                maxLights: 4,
                antiAlias: true,
                renderDistance: 75
            },
            low: {
                shadowMapSize: 512,
                particleCount: 200,
                maxLights: 2,
                antiAlias: false,
                renderDistance: 50
            }
        };

        this.setupOptimizations();
        this.setupMonitoring();
    }

    setupOptimizations() {
        // Initialize object pooling
        this.objectPools = new Map();
        
        // Setup frustum culling
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
        
        // Setup LOD system
        this.setupLODSystem();
        
        // Initialize occlusion culling
        this.setupOcclusionCulling();
    }

    setupMonitoring() {
        this.stats = {
            begin: performance.now(),
            frames: 0,
            lastUpdate: performance.now()
        };

        // Create performance HUD
        this.createPerformanceHUD();
    }

    createPerformanceHUD() {
        const hud = document.createElement('div');
        hud.className = 'performance-hud';
        hud.innerHTML = `
            <div class="metric">FPS: <span id="fpsCounter">60</span></div>
            <div class="metric">Draw Calls: <span id="drawCalls">0</span></div>
            <div class="metric">Triangles: <span id="triangles">0</span></div>
            <div class="metric">Objects: <span id="objects">0</span></div>
        `;
        document.body.appendChild(hud);
    }

    setupLODSystem() {
        this.lodGroups = new Map();
        this.lodThresholds = [0, 20, 40, 60];
    }

    setupOcclusionCulling() {
        this.occlusionQueries = new Map();
        this.visibilityTimeout = 1000; // ms
    }

    addToObjectPool(type, createFn, initialSize = 10) {
        const pool = [];
        for (let i = 0; i < initialSize; i++) {
            const obj = createFn();
            obj.visible = false;
            pool.push(obj);
        }
        this.objectPools.set(type, pool);
    }

    getFromPool(type) {
        const pool = this.objectPools.get(type);
        if (!pool) return null;

        const obj = pool.find(o => !o.visible);
        if (obj) {
            obj.visible = true;
            return obj;
        }

        // Create new object if pool is exhausted
        const newObj = pool[0].clone();
        newObj.visible = true;
        pool.push(newObj);
        return newObj;
    }

    returnToPool(obj) {
        obj.visible = false;
        obj.position.set(0, -1000, 0); // Move out of view
    }

    updateFrustumCulling() {
        this.projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        this.scene.traverse((obj) => {
            if (obj.isMesh && obj.userData.cullable) {
                if (!obj.geometry.boundingSphere) {
                    obj.geometry.computeBoundingSphere();
                }
                const sphere = obj.geometry.boundingSphere.clone();
                sphere.applyMatrix4(obj.matrixWorld);
                obj.visible = this.frustum.intersectsSphere(sphere);
            }
        });
    }

    updateLOD() {
        this.lodGroups.forEach((group, object) => {
            const distance = this.camera.position.distanceTo(object.position);
            let levelIndex = this.lodThresholds.findIndex(t => distance < t);
            levelIndex = Math.max(0, levelIndex);
            
            if (group.currentLevel !== levelIndex) {
                group.currentLevel = levelIndex;
                object.geometry = group.geometries[levelIndex];
            }
        });
    }

    addLODObject(object, geometries) {
        this.lodGroups.set(object, {
            geometries,
            currentLevel: 0
        });
    }

    updateOcclusionCulling() {
        const now = performance.now();
        
        this.occlusionQueries.forEach((data, object) => {
            if (now - data.lastCheck > this.visibilityTimeout) {
                // Perform occlusion test
                const visible = this.testOcclusion(object);
                object.visible = visible;
                data.lastCheck = now;
            }
        });
    }

    testOcclusion(object) {
        // Simplified occlusion test using raycasting
        const rayDirection = object.position.clone().sub(this.camera.position).normalize();
        const ray = new THREE.Raycaster(this.camera.position, rayDirection);
        const intersects = ray.intersectObjects(this.scene.children, true);
        
        return intersects.length === 0 || intersects[0].object === object;
    }

    update() {
        // Update performance metrics
        this.updateMetrics();
        
        // Apply optimizations
        this.updateFrustumCulling();
        this.updateLOD();
        this.updateOcclusionCulling();
        
        // Adjust quality settings based on performance
        this.adjustQualitySettings();
        
        // Update HUD
        this.updatePerformanceHUD();
    }

    updateMetrics() {
        const now = performance.now();
        const delta = now - this.stats.lastUpdate;

        if (delta >= 1000) {
            this.metrics.fps = Math.round((this.stats.frames * 1000) / delta);
            this.metrics.frameTime = delta / this.stats.frames;
            this.metrics.drawCalls = this.renderer.info.render.calls;
            this.metrics.triangles = this.renderer.info.render.triangles;
            this.metrics.objects = this.scene.children.length;

            this.stats.frames = 0;
            this.stats.lastUpdate = now;
        }

        this.stats.frames++;
    }

    adjustQualitySettings() {
        const targetFPS = 60;
        const tolerance = 5;

        if (this.metrics.fps < targetFPS - tolerance) {
            this.decreaseQuality();
        } else if (this.metrics.fps > targetFPS + tolerance) {
            this.increaseQuality();
        }
    }

    decreaseQuality() {
        if (this.currentLevel === 'high') {
            this.setQualityLevel('medium');
        } else if (this.currentLevel === 'medium') {
            this.setQualityLevel('low');
        }
    }

    increaseQuality() {
        if (this.currentLevel === 'low') {
            this.setQualityLevel('medium');
        } else if (this.currentLevel === 'medium') {
            this.setQualityLevel('high');
        }
    }

    setQualityLevel(level) {
        if (this.currentLevel === level) return;

        const settings = this.levels[level];
        this.currentLevel = level;

        // Apply renderer settings
        this.renderer.shadowMap.mapSize.width = settings.shadowMapSize;
        this.renderer.shadowMap.mapSize.height = settings.shadowMapSize;
        this.renderer.setPixelRatio(settings.antiAlias ? window.devicePixelRatio : 1);

        // Update scene settings
        this.scene.traverse((obj) => {
            if (obj.isLight) {
                obj.shadow.mapSize.width = settings.shadowMapSize;
                obj.shadow.mapSize.height = settings.shadowMapSize;
            }
        });

        // Emit quality change event
        this.onQualityChange(level);
    }

    onQualityChange(level) {
        const event = new CustomEvent('qualitychange', { detail: { level } });
        window.dispatchEvent(event);
    }

    updatePerformanceHUD() {
        document.getElementById('fpsCounter').textContent = this.metrics.fps;
        document.getElementById('drawCalls').textContent = this.metrics.drawCalls;
        document.getElementById('triangles').textContent = this.metrics.triangles;
        document.getElementById('objects').textContent = this.metrics.objects;
    }
} 