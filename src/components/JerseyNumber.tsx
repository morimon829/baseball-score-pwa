import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
    number: string;
    className?: string;
    size?: number;
    color?: string;
    textColor?: string;
}

export const JerseyNumber: React.FC<Props> = ({
    number,
    className,
    size = 24,
    color = "bg-gray-800",
    textColor = "text-white"
}) => {
    return (
        <div
            className={twMerge(clsx("relative flex items-center justify-center", className))}
            style={{ width: size, height: size * 0.9 }}
        >
            <svg
                viewBox="0 0 24 20"
                fill="currentColor"
                className={clsx("absolute inset-0 w-full h-full", color.replace('bg-', 'text-'))}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Simple T-Shirt / Jersey Shape */}
                <path d="M6 0L0 4L2 8L6 6V20H18V6L22 8L24 4L18 0H6Z" />
            </svg>
            <span
                className={clsx("relative z-10 font-bold", textColor)}
                style={{ fontSize: size * 0.4 }}
            >
                {number}
            </span>
        </div>
    );
};
