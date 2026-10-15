import { Canvas, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import {
    type ComponentProps,
    createContext,
    type RefObject,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import * as THREE from 'three';
import type { ShaderMaterial } from 'three';
import { createPhysicsBasedMotion } from '@/features/animation/utils/second-order-dynamics';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { MediaImage } from '@/payload-types';
import type { Maybe } from '@/utils/maybe';

const SCROLL_JUMP_THRESHOLD = 500;
const INTENSITY_FACTOR = 0.9;

const CLIP_REVEAL_DURATION_SECONDS = 2;
const CLIP_REVEAL_DELAY_SECONDS = 1.5;
const CLIP_REVEAL_EASE = 'power4.inOut';

const DISABLED_OPACITY = 0.2;
const DISABLED_DURATION_SECONDS = 0.5;
const DISABLED_EASE = 'power1.inOut';
const DISABLED_DELAY_SECONDS = 0.2;

// Clamp delta to prevent issues after tab inactivity
const MAX_DELTA_SECONDS = 0.1;

// Fallback = just a blue color
const FALLBACK_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWKSULL9DwAAAP//WBuxzgAAAAZJREFUAwACTgF5Vq379gAAAABJRU5ErkJggg==';

const VERTEX = `
    uniform float uIntensity;
    varying vec2 vUv;

    void main() {
        const float PI = 3.141592653589793;

        vUv = uv;

        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec4 clipPos = projectionMatrix * viewMatrix * worldPos;

        float screenY = clipPos.y / clipPos.w;
        float wave = sin(screenY * PI) * uIntensity;
        worldPos.z += wave;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const FRAGMENT = `
    uniform sampler2D uTexture;
    uniform float uClipRevealProgress;
    uniform float uOpacity;

    varying vec2 vUv;

    void main() {
        if (vUv.y < 1.0 - uClipRevealProgress) discard;
        gl_FragColor = texture2D(uTexture, vUv) * uOpacity;
    }
`;

type PlaneConfig = {
    id: string;
    targetRef: RefObject<HTMLElement | null>;
    src: string;
    zPosition: number;
};

type ContextValue = {
    register: (config: PlaneConfig) => void;
    unregister: (id: string) => void;
};

const Context = createContext<ContextValue | null>(null);

interface DistortedImageCanvasProps extends ComponentProps<'canvas'> {
    activeItemIndex?: Maybe<number>;
}

export const DistortedImageCanvas = ({
    children,
    activeItemIndex,
}: DistortedImageCanvasProps) => {
    const [planes, setPlanes] = useState<Map<string, PlaneConfig>>(new Map());
    const activeItemIndexRef = useRef<Maybe<number>>(activeItemIndex);
    activeItemIndexRef.current = activeItemIndex;
    const scrollPhysics = createPhysicsBasedMotion(0.1, 0.8, -0.2, 0);
    const register = useCallback((config: PlaneConfig) => {
        setPlanes((prev) => new Map(prev).set(config.id, config));
    }, []);

    const unregister = useCallback((id: string) => {
        setPlanes((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const contextValue = useMemo(
        () => ({ register, unregister }),
        [register, unregister],
    );

    const previousScrollY = useRef(0);
    const intensity = useRef(0);
    const clipRevealProgress = useRef({ value: 0 });

    // biome-ignore lint/correctness/useExhaustiveDependencies: adding scrollphysics as dep breaks the animation on hover
    useEffect(() => {
        gsap.to(clipRevealProgress.current, {
            value: 1,
            duration: CLIP_REVEAL_DURATION_SECONDS,
            ease: CLIP_REVEAL_EASE,
            delay: CLIP_REVEAL_DELAY_SECONDS,
        });

        const tick = (delta: number) => {
            const clampedDelta = Math.min(delta, MAX_DELTA_SECONDS);

            const scrollY = window.scrollY;
            const scrollSpeed = scrollY - previousScrollY.current;
            previousScrollY.current = scrollY;

            // Skip large jumps (infinite scroll reset)
            if (Math.abs(scrollSpeed) > SCROLL_JUMP_THRESHOLD) return;

            const easedScrollSpeed = Math.abs(
                scrollPhysics.update(clampedDelta, scrollSpeed),
            );
            intensity.current = (easedScrollSpeed / 100) * INTENSITY_FACTOR;
        };
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
    }, []);

    const canvasStyle = useMemo(
        () => ({
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none' as const,
            zIndex: 10,
        }),
        [],
    );

    const planeElements = useMemo(
        () =>
            Array.from(planes.values()).map(
                ({ id, targetRef, src, zPosition }, index) => (
                    <Plane
                        key={id}
                        targetRef={targetRef}
                        intensity={intensity}
                        clipRevealProgress={clipRevealProgress}
                        zPosition={zPosition}
                        src={src}
                        index={index}
                        activeItemIndexRef={activeItemIndexRef}
                    />
                ),
            ),
        // intensity, clipRevealProgress, and activeItemIndexRef are refs (stable), only include planes
        [planes],
    );

    return (
        <Context.Provider value={contextValue}>
            <Canvas style={canvasStyle}>{planeElements}</Canvas>
            {children}
        </Context.Provider>
    );
};

type PlaneProps = {
    targetRef: RefObject<HTMLElement | null>;
    intensity: RefObject<number>;
    clipRevealProgress: RefObject<{ value: number }>;
    index: number;
    activeItemIndexRef: RefObject<Maybe<number>>;
    zPosition: number;
    src: string;
};

const WIDTH_SEGMENTS = 10;
const HEIGHT_SEGMENTS = 10;

const Plane = ({
    targetRef,
    intensity,
    clipRevealProgress,
    index,
    activeItemIndexRef,
    zPosition,
    src,
}: PlaneProps) => {
    const { viewport, size } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);

    const loader = useMemo(() => new THREE.TextureLoader(), []);

    const fallbackTexture = useMemo(() => {
        const tex = loader.load(FALLBACK_DATA_URL);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, [loader]);

    useEffect(() => {
        loader.load(
            src,
            (texture) => {
                uniforms.current.uTexture.value = texture;
            },
            () => {
                uniforms.current.uTexture.value = fallbackTexture;
            },
        );
    }, [src, loader, fallbackTexture]);

    const opacity = useRef({ value: 1 });
    const prevDisabled = useRef(false);

    const uniforms = useRef<ShaderMaterial['uniforms']>({
        uIntensity: { value: intensity.current },
        uTexture: { value: fallbackTexture },
        uClipRevealProgress: { value: clipRevealProgress.current.value },
        uOpacity: { value: opacity.current.value },
    });

    const viewportRef = useRef(viewport);
    const sizeRef = useRef(size);
    viewportRef.current = viewport;
    sizeRef.current = size;

    // biome-ignore lint/correctness/useExhaustiveDependencies: refs can never be deps...
    useEffect(() => {
        const tick = () => {
            if (!targetRef.current || !meshRef.current) return;

            const disabled =
                activeItemIndexRef.current != null &&
                activeItemIndexRef.current !== index;

            if (disabled !== prevDisabled.current) {
                prevDisabled.current = disabled;
                if (disabled) {
                    gsap.to(opacity.current, {
                        value: DISABLED_OPACITY,
                        duration: DISABLED_DURATION_SECONDS,
                        ease: DISABLED_EASE,
                        overwrite: true,
                    });
                } else {
                    gsap.to(opacity.current, {
                        value: 1,
                        duration: DISABLED_DURATION_SECONDS,
                        ease: DISABLED_EASE,
                        delay: DISABLED_DELAY_SECONDS,
                    });
                }
            }

            const rect = targetRef.current.getBoundingClientRect();
            const worldPerPixelX =
                viewportRef.current.width / sizeRef.current.width;
            const worldPerPixelY =
                viewportRef.current.height / sizeRef.current.height;

            const planeWidth = rect.width * worldPerPixelX;
            const planeHeight = rect.height * worldPerPixelY;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const worldX =
                (centerX - sizeRef.current.width / 2) * worldPerPixelX;
            const worldY =
                -(centerY - sizeRef.current.height / 2) * worldPerPixelY;

            meshRef.current.position.set(worldX, worldY, zPosition);
            meshRef.current.scale.set(planeWidth, planeHeight, 1);

            uniforms.current.uIntensity.value = intensity.current;

            if (opacity.current.value !== 1) {
                uniforms.current.uOpacity.value = opacity.current.value;
            }

            if (clipRevealProgress.current.value < 1) {
                uniforms.current.uClipRevealProgress.value =
                    clipRevealProgress.current.value;
            }
        };
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
    }, []);

    return (
        <mesh ref={meshRef} visible={clipRevealProgress.current.value !== 0}>
            <planeGeometry args={[1, 1, WIDTH_SEGMENTS, HEIGHT_SEGMENTS]} />
            <shaderMaterial
                uniforms={uniforms.current}
                vertexShader={VERTEX}
                fragmentShader={FRAGMENT}
            />
        </mesh>
    );
};

interface DistortedImagePlaneProps extends ComponentProps<'div'> {
    image: Maybe<MediaImage>;
    zPosition?: number;
}

export const DistortedImagePlane = ({
    children,
    image,
    zPosition = 0,
    ...props
}: DistortedImagePlaneProps) => {
    const context = useContext(Context);
    const id = useId();
    const ref = useRef<HTMLDivElement>(null);
    const src = asDoc(image?.media)?.url ?? FALLBACK_DATA_URL;

    // biome-ignore lint/correctness/useExhaustiveDependencies: context shouldnt be dep
    useEffect(() => {
        if (!context) return;
        context.register({ id, targetRef: ref, src, zPosition });
        return () => context.unregister(id);
    }, [id, src]);

    return (
        <div ref={ref} {...props}>
            {children}
        </div>
    );
};
