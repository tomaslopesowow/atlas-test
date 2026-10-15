'use client';

import { type PropsWithChildren, Suspense, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { clientGuard } from '@repo/lib/environment';
import type { FeadshipHome } from '@/payload-types';
import {
    SceneControlsProvider,
    useSceneControls,
} from './feadship-home.controls.client';
import {
    VideoWedge,
    type VideoWedgeHandle,
} from '@/components/webgl/video-wedge';
import { usePointerLookControls } from '../../scene/controls/pointer-look-controls';
import { WebGLCanvasPortal } from '@/components/webgl/portal';
import { useSupportsWebm } from '@/utils/hooks/use-supports-webm';
import { useMotion } from '../../animation/hooks/use-motion';
import * as THREE from 'three';

const LOG_PREFIX = '[HomepageScene]';

export const HomepageScene = ({
    children,
    block,
}: PropsWithChildren<{ block: FeadshipHome }>) => {
    // Enable controls in development, disable in production
    const enableControls =
        process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_ENABLE_SCENE_CONTROLS === 'yes';

    console.log(`${LOG_PREFIX} Rendering HomepageScene`);

    return (
        <SceneControlsProvider enabled={enableControls}>
            <WebGLCanvasPortal
                camera={{
                    position: [0, 0, 0],
                    fov: 75,
                }}
                gl={{
                    antialias: true,
                    powerPreference: 'high-performance',
                }}
                dpr={clientGuard(() => Math.min(window.devicePixelRatio, 2))}
                className="fixed size-full inset-0"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 1000,
                }}
            >
                {/* Lighting - needed for MeshStandardMaterial */}
                <ambientLight intensity={1.0} />
                <directionalLight position={[5, 5, 5]} intensity={1.0} />

                {/* Video Wedge with Suspense for texture loading */}
                <Suspense>
                    <HomepageSceneContent block={block} />
                </Suspense>

                {children}
            </WebGLCanvasPortal>
        </SceneControlsProvider>
    );
};

/**
 * Inner component that reads context and passes props to VideoWedge.
 * Separated so that useSceneControls is called inside the Canvas (R3F context).
 */
function HomepageSceneContent({ block }: { block: FeadshipHome }) {
    const controls = useSceneControls();
    const supportsWebm = useSupportsWebm();
    const { camera } = useThree();
    const videoWedgeRef = useRef<VideoWedgeHandle>(null);

    console.log(`${LOG_PREFIX} Rendering HomepageSceneContent`, { controls });

    usePointerLookControls({
        yawRoomDeg: controls.camera.yawRoomDeg,
        pitchRoomDeg: controls.camera.pitchRoomDeg,
        smoothing: controls.camera.smoothing,
    });

    useEffect(() => {
        // Check if camera is a THREE.PerspectiveCamera
        if ('fov' in camera) {
            camera.position.set(
                controls.camera.positionX,
                controls.camera.positionY,
                controls.camera.positionZ,
            );
            camera.fov = controls.camera.fov;
            camera.updateProjectionMatrix();
        }
    }, [camera, controls.camera]);

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            if (!videoWedgeRef.current) return;
            const { textures } = videoWedgeRef.current;

            const videoTextures: [
                diffuse: THREE.VideoTexture<HTMLVideoElement>,
                depth: THREE.VideoTexture<HTMLVideoElement>,
                normal: THREE.VideoTexture<HTMLVideoElement>,
            ] = [textures.diffuse, textures.depth, textures.normal];

            // Prepare videos for playback
            videoTextures.forEach((texture) => {
                // Flip textures horizontally because we use BackSide material
                texture.wrapS = THREE.RepeatWrapping;
                texture.repeat.x = -1;

                // Load video and set current time to avoid blank frames on some browsers
                texture.source.data.load();
                texture.source.data.currentTime = 0.001;
            });

            // Throttling variables for video updates
            const videoFps = block.fps ?? 30;
            const videoFrameTime = 1000 / videoFps;
            let lastUpdateTime = 0;
            let pendingProgress = 0;

            let debugVideos:
                | [
                      diffuse: HTMLVideoElement,
                      depth: HTMLVideoElement,
                      normal: HTMLVideoElement,
                  ]
                | null = null;

            if (process.env.NODE_ENV === 'development') {
                console.log('VideoWedge: Enabling debug video');
                const previewSize = 200;

                debugVideos = [
                    document.createElement('video'),
                    document.createElement('video'),
                    document.createElement('video'),
                ];

                debugVideos.forEach((video, index) => {
                    video.src = videoTextures[index].source.data.src;
                    video.muted = true;
                    video.loop = true;
                    video.playsInline = true;
                    video.currentTime = 0.001;

                    gsap.set(video, {
                        position: 'fixed',
                        left: 0,
                        top: index * previewSize,
                        width: previewSize,
                        height: previewSize,
                        zIndex: Number.MAX_SAFE_INTEGER,
                    });
                });

                document.body.append(...debugVideos);
            }

            console.log('VideoWedge: GSAP ScrollTrigger initialized', {
                videoFps,
                videoFrameTime,
                videoTextures,
                debugVideos,
            });

            gsap.registerPlugin(ScrollTrigger);
            const context = gsap.context(() => {
                ScrollTrigger.create({
                    trigger: `[data-block-id="${block.id}"] #scroller`,
                    markers: process.env.NODE_ENV === 'development',
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,

                    onUpdate: (self) => {
                        pendingProgress = self.progress;
                        const now = performance.now();

                        // Only update video at `videoFps` intervals
                        if (now - lastUpdateTime < videoFrameTime) return;

                        lastUpdateTime = now;

                        for (const texture of videoTextures) {
                            if (texture.source.data.readyState >= 2) {
                                // IMPORTANT: use the diffuse texture's duration to ensure all videos are synced
                                // and constrained to the diffuse texture's duration
                                texture.source.data.currentTime =
                                    pendingProgress *
                                    videoTextures[0].source.data.duration;
                            }
                        }

                        if (
                            process.env.NODE_ENV === 'development' &&
                            debugVideos
                        ) {
                            for (const video of debugVideos) {
                                if (video.readyState >= 2) {
                                    video.currentTime =
                                        pendingProgress *
                                        videoTextures[0].source.data.duration;
                                }
                            }
                        }
                    },
                });
            });

            return () => {
                context.kill(true);
                debugVideos?.forEach((video) => void video.remove());
            };
        },
        {
            load: { when: 'load' },
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
        },
        [],
    );

    const videoDiffuseUrl = supportsWebm
        ? block.videoDiffuse?.webm
        : block.videoDiffuse?.mp4;
    const videoDepthUrl = supportsWebm
        ? block.videoDepth?.webm
        : block.videoDepth?.mp4;
    const videoNormalUrl = supportsWebm
        ? block.videoNormal?.webm
        : block.videoNormal?.mp4;

    if (!videoDiffuseUrl || !videoDepthUrl || !videoNormalUrl) {
        return null;
    }

    return (
        <VideoWedge
            ref={videoWedgeRef}
            videoDiffuseUrl={videoDiffuseUrl}
            videoDepthUrl={videoDepthUrl}
            videoNormalUrl={videoNormalUrl}
            wedge={controls.wedge}
            material={controls.material}
        />
    );
}
