import { createNoise2D } from 'simplex-noise';

export const CONFIG = {
    NOISE_AMPLITUDE: 80,
    NOISE_FREQUENCY: 0.003,
    PATH_POINT_INTERVAL_PX: 20,
    PART_INDICATOR_SIZE_PX: 6,
    PART_INDICATOR_BORDER_OFFSET_PX: 4,
} as const;

// Single noise instance for consistent results across both components
export const NOISE = createNoise2D();

/**
 * Calculate the X offset from path center at a given Y position.
 * Returns value in range [-amplitude, +amplitude]
 */
export const getNoiseOffsetAtY = (y: number, maxAmplitude: number): number => {
    const clampedAmplitude = Math.min(CONFIG.NOISE_AMPLITUDE, maxAmplitude);
    const noiseOffset = NOISE(0, y * CONFIG.NOISE_FREQUENCY) * clampedAmplitude;
    return noiseOffset;
};
