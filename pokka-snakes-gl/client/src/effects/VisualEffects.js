import * as THREE from 'three';

export class VisualEffects {
    constructor(game) {
        this.game = game;
        this.effects = new Set();
        this.initShaders();
    }

    initShaders() {
        // Glow shader
        this.glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xffffff) },
                viewVector: { value: new THREE.Vector3() },
                c: { value: 0.1 },
                p: { value: 4.5 }
            },
            vertexShader: `
                uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize(normalMatrix * normal);
                    vec3 vNormel = normalize(normalMatrix * viewVector);
                    intensity = pow(c - dot(vNormal, vNormel), p);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float intensity;
                void main() {
                    gl_FragColor = vec4(color, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        // Trail shader
        this.trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float time;
                attribute vec3 position;
                attribute vec3 velocity;
                attribute vec3 color;
                varying vec3 vPosition;
                varying vec3 vVelocity;
                varying vec3 vColor;
                void main() {
                    vPosition = position + velocity * time;
                    vVelocity = velocity;
                    vColor = color;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `,
            transparent: true
        });
    }
} 