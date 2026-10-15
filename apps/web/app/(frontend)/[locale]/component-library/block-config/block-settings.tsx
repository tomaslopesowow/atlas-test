'use client';

import { useState } from 'react';
import { BlockConfigurationDropdown } from './block-config';

interface BlockSettingsProps {
    layout?: {
        width?: 'fluid' | 'contained';
        horizontalPadding?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
        paddingTop?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
        paddingBottom?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
        navigationInset?: boolean;
    };
    appearance?: {
        backgroundColor?: 'transparent' | 'white' | 'offWhite';
    };
    visibility?: {
        locale?: string[];
    };
    onLayoutChange?: (layout: BlockSettingsProps['layout']) => void;
    onAppearanceChange?: (appearance: BlockSettingsProps['appearance']) => void;
    onVisibilityChange?: (visibility: BlockSettingsProps['visibility']) => void;
}

export function BlockSettings({
    layout = {},
    appearance = {},
    visibility = {},
    onLayoutChange,
    onAppearanceChange,
    onVisibilityChange,
}: BlockSettingsProps) {
    const [isBlockSettingsOpen, setIsBlockSettingsOpen] = useState(false);
    const [isLayoutOpen, setIsLayoutOpen] = useState(false);
    const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
    const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

    const updateLayout = (updates: Partial<BlockSettingsProps['layout']>) => {
        const newLayout = { ...layout, ...updates };
        onLayoutChange?.(newLayout);
    };

    const updateAppearance = (
        updates: Partial<BlockSettingsProps['appearance']>,
    ) => {
        const newAppearance = { ...appearance, ...updates };
        onAppearanceChange?.(newAppearance);
    };

    const updateVisibility = (
        updates: Partial<BlockSettingsProps['visibility']>,
    ) => {
        const newVisibility = { ...visibility, ...updates };
        onVisibilityChange?.(newVisibility);
    };

    return (
        <BlockConfigurationDropdown
            isOpen={isBlockSettingsOpen}
            onToggle={() => setIsBlockSettingsOpen(!isBlockSettingsOpen)}
        >
            {/* Layout Settings */}
            <div>
                <button
                    type="button"
                    className="w-full flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors mb-2"
                    onClick={() => setIsLayoutOpen(!isLayoutOpen)}
                >
                    <span className="text-xs font-medium text-gray-700">
                        Layout
                    </span>
                    <svg
                        className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                            isLayoutOpen ? 'rotate-180' : ''
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
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                        isLayoutOpen
                            ? 'max-h-[300px] opacity-100'
                            : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="space-y-2 pl-2">
                        {/* Width */}
                        <div>
                            <label
                                htmlFor="block-width"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Width
                            </label>
                            <select
                                id="block-width"
                                value={layout.width || 'contained'}
                                onChange={(e) =>
                                    updateLayout({
                                        width: e.target.value as
                                            | 'fluid'
                                            | 'contained',
                                    })
                                }
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="contained">Contained</option>
                                <option value="fluid">Fluid</option>
                            </select>
                        </div>

                        {/* Horizontal Padding */}
                        <div>
                            <label
                                htmlFor="block-horizontal-padding"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Horizontal Padding
                            </label>
                            <select
                                id="block-horizontal-padding"
                                value={layout.horizontalPadding || '0'}
                                onChange={(e) =>
                                    updateLayout({
                                        horizontalPadding: e.target.value as
                                            | '0'
                                            | '1'
                                            | '2'
                                            | '3'
                                            | '4'
                                            | '5'
                                            | '6'
                                            | '7'
                                            | '8',
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
                                htmlFor="block-padding-top"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Padding Top
                            </label>
                            <select
                                id="block-padding-top"
                                value={layout.paddingTop || '3'}
                                onChange={(e) =>
                                    updateLayout({
                                        paddingTop: e.target.value as
                                            | '0'
                                            | '1'
                                            | '2'
                                            | '3'
                                            | '4'
                                            | '5'
                                            | '6'
                                            | '7'
                                            | '8',
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
                                htmlFor="block-padding-bottom"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Padding Bottom
                            </label>
                            <select
                                id="block-padding-bottom"
                                value={layout.paddingBottom || '3'}
                                onChange={(e) =>
                                    updateLayout({
                                        paddingBottom: e.target.value as
                                            | '0'
                                            | '1'
                                            | '2'
                                            | '3'
                                            | '4'
                                            | '5'
                                            | '6'
                                            | '7'
                                            | '8',
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
                                htmlFor="block-navigation-inset"
                                className="flex items-center cursor-pointer"
                            >
                                <input
                                    id="block-navigation-inset"
                                    type="checkbox"
                                    checked={layout.navigationInset || false}
                                    onChange={(e) =>
                                        updateLayout({
                                            navigationInset: e.target.checked,
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
            </div>

            {/* Appearance Settings */}
            <div>
                <button
                    type="button"
                    className="w-full flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors mb-2"
                    onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                >
                    <span className="text-xs font-medium text-gray-700">
                        Appearance
                    </span>
                    <svg
                        className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                            isAppearanceOpen ? 'rotate-180' : ''
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
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                        isAppearanceOpen
                            ? 'max-h-[100px] opacity-100'
                            : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="space-y-2 pl-2">
                        {/* Background Color */}
                        <div>
                            <label
                                htmlFor="block-background-color"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Background Color
                            </label>
                            <select
                                id="block-background-color"
                                value={
                                    appearance.backgroundColor || 'transparent'
                                }
                                onChange={(e) =>
                                    updateAppearance({
                                        backgroundColor: e.target.value as
                                            | 'transparent'
                                            | 'white'
                                            | 'offWhite',
                                    })
                                }
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="transparent">Transparent</option>
                                <option value="white">White</option>
                                <option value="offWhite">Off White</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visibility Settings */}
            <div>
                <button
                    type="button"
                    className="w-full flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors mb-2"
                    onClick={() => setIsVisibilityOpen(!isVisibilityOpen)}
                >
                    <span className="text-xs font-medium text-gray-700">
                        Visibility
                    </span>
                    <svg
                        className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                            isVisibilityOpen ? 'rotate-180' : ''
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
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                        isVisibilityOpen
                            ? 'max-h-[200px] opacity-100'
                            : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="space-y-2 pl-2">
                        {/* Locale Visibility */}
                        <div>
                            <div className="block text-xs font-medium text-gray-700 mb-1">
                                Visible in Languages
                            </div>
                            <div className="space-y-1">
                                {['en', 'de', 'fr', 'es'].map((locale) => (
                                    <label
                                        key={locale}
                                        htmlFor={`locale-${locale}`}
                                        className="flex items-center cursor-pointer"
                                    >
                                        <input
                                            id={`locale-${locale}`}
                                            type="checkbox"
                                            checked={
                                                !visibility.locale ||
                                                visibility.locale.includes(
                                                    locale,
                                                )
                                            }
                                            onChange={(e) => {
                                                const currentLocales =
                                                    visibility.locale || [
                                                        'en',
                                                        'de',
                                                        'fr',
                                                        'es',
                                                    ];
                                                const newLocales = e.target
                                                    .checked
                                                    ? [
                                                          ...currentLocales,
                                                          locale,
                                                      ]
                                                    : currentLocales.filter(
                                                          (l) => l !== locale,
                                                      );
                                                updateVisibility({
                                                    locale:
                                                        newLocales.length === 4
                                                            ? undefined
                                                            : newLocales,
                                                });
                                            }}
                                            className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-xs font-medium text-gray-700 capitalize">
                                            {locale}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Leave all unchecked to show in all languages
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </BlockConfigurationDropdown>
    );
}
