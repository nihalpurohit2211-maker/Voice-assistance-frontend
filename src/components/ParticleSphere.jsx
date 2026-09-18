import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const getTokenColor = (tokenName, fallback) => {
    if (typeof window !== 'undefined') {
        const val = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
        if (val) return val;
    }
    return fallback;
};

const getModePalettes = () => ({
    casual: {
        primary: new THREE.Color(getTokenColor('--mode-casual', '#5B8DEF')),
        secondary: new THREE.Color(getTokenColor('--mode-casual', '#5B8DEF')).multiplyScalar(0.7),
        halo: new THREE.Color(getTokenColor('--mode-casual', '#5B8DEF')).lerp(new THREE.Color('#ffffff'), 0.3),
        core: new THREE.Color(getTokenColor('--mode-casual', '#5B8DEF')).lerp(new THREE.Color('#ffffff'), 0.6),
    },
    focused: {
        primary: new THREE.Color(getTokenColor('--mode-focused', '#E0913D')),
        secondary: new THREE.Color(getTokenColor('--mode-focused', '#E0913D')).multiplyScalar(0.7),
        halo: new THREE.Color(getTokenColor('--mode-focused', '#E0913D')).lerp(new THREE.Color('#ffffff'), 0.3),
        core: new THREE.Color(getTokenColor('--mode-focused', '#E0913D')).lerp(new THREE.Color('#ffffff'), 0.6),
    },
    reflective: {
        primary: new THREE.Color(getTokenColor('--mode-reflective', '#8B6FE0')),
        secondary: new THREE.Color(getTokenColor('--mode-reflective', '#8B6FE0')).multiplyScalar(0.7),
        halo: new THREE.Color(getTokenColor('--mode-reflective', '#8B6FE0')).lerp(new THREE.Color('#ffffff'), 0.3),
        core: new THREE.Color(getTokenColor('--mode-reflective', '#8B6FE0')).lerp(new THREE.Color('#ffffff'), 0.6),
    },
    playful: {
        primary: new THREE.Color(getTokenColor('--mode-playful', '#4FC98A')),
        secondary: new THREE.Color(getTokenColor('--mode-playful', '#4FC98A')).multiplyScalar(0.7),
        halo: new THREE.Color(getTokenColor('--mode-playful', '#4FC98A')).lerp(new THREE.Color('#ffffff'), 0.3),
        core: new THREE.Color(getTokenColor('--mode-playful', '#4FC98A')).lerp(new THREE.Color('#ffffff'), 0.6),
    },
    idle: {
        primary: new THREE.Color(getTokenColor('--text-secondary', '#9a9aa8')),
        secondary: new THREE.Color(getTokenColor('--text-muted', '#5c5c68')),
        halo: new THREE.Color(getTokenColor('--text-secondary', '#9a9aa8')).multiplyScalar(0.8),
        core: new THREE.Color(getTokenColor('--text-secondary', '#9a9aa8')).lerp(new THREE.Color('#ffffff'), 0.2),
    }
});

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
    useCartesia = false,
    guidanceMode = 'none'
}) => {
    const containerRef = useRef(null);
    const modeRef = useRef(mode);
    const aiStateRef = useRef(aiState);
    const useCartesiaRef = useRef(useCartesia);
    const guidanceModeRef = useRef(guidanceMode);

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
        guidanceModeRef.current = guidanceMode;
    }, [guidanceMode]);

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

        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
        const SPHERE_RADIUS = 1.28;

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

            sphereColors[i * 3] = 0.36;
            sphereColors[i * 3 + 1] = 0.55;
            sphereColors[i * 3 + 2] = 0.94;
        }

        sphereGeo.setAttribute('position', new THREE.BufferAttribute(spherePositions, 3));
        sphereGeo.setAttribute('color', new THREE.BufferAttribute(sphereColors, 3));

        const sphereMaterial = new THREE.PointsMaterial({
            size: 0.058,
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
            const r = 1.85 + (Math.sin(i * 11) * 0.5 + 0.5) * 0.45;
            const hx = Math.cos(angle) * r;
            const hz = Math.sin(angle) * r;
            const hy = Math.sin(angle * 3) * 0.12 + (Math.sin(i * 13) * 0.06);

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
            size: 0.046,
            map: particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const haloPoints = new THREE.Points(haloGeo, haloMaterial);
        const haloGroup = new THREE.Group();
        haloGroup.rotation.x = 0.48;
        haloGroup.rotation.z = 0.18;
        haloGroup.add(haloPoints);
        scene.add(haloGroup);

        // 4. Build Guidance Mode Outer Ring (~180 particles in var(--mode-guidance))
        // Layered on top, rendered when a guidance mode other than 'None' is active
        const GUIDANCE_COUNT = 180;
        const guidanceGeo = new THREE.BufferGeometry();
        const guidancePositions = new Float32Array(GUIDANCE_COUNT * 3);
        const guidanceBasePositions = new Float32Array(GUIDANCE_COUNT * 3);
        const guidanceColors = new Float32Array(GUIDANCE_COUNT * 3);

        const guidanceColor = new THREE.Color(getTokenColor('--mode-guidance', '#D4536B'));

        for (let i = 0; i < GUIDANCE_COUNT; i++) {
            const angle = (i / GUIDANCE_COUNT) * Math.PI * 2;
            const gr = 2.40 + (Math.sin(i * 9) * 0.5 + 0.5) * 0.20;
            const gx = Math.cos(angle) * gr;
            const gz = Math.sin(angle) * gr;
            const gy = Math.sin(angle * 5) * 0.09;

            guidanceBasePositions[i * 3] = gx;
            guidanceBasePositions[i * 3 + 1] = gy;
            guidanceBasePositions[i * 3 + 2] = gz;

            guidancePositions[i * 3] = gx;
            guidancePositions[i * 3 + 1] = gy;
            guidancePositions[i * 3 + 2] = gz;

            guidanceColors[i * 3] = guidanceColor.r;
            guidanceColors[i * 3 + 1] = guidanceColor.g;
            guidanceColors[i * 3 + 2] = guidanceColor.b;
        }

        guidanceGeo.setAttribute('position', new THREE.BufferAttribute(guidancePositions, 3));
        guidanceGeo.setAttribute('color', new THREE.BufferAttribute(guidanceColors, 3));

        const guidanceMaterial = new THREE.PointsMaterial({
            size: 0.040,
            map: particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.80,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const guidancePoints = new THREE.Points(guidanceGeo, guidanceMaterial);
        const guidanceGroup = new THREE.Group();
        guidanceGroup.rotation.x = -0.38;
        guidanceGroup.rotation.z = -0.22;
        guidanceGroup.add(guidancePoints);
        scene.add(guidanceGroup);

        // 5. Central Luminous Core Glow Sprite
        const initialPalettes = getModePalettes();
        const initialCasual = initialPalettes.casual;

        const coreMaterial = new THREE.SpriteMaterial({
            map: particleTexture,
            color: initialCasual.primary.clone(),
            transparent: true,
            opacity: 0.30,
            blending: THREE.AdditiveBlending,
        });
        const coreSprite = new THREE.Sprite(coreMaterial);
        coreSprite.scale.set(2.1, 2.1, 1.0);
        scene.add(coreSprite);

        // Dynamic State Tracking
        const currentPrimaryColor = initialCasual.primary.clone();
        const currentSecondaryColor = initialCasual.secondary.clone();
        const currentHaloColor = initialCasual.halo.clone();
        const currentCoreColor = initialCasual.core.clone();

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

        // 6. 60 FPS Render & Physics Loop
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
            const isIdle = currentState === 'idle';
            const currentGuidance = guidanceModeRef.current || 'none';
            const hasGuidanceActive = currentGuidance !== 'none';

            const audioData = getVisualizerData 
                ? getVisualizerData(currentState, useCartesiaRef.current) 
                : { volume: 0, bass: 0, mid: 0, treble: 0, source: 'idle' };

            const currentPalettes = getModePalettes();
            // In idle state: desaturated neutral color, slow drift, no audio reactivity
            const targetPalette = isIdle 
                ? currentPalettes.idle 
                : (currentPalettes[activeMode] || currentPalettes.casual);

            // Smoothly lerp colors toward the current state / mode
            currentPrimaryColor.lerp(targetPalette.primary, 0.06);
            currentSecondaryColor.lerp(targetPalette.secondary, 0.06);
            currentHaloColor.lerp(targetPalette.halo, 0.06);
            currentCoreColor.lerp(targetPalette.core, 0.06);

            coreMaterial.color.copy(currentCoreColor);

            // Audio features (zeroed out in idle)
            const vol = isIdle ? 0 : (audioData.volume || 0);
            const bass = isIdle ? 0 : (audioData.bass || 0);
            const mid = isIdle ? 0 : (audioData.mid || 0);
            const treble = isIdle ? 0 : (audioData.treble || 0);
            const source = isIdle ? 'idle' : (audioData.source || 'idle');

            // Core glow breathing
            const baseGlowScale = 2.1 + Math.sin(elapsed * 1.1) * 0.05;
            const audioGlowPulse = vol * 0.25;
            coreSprite.scale.set(baseGlowScale + audioGlowPulse, baseGlowScale + audioGlowPulse, 1.0);
            coreMaterial.opacity = isIdle ? 0.16 : (0.22 + vol * 0.18);

            // --- Sphere Particle Physics & Audio Reactivity ---
            const posAttr = sphereGeo.attributes.position;
            const colAttr = sphereGeo.attributes.color;

            // Subtle resting breath oscillation
            const restingBreath = Math.sin(elapsed * (isIdle ? 0.8 : 1.3)) * (isIdle ? 0.008 : 0.012);

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
                    // USER SPEAKING: Amplitude and frequency ripple from mic AnalyserNode
                    const absY = Math.abs(ny);
                    let freqWeight = 0;
                    if (absY < 0.4) {
                        freqWeight = bass * 0.35 + mid * 0.2;
                    } else if (absY < 0.8) {
                        freqWeight = mid * 0.35 + bass * 0.15;
                    } else {
                        freqWeight = treble * 0.35 + mid * 0.15;
                    }

                    const microWave = Math.sin(nx * 4.0 + ny * 5.0 + elapsed * 5.0) * 0.012 * vol;
                    displacement += freqWeight * 0.10 + microWave;

                } else if (source === 'ai') {
                    // AI SPEAKING: Harmonic traveling ripples from TTS output AnalyserNode
                    const ripple1 = Math.sin(nx * 3.5 + ny * 2.5 + elapsed * 4.5);
                    const ripple2 = Math.cos(nz * 3.5 + elapsed * 3.5);
                    const liquidWave = (ripple1 * 0.6 + ripple2 * 0.4) * (0.018 + vol * 0.035);
                    displacement += liquidWave;

                } else if (source === 'thinking') {
                    // THINKING: Cognitive rhythmic pulse
                    const thinkPulse = Math.sin(elapsed * 3.0 + ny * 3.5) * 0.035;
                    displacement += thinkPulse;
                }

                posAttr.array[i3] = bx + nx * displacement;
                posAttr.array[i3 + 1] = by + ny * displacement;
                posAttr.array[i3 + 2] = bz + nz * displacement;

                // Color gradient from pole to equator
                const equatorFactor = 1 - Math.abs(ny);
                colAttr.array[i3] = THREE.MathUtils.lerp(currentSecondaryColor.r, currentPrimaryColor.r, equatorFactor);
                colAttr.array[i3 + 1] = THREE.MathUtils.lerp(currentSecondaryColor.g, currentPrimaryColor.g, equatorFactor);
                colAttr.array[i3 + 2] = THREE.MathUtils.lerp(currentSecondaryColor.b, currentPrimaryColor.b, equatorFactor);
            }

            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;

            // --- Orbiting Halo Ring Dynamics ---
            const haloPosAttr = haloGeo.attributes.position;
            const haloColAttr = haloGeo.attributes.color;

            const haloSpinRate = isIdle 
                ? 0.0020 
                : ((0.0035 + vol * 0.005) * (source === 'ai' ? 1.3 : 1.0));
            haloGroup.rotation.y -= haloSpinRate;

            for (let i = 0; i < HALO_COUNT; i++) {
                const i3 = i * 3;
                const hbx = haloBasePositions[i3];
                const hby = haloBasePositions[i3 + 1];
                const hbz = haloBasePositions[i3 + 2];

                const haloWave = Math.sin(i * 0.15 + elapsed * 2.5) * (0.015 + vol * 0.025);
                const expansion = 1.0 + restingBreath * 0.3 + vol * 0.035;

                haloPosAttr.array[i3] = hbx * expansion;
                haloPosAttr.array[i3 + 1] = hby + haloWave;
                haloPosAttr.array[i3 + 2] = hbz * expansion;

                haloColAttr.array[i3] = currentHaloColor.r;
                haloColAttr.array[i3 + 1] = currentHaloColor.g;
                haloColAttr.array[i3 + 2] = currentHaloColor.b;
            }

            haloPosAttr.needsUpdate = true;
            haloColAttr.needsUpdate = true;

            // --- Guidance Mode Outer Ring Dynamics ---
            if (hasGuidanceActive) {
                guidanceGroup.visible = true;
                guidanceGroup.rotation.y += 0.0025;
                const gCol = new THREE.Color(getTokenColor('--mode-guidance', '#D4536B'));
                const gColAttr = guidanceGeo.attributes.color;
                const gPosAttr = guidanceGeo.attributes.position;

                for (let i = 0; i < GUIDANCE_COUNT; i++) {
                    const i3 = i * 3;
                    const gbx = guidanceBasePositions[i3];
                    const gby = guidanceBasePositions[i3 + 1];
                    const gbz = guidanceBasePositions[i3 + 2];

                    const gWave = Math.sin(i * 0.2 + elapsed * 2.0) * 0.018;
                    gPosAttr.array[i3] = gbx;
                    gPosAttr.array[i3 + 1] = gby + gWave;
                    gPosAttr.array[i3 + 2] = gbz;

                    gColAttr.array[i3] = gCol.r;
                    gColAttr.array[i3 + 1] = gCol.g;
                    gColAttr.array[i3 + 2] = gCol.b;
                }
                gPosAttr.needsUpdate = true;
                gColAttr.needsUpdate = true;
            } else {
                guidanceGroup.visible = false;
            }

            // Sphere group rotation & interactive mouse tilt
            sphereGroup.rotation.y += isIdle ? 0.002 : (0.0035 + (source === 'ai' ? 0.005 : 0.001));
            sphereGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.06 + mouseY * 0.20;
            sphereGroup.rotation.z = mouseX * 0.20;

            renderer.render(scene, camera);
        };

        animate();

        // 7. Memory Cleanup on Unmount
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();

            sphereGeo.dispose();
            sphereMaterial.dispose();
            haloGeo.dispose();
            haloMaterial.dispose();
            guidanceGeo.dispose();
            guidanceMaterial.dispose();
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
