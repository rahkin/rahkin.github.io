export class ResourceManager {
    constructor() {
        this.resources = new Map();
        this.loadingPromises = new Map();
        this.resourceMetadata = new Map();
        
        // Resource loaders
        this.loaders = {
            texture: new THREE.TextureLoader(),
            model: new THREE.GLTFLoader(),
            audio: new AudioLoader(),
            json: new JSONLoader(),
            shader: new ShaderLoader()
        };
        
        this.setupCaching();
    }

    setupCaching() {
        this.cache = {
            maxSize: 100 * 1024 * 1024, // 100MB
            currentSize: 0,
            items: new Map()
        };
    }

    async load(type, url, options = {}) {
        const resourceKey = `${type}:${url}`;
        
        // Check if resource is already loaded
        if (this.resources.has(resourceKey)) {
            return this.resources.get(resourceKey);
        }
        
        // Check if resource is being loaded
        if (this.loadingPromises.has(resourceKey)) {
            return this.loadingPromises.get(resourceKey);
        }
        
        // Start loading
        const loadPromise = this.loadResource(type, url, options);
        this.loadingPromises.set(resourceKey, loadPromise);
        
        try {
            const resource = await loadPromise;
            this.resources.set(resourceKey, resource);
            this.loadingPromises.delete(resourceKey);
            
            // Store metadata
            this.resourceMetadata.set(resourceKey, {
                type,
                url,
                size: this.getResourceSize(resource),
                lastAccessed: Date.now(),
                options
            });
            
            // Manage cache
            this.updateCache(resourceKey, resource);
            
            return resource;
        } catch (error) {
            this.loadingPromises.delete(resourceKey);
            throw error;
        }
    }

    async loadResource(type, url, options) {
        const loader = this.loaders[type];
        if (!loader) {
            throw new Error(`No loader found for resource type: ${type}`);
        }
        
        switch (type) {
            case 'texture':
                return this.loadTexture(url, options);
            case 'model':
                return this.loadModel(url, options);
            case 'audio':
                return this.loadAudio(url, options);
            case 'json':
                return this.loadJSON(url);
            case 'shader':
                return this.loadShader(url);
            default:
                throw new Error(`Unsupported resource type: ${type}`);
        }
    }

    async loadTexture(url, options) {
        const texture = await this.loaders.texture.loadAsync(url);
        
        if (options.generateMipmaps) {
            texture.generateMipmaps = true;
        }
        
        if (options.anisotropy) {
            texture.anisotropy = options.anisotropy;
        }
        
        return texture;
    }

    async loadModel(url, options) {
        const gltf = await this.loaders.model.loadAsync(url);
        
        if (options.animations) {
            return {
                scene: gltf.scene,
                animations: gltf.animations
            };
        }
        
        return gltf.scene;
    }

    async loadAudio(url, options) {
        return this.loaders.audio.load(url, options);
    }

    async loadJSON(url) {
        const response = await fetch(url);
        return response.json();
    }

    async loadShader(url) {
        return this.loaders.shader.load(url);
    }

    getResourceSize(resource) {
        if (resource instanceof THREE.Texture) {
            return resource.image.width * resource.image.height * 4; // Approximate size in bytes
        }
        
        if (resource instanceof THREE.BufferGeometry) {
            let size = 0;
            for (const attribute of Object.values(resource.attributes)) {
                size += attribute.array.byteLength;
            }
            return size;
        }
        
        // Default size estimation
        return 1024; // 1KB
    }

    updateCache(key, resource) {
        const size = this.getResourceSize(resource);
        
        // Check if we need to free up space
        while (this.cache.currentSize + size > this.cache.maxSize) {
            this.evictLeastRecentlyUsed();
        }
        
        // Add to cache
        this.cache.items.set(key, {
            resource,
            size,
            lastAccessed: Date.now()
        });
        
        this.cache.currentSize += size;
    }

    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, item] of this.cache.items) {
            if (item.lastAccessed < oldestTime) {
                oldestTime = item.lastAccessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            const item = this.cache.items.get(oldestKey);
            this.cache.currentSize -= item.size;
            this.cache.items.delete(oldestKey);
            this.resources.delete(oldestKey);
        }
    }

    get(type, url) {
        const resourceKey = `${type}:${url}`;
        const resource = this.resources.get(resourceKey);
        
        if (resource) {
            // Update last accessed time
            const metadata = this.resourceMetadata.get(resourceKey);
            if (metadata) {
                metadata.lastAccessed = Date.now();
            }
        }
        
        return resource;
    }

    unload(type, url) {
        const resourceKey = `${type}:${url}`;
        const resource = this.resources.get(resourceKey);
        
        if (resource) {
            // Dispose of resource
            if (resource.dispose) {
                resource.dispose();
            }
            
            this.resources.delete(resourceKey);
            this.resourceMetadata.delete(resourceKey);
            this.cache.items.delete(resourceKey);
        }
    }

    clear() {
        // Dispose of all resources
        this.resources.forEach((resource) => {
            if (resource.dispose) {
                resource.dispose();
            }
        });
        
        this.resources.clear();
        this.loadingPromises.clear();
        this.resourceMetadata.clear();
        this.cache.items.clear();
        this.cache.currentSize = 0;
    }

    getLoadingProgress() {
        const total = this.loadingPromises.size + this.resources.size;
        const loaded = this.resources.size;
        
        return {
            loaded,
            total,
            progress: total > 0 ? loaded / total : 1
        };
    }
}

// Helper loader classes
class AudioLoader {
    async load(url, options) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return await audioContext.decodeAudioData(arrayBuffer);
    }
}

class JSONLoader {
    async load(url) {
        const response = await fetch(url);
        return response.json();
    }
}

class ShaderLoader {
    async load(url) {
        const response = await fetch(url);
        return response.text();
    }
} 