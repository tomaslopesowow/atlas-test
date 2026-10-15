import { MP4Demuxer } from './demuxer_mp4.js';
import { Canvas2DRenderer } from './renderer_2d.js';

const chunkStore = [];
const frames = new Map();
const keyframeTimestamps = [];

let renderer = null;
let decoder = null;

let demuxingComplete = false;
let lastChunkTimestamp = null;
let pendingStatus = null;
let firstFrameDecoded = false;

let currentKeyframeIndex = 0;
let previousKeyframeIndex = -1;

self.postMessage({ type: 'ready' }); // notify main thread when ready

const setStatus = (type, message) => {
    if (pendingStatus) {
        pendingStatus[type] = message;
    } else {
        pendingStatus = { [type]: message };
        self.postMessage(pendingStatus);
        pendingStatus = null;
    }
    if (message !== 'Done') return;
    demuxingComplete = true;

    lastChunkTimestamp = chunkStore[chunkStore.length - 1]?.chunk.timestamp;

    // Decode the first keyframe only
    decodeChunksFromKeyframe(0);

    self.postMessage({ type: 'demuxingComplete' }); // notify main thread demuxing complete
};

const decodeChunksFromKeyframe = (keyframeIndex) => {
    // Get all chunks for this keyframe
    const chunksToDecode = chunkStore.filter(
        ({ keyframeIndex: kfIndex }) => kfIndex === keyframeIndex,
    );

    // Decode the chunks
    for (const { chunk } of chunksToDecode) {
        decoder.decode(chunk);
    }
};

const cleanupOldFrames = (currentKeyframe) => {
    frames.forEach((frameArray, keyframeIndex) => {
        // Close keyframes that are more than 1 position away in EITHER direction
        if (Math.abs(keyframeIndex - currentKeyframe) > 1) {
            console.log('closing frames for keyframe', keyframeIndex);
            for (const frame of frameArray) {
                frame.close();
            }
            frames.delete(keyframeIndex);
        }
    });
};

const scrollDirection = 'down';
let targetChunk = null;

const handleScroll = ({ y, length, width, height }) => {
    self.postMessage({ type: 'busy' });

    if (!demuxingComplete || y < 0 || !frames.size)
        return self.postMessage({ type: 'idle' });

    const scrollTimestamp = (lastChunkTimestamp / length) * y;

    // Find the target chunk
    for (const entry of chunkStore) {
        if (entry.chunk.timestamp > scrollTimestamp) {
            targetChunk = entry;
            break;
        }
    }

    if (!targetChunk) return self.postMessage({ type: 'idle' });

    // Check if we need to switch keyframes
    if (previousKeyframeIndex !== targetChunk.keyframeIndex) {
        currentKeyframeIndex = targetChunk.keyframeIndex;

        // Clean up old frames
        cleanupOldFrames(currentKeyframeIndex);

        // Decode current keyframe
        decodeChunksFromKeyframe(currentKeyframeIndex);

        // Pre-decode next keyframe for smooth scrolling
        const nextKeyframe = currentKeyframeIndex + 1;
        if (nextKeyframe < keyframeTimestamps.length) {
            decodeChunksFromKeyframe(nextKeyframe);
        }

        previousKeyframeIndex = currentKeyframeIndex;
    }

    // Find the target frame
    const targetKeyframeFrames = frames.get(targetChunk.keyframeIndex);
    if (!targetKeyframeFrames) return self.postMessage({ type: 'idle' });

    const targetFrame = targetKeyframeFrames.find(
        ({ timestamp }) => timestamp === targetChunk.chunk.timestamp,
    );

    if (targetFrame) {
        renderer.draw(targetFrame, width, height);
    } else {
        // If exact frame not found, find closest frame in current keyframe
        const closestFrame = targetKeyframeFrames.reduce((closest, frame) => {
            const currentDiff = Math.abs(
                frame.timestamp - targetChunk.chunk.timestamp,
            );
            const closestDiff = Math.abs(
                closest.timestamp - targetChunk.chunk.timestamp,
            );
            return currentDiff < closestDiff ? frame : closest;
        });

        if (closestFrame) {
            renderer.draw(closestFrame, width, height);
        }
    }

    self.postMessage({ type: 'idle' });
};

let startTime = null;
let frameCount = 0;

const start = async ({ dataUri, canvas, width, height }) => {
    renderer = new Canvas2DRenderer(canvas);

    decoder = new VideoDecoder({
        async output(frame) {
            if (!firstFrameDecoded) {
                firstFrameDecoded = true;
                renderer.draw(frame, width, height);
            }

            // Find the right keyframe index for this frame
            const keyframeIndex = keyframeTimestamps.findLastIndex(
                (timestamp) => frame.timestamp >= timestamp,
            );

            const actualKeyframeIndex = keyframeIndex >= 0 ? keyframeIndex : 0;
            if (!frames.has(actualKeyframeIndex))
                frames.set(actualKeyframeIndex, []);
            frames.get(actualKeyframeIndex).push(frame);

            if (startTime == null) {
                startTime = performance.now();
            } else {
                const elapsed = (performance.now() - startTime) / 1000;
                const fps = ++frameCount / elapsed;
                setStatus('render', `${fps.toFixed(0)} fps`);
            }
        },
        error(e) {
            console.error('Decoder error:', e);
            setStatus('decode', e);
        },
    });

    new MP4Demuxer(dataUri, {
        onConfig(config) {
            setStatus(
                'decode',
                `${config.codec} @ ${config.codedWidth}x${config.codedHeight}`,
            );
            decoder.configure({
                ...config,
                hardwareAcceleration: 'prefer-software',
                optimizeForLatency: true,
            });
        },

        onChunk(chunk) {
            if (chunk.type === 'key') keyframeTimestamps.push(chunk.timestamp);
            chunkStore.push({
                chunk,
                keyframeIndex: keyframeTimestamps.length - 1,
            });
        },
        setStatus,
    });
};

// listen for the start request and scroll events
self.addEventListener('message', (message) => {
    if (message.data.type === 'start') return start(message.data);
    if (message.data.type === 'scroll') return handleScroll(message.data);
});
