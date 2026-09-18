import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const MODE_PALETTES = {
    casual: {
        primary: new THREE.Color('#38bdf8'),    // Sky blue
        secondary: new THREE.Color('#0284c7'),  // Ocean blue
        halo: new THREE.Color('#7dd3fc'),       // Light cyan
        core: new THREE.Color('#bae6fd'),       // Soft luminous glow
    },
    focused: {
        primary: new THREE.Color('#f59e0b'),    // Amber gold
        secondary: new THREE.Color('#d97706'),  // Deep warm amber
        halo: new THREE.Color('#fcd34d'),       // Sunlight
        core: new THREE.Color('#fef3c7'),       // Luminous warm white
    },
    reflective: {
        primary: new THREE.Color('#a855f7'),    // Lavender violet
        secondary: new THREE.Color('#ec4899'),  // Gentle rose
        halo: new THREE.Color('#c084fc'),       // Lilac
        core: new THREE.Color('#f3e8ff'),       // Pale lavender
    },
    playful: {
        primary: new THREE.Color('#10b981'),    // Emerald mint
        secondary: new THREE.Color('#06b6d4'),  // Vibrant teal
        halo: new THREE.Color('#34d399'),       // Bright lime mint
        core: new THREE.Color('#a7f3d0'),       // Sparkling aquamarine
    },
};

// Generates an anti-aliased soft circular glow sprite texture
function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

