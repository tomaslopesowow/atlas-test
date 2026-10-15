'use client';

import { useFBO } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createDevControls } from '@/features/scene/dev/create-dev-controls';

export const {
    Provider: WaterRippleControlsProvider,
    useDevControls: useWaterRippleControls,
} = createDevControls({
    ripple: {
        planeScale: {
            value: 1.0,
            min: 0.1,
            max: 1.5,
            step: 0.05,
            label: 'Plane Size',
        },
        viscosity: { value: 1, min: 0.1, max: 5, step: 0.1 },
        speed: { value: 1, min: 0, max: 5, step: 0.1 },
        size: { value: 0.5, min: 0.1, max: 2, step: 0.025 },
        displacement: { value: 4, min: 0, max: 10, step: 0.1 },
        lightIntensity: { value: 8, min: 0.1, max: 20, step: 0.1 },
        shadowIntensity: { value: 5, min: 0.1, max: 20, step: 0.1 },
        baseColor: '#1a1a2e',
    },
});

// Ripple simulation shader - calculates wave propagation
const rippleSimulationShader = {
    vertexShader: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec2 uResolution;
        uniform vec2 uMousePosition;
        uniform vec2 uLastMousePosition;
        uniform vec2 uVelocity;
        uniform int uTime;
        uniform sampler2D uTargetTexture;
        uniform float uAspectRatio;

        uniform float uViscosity;
        uniform float uSpeed;
        uniform float uSize;

        varying vec2 vUv;

        // Line distance field for smooth ripple drawing (aspect ratio corrected)
        float sdLine(vec2 p, vec2 a, vec2 b) {
            // Correct for aspect ratio to get circular ripples (branchless)
            float isWide = step(1.0, uAspectRatio); // 1.0 if wide, 0.0 if tall
            vec2 scaleWide = vec2(1.0 / uAspectRatio, 1.0);
            vec2 scaleTall = vec2(1.0, uAspectRatio);
            vec2 scale = mix(scaleTall, scaleWide, isWide);

            vec2 correctedP = p * scale;
            vec2 correctedA = a * scale;
            vec2 correctedB = b * scale;

            float velocity = clamp(length(uVelocity), 0.5, 1.5);
            vec2 pa = correctedP - correctedA;
            vec2 ba = correctedB - correctedA;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            return length(pa - ba * h) / velocity;
        }

        void main() {
            float velocity = clamp(length(uVelocity), 0.1, 1.0);
            vec3 speed = vec3(vec2(uSpeed) / uResolution.xy, 0.0);

            vec2 mouse = (uMousePosition + 1.0) * 0.5;
            vec2 lastMouse = (uLastMousePosition + 1.0) * 0.5;

            vec4 color = texture2D(uTargetTexture, vUv);

            // Use line distance field for smooth ripples
            float shade = smoothstep(0.02 * uSize * velocity, 0.0, sdLine(vUv, lastMouse, mouse));

            vec4 texelColor = color;

            float d = shade * uViscosity;

            // Sample neighboring pixels for wave propagation
            float top = texture2D(uTargetTexture, vUv - speed.zy).x;
            float right = texture2D(uTargetTexture, vUv - speed.xz).x;
            float bottom = texture2D(uTargetTexture, vUv + speed.xz).x;
            float left = texture2D(uTargetTexture, vUv + speed.zy).x;

            // Wave equation
            d += -(texelColor.y - 0.5) * 2.0 + (top + right + bottom + left - 2.0);
            d *= 0.99; // Damping

            // Skip first frames to avoid initialization artifacts
            d *= float(uTime > 5);

            d = d * 0.5 + 0.5;

            color = vec4(d, texelColor.x, 0.0, 1.0);

            gl_FragColor = color;
        }
    `,
};

// Display shader - renders the ripples with bump mapping and lighting
const displayShader = {
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D uRippleTexture;
        uniform vec2 uResolution;
        uniform float uDisplacementStrength;
        uniform float uLightIntensity;
        uniform float uShadowIntensity;
        uniform vec3 uBaseColor;

        varying vec2 vUv;
        varying vec3 vPosition;

        // Gaussian blur for smoother ripples
        vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
            vec4 color = vec4(0.0);
            vec2 off1 = vec2(1.3333333333333333) * direction;
            color += texture2D(image, uv) * 0.29411764705882354;
            color += texture2D(image, uv + (off1 / resolution)) * 0.35294117647058826;
            color += texture2D(image, uv - (off1 / resolution)) * 0.35294117647058826;
            return color;
        }

        float bumpMap(vec2 uv, float height) {
            vec3 shade = blur5(uRippleTexture, vUv, uResolution, vec2(1.0, 1.0)).rgb;
            return 1.0 - shade.r * height;
        }

        // Calculate lighting and reflections
        vec4 renderPass(vec2 uv, inout float distortion) {
            vec3 surfacePos = vec3(uv, 0.0);
            vec3 ray = normalize(vec3(uv, 1.0));
            vec3 lightPos = vec3(2.0, 3.0, -3.0);
            vec3 normal = vec3(0.0, 0.0, -1.0);

            vec2 sampleDistance = vec2(0.005, 0.0);

            float fx = bumpMap(sampleDistance.xy, 0.2);
            float fy = bumpMap(sampleDistance.yx, 0.2);
            float f = bumpMap(vec2(0.0), 0.2);

            distortion = f;

            fx = (fx - f) / sampleDistance.x;
            fy = (fy - f) / sampleDistance.x;
            normal = normalize(normal + vec3(fx, fy, 0.0) * 0.2);

            // Fresnel effect
            float bias = 0.2;
            float scale = 10.0;
            float power = 10.1;
            float shade = bias + (scale * pow(1.0 + dot(normalize(surfacePos - vec3(uv, -3.0)), normal), power));

            vec3 lightV = lightPos - surfacePos;
            float lightDist = max(length(lightV), 0.001);
            lightV /= lightDist;

            vec3 lightColor = vec3(1.0 - uLightIntensity / 20.0);
            float shininess = 0.1;
            float brightness = 1.0 - uLightIntensity / 40.0;
            float falloff = 0.1;
            float attenuation = (0.75 + uLightIntensity / 40.0) / (1.0 + lightDist * lightDist * falloff);

            float diffuse = max(dot(normal, lightV), 0.0);
            float specular = pow(max(dot(reflect(-lightV, normal), -ray), 0.0), 15.0) * shininess;

            vec3 texCol = vec3(0.5) * brightness;
            float metalness = 1.0;

            vec3 color = (texCol * (diffuse * vec3(0.9) * 2.0 + 0.5) + lightColor * specular * f * 2.0 * metalness) * attenuation * 2.0;

            return vec4(color, 1.0);
        }

        void main() {
            float distortion;

            // Apply displacement to UV coordinates for sampling
            vec2 displacedUv = vUv;

            // First pass to get distortion
            vec4 reflections = renderPass(displacedUv, distortion);

            // Apply displacement based on distortion
            displacedUv = vUv + (distortion - 0.5) * (uDisplacementStrength / 100.0);

            // Second pass with displaced UVs for more dramatic effect
            reflections = renderPass(displacedUv, distortion);

            vec4 ripples = vec4(0.16);
            ripples += distortion * 0.15 - 0.1;
            ripples += reflections * 0.9;

            vec4 color = vec4(uBaseColor, 1.0);

            // Add lighting effects (more pronounced, affected by displacement)
            float lights = max(0.0, ripples.r - 0.4);
            color.rgb += lights * (uLightIntensity / 5.0) * (1.0 + uDisplacementStrength * 0.05);

            // Add shadows (more pronounced, affected by displacement)
            float shadow = max(0.0, 1.0 - (ripples.r + 0.4));
            color.rgb -= shadow * (uShadowIntensity / 5.0) * (1.0 + uDisplacementStrength * 0.05);

            gl_FragColor = color;
        }
    `,
};

