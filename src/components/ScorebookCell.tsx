import React from 'react';
import { clsx } from 'clsx';
import type { InningResult } from '../types';

interface Props {
    result: InningResult;
    isRun?: boolean;
    reachedFirst?: boolean;
    reachedSecond?: boolean;
    reachedThird?: boolean;
    onClick?: () => void;
    className?: string;
}

export const ScorebookCell: React.FC<Props> = ({
    result,
    isRun,
    reachedFirst,
    reachedSecond,
    reachedThird,
    onClick,
    className
}) => {
    // Determine which lines to highlight based on runner progress
    // Run implies 3rd->Home
    // Reached 3rd implies 2nd->3rd
    // Reached 2nd implies 1st->2nd
    // Reached 1st implies Home->1st
    // But we allow manual control, so strictly follow props.

    // SVG Coordinate system: 0,0 to 100,100
    // Diamond corners:
    // Home: 50, 90
    // 1st: 90, 50
    // 2nd: 50, 10
    // 3rd: 10, 50

    const strokeWidth = 4;
    const baseColor = "stroke-gray-300";
    const activeColor = "stroke-red-600";

    return (
        <div
            className={clsx("relative w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50", className)}
            onClick={onClick}
        >
            <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 p-1 pointer-events-none">
                {/* Background Details - Light Gray Diamond */}
                <path d="M50 90 L90 50 L50 10 L10 50 Z" fill="none" className="stroke-gray-200" strokeWidth="1" />

                {/* Runner Paths */}
                {/* Home -> 1st */}
                <line x1="50" y1="90" x2="90" y2="50"
                    className={reachedFirst ? activeColor : baseColor}
                    strokeWidth={strokeWidth}
                />

                {/* 1st -> 2nd */}
                <line x1="90" y1="50" x2="50" y2="10"
                    className={reachedSecond ? activeColor : baseColor}
                    strokeWidth={strokeWidth}
                />

                {/* 2nd -> 3rd */}
                <line x1="50" y1="10" x2="10" y2="50"
                    className={reachedThird ? activeColor : baseColor}
                    strokeWidth={strokeWidth}
                />

                {/* 3rd -> Home */}
                <line x1="10" y1="50" x2="50" y2="90"
                    className={isRun ? activeColor : baseColor}
                    strokeWidth={strokeWidth}
                />

                {/* Central Circle for Run? Optional. 
                    Standard scorebook often shades the center if run scored.
                */}
                {isRun && (
                    <circle cx="50" cy="50" r="15" className="fill-red-100" />
                )}
            </svg>

            {/* Result Text */}
            <span className="relative z-10 font-bold text-lg md:text-xl pointer-events-none select-none">
                {result}
            </span>

            {/* Run Indicator (small '得' badge) - kept from previous design or remove?
                If the diamond shows the run clearly (red line + fill), maybe we don't need the badge.
                But for clarity/accessibility, let's keep a small indicator or rely on the visual.
                Let's rely on the prominent red diamond for now.
            */}
        </div>
    );
};
