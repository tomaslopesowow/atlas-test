'use client';
import { cn } from '@/components/utils/ui';
import type { Media } from '@/payload-types';
import { createPhysicsBasedMotion } from '@owowagency/gsap-motion';
import { useRef } from 'react';
import { useMotion } from '../hooks/use-motion';
import { getMousePosition } from '../utils/pointer';

type ImageCursorPixalationProps = {
    className?: string;
    image?: Media;
    squaresAmount?: number;
    distortionRadius?: number;
    distortionScaleFactor?: number;
    distortionStrength?: number;
    relaxationSpeed?: number;
    relaxationDamping?: number;
};

/**
 * DistortedImage component that creates a distorted image effect, based on the mouse position.
 *
 * @description
 * The DistortedImage component is a utility component that creates a distorted image effect, based on the mouse position.
 *
 * @param {MediaImage} props.image - The image to distort.
 * @param {number} props.squaresAmount - The amount of squares to use for the distortion, on the x axis.
 * @param {number} props.distortionRadius - The radius around the cursor where distortion is applied, in pixels.
 * @param {number} props.distortionScaleFactor - Decides the overall height of the distortion peaks in the center of the radius.
 * @param {number} props.distortionStrength - Decides how quickly the distortion ramps up from the edges to the center.
 * @param {number} props.relaxationSpeed - The speed of the relaxation motion.
 * @param {number} props.relaxationDamping - The damping of the relaxation motion.
 *
 * @example
 * <DistortedImage image={image} />
 */

const defaultConfig = {
    squaresAmount: 32,
    distortionRadius: 100,
    distortionScaleFactor: 6,
    distortionStrength: 3,
    relaxationSpeed: 0.006,
    relaxationDamping: 0.4,
};