export const ParticleSphere = ({ 
    mode = 'casual', 
    aiState = 'idle', 
    getVisualizerData, 
    useCartesia = false 
}) => {
    const containerRef = useRef(null);
    const modeRef = useRef(mode);
    const aiStateRef = useRef(aiState);
    const useCartesiaRef = useRef(useCartesia);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        aiStateRef.current = aiState;
    }, [aiState]);

    useEffect(() => {
        useCartesiaRef.current = useCartesia;
    }, [useCartesia]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let animationFrameId;
        const clock = new THREE.Clock();

        // 1. Scene & Camera Setup
        const scene = new THREE.Scene();
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
        camera.position.z = 6.8;

        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true, 
            powerPreference: 'high-performance' 
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const particleTexture = createParticleTexture();

        // 2. Build Sphere Particles (Fibonacci distribution ~720 particles)
        const SPHERE_COUNT = 720;
        const sphereGeo = new THREE.BufferGeometry();
        const spherePositions = new Float32Array(SPHERE_COUNT * 3);
        const sphereBasePositions = new Float32Array(SPHERE_COUNT * 3);
        const sphereNormals = new Float32Array(SPHERE_COUNT * 3);
        const sphereColors = new Float32Array(SPHERE_COUNT * 3);

        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle ~2.3999
        const SPHERE_RADIUS = 1.85;

        for (let i = 0; i < SPHERE_COUNT; i++) {
            const y = 1 - (i / (SPHERE_COUNT - 1)) * 2; // -1 to 1
            const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
            const theta = phi * i;

            const nx = Math.cos(theta) * radiusAtY;
            const ny = y;
            const nz = Math.sin(theta) * radiusAtY;

            sphereNormals[i * 3] = nx;
            sphereNormals[i * 3 + 1] = ny;
            sphereNormals[i * 3 + 2] = nz;

            const bx = nx * SPHERE_RADIUS;
            const by = ny * SPHERE_RADIUS;
            const bz = nz * SPHERE_RADIUS;

            sphereBasePositions[i * 3] = bx;
            sphereBasePositions[i * 3 + 1] = by;
            sphereBasePositions[i * 3 + 2] = bz;

            spherePositions[i * 3] = bx;
            spherePositions[i * 3 + 1] = by;
            spherePositions[i * 3 + 2] = bz;

            // Initialize default casual color
            sphereColors[i * 3] = 0.22;
            sphereColors[i * 3 + 1] = 0.74;
            sphereColors[i * 3 + 2] = 0.97;
        }

        sphereGeo.setAttribute('position', new THREE.BufferAttribute(spherePositions, 3));
        sphereGeo.setAttribute('color', new THREE.BufferAttribute(sphereColors, 3));

        const sphereMaterial = new THREE.PointsMaterial({
            size: 0.08,
            map: particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const spherePoints = new THREE.Points(sphereGeo, sphereMaterial);
        const sphereGroup = new THREE.Group();
        sphereGroup.add(spherePoints);
        scene.add(sphereGroup);

        // 3. Build Halo / Orbital Ring Particles (~320 particles)
        const HALO_COUNT = 320;
        const haloGeo = new THREE.BufferGeometry();
        const haloPositions = new Float32Array(HALO_COUNT * 3);
        const haloBasePositions = new Float32Array(HALO_COUNT * 3);
        const haloColors = new Float32Array(HALO_COUNT * 3);

        for (let i = 0; i < HALO_COUNT; i++) {
            const angle = (i / HALO_COUNT) * Math.PI * 2;
            const r = 2.6 + (Math.sin(i * 11) * 0.5 + 0.5) * 0.7; // slight organic ribbon thickness
            const hx = Math.cos(angle) * r;
            const hz = Math.sin(angle) * r;
            const hy = Math.sin(angle * 3) * 0.18 + (Math.sin(i * 13) * 0.08);

            haloBasePositions[i * 3] = hx;
            haloBasePositions[i * 3 + 1] = hy;
            haloBasePositions[i * 3 + 2] = hz;

            haloPositions[i * 3] = hx;
            haloPositions[i * 3 + 1] = hy;
            haloPositions[i * 3 + 2] = hz;

            haloColors[i * 3] = 0.49;
            haloColors[i * 3 + 1] = 0.83;
            haloColors[i * 3 + 2] = 0.99;
        }

        haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
        haloGeo.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));

        const haloMaterial = new THREE.PointsMaterial({
            size: 0.065,
            map: particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const haloPoints = new THREE.Points(haloGeo, haloMaterial);
        const haloGroup = new THREE.Group();
        haloGroup.rotation.x = 0.48; // Tilt halo relative to sphere
        haloGroup.rotation.z = 0.18;
        haloGroup.add(haloPoints);
        scene.add(haloGroup);

        // 4. Central Luminous Core Glow Sprite
        const coreMaterial = new THREE.SpriteMaterial({
            map: particleTexture,
            color: new THREE.Color('#38bdf8'),
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
        });
        const coreSprite = new THREE.Sprite(coreMaterial);
        coreSprite.scale.set(3.2, 3.2, 1.0);
        scene.add(coreSprite);

        // Dynamic State Tracking
        const currentPrimaryColor = new THREE.Color('#38bdf8');
        const currentSecondaryColor = new THREE.Color('#0284c7');
        const currentHaloColor = new THREE.Color('#7dd3fc');
        const currentCoreColor = new THREE.Color('#bae6fd');

        let mouseX = 0;
        let mouseY = 0;
        let targetMouseX = 0;
        let targetMouseY = 0;

        const handlePointerMove = (e) => {
            const rect = container.getBoundingClientRect();
            targetMouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            targetMouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        };
        window.addEventListener('pointermove', handlePointerMove);

        // Handle Responsive Window & Container Resizing
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            if (w === 0 || h === 0) return;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        // 5. 60 FPS Render & Physics Loop
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            const dt = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            // Smooth mouse parallax damping
            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            // Fetch live audio visualizer data
            const activeMode = modeRef.current || 'casual';
            const currentState = aiStateRef.current || 'idle';
            const audioData = getVisualizerData ? getVisualizerData(currentState, useCartesiaRef.current) : { volume: 0, bass: 0, mid: 0, treble: 0, source: 'idle' };

            const targetPalette = MODE_PALETTES[activeMode] || MODE_PALETTES.casual;

            // Smoothly lerp colors toward the current conversation mode
            currentPrimaryColor.lerp(targetPalette.primary, 0.06);
            currentSecondaryColor.lerp(targetPalette.secondary, 0.06);
            currentHaloColor.lerp(targetPalette.halo, 0.06);
            currentCoreColor.lerp(targetPalette.core, 0.06);

            coreMaterial.color.copy(currentCoreColor);

            const vol = audioData.volume || 0;
            const bass = audioData.bass || 0;
            const mid = audioData.mid || 0;
            const treble = audioData.treble || 0;
            const source = audioData.source || 'idle';

            // Core glow scale breathing & pulsing
            const baseGlowScale = 3.2 + Math.sin(elapsed * 1.5) * 0.15;
            const audioGlowPulse = vol * 1.8;
            coreSprite.scale.set(baseGlowScale + audioGlowPulse, baseGlowScale + audioGlowPulse, 1.0);
            coreMaterial.opacity = 0.28 + vol * 0.45;

            // --- Sphere Particle Physics & Real-Time Audio Displacement ---
            const posAttr = sphereGeo.attributes.position;
            const colAttr = sphereGeo.attributes.color;

            // Natural resting breath oscillation
            const restingBreath = Math.sin(elapsed * 1.6) * 0.04;

            for (let i = 0; i < SPHERE_COUNT; i++) {
                const i3 = i * 3;
                const bx = sphereBasePositions[i3];
                const by = sphereBasePositions[i3 + 1];
                const bz = sphereBasePositions[i3 + 2];

                const nx = sphereNormals[i3];
                const ny = sphereNormals[i3 + 1];
                const nz = sphereNormals[i3 + 2];

                let displacement = restingBreath;

                if (source === 'user') {
                    // USER SPEAKING: Direct real-time frequency displacement based on actual voice
                    // Bass influences equator (|ny| < 0.4), Mids influence body (0.4-0.8), Treble influences poles (>0.8)
                    const absY = Math.abs(ny);
                    let freqWeight = 0;
                    if (absY < 0.4) {
                        freqWeight = bass * 1.3 + mid * 0.5;
                    } else if (absY < 0.8) {
                        freqWeight = mid * 1.2 + bass * 0.3;
                    } else {
                        freqWeight = treble * 1.4 + mid * 0.4;
                    }

                    // Dynamic wave ripple across microphone voice pitch
                    const microWave = Math.sin(nx * 5.0 + ny * 6.0 + elapsed * 8.0) * 0.08 * vol;
                    displacement += freqWeight * 0.75 + microWave;

                } else if (source === 'ai') {
                    // AI SPEAKING: Coherent, smooth harmonic traveling ripples
                    const ripple1 = Math.sin(nx * 4.0 + ny * 3.0 + elapsed * 6.0);
                    const ripple2 = Math.cos(nz * 4.0 + elapsed * 4.5);
                    const liquidWave = (ripple1 * 0.6 + ripple2 * 0.4) * (0.12 + vol * 0.55);
                    displacement += liquidWave;

                } else if (source === 'thinking') {
                    // THINKING: Rhythmic breathing wave expanding from equator
                    const thinkPulse = Math.sin(elapsed * 3.5 + ny * 4.0) * 0.12;
                    displacement += thinkPulse;
                }

                // Apply displacement along vertex normal
                posAttr.array[i3] = bx + nx * displacement;
                posAttr.array[i3 + 1] = by + ny * displacement;
                posAttr.array[i3 + 2] = bz + nz * displacement;

                // Color gradient from pole to equator using mode palette
                const equatorFactor = 1 - Math.abs(ny);
                colAttr.array[i3] = THREE.MathUtils.lerp(currentSecondaryColor.r, currentPrimaryColor.r, equatorFactor);
                colAttr.array[i3 + 1] = THREE.MathUtils.lerp(currentSecondaryColor.g, currentPrimaryColor.g, equatorFactor);
                colAttr.array[i3 + 2] = THREE.MathUtils.lerp(currentSecondaryColor.b, currentPrimaryColor.b, equatorFactor);
            }

            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;

            // --- Orbiting Halo Dynamics ---
            const haloPosAttr = haloGeo.attributes.position;
            const haloColAttr = haloGeo.attributes.color;

            // Halo spin speed accelerates with audio volume
            const haloSpinRate = (0.005 + vol * 0.02) * (source === 'ai' ? 1.5 : 1.0);
            haloGroup.rotation.y -= haloSpinRate;

            for (let i = 0; i < HALO_COUNT; i++) {
                const i3 = i * 3;
                const hbx = haloBasePositions[i3];
                const hby = haloBasePositions[i3 + 1];
                const hbz = haloBasePositions[i3 + 2];

                // Halo ripples with audio intensity
                const haloWave = Math.sin(i * 0.15 + elapsed * 4.0) * (0.05 + vol * 0.25);
                const expansion = 1.0 + restingBreath * 0.5 + vol * 0.22;

                haloPosAttr.array[i3] = hbx * expansion;
                haloPosAttr.array[i3 + 1] = hby + haloWave;
                haloPosAttr.array[i3 + 2] = hbz * expansion;

                haloColAttr.array[i3] = currentHaloColor.r;
                haloColAttr.array[i3 + 1] = currentHaloColor.g;
                haloColAttr.array[i3 + 2] = currentHaloColor.b;
            }

            haloPosAttr.needsUpdate = true;
            haloColAttr.needsUpdate = true;

            // Sphere group rotation & interactive mouse tilt
            sphereGroup.rotation.y += 0.0035 + (source === 'ai' ? 0.005 : 0.001);
            sphereGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.08 + mouseY * 0.25;
            sphereGroup.rotation.z = mouseX * 0.25;

            renderer.render(scene, camera);
        };

        animate();

        // 6. Memory Cleanup on Unmount
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();

            sphereGeo.dispose();
            sphereMaterial.dispose();
            haloGeo.dispose();
            haloMaterial.dispose();
            coreMaterial.dispose();
            particleTexture.dispose();
            renderer.dispose();

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full relative flex items-center justify-center pointer-events-none"
            style={{ touchAction: 'none' }}
        />
    );
};
