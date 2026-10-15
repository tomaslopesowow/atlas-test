'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';

export interface PointerLookControlsProps {
    yawRoomDeg?: number;
    pitchRoomDeg?: number;
    smoothing?: number;
}

/**
 * Reusable pointer look-around controls.
 * Rotates the camera based on pointer position with GSAP ticker smoothing.
 */
export function usePointerLookControls({
    yawRoomDeg = 8,
    pitchRoomDeg = 20,
    smoothing = 0.1,
}: PointerLookControlsProps) {
    const { gl, camera } = useThree();
    const rotation = useRef({ yaw: 0, pitch: 0 });
    const target = useRef({ yaw: 0, pitch: 0 });
    const maxYaw = (yawRoomDeg * Math.PI) / 180;
    const maxPitch = (pitchRoomDeg * Math.PI) / 180;

    // Track pointer position
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            const normalizedX = -(e.clientX / window.innerWidth) * 2 + 1;
            const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;

            target.current.yaw = normalizedX * maxYaw;
            target.current.pitch = normalizedY * maxPitch;
        };

        gl.domElement.addEventListener('pointermove', handlePointerMove);
        return () =>
            gl.domElement.removeEventListener('pointermove', handlePointerMove);
    }, [gl, maxYaw, maxPitch]);

    // Animate rotation with GSAP ticker
    useEffect(() => {
        const tick = () => {
            // Smooth interpolation
            rotation.current.yaw +=
                (target.current.yaw - rotation.current.yaw) * smoothing;
            rotation.current.pitch +=
                (target.current.pitch - rotation.current.pitch) * smoothing;

            // Apply yaw to camera Y-axis rotation
            camera.rotation.y = rotation.current.yaw;

            // Apply pitch to camera X-axis rotation
            camera.rotation.x = rotation.current.pitch;
        };

        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
    }, [camera, smoothing]);
}
