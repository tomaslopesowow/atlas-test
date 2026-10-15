'use client';

import type { Content } from '@/payload-types';
import { useState } from 'react';
import { CONTENT_BLOCK_FIXTURE } from '../component-fixtures';
import { BlockConfigurationDropdown } from './block-config';

type ExtendedContent = Content & {
    textAlignment?: 'top' | 'center' | 'bottom';
    textCentered?: boolean;
    gapHorizontal?: string;
    mediaAspectRatio?: string;
    mediaBorderRadius?: string;
};

interface ContentBlockConfigProps {
    contentFixture: ExtendedContent;
    updateContentFixture: (updates: Partial<ExtendedContent>) => void;
    isContentDropdownOpen: boolean;
    setIsContentDropdownOpen: (open: boolean) => void;
}

export function ContentBlockConfig({
    contentFixture,
    updateContentFixture,
    isContentDropdownOpen,
    setIsContentDropdownOpen,
}: ContentBlockConfigProps) {
    const [isContentBlockConfigOpen, setIsContentBlockConfigOpen] =
        useState(false);

    return (
        <>
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 border-b border-gray-200 rounded-lg bg-white/80 cursor-pointer hover:bg-gray-50/20 transition-colors backdrop-blur-md"
                onClick={() => setIsContentDropdownOpen(!isContentDropdownOpen)}
                aria-expanded={isContentDropdownOpen}
                aria-label="Toggle content block configuration"
            >
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Content Block
                        </h3>
                    </div>
                </div>

                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isContentDropdownOpen ? 'rotate-180' : ''
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

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isContentDropdownOpen
                        ? 'max-h-[600px] opacity-100'
                        : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-4 space-y-4">
                    <BlockConfigurationDropdown
                        isOpen={isContentBlockConfigOpen}
                        onToggle={() =>
                            setIsContentBlockConfigOpen(
                                !isContentBlockConfigOpen,
                            )
                        }
                    >
                        <div>
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Layout
                            </h4>
                            <div className="space-y-2">
                                <div>
                                    <label
                                        htmlFor="content-width"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Width
                                    </label>
                                    <select
                                        id="content-width"
                                        value={
                                            contentFixture.layout?.width ||
                                            'contained'
                                        }
                                        onChange={(e) =>
                                            updateContentFixture({
                                                layout: {
                                                    ...contentFixture.layout,
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

                                <div>
                                    <label
                                        htmlFor="content-horizontal-padding"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Horizontal Padding
                                    </label>
                                    <select
                                        id="content-horizontal-padding"
                                        value={
                                            contentFixture.layout
                                                ?.horizontalPadding || '0'
                                        }
                                        onChange={(e) =>
                                            updateContentFixture({
                                                layout: {
                                                    ...contentFixture.layout,
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

                                <div>
                                    <label
                                        htmlFor="content-padding-top"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Padding Top
                                    </label>
                                    <select
                                        id="content-padding-top"
                                        value={
                                            contentFixture.layout?.paddingTop ||
                                            '3'
                                        }
                                        onChange={(e) =>
                                            updateContentFixture({
                                                layout: {
                                                    ...contentFixture.layout,
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

                                <div>
                                    <label
                                        htmlFor="content-padding-bottom"
                                        className="block text-xs font-medium text-gray-700 mb-1"
                                    >
                                        Padding Bottom
                                    </label>
                                    <select
                                        id="content-padding-bottom"
                                        value={
                                            contentFixture.layout
                                                ?.paddingBottom || '3'
                                        }
                                        onChange={(e) =>
                                            updateContentFixture({
                                                layout: {
                                                    ...contentFixture.layout,
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

                                <div>
                                    <label
                                        htmlFor="content-navigation-inset"
                                        className="flex items-center cursor-pointer"
                                    >
                                        <input
                                            id="content-navigation-inset"
                                            type="checkbox"
                                            checked={
                                                contentFixture.layout
                                                    ?.navigationInset || false
                                            }
                                            onChange={(e) =>
                                                updateContentFixture({
                                                    layout: {
                                                        ...contentFixture.layout,
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

                        <div>
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Appearance
                            </h4>
                            <div>
                                <label
                                    htmlFor="content-background-color"
                                    className="block text-xs font-medium text-gray-700 mb-1"
                                >
                                    Background Color
                                </label>
                                <select
                                    id="content-background-color"
                                    value={
                                        contentFixture.appearance
                                            ?.backgroundColor || 'transparent'
                                    }
                                    onChange={(e) =>
                                        updateContentFixture({
                                            appearance: {
                                                ...contentFixture.appearance,
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

                    <div>
                        <label
                            htmlFor="media-position"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Media Position
                        </label>
                        <select
                            id="media-position"
                            value={contentFixture.mediaPosition || 'left'}
                            onChange={(e) =>
                                updateContentFixture({
                                    mediaPosition: e.target.value as
                                        | 'left'
                                        | 'right',
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="text-alignment"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Text Alignment
                        </label>
                        <select
                            id="text-alignment"
                            value={contentFixture.textAlignment || 'top'}
                            onChange={(e) =>
                                updateContentFixture({
                                    textAlignment: e.target.value as
                                        | 'top'
                                        | 'center'
                                        | 'bottom',
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="top">Top</option>
                            <option value="center">Center</option>
                            <option value="bottom">Bottom</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="text-centered"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="text-centered"
                                type="checkbox"
                                checked={contentFixture.textCentered || false}
                                onChange={(e) =>
                                    updateContentFixture({
                                        textCentered: e.target.checked,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Text Centered
                            </span>
                        </label>
                    </div>

                    <div>
                        <label
                            htmlFor="gap-horizontal"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Gap Horizontal
                        </label>
                        <select
                            id="gap-horizontal"
                            value={contentFixture.gapHorizontal || 'gap-x-12'}
                            onChange={(e) =>
                                updateContentFixture({
                                    gapHorizontal: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="gap-x-12">Default (gap-x-12)</option>
                            <option value="gap-x-8">Small (gap-x-8)</option>
                            <option value="gap-x-16">Large (gap-x-16)</option>
                            <option value="gap-x-0">None (gap-x-0)</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="media-aspect-ratio"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Media Aspect Ratio
                        </label>
                        <select
                            id="media-aspect-ratio"
                            value={
                                contentFixture.mediaAspectRatio ||
                                'aspect-[4/3] md:aspect-[3/4]'
                            }
                            onChange={(e) =>
                                updateContentFixture({
                                    mediaAspectRatio: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="aspect-[4/3] md:aspect-[3/4]">
                                Default (4:3 / 3:4)
                            </option>
                            <option value="aspect-square">Square</option>
                            <option value="aspect-video">Video (16:9)</option>
                            <option value="aspect-[3/2]">Photo (3:2)</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="media-border-radius"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Media Border Radius
                        </label>
                        <select
                            id="media-border-radius"
                            value={
                                contentFixture.mediaBorderRadius || 'rounded-lg'
                            }
                            onChange={(e) =>
                                updateContentFixture({
                                    mediaBorderRadius: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="rounded-lg">
                                Default (rounded-lg)
                            </option>
                            <option value="rounded-none">None</option>
                            <option value="rounded-md">
                                Small (rounded-md)
                            </option>
                            <option value="rounded-xl">
                                Large (rounded-xl)
                            </option>
                            <option value="rounded-full">
                                Full (rounded-full)
                            </option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="show-media"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="show-media"
                                type="checkbox"
                                checked={!!contentFixture.media}
                                onChange={(e) =>
                                    updateContentFixture({
                                        media: e.target.checked
                                            ? CONTENT_BLOCK_FIXTURE.media
                                            : undefined,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Show Media
                            </span>
                        </label>
                    </div>

                    <div>
                        <label
                            htmlFor="show-buttons"
                            className="flex items-center cursor-pointer"
                        >
                            <input
                                id="show-buttons"
                                type="checkbox"
                                checked={
                                    !!contentFixture.buttons &&
                                    contentFixture.buttons.length > 0
                                }
                                onChange={(e) =>
                                    updateContentFixture({
                                        buttons: e.target.checked
                                            ? CONTENT_BLOCK_FIXTURE.buttons
                                            : undefined,
                                    })
                                }
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Show Buttons
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </>
    );
}
