import React, { useState, useEffect } from 'react';
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
    const [category, setCategory] = useState<string | null>(null);
    const [position, setPosition] = useState<number | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCategory(null);
            setPosition(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelect = (res: InningResult, isOut: boolean) => {
        onSelect(res, isOut);
        setCategory(null);
        setPosition(null);
    };

    const renderMenu = () => {
        // Main Menu
        if (!category) {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCategory('安打')} className="p-3 bg-yellow-100 border border-yellow-300 rounded font-bold hover:bg-yellow-200">打撃 (安打など)</button>
                    <button onClick={() => setCategory('凡退')} className="p-3 bg-gray-100 border border-gray-300 rounded font-bold hover:bg-gray-200">凡退 (ゴロ/飛球)</button>
                    <button onClick={() => setCategory('三振')} className="p-3 text-red-700 bg-red-50 border border-red-200 rounded font-bold hover:bg-red-100">三振</button>
                    <button onClick={() => setCategory('四死球')} className="p-3 bg-blue-50 border border-blue-200 rounded font-bold hover:bg-blue-100">四死球</button>
                    <button onClick={() => setCategory('犠打飛')} className="p-3 bg-indigo-50 border border-indigo-200 rounded font-bold hover:bg-indigo-100">犠打・犠飛</button>
                    <button onClick={() => setCategory('その他')} className="p-3 bg-gray-50 border border-gray-300 rounded font-bold hover:bg-gray-100">その他 (失策など)</button>
                    <button onClick={() => handleSelect('', false)} className="p-3 col-span-2 mt-2 border-2 border-dashed border-gray-400 text-gray-500 rounded font-bold hover:bg-gray-100">クリア (取り消し)</button>
                </div>
            );
        }

        // Sub Menu: Hit
        if (category === '安打') {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleSelect('安', false)} className="p-3 bg-yellow-100 border border-yellow-300 rounded font-bold text-lg">安打 (単打)</button>
                    <button onClick={() => handleSelect('二', false)} className="p-3 bg-yellow-100 border border-yellow-300 rounded font-bold text-lg">二塁打</button>
                    <button onClick={() => handleSelect('三', false)} className="p-3 bg-yellow-100 border border-yellow-300 rounded font-bold text-lg">三塁打</button>
                    <button onClick={() => handleSelect('本', false)} className="p-3 bg-orange-200 border border-orange-400 rounded font-bold text-lg">本塁打</button>
                    <button onClick={() => setCategory(null)} className="p-3 col-span-2 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                </div>
            );
        }

        // Sub Menu: Out -> Position
        if (category === '凡退' && position === null) {
            const positions = [
                { id: 1, name: '投' }, { id: 2, name: '捕' }, { id: 3, name: '一' },
                { id: 4, name: '二' }, { id: 5, name: '三' }, { id: 6, name: '遊' },
                { id: 7, name: '左' }, { id: 8, name: '中' }, { id: 9, name: '右' }
            ];
            return (
                <>
                    <p className="text-center font-bold text-gray-600 mb-2">打球の飛んだポジション</p>
                    <div className="grid grid-cols-3 gap-3">
                        {positions.map(p => (
                            <button key={p.id} onClick={() => setPosition(p.id)} className="p-3 bg-white border border-gray-300 rounded font-bold text-lg hover:bg-blue-50">
                                {p.name}
                            </button>
                        ))}
                        <button onClick={() => setCategory(null)} className="p-3 col-span-3 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                    </div>
                </>
            );
        }

        // Sub Menu: Out -> Outcome (Fly vs Grounder)
        if (category === '凡退' && position !== null) {
            const posNames = ['', '投', '捕', '一', '二', '三', '遊', '左', '中', '右'];
            const pName = posNames[position];

            // Infielders have Grounders vs Flys. Outfielders typically only have Flys standard in this app.
            const hasGrounder = position <= 6;

            return (
                <div className="grid grid-cols-2 gap-3">
                    <p className="col-span-2 text-center font-bold text-gray-600 mb-2">【 {pName} 】への打球</p>
                    {hasGrounder && (
                        <button onClick={() => handleSelect(`${pName}ゴ` as InningResult, true)} className="p-4 bg-white border border-gray-300 rounded font-bold text-xl hover:bg-gray-100">
                            {pName}ゴ <span className="text-sm font-normal text-gray-500 block">(ゴロ)</span>
                        </button>
                    )}
                    <button onClick={() => handleSelect(`${pName}飛` as InningResult, true)} className={clsx("p-4 bg-white border border-gray-300 rounded font-bold text-xl hover:bg-gray-100", !hasGrounder && "col-span-2")}>
                        {pName}飛 <span className="text-sm font-normal text-gray-500 block">(フライ/ライナー)</span>
                    </button>
                    <button onClick={() => setPosition(null)} className="p-3 col-span-2 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                </div>
            );
        }

        if (category === '三振') {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleSelect('振', true)} className="p-3 bg-white border border-gray-300 rounded font-bold text-lg hover:bg-gray-100">空振り三振</button>
                    <button onClick={() => handleSelect('逃振', true)} className="p-3 bg-white border border-gray-300 rounded font-bold text-lg hover:bg-gray-100">見逃し三振</button>
                    <button onClick={() => setCategory(null)} className="p-3 col-span-2 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                </div>
            );
        }

        if (category === '四死球') {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleSelect('四', false)} className="p-3 bg-blue-50 border border-blue-200 rounded font-bold text-lg hover:bg-blue-100">四球 (フォアボール)</button>
                    <button onClick={() => handleSelect('死', false)} className="p-3 bg-blue-50 border border-blue-200 rounded font-bold text-lg hover:bg-blue-100">死球 (デッドボール)</button>
                    <button onClick={() => setCategory(null)} className="p-3 col-span-2 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                </div>
            );
        }

        if (category === '犠打飛') {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleSelect('犠打', true)} className="p-3 bg-indigo-50 border border-indigo-200 rounded font-bold text-lg hover:bg-indigo-100">犠打 (バント)</button>
                    <button onClick={() => handleSelect('犠飛', true)} className="p-3 bg-indigo-50 border border-indigo-200 rounded font-bold text-lg hover:bg-indigo-100">犠飛 (犠牲フライ)</button>
                    <button onClick={() => setCategory(null)} className="p-3 col-span-2 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                </div>
            );
        }

        if (category === 'その他') {
            return (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleSelect('失', false)} className="p-3 bg-red-50 border border-red-200 rounded font-bold text-lg hover:bg-red-100 text-red-700">失策 (エラー)</button>
                    <button onClick={() => handleSelect('野選', false)} className="p-3 bg-white border border-gray-300 rounded font-bold text-lg hover:bg-gray-100">野選 (FC)</button>
                    <button onClick={() => handleSelect('打妨', false)} className="p-3 bg-white border border-gray-300 rounded font-bold text-lg hover:bg-gray-100">打撃妨害</button>
                    <button onClick={() => handleSelect('守妨', false)} className="p-3 bg-white border border-gray-300 rounded font-bold text-lg hover:bg-gray-100">守備妨害</button>
                    <button onClick={() => setCategory(null)} className="p-3 col-span-2 mt-2 bg-gray-200 rounded font-bold text-gray-600">戻る</button>
                </div>
            );
        }

        return null;
    };

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

                <div className="p-4 overflow-y-auto">
                    {/* Runners on Base Control */}
                    {runners.length > 0 && (
                        <div className="border-t pt-2 mb-4">
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

                    {/* Result Selection Area */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        {renderMenu()}
                    </div>
                </div>
            </div>
        </div>
    );
};
