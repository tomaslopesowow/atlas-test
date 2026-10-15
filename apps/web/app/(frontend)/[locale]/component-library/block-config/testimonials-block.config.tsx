'use client';

import type { TestimonialsBlock } from '@/payload-types';
import { useState } from 'react';
import { BlockConfigurationDropdown } from './block-config';

type ExtendedTestimonialsBlock = TestimonialsBlock & {
    carouselOverflow?: boolean;
    cardColor?: string;
    indicatorDots?: boolean;
    arrowButtons?: boolean;
    authorImage?: boolean;
    authorTitle?: boolean;
    linkType?: 'none' | 'button' | 'anchor';
};

interface TestimonialsBlockConfigProps {
    testimonialsFixture: ExtendedTestimonialsBlock;
    updateTestimonialsFixture: (
        updates: Partial<ExtendedTestimonialsBlock>,
    ) => void;
    isTestimonialsDropdownOpen: boolean;
    setIsTestimonialsDropdownOpen: (open: boolean) => void;
}

export function TestimonialsBlockConfig({
    testimonialsFixture,
    updateTestimonialsFixture,
    isTestimonialsDropdownOpen,
    setIsTestimonialsDropdownOpen,
}: TestimonialsBlockConfigProps) {
    const [isTestimonialsBlockConfigOpen, setIsTestimonialsBlockConfigOpen] =
        useState(false);

    return (
        <>
            {/* Testimonials Block Dropdown Header */}
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 border-b border-gray-200 rounded-lg bg-white/80 cursor-pointer hover:bg-gray-50/20 transition-colors backdrop-blur-md"
                onClick={() =>
                    setIsTestimonialsDropdownOpen(!isTestimonialsDropdownOpen)
                }
                aria-expanded={isTestimonialsDropdownOpen}
                aria-label="Toggle testimonials block configuration"
            >
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg
                            width="50"
                            height="50"
                            viewBox="0 0 50 50"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <rect
                                width="50"
                                height="50"
                                rx="10"
                                fill="#B4FFAC"
                            />
                            <rect
                                x="12"
                                y="14"
                                width="15"
                                height="23"
                                rx="2"
                                fill="white"
                            />
                            <rect
                                x="29"
                                y="14"
                                width="15"
                                height="23"
                                rx="2"
                                fill="white"
                            />
                            <path
                                d="M46 16C46 14.8954 46.8954 14 48 14H50V37H48C46.8954 37 46 36.1046 46 35V16Z"
                                fill="white"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm text-left font-semibold text-gray-900">
                            Testimonials Block
                        </h3>
                    </div>
                </div>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isTestimonialsDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {/* Testimonials Block Dropdown Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isTestimonialsDropdownOpen
                        ? 'max-h-[600px] opacity-100'
                        : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-4 space-y-4">
                    {/* Block Configuration Dropdown */}
                    <BlockConfigurationDropdown
                        isOpen={isTestimonialsBlockConfigOpen}
                        onToggle={() =>
                            setIsTestimonialsBlockConfigOpen(
                                !isTestimonialsBlockConfigOpen,
                            )
                        }
                    >
                        {/* Layout Settings */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Layout
                            </h4>
                            <div className="space-y-2">
                                {/* Width */}
                                <div>
                                    <label
                                        htmlFor="testimonials-width"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Width
                                    </label>
                                    <select
                                        id="testimonials-width"
                                        value={
                                            testimonialsFixture.layout?.width ||
                                            'contained'
                                        }
                                        onChange={(e) =>
                                            updateTestimonialsFixture({
                                                layout: {
                                                    ...testimonialsFixture.layout,
                                                    width: e.target.value as
                                                        | 'fluid'
                                                        | 'contained',
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="contained">
                                            Contained
                                        </option>
                                        <option value="fluid">Fluid</option>
                                    </select>
                                </div>

                                {/* Horizontal Padding */}
                                <div>
                                    <label
                                        htmlFor="testimonials-horizontal-padding"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Horizontal Padding
                                    </label>
                                    <select
                                        id="testimonials-horizontal-padding"
                                        value={
                                            testimonialsFixture.layout
                                                ?.horizontalPadding || '0'
                                        }
                                        onChange={(e) =>
                                            updateTestimonialsFixture({
                                                layout: {
                                                    ...testimonialsFixture.layout,
                                                    horizontalPadding: e.target
                                                        .value as
                                                        | '0'
                                                        | '1'
                                                        | '2'
                                                        | '3'
                                                        | '4'
                                                        | '5'
                                                        | '6'
                                                        | '7'
                                                        | '8',
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="0">None</option>
                                        <option value="1">Small</option>
                                        <option value="2">Medium</option>
                                        <option value="3">Large</option>
                                        <option value="4">Extra Large</option>
                                    </select>
                                </div>

                                {/* Padding Top */}
                                <div>
                                    <label
                                        htmlFor="testimonials-padding-top"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Padding Top
                                    </label>
                                    <select
                                        id="testimonials-padding-top"
                                        value={
                                            testimonialsFixture.layout
                                                ?.paddingTop || '3'
                                        }
                                        onChange={(e) =>
                                            updateTestimonialsFixture({
                                                layout: {
                                                    ...testimonialsFixture.layout,
                                                    paddingTop: e.target
                                                        .value as
                                                        | '0'
                                                        | '1'
                                                        | '2'
                                                        | '3'
                                                        | '4'
                                                        | '5'
                                                        | '6'
                                                        | '7'
                                                        | '8',
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="0">None</option>
                                        <option value="1">Small</option>
                                        <option value="2">Medium</option>
                                        <option value="3">Large</option>
                                        <option value="4">Extra Large</option>
                                    </select>
                                </div>

                                {/* Padding Bottom */}
                                <div>
                                    <label
                                        htmlFor="testimonials-padding-bottom"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Padding Bottom
                                    </label>
                                    <select
                                        id="testimonials-padding-bottom"
                                        value={
                                            testimonialsFixture.layout
                                                ?.paddingBottom || '3'
                                        }
                                        onChange={(e) =>
                                            updateTestimonialsFixture({
                                                layout: {
                                                    ...testimonialsFixture.layout,
                                                    paddingBottom: e.target
                                                        .value as
                                                        | '0'
                                                        | '1'
                                                        | '2'
                                                        | '3'
                                                        | '4'
                                                        | '5'
                                                        | '6'
                                                        | '7'
                                                        | '8',
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="0">None</option>
                                        <option value="1">Small</option>
                                        <option value="2">Medium</option>
                                        <option value="3">Large</option>
                                        <option value="4">Extra Large</option>
                                    </select>
                                </div>

                                {/* Navigation Inset */}
                                <div>
                                    <label
                                        htmlFor="testimonials-navigation-inset"
                                        className="flex items-center cursor-pointer"
                                    >
                                        <input
                                            id="testimonials-navigation-inset"
                                            type="checkbox"
                                            checked={
                                                testimonialsFixture.layout
                                                    ?.navigationInset || false
                                            }
                                            onChange={(e) =>
                                                updateTestimonialsFixture({
                                                    layout: {
                                                        ...testimonialsFixture.layout,
                                                        navigationInset:
                                                            e.target.checked,
                                                    },
                                                })
                                            }
                                            className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-xs font-medium text-gray-700">
                                            Navigation Inset
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Appearance Settings */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Appearance
                            </h4>
                            <div>
                                <label
                                    htmlFor="testimonials-background-color"
                                    className="block text-xs font-medium text-gray-700 mb-1"
                                >
                                    Background Color
                                </label>
                                <select
                                    id="testimonials-background-color"
                                    value={
                                        testimonialsFixture.appearance
                                            ?.backgroundColor || 'transparent'
                                    }
                                    onChange={(e) =>
                                        updateTestimonialsFixture({
                                            appearance: {
                                                ...testimonialsFixture.appearance,
                                                backgroundColor: e.target
                                                    .value as
                                                    | 'transparent'
                                                    | 'white'
                                                    | 'offWhite',
                                            },
                                        })
                                    }
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="transparent">
                                        Transparent
                                    </option>
                                    <option value="white">White</option>
                                    <option value="offWhite">Off White</option>
                                </select>
                            </div>
                        </div>
                    </BlockConfigurationDropdown>

                    {/* Carousel Overflow */}
                    <div>
                        <label
                            htmlFor="carousel-overflow"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="carousel-overflow"
                                type="checkbox"
                                checked={
                                    testimonialsFixture.carouselOverflow ?? true
                                }
                                onChange={(e) =>
                                    updateTestimonialsFixture({
                                        carouselOverflow: e.target.checked,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Carousel Overflow
                            </span>
                        </label>
                    </div>

                    {/* Card Color */}
                    <div>
                        <label
                            htmlFor="card-color"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Card Color
                        </label>
                        <select
                            id="card-color"
                            value={
                                testimonialsFixture.cardColor ||
                                'bg-surface-secondary'
                            }
                            onChange={(e) =>
                                updateTestimonialsFixture({
                                    cardColor: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="bg-surface-secondary">
                                Surface Secondary
                            </option>
                            <option value="bg-white">White</option>
                            <option value="bg-gray-50">Light Gray</option>
                            <option value="bg-blue-50">Light Blue</option>
                            <option value="bg-transparent">Transparent</option>
                        </select>
                    </div>

                    {/* Indicator Dots */}
                    <div>
                        <label
                            htmlFor="indicator-dots"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="indicator-dots"
                                type="checkbox"
                                checked={
                                    testimonialsFixture.indicatorDots ?? true
                                }
                                onChange={(e) =>
                                    updateTestimonialsFixture({
                                        indicatorDots: e.target.checked,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Indicator Dots
                            </span>
                        </label>
                    </div>

                    {/* Arrow Buttons */}
                    <div>
                        <label
                            htmlFor="arrow-buttons"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="arrow-buttons"
                                type="checkbox"
                                checked={
                                    testimonialsFixture.arrowButtons ?? true
                                }
                                onChange={(e) =>
                                    updateTestimonialsFixture({
                                        arrowButtons: e.target.checked,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Arrow Buttons
                            </span>
                        </label>
                    </div>

                    {/* Author Image */}
                    <div>
                        <label
                            htmlFor="author-image"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="author-image"
                                type="checkbox"
                                checked={
                                    testimonialsFixture.authorImage ?? true
                                }
                                onChange={(e) =>
                                    updateTestimonialsFixture({
                                        authorImage: e.target.checked,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Author Image
                            </span>
                        </label>
                    </div>

                    {/* Author Title */}
                    <div>
                        <label
                            htmlFor="author-title"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="author-title"
                                type="checkbox"
                                checked={
                                    testimonialsFixture.authorTitle ?? true
                                }
                                onChange={(e) =>
                                    updateTestimonialsFixture({
                                        authorTitle: e.target.checked,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Author Title
                            </span>
                        </label>
                    </div>

                    {/* Link Type */}
                    <div>
                        <label
                            htmlFor="link-type"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Link Type
                        </label>
                        <select
                            id="link-type"
                            value={testimonialsFixture.linkType || 'none'}
                            onChange={(e) =>
                                updateTestimonialsFixture({
                                    linkType: e.target.value as
                                        | 'none'
                                        | 'button'
                                        | 'anchor',
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="none">None</option>
                            <option value="button">Button</option>
                            <option value="anchor">Anchor</option>
                        </select>
                    </div>
                </div>
            </div>
        </>
    );
}
