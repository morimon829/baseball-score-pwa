import React from 'react';
import type { InningResult } from '../types';
import { clsx } from 'clsx';

interface Runner {
    playerId: string;
    name: string;
    currentBase: 1 | 2 | 3;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (result: InningResult, isOut: boolean) => void;
    hasRun: boolean;
    onToggleRun: () => void;
    // New props for runner details
    reachedFirst: boolean;
    reachedSecond: boolean;
    reachedThird: boolean;
    onToggleBase: (base: 1 | 2 | 3) => void;
    runners?: Runner[];
    onRunnerAdvance?: (playerId: string, base: 1 | 2 | 3 | 4, isSteal?: boolean) => void;
}

export const InputModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSelect,
    hasRun,
    onToggleRun,
    reachedFirst,
    reachedSecond,
    reachedThird,
    onToggleBase,
    runners = [],
    onRunnerAdvance
}) => {
    if (!isOpen) return null;

    const buttons: { label: InningResult; isOut: boolean; style?: string }[] = [
        { label: '安', isOut: false, style: 'bg-yellow-100 border-yellow-300' },
        { label: '二', isOut: false, style: 'bg-yellow-100 border-yellow-300' },
        { label: '三', isOut: false, style: 'bg-yellow-100 border-yellow-300' },
        { label: '本', isOut: false, style: 'bg-orange-200 border-orange-400 font-bold' },
        { label: '四', isOut: false, style: 'bg-blue-50 border-blue-200' },
        { label: '死', isOut: false, style: 'bg-blue-50 border-blue-200' },
        { label: '振', isOut: true },
        { label: '投ゴ', isOut: true },
        { label: '捕ゴ', isOut: true },
        { label: '一ゴ', isOut: true },
        { label: '二ゴ', isOut: true },
        { label: '三ゴ', isOut: true },
        { label: '遊ゴ', isOut: true },
        { label: '投飛', isOut: true },
        { label: '捕飛', isOut: true },
        { label: '一飛', isOut: true },
        { label: '二飛', isOut: true },
        { label: '三飛', isOut: true },
        { label: '遊飛', isOut: true },
        { label: '左飛', isOut: true },
        { label: '中飛', isOut: true },
        { label: '右飛', isOut: true },
        { label: '犠飛', isOut: true },
        { label: '犠打', isOut: true },
        { label: '打妨', isOut: false },
        { label: '守妨', isOut: false },
        { label: '失', isOut: false, style: 'bg-red-50 border-red-200' },
        { label: '野選', isOut: false },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-3 bg-gray-100 border-b">
                    <h3 className="font-bold text-lg">結果を入力</h3>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800">
                        ✕
                    </button>
                </div>

                {/* Advanced Runner Controls */}
                <div className="p-3 bg-blue-50 border-b flex justify-around items-center">
                    <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-blue-900">進塁状況:</span>
                        <button
                            onClick={() => onToggleBase(1)}
                            className={clsx("w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center font-bold text-sm", reachedFirst ? "bg-red-500 text-white border-red-600" : "bg-white")}
                        >1</button>
                        <span className="text-gray-400">→</span>
                        <button
                            onClick={() => onToggleBase(2)}
                            className={clsx("w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center font-bold text-sm", reachedSecond ? "bg-red-500 text-white border-red-600" : "bg-white")}
                        >2</button>
                        <span className="text-gray-400">→</span>
                        <button
                            onClick={() => onToggleBase(3)}
                            className={clsx("w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center font-bold text-sm", reachedThird ? "bg-red-500 text-white border-red-600" : "bg-white")}
                        >3</button>
                        <span className="text-gray-400">→</span>
                        <button
                            onClick={onToggleRun}
                            className={clsx(
                                "px-3 py-1 rounded-full border flex items-center",
                                hasRun
                                    ? "bg-red-600 border-red-700 text-white shadow-md transform scale-105"
                                    : "bg-white border-gray-300 text-gray-500 hover:bg-red-50"
                            )}
                        >
                            <span className="font-bold mr-1">得点</span>
                            {hasRun && <span className="bg-white text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                        </button>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-4 gap-3 overflow-y-auto">
                    {/* Runners on Base Control */}
                    {runners.length > 0 && (
                        <div className="border-t pt-2">
                            <h4 className="font-bold text-sm text-gray-600 mb-2">塁上のランナー (タップで進塁)</h4>
                            <div className="space-y-2">
                                {runners.map(runner => (
                                    <div key={runner.playerId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                        <div className="flex items-center">
                                            <span className="font-bold mr-2">{runner.name}</span>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {runner.currentBase === 1 ? '1塁' : runner.currentBase === 2 ? '2塁' : '3塁'}
                                            </span>
                                        </div>
                                        <div className="flex space-x-1">
                                            {runner.currentBase < 2 && (
                                                <>
                                                    <button
                                                        onClick={() => onRunnerAdvance?.(runner.playerId, 2)}
                                                        className="px-2 py-1 bg-white border rounded hover:bg-blue-50 text-sm"
                                                    >
                                                        →2
                                                    </button>
                                                    <button
                                                        onClick={() => onRunnerAdvance?.(runner.playerId, 2, true)}
                                                        className="px-2 py-1 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 text-sm text-blue-800 font-bold"
                                                    >
                                                        盗
                                                    </button>
                                                </>
                                            )}
                                            {runner.currentBase < 3 && (
                                                <>
                                                    <button
                                                        onClick={() => onRunnerAdvance?.(runner.playerId, 3)}
                                                        className="px-2 py-1 bg-white border rounded hover:bg-blue-50 text-sm"
                                                    >
                                                        →3
                                                    </button>
                                                    <button
                                                        onClick={() => onRunnerAdvance?.(runner.playerId, 3, true)}
                                                        className="px-2 py-1 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 text-sm text-blue-800 font-bold"
                                                    >
                                                        盗
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => onRunnerAdvance?.(runner.playerId, 4 as any)} // 4 treated as Run
                                                className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 text-sm"
                                            >
                                                生還
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => onSelect('', false)}
                        className="p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center col-span-4"
                    >
                        <span className="text-sm font-bold text-gray-400">クリア</span>
                    </button>
                    {buttons.map((btn) => (
                        <button
                            key={btn.label}
                            onClick={() => onSelect(btn.label, btn.isOut)}
                            className={clsx(
                                "p-3 rounded-lg border-2 flex flex-col items-center justify-center shadow-sm transition-all active:scale-95",
                                btn.style || "bg-white border-gray-200 hover:border-blue-300"
                            )}
                        >
                            <span className="text-lg md:text-xl font-bold">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
