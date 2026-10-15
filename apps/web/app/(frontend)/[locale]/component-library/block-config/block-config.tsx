'use client';

import type { Content, TestimonialsBlock } from '@/payload-types';
import React, { useState, useRef, useCallback } from 'react';
import {
    CONTENT_BLOCK_FIXTURE,
    TESTIMONIALS_BLOCK_FIXTURE,
} from '../component-fixtures';
import { ContentBlockConfig } from './content-block.config';
import { TestimonialsBlockConfig } from './testimonials-block.config';

type ExtendedContent = Content & {
    textAlignment?: 'top' | 'center' | 'bottom';
    textCentered?: boolean;
    gapHorizontal?: string;
    mediaAspectRatio?: string;
    mediaBorderRadius?: string;
};

type ExtendedTestimonialsBlock = TestimonialsBlock & {
    carouselOverflow?: boolean;
    cardColor?: string;
    indicatorDots?: boolean;
    arrowButtons?: boolean;
    authorImage?: boolean;
    authorTitle?: boolean;
    linkType?: 'none' | 'button' | 'anchor';
};

interface BlockConfigurationDropdownProps {
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

export function BlockConfigurationDropdown({
    isOpen,
    onToggle,
    children,
}: BlockConfigurationDropdownProps) {
    return (
        <div className="border border-gray-200 rounded-lg">
            <button
                type="button"
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-label="Toggle block configuration"
            >
                <div className="flex items-center space-x-2">
                    <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                        Block Configuration
                    </span>
                </div>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
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
                    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-3 space-y-3 bg-white">{children}</div>
            </div>
        </div>
    );
}

interface ContentBlockControlsProps {
    onFixtureChange: (fixture: ExtendedContent) => void;
    onTestimonialsFixtureChange: (fixture: ExtendedTestimonialsBlock) => void;
}

export function ContentBlockControls({
    onFixtureChange,
    onTestimonialsFixtureChange,
}: ContentBlockControlsProps) {
    const [contentFixture, setContentFixture] = useState<ExtendedContent>(
        CONTENT_BLOCK_FIXTURE,
    );
    const [testimonialsFixture, setTestimonialsFixture] =
        useState<ExtendedTestimonialsBlock>(TESTIMONIALS_BLOCK_FIXTURE);
    const [isContentDropdownOpen, setIsContentDropdownOpen] = useState(false);
    const [isTestimonialsDropdownOpen, setIsTestimonialsDropdownOpen] =
        useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Drag state
    const [position, setPosition] = useState({ x: 16, y: 16 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const controlsRef = useRef<HTMLDivElement>(null);

    const updateContentFixture = (updates: Partial<ExtendedContent>) => {
        const newFixture = { ...contentFixture, ...updates };
        setContentFixture(newFixture);
        onFixtureChange(newFixture);
    };

    const updateTestimonialsFixture = (
        updates: Partial<ExtendedTestimonialsBlock>,
    ) => {
        const newFixture = { ...testimonialsFixture, ...updates };
        setTestimonialsFixture(newFixture);
        onTestimonialsFixtureChange(newFixture);
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!controlsRef.current) return;

        const rect = controlsRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // Keep within viewport bounds
            const maxX =
                window.innerWidth - (controlsRef.current?.offsetWidth || 0);
            const maxY =
                window.innerHeight - (controlsRef.current?.offsetHeight || 0);

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY)),
            });
        },
        [isDragging, dragOffset],
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={controlsRef}
            style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                width: '320px',
                zIndex: 1000,
            }}
            className="bg-white/80 rounded-lg shadow-md border border-gray-200 cursor-move backdrop-blur-md"
            onMouseDown={handleMouseDown}
        >
            {/* Main Header with Minimize Toggle */}
            <div className="flex relative items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Block configuration</h2>
                <button
                    type="button"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="absolute flex items-center justify-center right-1 h-[90%] aspect-square p-1 my-1 rounded bg-white/80 hover:shadow-none  shadow-inner transition-colors"
                    aria-label={
                        isMinimized ? 'Expand controls' : 'Minimize controls'
                    }
                >
                    <svg
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                            isMinimized ? 'rotate-180' : ''
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
            </div>

            {/* Content Section */}
            <div
                className={`overflow-hidden transition-all px-[3px] flex flex-col gap-y-[1px] duration-300 ease-in-out ${
                    isMinimized
                        ? 'max-h-0 opacity-0'
                        : 'max-h-[1200px] opacity-100'
                }`}
            >
                {/* Content Block Configuration */}
                <ContentBlockConfig
                    contentFixture={contentFixture}
                    updateContentFixture={updateContentFixture}
                    isContentDropdownOpen={isContentDropdownOpen}
                    setIsContentDropdownOpen={setIsContentDropdownOpen}
                />

                {/* Testimonials Block Configuration */}
                <TestimonialsBlockConfig
                    testimonialsFixture={testimonialsFixture}
                    updateTestimonialsFixture={updateTestimonialsFixture}
                    isTestimonialsDropdownOpen={isTestimonialsDropdownOpen}
                    setIsTestimonialsDropdownOpen={
                        setIsTestimonialsDropdownOpen
                    }
                />
            </div>
        </div>
    );
}
