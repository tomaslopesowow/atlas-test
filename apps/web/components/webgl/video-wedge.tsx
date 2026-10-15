'use client';

import {
    type ComponentProps,
    type Ref,
    useImperativeHandle,
    useMemo,
    useRef,
} from 'react';
import { useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';

export interface VideoWedgeHandle {
    mesh: THREE.Mesh | null;
    textures: {
        diffuse: THREE.VideoTexture;
        depth: THREE.VideoTexture;
        normal: THREE.VideoTexture;
    };
}

export interface VideoWedgeProps {
    ref?: Ref<VideoWedgeHandle>;
    videoDiffuseUrl: string;
    videoDepthUrl: string;
    videoNormalUrl: string;
    wedge: {
        radius: number;
        phiLength: number;
        thetaLength: number;
        widthSegments: number;
        heightSegments: number;
    };
    material: {
        displacementScale: number;
        displacementBias: number;
        wireframe: false;
    };
    unsuspend?: keyof HTMLVideoElementEventMap;
}

/**
 * Main VideoWedge component
 * Renders 1/6 sphere wedge with video texture and depth displacement
 */
export function VideoWedge({
    ref,
    videoDiffuseUrl,
    videoDepthUrl,
    videoNormalUrl,
    wedge,
    material,
    unsuspend = 'loadedmetadata',
}: VideoWedgeProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Load video texture
    const videoDiffuseTexture = useVideoTexture(videoDiffuseUrl, {
        unsuspend,
        preload: 'auto',
        start: false,
        muted: true,
        playsInline: true,
        crossOrigin: 'anonymous',
    });

    const videoDepthTexture = useVideoTexture(videoDepthUrl, {
        unsuspend,
        preload: 'auto',
        start: false,
        muted: true,
        playsInline: true,
        crossOrigin: 'anonymous',
    });

    const videoNormalTexture = useVideoTexture(videoNormalUrl, {
        unsuspend,
        preload: 'auto',
        start: false,
        muted: true,
        playsInline: true,
        crossOrigin: 'anonymous',
    });

    useImperativeHandle(
        ref,
        () => ({
            mesh: meshRef.current,
            textures: {
                diffuse: videoDiffuseTexture,
                depth: videoDepthTexture,
                normal: videoNormalTexture,
            },
        }),
        [videoDiffuseTexture, videoDepthTexture, videoNormalTexture],
    );

    // Memoize geometry args for performance - now using wedge controls
    const geometryArgs = useMemo<
        ComponentProps<'sphereGeometry'>['args']
    >(() => {
        const phiLengthRad = (wedge.phiLength * Math.PI) / 180;
        const thetaLengthRad = (wedge.thetaLength * Math.PI) / 180;
        return [
            wedge.radius,
            wedge.widthSegments,
            wedge.heightSegments,
            -phiLengthRad / 2, // phiStart (centered on forward direction)
            phiLengthRad, // phiLength (horizontal span)
            Math.PI / 2 - thetaLengthRad / 2, // thetaStart (centered vertically)
            thetaLengthRad, // thetaLength (vertical span)
        ] as const;
    }, [wedge]);

    return (
        <group rotation={[0, -Math.PI / 2, 0]}>
            <mesh ref={meshRef}>
                <sphereGeometry args={geometryArgs} />
                <meshStandardMaterial
                    map={videoDiffuseTexture}
                    displacementMap={videoDepthTexture}
                    displacementScale={-material.displacementScale}
                    displacementBias={material.displacementBias}
                    normalMap={videoNormalTexture}
                    emissive="white"
                    emissiveMap={videoDiffuseTexture}
                    emissiveIntensity={1.0}
                    side={THREE.BackSide}
                    toneMapped={false}
                    wireframe={material.wireframe}
                />
            </mesh>
        </group>
    );
}
