import React, { useState, useEffect } from 'react';
import type { Game, InningResult, Player } from '../types';
import { InputModal } from './InputModal';
import { GameInfoModal } from './GameInfoModal';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { JerseyNumber } from './JerseyNumber';
import { ScorebookCell } from './ScorebookCell';
import { calculateStats } from '../utils/calculator';
import { ArrowLeft, Download, Clock } from 'lucide-react';
import { saveGame } from '../utils/storage';
import { clsx } from 'clsx';
import { generatePDF } from '../utils/pdfGenerator';

interface Props {
    game: Game;
    onSave: (game: Game) => void;
    onBack: () => void;
}

export const ScoreSheet: React.FC<Props> = ({ game: initialGame, onBack }) => {
    const [game, setGame] = useState<Game>(initialGame);
    const [activeTeam, setActiveTeam] = useState<'visitor' | 'home'>('visitor');
    const [modalOpen, setModalOpen] = useState(false);
    const [gameInfoModalOpen, setGameInfoModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{ playerId: string, inning: number } | null>(null);

    // Player Selection State
    const [playerModalOpen, setPlayerModalOpen] = useState(false);
    const [targetLineupIndex, setTargetLineupIndex] = useState<number | null>(null);

    // Auto-save effect
    useEffect(() => {
        saveGame(game);
    }, [game]);

    const handleCellClick = (playerId: string, inning: number) => {
        setSelectedCell({ playerId, inning });
        setModalOpen(true);
    };

    // Helper to determine if result is Out
    const isOut = (result: InningResult): boolean => {
        return ['振', '投ゴ', '捕ゴ', '一ゴ', '二ゴ', '三ゴ', '遊ゴ',
            '投飛', '捕飛', '一飛', '二飛', '三飛', '遊飛',
            '左飛', '中飛', '右飛', '犠飛', '犠打'].includes(result);
    };

    // Get Runners for current inning (excluding current selected player)
    const getRunners = (inning: number, excludePlayerId: string) => {
        const teamLines = activeTeam === 'visitor' ? game.visitorLineup : game.homeLineup;
        const teamScores = activeTeam === 'visitor' ? game.scores.visitor : game.scores.home;

        return teamLines
            .map(p => {
                const s = teamScores.find(score => score.playerId === p.id);
                if (!s) return null;
                const r = s.inningResults[inning];
                const d = s.details[inning];
                if (!r || isOut(r) || d?.isRun) return null; // Not on base
                if (p.id === excludePlayerId) return null; // Current batter

                // Determine base - assume highest reached
                let currentBase: 1 | 2 | 3 = 1;
                if (d?.reachedThird) currentBase = 3;
                else if (d?.reachedSecond) currentBase = 2;
                else if (d?.reachedFirst) currentBase = 1;

                return { playerId: p.id, name: p.name, currentBase };
            })
            .filter((r): r is { playerId: string, name: string, currentBase: 1 | 2 | 3 } => r !== null);
    };

    const handleInput = (result: InningResult, isOutInput: boolean) => {
        if (!selectedCell) return;
        const { playerId, inning } = selectedCell;

        setGame(prev => {
            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]];
            let entryIndex = scores.findIndex(s => s.playerId === playerId);

            if (entryIndex === -1) {
                scores.push({
                    playerId,
                    inningResults: {},
                    details: {}
                });
                entryIndex = scores.length - 1;
            }

            const entry = { ...scores[entryIndex] };
            entry.inningResults = { ...entry.inningResults, [inning]: result };

            if (!result) {
                // Clear details if result is cleared
                entry.details[inning] = { rbi: 0, isRun: false, stolenBases: 0 };
            } else {
                if (!entry.details[inning]) {
                    entry.details[inning] = { rbi: 0, isRun: false };
                }

                // Auto Reach First if Hit/Walk and not Out
                // Note: isOutInput passed from modal relies on button type.
                if (!isOutInput && !entry.details[inning].reachedFirst) {
                    // Simple logic: if hit/walk, at least reach first.
                    // Unless it's a HR (Run) or specific case.
                    // Let's set reachedFirst = true for safety if not strictly 'HR'.
                    if (['安', '二', '三', '本', '四', '死', '敬遠', '失', '野選'].includes(result)) {
                        // FIX: HR should also reach first
                        entry.details[inning].reachedFirst = true;
                    }
                    if (['二', '三', '本'].includes(result)) entry.details[inning].reachedSecond = true;
                    if (['三', '本'].includes(result)) entry.details[inning].reachedThird = true;
                    if (result === '本') entry.details[inning].isRun = true;
                }
            }

            scores[entryIndex] = entry;

            // --- Auto Advance Runners Logic ---
            // Find runners (using PREV state to find them, but modifying NEW state scores)
            // We need to iterate over the *new* scores array to find other players to update
            scores.forEach((s, idx) => {
                if (s.playerId === playerId) return; // Skip current batter

                const r = s.inningResults[inning];
                const d = s.details[inning];
                if (!r || isOut(r) || d?.isRun) return; // Not on base

                // Current base
                let base = 0;
                if (d?.reachedThird) base = 3;
                else if (d?.reachedSecond) base = 2;
                else if (d?.reachedFirst) base = 1;

                if (base === 0) return;

                // Logic based on Batter Result
                let advance = 0;
                if (['安', '四', '死', '敬遠'].includes(result)) advance = 1; // Single/Walk -> +1 base (Simplified)
                if (result === '二') advance = 2;
                if (result === '三') advance = 3;
                if (result === '本') advance = 4;

                // For Walk, only force if forced? User asked for simple logic.
                // "Runner 1st & Double -> 2nd & 3rd". Wait.
                // 1B (base=1) + Double (adv=2) -> 1+2 = 3rd. Correct.
                // 2B (base=2) + Double (adv=2) -> 4 (Home). Correct.
                // Walk: 1B -> 2B (forced). 2B (open 1st) -> Stay?
                // Auto-logic is tricky. Let's apply basic advancement and let user fix?
                // "自動で設定されるようにしたい...自由に入力する余地は残したい"
                // Let's apply standard "Push" logic.

                if (['四', '死', '敬遠'].includes(result)) {
                    // Force logic is hard without knowing whole state.
                    // Simple: Advance 1 if on 1st. If on 2nd and 1st occupied... too complex for quick fix.
                    // Just use Advance 1 for Walk for 1st base runner only?
                    if (base === 1) advance = 1;
                    else advance = 0; // Don't auto-advance 2nd/3rd on walk unless forced.
                }

                if (advance > 0) {
                    const newBase = base + advance;
                    let newDetails = { ...scores[idx].details[inning] };

                    if (newBase >= 2) newDetails.reachedSecond = true;
                    if (newBase >= 3) newDetails.reachedThird = true;
                    if (newBase >= 4) newDetails.isRun = true;

                    scores[idx] = {
                        ...scores[idx],
                        details: {
                            ...scores[idx].details,
                            [inning]: newDetails
                        }
                    };
                }
            });

            return {
                ...prev,
                scores: {
                    ...prev.scores,
                    [teamKey]: scores
                }
            };
        });
        setModalOpen(false);

        // removed 3-out auto-change alert as per request
    };

    const handleRunnerAdvance = (playerId: string, base: 1 | 2 | 3 | 4, isSteal: boolean = false) => {
        // Advance base
        if (base === 4) toggleRun(playerId, selectedCell?.inning || 1);
        else toggleBase(playerId, selectedCell?.inning || 1, base as any);

        // Helper for Steal Count:
        if (isSteal) {
            setGame(prev => {
                const teamKey = activeTeam;
                const scores = [...prev.scores[teamKey]];
                const entryIndex = scores.findIndex(s => s.playerId === playerId);
                if (entryIndex === -1) return prev;

                const entry = { ...scores[entryIndex] };
                const inning = selectedCell?.inning || 1;
                const currentDetails = entry.details[inning] || { rbi: 0, isRun: false, stolenBases: 0 };

                entry.details = {
                    ...entry.details,
                    [inning]: { ...currentDetails, stolenBases: (currentDetails.stolenBases || 0) + 1 }
                };
                scores[entryIndex] = entry;
                return { ...prev, scores: { ...prev.scores, [teamKey]: scores } };
            });
        }
    };

    // Toggle Run (for simplicity, toggle when Result exists)
    const toggleRun = (playerId: string, inning: number) => {
        setGame(prev => {
            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]];
            const entryIndex = scores.findIndex(s => s.playerId === playerId);
            if (entryIndex === -1) return prev; // No entry yet

            const entry = { ...scores[entryIndex] };
            const currentDetails = entry.details[inning] || { rbi: 0, isRun: false };
            entry.details = {
                ...entry.details,
                [inning]: { ...currentDetails, isRun: !currentDetails.isRun }
            };
            scores[entryIndex] = entry;
            return { ...prev, scores: { ...prev.scores, [teamKey]: scores } };
        });
    };

    const toggleBase = (playerId: string, inning: number, base: 1 | 2 | 3) => {
        setGame(prev => {
            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]];
            const entryIndex = scores.findIndex(s => s.playerId === playerId);
            if (entryIndex === -1) return prev;

            const entry = { ...scores[entryIndex] };
            const currentDetails = entry.details[inning] || { rbi: 0, isRun: false };

            let updates = {};
            if (base === 1) updates = { reachedFirst: !currentDetails.reachedFirst };
            if (base === 2) updates = { reachedSecond: !currentDetails.reachedSecond };
            if (base === 3) updates = { reachedThird: !currentDetails.reachedThird };

            entry.details = {
                ...entry.details,
                [inning]: { ...currentDetails, ...updates }
            };
            scores[entryIndex] = entry;
            return { ...prev, scores: { ...prev.scores, [teamKey]: scores } };
        });
    };

    const handlePlayerNameClick = (index: number) => {
        setTargetLineupIndex(index);
        setPlayerModalOpen(true);
    };

    const handlePlayerSelect = (player: Player) => {
        if (targetLineupIndex === null) return;

        setGame(prev => {
            const isVisitor = activeTeam === 'visitor';
            const lineup = isVisitor ? [...prev.visitorLineup] : [...prev.homeLineup];

            // Migration logic:
            const oldId = lineup[targetLineupIndex].id;
            const newId = player.id;

            lineup[targetLineupIndex] = { ...player, order: targetLineupIndex + 1 };

            const scores = isVisitor ? [...prev.scores.visitor] : [...prev.scores.home];
            const scoreIndex = scores.findIndex(s => s.playerId === oldId);

            if (scoreIndex !== -1) {
                // Migrate scores to new ID
                scores[scoreIndex] = { ...scores[scoreIndex], playerId: newId };
            }

            return {
                ...prev,
                [isVisitor ? 'visitorLineup' : 'homeLineup']: lineup,
                scores: {
                    ...prev.scores,
                    [isVisitor ? 'visitor' : 'home']: scores
                }
            };
        });
        setPlayerModalOpen(false);
    };

    const handleErrorClick = (playerId: string) => {
        setGame(prev => {
            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]];
            let entryIndex = scores.findIndex(s => s.playerId === playerId);

            if (entryIndex === -1) {
                scores.push({
                    playerId,
                    inningResults: {},
                    details: {},
                    defensiveErrors: 1
                });
            } else {
                const entry = { ...scores[entryIndex] };
                entry.defensiveErrors = (entry.defensiveErrors || 0) + 1;
                // Simple cycle? 0 -> 1 -> 2 ... -> 0? Or just increment? 
                // User asked for "Input". Increment is standard. 
                // Context menu for decrement? Or just cycle for simplicity?
                // Let's cycle 0->1->2->3->0 for now to allow correction without complex UI.
                if (entry.defensiveErrors > 9) entry.defensiveErrors = 0;
                scores[entryIndex] = entry;
            }

            return {
                ...prev,
                scores: {
                    ...prev.scores,
                    [teamKey]: scores
                }
            };
        });
    };

    const currentLineup = activeTeam === 'visitor' ? game.visitorLineup : game.homeLineup;
    const currentScores = activeTeam === 'visitor' ? game.scores.visitor : game.scores.home;

    const totalInnings = Math.max(7, game.currentInning,
        // find max inning recorded
        ...currentScores.flatMap(s => Object.keys(s.inningResults).map(Number))
    );

    const innings = Array.from({ length: totalInnings }, (_, i) => i + 1);

    // Calculate Current Outs (for game.currentInning)
    const currentOuts = currentScores
        .map(s => s.inningResults[game.currentInning])
        .filter(r => r && isOut(r)).length;

    // Check for 3 Outs
    useEffect(() => {
        if (currentOuts >= 3) {
            // Check if already handled? No usually re-render triggers this.
            // We don't want to spam alerts.
            // But we can't easily track "Alerted for this inning".
            // Let's use a timeout or just show a Toast?
            // "Confirm" dialog is blocking and bad in useEffect.
            // Let's just allow user to click a "Change" button that appears?
            // Or maybe handling it in setGame is better? 
            // setGame is in handleInput.
            // Let's move this logic to handleInput to be triggered ONCE when the 3rd out is made.
        }
    }, [currentOuts, game.currentInning, activeTeam]);

    return (
        <div className="bg-white min-h-screen flex flex-col" id="score-sheet-container">
            {/* Header */}
            <div className="bg-blue-900 text-white p-3 flex justify-between items-center sticky top-0 z-50 shadow-md" data-html2canvas-ignore>
                <div className="flex items-center w-full">
                    <button onClick={onBack} className="p-2 mr-2 hover:bg-blue-800 rounded">
                        <ArrowLeft />
                    </button>

                    <button
                        onClick={() => setGameInfoModalOpen(true)}
                        className="flex-1 flex flex-col items-start hover:bg-blue-800 rounded p-1 -ml-1 text-left"
                    >
                        <div className="text-xs opacity-80 flex items-center gap-2">
                            <span>
                                {game.date ? (() => {
                                    const d = new Date(game.date);
                                    // Format YYYY年MM月DD日
                                    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
                                })() : '日付未定'}
                            </span>
                            {game.location && <span>@ {game.location}</span>}
                        </div>
                        <div className="text-lg md:text-xl font-bold flex items-center gap-3">
                            <span>{game.teams.visitor.name} vs {game.teams.home.name}</span>
                            <span className="text-sm font-normal opacity-90 flex items-center">
                                <Clock size={14} className="mr-1" />
                                {game.startTime || '--:--'} ~ {game.endTime || '--:--'}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Out Count (Just Display) */}
                <div className="flex items-center space-x-4 shrink-0 bg-black/20 rounded px-2 py-1 ml-2">
                    {/* Removed "X回表/裏" display as per request */}
                    <div className="flex space-x-1">
                        <span className={clsx("w-4 h-4 rounded-full border border-white", currentOuts >= 1 ? "bg-red-500 border-red-500" : "bg-transparent")}></span>
                        <span className={clsx("w-4 h-4 rounded-full border border-white", currentOuts >= 2 ? "bg-red-500 border-red-500" : "bg-transparent")}></span>
                    </div>
                </div>

                <div className="ml-4">
                    <button
                        onClick={() => generatePDF(game)}
                        className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-500 flex items-center"
                    >
                        <Download size={16} className="mr-1" /> PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-200 p-1">
                <button
                    className={clsx("flex-1 py-3 text-center font-bold text-lg", activeTeam === 'visitor' ? "bg-white text-blue-900 shadow" : "text-gray-500")}
                    onClick={() => setActiveTeam('visitor')}
                >
                    先攻: {game.teams.visitor.name}
                </button>
                <button
                    className={clsx("flex-1 py-3 text-center font-bold text-lg", activeTeam === 'home' ? "bg-white text-blue-900 shadow" : "text-gray-500")}
                    onClick={() => setActiveTeam('home')}
                >
                    後攻: {game.teams.home.name}
                </button>
            </div>

            {/* Score Grid Container */}
            <div className="flex-1 overflow-auto relative">
                <div className="min-w-max">
                    {/* Table Header */}
                    <div className="flex border-b-2 border-black bg-gray-100 font-bold text-sm sticky top-0 z-40">
                        <div className="w-10 p-2 text-center border-r border-gray-300 sticky left-0 bg-gray-100 z-50">打順</div>
                        <div className="w-32 p-2 text-center border-r border-gray-300 sticky left-10 bg-gray-100 z-50">氏名</div>
                        {innings.map(i => (
                            <div key={i} className="w-16 p-2 text-center border-r border-gray-300 min-w-[4rem]">{i}回</div>
                        ))}
                        <div className="w-12 p-2 text-center border-r border-gray-300">打席</div>
                        <div className="w-12 p-2 text-center border-r border-gray-300">打数</div>
                        <div className="w-12 p-2 text-center border-r border-gray-300">安打</div>
                        <div className="w-12 p-2 text-center border-r border-gray-300">得点</div>
                        <div className="w-12 p-2 text-center border-r border-gray-300">打点</div>
                        <div className="w-12 p-2 text-center border-r border-gray-300">盗塁</div>
                        <div className="w-12 p-2 text-center">失策</div>
                    </div>

                    {/* Rows */}
                    {currentLineup.map((player, index) => {
                        const entry = currentScores.find(s => s.playerId === player.id);
                        const stats = calculateStats(entry);
                        // Simple Plate Appearance calc (AtBats + Walks + Sacrifices would be better but using AtBats + Walks for now to match UI mostly)
                        // Note: accurate PA needs sacrifice fly/bunt tracking in calculator.
                        const pa = stats.atBats + stats.walks;

                        return (
                            <div key={index} className="flex border-b border-gray-300 h-16 items-center">
                                {/* Sticky Name Col */}
                                <div className="w-10 p-2 text-center border-r border-gray-300 font-bold bg-white sticky left-0 z-30 flex items-center justify-center">
                                    {index + 1}
                                </div>
                                <div
                                    className="w-32 p-2 border-r border-gray-300 bg-white sticky left-10 z-30 flex flex-col justify-center overflow-hidden cursor-pointer hover:bg-gray-50"
                                    onClick={() => handlePlayerNameClick(index)}
                                >
                                    {/* Player Selector in future? For now just name */}
                                    <span className={clsx("font-bold truncate text-base", !player.name && "text-gray-400")}>
                                        {player.name || '(選手選択)'}
                                    </span>
                                    <div className="flex items-center mt-1">
                                        <JerseyNumber number={player.number} size={20} color="bg-gray-600" />
                                    </div>
                                </div>

                                {/* Innings */}
                                {innings.map(i => {
                                    const result = entry?.inningResults[i] || '';
                                    const details = entry?.details[i];
                                    const isRun = details?.isRun;

                                    return (
                                        <div
                                            key={i}
                                            className="w-16 h-full border-r border-gray-300 min-w-[4rem] relative flex items-center justify-center p-1"
                                        >
                                            <ScorebookCell
                                                result={result}
                                                isRun={isRun}
                                                reachedFirst={details?.reachedFirst}
                                                reachedSecond={details?.reachedSecond}
                                                reachedThird={details?.reachedThird}
                                                onClick={() => handleCellClick(player.id, i)}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Stats */}
                                <div className="w-12 p-2 text-center border-r border-gray-300 font-bold bg-gray-50">{pa}</div>
                                <div className="w-12 p-2 text-center border-r border-gray-300 font-bold bg-gray-50">{stats.atBats}</div>
                                <div className="w-12 p-2 text-center border-r border-gray-300 font-bold bg-gray-50 text-red-600">{stats.hits}</div>
                                <div className="w-12 p-2 text-center border-r border-gray-300 font-bold bg-gray-50">{stats.runs}</div>
                                <div className="w-12 p-2 text-center border-r border-gray-300 font-bold bg-gray-50">{stats.rbi}</div>
                                <div className="w-12 p-2 text-center border-r border-gray-300 font-bold bg-gray-50 text-blue-600">{stats.stolenBases}</div>
                                <div
                                    className="w-12 p-2 text-center font-bold bg-gray-50 cursor-pointer hover:bg-gray-200"
                                    onClick={() => handleErrorClick(player.id)}
                                >
                                    {stats.errors}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pitcher Records */}
            <div className="p-4 bg-white border-t border-gray-300 pb-20">
                <h3 className="font-bold mb-2">投手記録</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Only show active team's pitchers or both? Usually you write both. Let's show both side by side or just active? 
                        The user image shows "Starter/Relief" boxes. Let's show only Active Team's pitchers to save space or both?
                        Let's show the Active Team's pitchers for now as it matches the tab view concept.
                    */}
                    <div className="border rounded">
                        <div className="bg-gray-100 p-2 font-bold text-center">{activeTeam === 'visitor' ? game.teams.visitor.name : game.teams.home.name} 投手</div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-left">氏名</th>
                                    <th className="p-2 w-14">回数</th>
                                    <th className="p-2 w-12">自責</th>
                                    <th className="p-2 w-16">勝敗</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[0, 1, 2, 3].map(idx => {
                                    const records = game.pitcherRecords?.[activeTeam] || [];
                                    const entry = records[idx] || { id: '', name: '', innings: '', er: 0, result: '' };

                                    const updatePitcher = (field: keyof typeof entry, value: string | number) => {
                                        setGame(prev => {
                                            const newRecords = [...(prev.pitcherRecords?.[activeTeam] || [])];
                                            while (newRecords.length <= idx) newRecords.push({ id: '', name: '', innings: '', er: 0, result: '' });

                                            newRecords[idx] = { ...newRecords[idx], [field]: value };
                                            return {
                                                ...prev,
                                                pitcherRecords: {
                                                    ...prev.pitcherRecords,
                                                    [activeTeam]: newRecords
                                                }
                                            };
                                        });
                                    };

                                    // Filter players to show only active team's players
                                    const teamPlayers = activeTeam === 'visitor' ? game.teams.visitor.players : game.teams.home.players;

                                    return (
                                        <tr key={idx} className="border-b last:border-0">
                                            <td className="p-1">
                                                <select
                                                    className="w-full border rounded p-1 text-sm bg-white"
                                                    value={entry.name}
                                                    onChange={e => updatePitcher('name', e.target.value)}
                                                >
                                                    <option value="">{idx === 0 ? "先発" : "救援"}</option>
                                                    {teamPlayers.map(p => (
                                                        <option key={p.id} value={p.name}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    className="w-full border rounded p-1 text-center"
                                                    value={entry.innings}
                                                    onChange={e => updatePitcher('innings', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded p-1 text-center"
                                                    value={entry.er || ''}
                                                    onChange={e => updatePitcher('er', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="p-1 text-center">
                                                <select
                                                    className="border rounded p-1 w-full"
                                                    value={entry.result}
                                                    onChange={e => updatePitcher('result', e.target.value as any)}
                                                >
                                                    <option value="">-</option>
                                                    <option value="win">○</option>
                                                    <option value="lose">●</option>
                                                    <option value="save">S</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <InputModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSelect={handleInput}
                hasRun={selectedCell ? (activeTeam === 'visitor' ? game.scores.visitor : game.scores.home).find(s => s.playerId === selectedCell.playerId)?.details[selectedCell.inning]?.isRun || false : false}
                onToggleRun={() => selectedCell && toggleRun(selectedCell.playerId, selectedCell.inning)}

                reachedFirst={selectedCell ? (activeTeam === 'visitor' ? game.scores.visitor : game.scores.home).find(s => s.playerId === selectedCell.playerId)?.details[selectedCell.inning]?.reachedFirst || false : false}
                reachedSecond={selectedCell ? (activeTeam === 'visitor' ? game.scores.visitor : game.scores.home).find(s => s.playerId === selectedCell.playerId)?.details[selectedCell.inning]?.reachedSecond || false : false}
                reachedThird={selectedCell ? (activeTeam === 'visitor' ? game.scores.visitor : game.scores.home).find(s => s.playerId === selectedCell.playerId)?.details[selectedCell.inning]?.reachedThird || false : false}
                onToggleBase={(base) => selectedCell && toggleBase(selectedCell.playerId, selectedCell.inning, base)}

                runners={selectedCell ? getRunners(selectedCell.inning, selectedCell.playerId) : []}
                onRunnerAdvance={(pid, base, isSteal) => {
                    handleRunnerAdvance(pid, base, isSteal);
                }}
            />

            <PlayerSelectionModal
                isOpen={playerModalOpen}
                onClose={() => setPlayerModalOpen(false)}
                team={activeTeam === 'visitor' ? game.teams.visitor : game.teams.home}
                onSelect={handlePlayerSelect}
            />

            {/* Footer for extra controls? e.g. Add Inning (auto handled basically) */}
            <div className="p-2 bg-gray-100 flex justify-end text-xs text-gray-500">
                ※ スコアを入力するには枠をタップしてください
            </div>

            {gameInfoModalOpen && (
                <GameInfoModal
                    game={game}
                    onSave={(updates) => setGame(prev => ({ ...prev, ...updates }))}
                    onClose={() => setGameInfoModalOpen(false)}
                />
            )}
        </div >
    );
};