export const DistortedImage = ({
    image: inputImage,
    className,
    ...config
}: ImageCursorPixalationProps) => {
    if (!inputImage?.url) return;

    const configRef = useRef({
        ...defaultConfig,
        ...config,
    });

    const {
        squaresAmount,
        distortionRadius,
        distortionScaleFactor,
        distortionStrength,
        relaxationSpeed,
        relaxationDamping,
    } = configRef.current;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    let firstFrameRendered = false;

    useMotion(
        ([{ default: gsap }]) => {
            if (!canvasRef.current || !containerRef.current) return;
            if (!inputImage?.url || !inputImage.width || !inputImage.height)
                return;

            const [canvas, container] = [
                canvasRef.current,
                containerRef.current,
            ];

            const [imageAspectRatio, containerAspectRatio] = [
                inputImage.width / inputImage.height,
                container.clientWidth / container.clientHeight,
            ];

            if (containerAspectRatio > imageAspectRatio) {
                canvas.width = containerRef.current?.clientWidth ?? 0;
                canvas.height = canvas.width / imageAspectRatio;
            } else {
                canvas.height = containerRef.current?.clientHeight ?? 0;
                canvas.width = canvas.height * imageAspectRatio;
            }

            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            const image = new Image();
            image.src = inputImage.url;

            if (!image.src) return;

            image.onload = () => {
                const squareSize = canvas.width / squaresAmount;

                // The amount the image is scaled in regards to the canvas
                const zoomFactor = canvas.width / image.width;

                const canvasRect = canvas.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                const previousMousePosition: { x: number; y: number } = {
                    x: 0,
                    y: 0,
                };

                const distortionPBM = createPhysicsBasedMotion(
                    relaxationSpeed,
                    relaxationDamping,
                    0,
                    0,
                );

                //Redraw the image on every tick
                gsap.ticker.add(() => {
                    const currentMousePosition = getMousePosition().page;

                    // Return early if the mouse is not close the canvas, to avoid unnecessary calculations and optimise performance
                    if (
                        (-(currentMousePosition.x - containerRect.x) >
                            distortionRadius ||
                            -(currentMousePosition.y - containerRect.y) >
                                distortionRadius ||
                            -(
                                containerRect.width +
                                containerRect.x -
                                currentMousePosition.x
                            ) > distortionRadius ||
                            -(
                                containerRect.height +
                                containerRect.y -
                                currentMousePosition.y
                            ) > distortionRadius) &&
                        firstFrameRendered
                    )
                        return;

                    firstFrameRendered = true;

                    const deltaRatio = gsap.ticker.deltaRatio();

                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const distanceMoved = {
                        x: distortionPBM.update(
                            deltaRatio,
                            currentMousePosition.x - previousMousePosition.x,
                        ),
                        y: distortionPBM.update(
                            deltaRatio,
                            currentMousePosition.y - previousMousePosition.y,
                        ),
                    };

                    previousMousePosition.x = currentMousePosition.x;
                    previousMousePosition.y = currentMousePosition.y;

                    for (let col = 0; col < squaresAmount; col++) {
                        for (let row = 0; row < squaresAmount; row++) {
                            // Position of the center of the square relative to the page
                            const currentSquarePosition = {
                                x:
                                    col * squareSize +
                                    canvasRect.x +
                                    squareSize / 2,
                                y:
                                    row * squareSize +
                                    canvasRect.y +
                                    squareSize / 2,
                            };

                            const distanceBetweenSquareAndMouse = {
                                x:
                                    currentSquarePosition.x -
                                    currentMousePosition.x,
                                y:
                                    currentSquarePosition.y -
                                    currentMousePosition.y,
                            };

                            const radialDistance = Math.sqrt(
                                distanceBetweenSquareAndMouse.x ** 2 +
                                    distanceBetweenSquareAndMouse.y ** 2,
                            );

                            const distortionFactor = smoothstep(
                                0,
                                distortionRadius,
                                distortionRadius - radialDistance,
                            );

                            const distortion = {
                                x:
                                    distanceMoved.x *
                                    exponentialGrowth(
                                        distortionFactor,
                                        distortionScaleFactor,
                                        distortionStrength,
                                    ),
                                y:
                                    distanceMoved.y *
                                    exponentialGrowth(
                                        distortionFactor,
                                        distortionScaleFactor,
                                        distortionStrength,
                                    ),
                            };

                            // we use a little overlap to avoid rendering bugs where adjecent squares create a 1-pixel wide line
                            const overlap = 1;

                            const cutPosition = [
                                (col * squareSize) / zoomFactor -
                                    distortion.x -
                                    overlap,
                                (row * squareSize) / zoomFactor -
                                    distortion.y -
                                    overlap,
                                squareSize / zoomFactor + 2 * overlap,
                                squareSize / zoomFactor + 2 * overlap,
                            ];

                            const restPosition = [
                                col * squareSize - overlap,
                                row * squareSize - overlap,
                                squareSize + 2 * overlap,
                                squareSize + 2 * overlap,
                            ];

                            ctx.drawImage(
                                image,
                                // @ts-ignore
                                ...cutPosition,
                                ...restPosition,
                            );
                        }
                    }
                });
            };
        },
        {
            observeWindowResize: () => true,
            load: {
                when: 'load',
                ref: canvasRef,
            },
            loader: () => [import('gsap')],
        },
    );

    return (
        <div
            ref={containerRef}
            className={cn(
                'w-full aspect-video overflow-hidden flex items-center justify-center',
                className,
            )}
        >
            <canvas ref={canvasRef} />
        </div>
    );
};

// Expects a value between 0 and 1, and returns a value which smoothly grows toward 1
// We use a power function to make the growth more exponential towards 1
const exponentialGrowth = (
    num: number,
    distortionScaleFactor: number,
    distortionStrength: number,
) => {
    return (
        (distortionScaleFactor *
            (distortionStrength * num ** distortionStrength)) /
        (1 + num)
    );
};

// Performs smooth interpolation between 0 and 1 over a specified range [edge0, edge1].
// Returns a value that smoothly transitions from 0 to 1 as x moves from edge0 to edge1.
// Uses the cubic Hermite interpolation formula.
const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};
