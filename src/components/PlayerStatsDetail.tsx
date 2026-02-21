import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Game } from '../types';

interface Props {
    playerId: string;
    playerName: string;
    games: Game[];
    onBack: () => void;
}

export const PlayerStatsDetail: React.FC<Props> = ({ playerId, playerName, games, onBack }) => {

    // Check if player has pitching records to decide if we show pitching tab/table
    const hasPitchingData = useMemo(() => {
        return games.some(g => {
            // Check if they pitched in this game
            const pRecords = g.pitcherRecords?.visitor?.some(p => p.id === playerId) || g.pitcherRecords?.home?.some(p => p.id === playerId);
            return pRecords;
        });
    }, [games, playerId]);

    const [activeTab, setActiveTab] = React.useState<'batting' | 'pitching'>('batting');

    const battingHistory = useMemo(() => {
        return games.map(game => {
            let entry = game.scores.visitor.find(s => s.playerId === playerId);
            if (!entry) {
                entry = game.scores.home.find(s => s.playerId === playerId);
            }
            if (!entry) return null;

            // Optional: skip if no AT BATs/PA ? No, show if they were in the lineup.
            return {
                gameId: game.id,
                date: game.date,
                opponent: entry === game.scores.visitor.find(s => s.playerId === playerId) ? game.teams?.home?.name : game.teams?.visitor?.name,
                entry
            };
        }).filter(Boolean);
    }, [games, playerId]);

    const pitchingHistory = useMemo(() => {
        return games.map(game => {
            let isVisitor = true;
            let record = game.pitcherRecords?.visitor?.find(p => p.id === playerId);
            if (!record) {
                isVisitor = false;
                record = game.pitcherRecords?.home?.find(p => p.id === playerId);
            }
            if (!record) return null;

            return {
                gameId: game.id,
                date: game.date,
                opponent: isVisitor ? game.teams?.home?.name : game.teams?.visitor?.name,
                record
            };
        }).filter(Boolean);
    }, [games, playerId]);


    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-blue-900 text-white p-4 sticky top-0 z-20 shadow flex items-center">
                <button onClick={onBack} className="p-2 hover:bg-blue-800 rounded-full mr-3">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">{playerName} の成績履歴</h1>
            </div>

            {hasPitchingData && (
                <div className="flex border-b bg-white mt-2 sticky top-[68px] z-10">
                    <button
                        className={`flex-1 py-3 text-center font-bold border-b-2 ${activeTab === 'batting' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                        onClick={() => setActiveTab('batting')}
                    >
                        打撃成績
                    </button>
                    <button
                        className={`flex-1 py-3 text-center font-bold border-b-2 ${activeTab === 'pitching' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                        onClick={() => setActiveTab('pitching')}
                    >
                        投手成績
                    </button>
                </div>
            )}

            <div className="p-2 overflow-x-auto mt-4">
                {activeTab === 'batting' ? (
                    <table className="w-full text-sm bg-white rounded shadow text-center whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-gray-100 z-10">日付</th>
                                <th className="p-2">対戦相手</th>
                                <th className="p-2">結果詳細</th>
                            </tr>
                        </thead>
                        <tbody>
                            {battingHistory.map((h, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-2 text-left sticky left-0 bg-white border-r font-medium text-gray-700">{h?.date}</td>
                                    <td className="p-2 text-gray-600">{h?.opponent || '不明'}</td>
                                    <td className="p-2 flex gap-1 justify-center whitespace-nowrap">
                                        {Object.values(h?.entry?.inningResults || {}).map((res, idx) => (
                                            res ? <span key={idx} className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">{String(res)}</span> : null
                                        ))}
                                    </td>
                                </tr>
                            ))}
                            {battingHistory.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500">打撃データがありません</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm bg-white rounded shadow text-center whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-gray-100 z-10">日付</th>
                                <th className="p-2">対戦相手</th>
                                <th className="p-2">結果</th>
                                <th className="p-2">回数</th>
                                <th className="p-2">自責点</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pitchingHistory.map((h, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-2 text-left sticky left-0 bg-white border-r font-medium text-gray-700">{h?.date}</td>
                                    <td className="p-2 text-gray-600">{h?.opponent || '不明'}</td>
                                    <td className="p-2 font-bold">{h?.record?.result === 'win' ? '勝' : h?.record?.result === 'lose' ? '負' : h?.record?.result === 'save' ? 'S' : '-'}</td>
                                    <td className="p-2">{h?.record?.innings ? h.record.innings : '-'}</td>
                                    <td className="p-2 text-red-600 font-bold">{h?.record?.er ?? '-'}</td>
                                </tr>
                            ))}
                            {pitchingHistory.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">登板データがありません</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
