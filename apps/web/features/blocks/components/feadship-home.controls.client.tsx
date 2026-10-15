'use client';

import { createDevControls } from '@/features/scene/dev/create-dev-controls';

const { Provider: SceneControlsProvider, useDevControls: useSceneControls } =
    createDevControls({
        camera: {
            positionX: {
                value: 0,
                min: -50,
                max: 50,
                step: 0.5,
                label: 'Position X',
            },
            positionY: {
                value: 0,
                min: -50,
                max: 50,
                step: 0.5,
                label: 'Position Y',
            },
            positionZ: {
                value: 0,
                min: -50,
                max: 50,
                step: 0.5,
                label: 'Position Z',
            },
            fov: { value: 90, min: 20, max: 120, step: 1, label: 'FOV' },
            yawRoomDeg: {
                value: 10,
                min: 0,
                max: 10,
                step: 1,
                label: 'Yaw Room Deg',
            },
            pitchRoomDeg: {
                value: 10,
                min: 0,
                max: 10,
                step: 1,
                label: 'Pitch Room Deg',
            },
            smoothing: {
                value: 0.1,
                min: 0,
                max: 1,
                step: 0.01,
                label: 'Smoothing',
            },
        },
        wedge: {
            radius: { value: 50, min: 10, max: 200, step: 5, label: 'Radius' },
            phiLength: {
                value: 60,
                min: 30,
                max: 180,
                step: 5,
                label: 'Phi (deg)',
            },
            thetaLength: {
                value: 60,
                min: 30,
                max: 180,
                step: 5,
                label: 'Theta (deg)',
            },
            widthSegments: {
                value: 512,
                min: 32,
                max: 1024,
                step: 32,
                label: 'Width Segments',
            },
            heightSegments: {
                value: 512,
                min: 32,
                max: 1024,
                step: 32,
                label: 'Height Segments',
            },
        },
        material: {
            displacementScale: {
                value: 1,
                min: 0,
                max: 10,
                step: 0.1,
                label: 'Displacement Scale',
            },
            displacementBias: {
                value: 0,
                min: -5,
                max: 5,
                step: 0.1,
                label: 'Displacement Bias',
            },
            wireframe: { value: false, label: 'Wireframe' },
        },
    });

export { SceneControlsProvider, useSceneControls };
