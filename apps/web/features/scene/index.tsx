'use client';

import { WebGLCanvasPortal } from '@/components/webgl/portal';
import {
    WaterRipple,
    WaterRippleControlsProvider,
} from './objects/water-ripple';

function SceneProvider() {
    const enableControls =
        process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_ENABLE_SCENE_CONTROLS === 'yes';

    return (
        <WaterRippleControlsProvider enabled={enableControls}>
            <WebGLCanvasPortal camera={{ position: [0, 0, 5], fov: 75 }}>
                <SceneObjects />
            </WebGLCanvasPortal>
        </WaterRippleControlsProvider>
    );
}

function SceneObjects() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[2, 3, -3]} intensity={1} />
            <WaterRipple />
        </>
    );
}

export function SceneMain() {
    return <SceneProvider />;
}