const FBO_SIZE = 512;

export function WaterRipple() {
    const { size, viewport, camera } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const rippleMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const displayMaterialRef = useRef<THREE.ShaderMaterial>(null);

    // Create two FBOs for ping-pong rendering
    const fbo1 = useFBO(FBO_SIZE, FBO_SIZE, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    });
    const fbo2 = useFBO(FBO_SIZE, FBO_SIZE, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    });

    // Use refs to track which FBO is read and which is write
    const readFBO = useRef(fbo1);
    const writeFBO = useRef(fbo2);

    // Mouse state
    const mouse = useRef({
        current: new THREE.Vector2(0, 0),
        last: new THREE.Vector2(0, 0),
        velocity: new THREE.Vector2(0, 0),
    });

    const time = useRef(0);
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());

    const {
        viscosity,
        speed,
        size: rippleSize,
        displacement,
        lightIntensity,
        shadowIntensity,
        baseColor,
        planeScale,
    } = useWaterRippleControls().ripple;

    // Calculate plane size based on camera distance and FOV
    const planeSize = useMemo(() => {
        const distance = camera.position.z;
        const fov = (camera as THREE.PerspectiveCamera).fov;
        const height = 2 * Math.tan((fov * Math.PI) / 180 / 2) * distance;
        const width = height * viewport.aspect;

        // Scale based on control value
        return [width * planeScale, height * planeScale];
    }, [camera, viewport, planeScale]);

    // Calculate aspect ratio for shader
    const aspectRatio = planeSize[0] / planeSize[1];

    // Ripple simulation material
    const rippleMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: rippleSimulationShader.vertexShader,
            fragmentShader: rippleSimulationShader.fragmentShader,
            uniforms: {
                uResolution: { value: new THREE.Vector2(FBO_SIZE, FBO_SIZE) },
                uMousePosition: { value: new THREE.Vector2(0, 0) },
                uLastMousePosition: { value: new THREE.Vector2(0, 0) },
                uVelocity: { value: new THREE.Vector2(0, 0) },
                uTime: { value: 0 },
                uTargetTexture: { value: readFBO.current.texture },
                uAspectRatio: { value: aspectRatio },
                uViscosity: { value: viscosity },
                uSpeed: { value: speed },
                uSize: { value: rippleSize },
            },
        });
    }, [viscosity, speed, rippleSize, aspectRatio]);

    // Display material
    const displayMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: displayShader.vertexShader,
            fragmentShader: displayShader.fragmentShader,
            uniforms: {
                uRippleTexture: { value: readFBO.current.texture },
                uResolution: { value: new THREE.Vector2(FBO_SIZE, FBO_SIZE) },
                uDisplacementStrength: { value: displacement },
                uLightIntensity: { value: lightIntensity },
                uShadowIntensity: { value: shadowIntensity },
                uBaseColor: { value: new THREE.Color(baseColor) },
            },
        });
    }, [displacement, lightIntensity, shadowIntensity, baseColor]);

    // Mouse move handler
    const onMouseMove = useCallback(
        (event: MouseEvent | TouchEvent) => {
            if (!meshRef.current) return;

            // Get mouse position
            if ('touches' in event) {
                pointer.current.x =
                    (event.touches[0].clientX / size.width) * 2 - 1;
                pointer.current.y =
                    -(event.touches[0].clientY / size.height) * 2 + 1;
            } else {
                pointer.current.x = (event.clientX / size.width) * 2 - 1;
                pointer.current.y = -(event.clientY / size.height) * 2 + 1;
            }

            // Raycast to plane
            raycaster.current.setFromCamera(pointer.current, camera);
            const intersects = raycaster.current.intersectObject(
                meshRef.current,
            );

            if (intersects.length > 0 && intersects[0].uv) {
                const uv = intersects[0].uv;

                // Update mouse positions
                mouse.current.last.copy(mouse.current.current);
                mouse.current.current.set(uv.x * 2 - 1, uv.y * 2 - 1);

                // Calculate velocity
                mouse.current.velocity.x =
                    (mouse.current.current.x - mouse.current.last.x) / 0.016;
                mouse.current.velocity.y =
                    (mouse.current.current.y - mouse.current.last.y) / 0.016;
            }
        },
        [camera, size],
    );

    // Setup event listeners
    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onMouseMove);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onMouseMove);
        };
    }, [onMouseMove]);

    // Animation loop
    useFrame(({ gl }) => {
        if (!rippleMaterialRef.current || !displayMaterialRef.current) return;

        // Update ripple material uniforms
        rippleMaterialRef.current.uniforms.uMousePosition.value.copy(
            mouse.current.current,
        );
        rippleMaterialRef.current.uniforms.uLastMousePosition.value.copy(
            mouse.current.last,
        );
        rippleMaterialRef.current.uniforms.uVelocity.value.copy(
            mouse.current.velocity,
        );
        rippleMaterialRef.current.uniforms.uTime.value = time.current++;
        rippleMaterialRef.current.uniforms.uAspectRatio.value = aspectRatio;
        rippleMaterialRef.current.uniforms.uViscosity.value = viscosity;
        rippleMaterialRef.current.uniforms.uSpeed.value = speed;
        rippleMaterialRef.current.uniforms.uSize.value = rippleSize;
        rippleMaterialRef.current.uniforms.uTargetTexture.value =
            readFBO.current.texture;

        // Render ripple simulation to writeFBO
        gl.setRenderTarget(writeFBO.current);
        gl.render(
            new THREE.Scene().add(
                new THREE.Mesh(
                    new THREE.PlaneGeometry(2, 2),
                    rippleMaterialRef.current,
                ),
            ),
            new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        );
        gl.setRenderTarget(null);

        // Swap FBOs - swap the refs
        const temp = readFBO.current;
        readFBO.current = writeFBO.current;
        writeFBO.current = temp;

        // Update display material
        displayMaterialRef.current.uniforms.uRippleTexture.value =
            readFBO.current.texture;
        displayMaterialRef.current.uniforms.uDisplacementStrength.value =
            displacement;
        displayMaterialRef.current.uniforms.uLightIntensity.value =
            lightIntensity;
        displayMaterialRef.current.uniforms.uShadowIntensity.value =
            shadowIntensity;
        displayMaterialRef.current.uniforms.uBaseColor.value.set(baseColor);

        // Lerp velocity towards zero
        mouse.current.velocity.lerp(new THREE.Vector2(0, 0), 0.1);
    });

    // Store ripple material in ref
    rippleMaterialRef.current = rippleMaterial;

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[planeSize[0], planeSize[1]]} />
            <primitive
                object={displayMaterial}
                ref={displayMaterialRef}
                attach="material"
            />
        </mesh>
    );
}
