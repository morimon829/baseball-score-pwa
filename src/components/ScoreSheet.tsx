import React, { useState, useEffect } from 'react';
import type { Game, InningResult, Player } from '../types';
import { InputModal } from './InputModal';
import { GameInfoModal } from './GameInfoModal';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { JerseyNumber } from './JerseyNumber';
import { ScorebookCell } from './ScorebookCell';
import { calculateStats } from '../utils/calculator';
import { ArrowLeft, Download, Clock, User } from 'lucide-react';
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
    const [selectedCell, setSelectedCell] = useState<{ playerId: string, inning: string } | null>(null);

    // Extra Innings State (allow forcing extra columns before data exists)
    const [manualMaxInning, setManualMaxInning] = useState<number>(7);

    // Player Selection State
    const [playerModalOpen, setPlayerModalOpen] = useState(false);
    const [targetLineupIndex, setTargetLineupIndex] = useState<number | null>(null);

    // Auto-save effect
    useEffect(() => {
        saveGame(game);
    }, [game]);

    const handleCellClick = (playerId: string, inning: string) => {
        setSelectedCell({ playerId, inning });
        setModalOpen(true);
    };

    const handleInningChange = () => {
        if (activeTeam === 'visitor') {
            setActiveTeam('home');
        } else {
            setActiveTeam('visitor');
            setGame(prev => ({ ...prev, currentInning: prev.currentInning + 1 }));
        }
    };

    // Helper to determine if result is Out
    const isOut = (result: InningResult): boolean => {
        return ['振', '投ゴ', '捕ゴ', '一ゴ', '二ゴ', '三ゴ', '遊ゴ',
            '投飛', '捕飛', '一飛', '二飛', '三飛', '遊飛',
            '左飛', '中飛', '右飛', '犠飛', '犠打'].includes(result);
    };

    // Get Runners for current inning (excluding current selected player)
    const getRunners = (inning: string, excludePlayerId: string) => {
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

        // --- 3-Out Check Logic (Moved outside setGame to avoid double-trigger) ---
        const strictOuts = ['振', '投ゴ', '捕ゴ', '一ゴ', '二ゴ', '三ゴ', '遊ゴ',
            '投飛', '捕飛', '一飛', '二飛', '三飛', '遊飛',
            '左飛', '中飛', '右飛', '犠打', '犠飛'];

        if (strictOuts.includes(result)) {
            const currentScores = activeTeam === 'visitor' ? game.scores.visitor : game.scores.home;
            // Calculate outs BEFORE this new input for the current base inning
            const inningPrefix = inning.split('-')[0];
            const currentOuts = currentScores
                .flatMap(s => Object.entries(s.inningResults)
                    .filter(([k]) => k === inningPrefix || k.startsWith(`${inningPrefix}-`))
                    .map(([_, r]) => r)
                )
                .filter(r => r && strictOuts.includes(r)).length;

            // Check if this new input makes it 3 outs
            // Note: We should check if we are overwriting an existing out? 
            // If we overwrite "Strikeout" with "Strikeout", count doesn't change.
            // But usually we just add. For simplicity, we assume adding or updating non-out to out.
            const isOverwriteOut = (() => {
                const s = currentScores.find(s => s.playerId === playerId);
                const oldRes = s?.inningResults[inning];
                return oldRes && strictOuts.includes(oldRes);
            })();

            if (!isOverwriteOut && currentOuts + 1 >= 3) {
                setTimeout(() => {
                    if (window.confirm('3アウトです。チェンジしますか？\n(OK: 攻守交替/次へ, Cancel: そのまま)')) {
                        handleInningChange();
                    }
                }, 300); // 300ms delay to allow UI to update first (e.g. show the Out in cell)
            }
        }
        // -----------------------------------------------------------------------

        setGame(prev => {
            // ... (existing update logic wrapper is complex, let's just insert checking logic in the setState callback or after)
            // The previous logic was modifying `scores` which is local scope in the callback. 
            // We need to return the new state. 
            // To implement the alert, we need to know the *result* of the new state. 
            // But we can't do async "confirm" inside setGame.

            // Workaround: Use a separate useEffect to check for 3 outs? No, that triggers on load too.
            // Best way: Calculate outs *before* setGame? No, we need new state.
            // Calculate outs from `prev` + `current input`.

            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]];
            // ... (same update logic as above to get new scores)
            // Let's copy the logic or trust that we can check *after* setGame via a ref or specific effect?

            // Actually, we can check based on "Out" input.
            // (Alert Logic moved outside)

            // Continue with state update...
            let entryIndex = scores.findIndex(s => s.playerId === playerId);
            // ... (rest of logic)
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
            // ...
            // (Copying the rest of the logic from the file view to be safe)
            if (!result) {
                entry.details[inning] = { rbi: 0, isRun: false, stolenBases: 0 };
            } else {
                if (!entry.details[inning]) {
                    entry.details[inning] = { rbi: 0, isRun: false };
                }
                if (!isOutInput && !entry.details[inning].reachedFirst) {
                    if (['安', '二', '三', '本', '四', '死', '敬遠', '失', '野選'].includes(result)) {
                        entry.details[inning].reachedFirst = true;
                    }
                    if (['二', '三', '本'].includes(result)) entry.details[inning].reachedSecond = true;
                    if (['三', '本'].includes(result)) entry.details[inning].reachedThird = true;
                    if (result === '本') entry.details[inning].isRun = true;
                }
            }
            scores[entryIndex] = entry;

            // Auto Advance
            scores.forEach((s, idx) => {
                if (s.playerId === playerId) return;

                // Look only at the current inning turn (the specific column) for auto advance
                const r = s.inningResults[inning];
                const d = s.details[inning];
                if (!r || isOut(r) || d?.isRun) return;

                let base = 0;
                if (d?.reachedThird) base = 3;
                else if (d?.reachedSecond) base = 2;
                else if (d?.reachedFirst) base = 1;

                if (base === 0) return;

                let advance = 0;
                if (['安', '四', '死', '敬遠'].includes(result)) advance = 1;
                if (result === '二') advance = 2;
                if (result === '三') advance = 3;
                if (result === '本') advance = 4;
                if (['四', '死', '敬遠'].includes(result)) {
                    // Force advance only if on 1st, or forced by runners behind (not deeply implemented yet, basic logic)
                    if (base === 1) advance = 1;
                    else advance = 0;
                }

                if (advance > 0) {
                    const newBase = base + advance;
                    let newDetails = { ...scores[idx].details[inning] };
                    if (newBase >= 2) newDetails.reachedSecond = true;
                    if (newBase >= 3) newDetails.reachedThird = true;
                    if (newBase >= 4) newDetails.isRun = true;
                    scores[idx] = { ...scores[idx], details: { ...scores[idx].details, [inning]: newDetails } };
                }
            });

            return {
                ...prev,
                scores: { ...prev.scores, [teamKey]: scores }
            };
        });
        setModalOpen(false);
    };

    const handleRunnerAdvance = (playerId: string, base: 1 | 2 | 3 | 4, isSteal: boolean = false) => {
        // Advance base
        if (base === 4) toggleRun(playerId, selectedCell?.inning || '1');
        else toggleBase(playerId, selectedCell?.inning || '1', base as any);

        // Helper for Steal Count:
        if (isSteal) {
            setGame(prev => {
                const teamKey = activeTeam;
                const scores = [...prev.scores[teamKey]];
                const entryIndex = scores.findIndex(s => s.playerId === playerId);
                if (entryIndex === -1) return prev;

                const entry = { ...scores[entryIndex] };
                const inning = selectedCell?.inning || '1';
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
    const toggleRun = (playerId: string, inning: string) => {
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

    const toggleBase = (playerId: string, inning: string, base: 1 | 2 | 3) => {
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

    const handlePositionChange = (index: number, newPosition: string) => {
        setGame(prev => {
            const isVisitor = activeTeam === 'visitor';
            const lineup = [...(isVisitor ? prev.visitorLineup : prev.homeLineup)];

            // Auto-swap logic for 1-9 (DH can be multiple theoretically, but standard baseball has 1 DH. 
            // We'll apply swap logic only to 1-9 to be safe and match user request).
            if (newPosition >= '1' && newPosition <= '9') {
                const existingIndex = lineup.findIndex((p, i) => i !== index && p.position === newPosition);
                if (existingIndex !== -1) {
                    // Swap: The other player gets the current player's old position
                    const currentOldPosition = lineup[index].position;
                    lineup[existingIndex] = { ...lineup[existingIndex], position: currentOldPosition };
                }
            }

            lineup[index] = { ...lineup[index], position: newPosition };

            return {
                ...prev,
                [isVisitor ? 'visitorLineup' : 'homeLineup']: lineup
            };
        });
    };

    const handleAddBattingAroundColumn = (inningNum: string) => {
        // Find the next turn number for this inning
        let maxTurn = 1;
        currentScores.forEach(s => {
            Object.keys(s.inningResults).forEach(key => {
                const parts = key.split('-');
                if (parts[0] === inningNum && parts.length > 1) {
                    const turn = parseInt(parts[1]);
                    if (turn > maxTurn) maxTurn = turn;
                }
            });
        });
        const nextTurn = maxTurn + 1;
        const newKey = `${inningNum}-${nextTurn}`;

        // To force the column to appear, we define it in the first player's record (or anyone's).
        // It will be drawn for everyone once it exists in the data.
        setGame(prev => {
            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]];

            // Just attach an empty string to the first player in the lineup to force rendering.
            // If the player doesn't have an entry yet, create one.
            const firstPlayerId = currentLineup[0].id;
            let entryIndex = scores.findIndex(s => s.playerId === firstPlayerId);

            if (entryIndex === -1) {
                scores.push({
                    playerId: firstPlayerId,
                    inningResults: { [newKey]: '' },
                    details: {}
                });
            } else {
                const entry = { ...scores[entryIndex] };
                entry.inningResults = { ...entry.inningResults, [newKey]: '' };
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

    const handleRemoveBattingAroundColumn = (inningNum: string, turn: number) => {
        const targetKey = `${inningNum}-${turn}`;

        // Safety check: is there any data besides empty strings?
        let hasData = false;
        currentScores.forEach(s => {
            if (s.inningResults[targetKey] && (s.inningResults[targetKey] as string) !== '') hasData = true;
            if (s.details[targetKey] && Object.keys(s.details[targetKey]).length > 0) hasData = true;
        });

        if (hasData) {
            if (!window.confirm(`この列（${inningNum}回${turn > 1 ? `-${turn}` : ''}）にはデータが入力されています。本当に削除しますか？`)) {
                return;
            }
        }

        setGame(prev => {
            const teamKey = activeTeam;
            const scores = [...prev.scores[teamKey]].map(s => {
                const newInningResults = { ...s.inningResults };
                delete newInningResults[targetKey];

                const newDetails = { ...s.details };
                delete newDetails[targetKey];

                return { ...s, inningResults: newInningResults, details: newDetails };
            });

            return {
                ...prev,
                scores: {
                    ...prev.scores,
                    [teamKey]: scores
                }
            };
        });
    };

    const handleAddBatter = () => {
        setGame(prev => {
            const teamKey = activeTeam === 'visitor' ? 'visitorLineup' : 'homeLineup';
            const lineup = [...prev[teamKey]];
            lineup.push({
                id: `${activeTeam}-${crypto.randomUUID()}`,
                name: '',
                number: '',
                order: lineup.length + 1
            });
            return { ...prev, [teamKey]: lineup };
        });
    };

    const handleRemoveBatter = () => {
        setGame(prev => {
            const teamLineupKey = activeTeam === 'visitor' ? 'visitorLineup' : 'homeLineup';
            const teamScoresKey = activeTeam;
            const lineup = [...prev[teamLineupKey]];
            if (lineup.length <= 9) {
                alert('基本ルールの9人を下回ることはできません。');
                return prev;
            }

            const lastPlayer = lineup[lineup.length - 1];

            // Check if the last player has data
            const scores = prev.scores[teamScoresKey];
            const entry = scores.find(s => s.playerId === lastPlayer.id);
            let hasData = false;
            if (entry) {
                if (Object.values(entry.inningResults).some(v => v !== '')) hasData = true;
                if (Object.values(entry.details).some((d: any) => Object.keys(d).length > 0)) hasData = true;
            }

            if (hasData) {
                if (!window.confirm(`打順 ${lineup.length} 番の選手にはデータが入力されています。本当に削除しますか？`)) {
                    return prev;
                }
            }

            lineup.pop();
            return { ...prev, [teamLineupKey]: lineup };
        });
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

    // 1. Find the maximum base inning (at least 7, or manualMaxInning, or max data inning)
    const maxDataInning = Math.max(
        0,
        ...game.scores.visitor.flatMap(s => Object.keys(s.inningResults).map(k => parseInt(k.split('-')[0]) || 0)),
        ...game.scores.home.flatMap(s => Object.keys(s.inningResults).map(k => parseInt(k.split('-')[0]) || 0))
    );
    const maxBaseInning = Math.max(7, manualMaxInning, game.currentInning, maxDataInning);

    // Sync manualMaxInning with data to prevent it from going backwards
    useEffect(() => {
        if (maxDataInning > manualMaxInning) {
            setManualMaxInning(maxDataInning);
        }
        if (game.currentInning > manualMaxInning) {
            setManualMaxInning(game.currentInning);
        }
    }, [maxDataInning, game.currentInning, manualMaxInning]);

    // 2. Determine how many columns each base inning needs
    // For each inning 1..maxBaseInning, we check if any 'X-2', 'X-3' exists in data
    const columnKeys: string[] = [];
    for (let i = 1; i <= maxBaseInning; i++) {
        columnKeys.push(`${i}`); // Always have the base column

        // Find max turn for this inning in the data
        let maxTurn = 1;
        currentScores.forEach(s => {
            Object.keys(s.inningResults).forEach(key => {
                const parts = key.split('-');
                if (parseInt(parts[0]) === i && parts.length > 1) {
                    const turn = parseInt(parts[1]);
                    if (turn > maxTurn) maxTurn = turn;
                }
            });
        });

        // Add extra columns if maxTurn > 1
        for (let t = 2; t <= maxTurn; t++) {
            columnKeys.push(`${i}-${t}`);
        }
    }

    // Calculate Current Outs (for game.currentInning)
    // To do this accurately with batting around, we need to count outs in ALL columns for the current inning.
    const currentInningPrefix = `${game.currentInning}`;
    const currentOuts = currentScores.flatMap(s =>
        Object.entries(s.inningResults)
            .filter(([key]) => key === currentInningPrefix || key.startsWith(`${currentInningPrefix}-`))
            .map(([_, res]) => res)
    ).filter(r => r && isOut(r)).length;

    // Check for 3 Outs - handled inside handleInput to avoid spam/double-triggers during state re-renders


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
                        className="flex-1 flex items-center hover:bg-blue-800 rounded p-1 -ml-1 text-left"
                    >
                        <div className="flex flex-col flex-1">
                            <div className="text-xs opacity-80 flex items-center gap-2 flex-wrap">
                                <span>
                                    {game.date ? (() => {
                                        const d = new Date(game.date);
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
                        </div>

                        {/* Umpire Info Display - Right Side */}
                        {(game.umpires?.main || game.umpires?.base1) && (
                            <div className="flex items-center ml-2 border-l border-white/30 pl-3 py-1">
                                <div className="flex flex-col justify-center text-sm opacity-90">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <User size={14} />
                                        <span className="font-bold">主審: {game.umpires.main || '-'}</span>
                                    </div>
                                    {(game.umpires.base1 || game.umpires.base2 || game.umpires.base3) && (
                                        <div className="flex gap-2 text-xs opacity-90">
                                            <span>一: {game.umpires.base1 || '-'}</span>
                                            <span>二: {game.umpires.base2 || '-'}</span>
                                            <span>三: {game.umpires.base3 || '-'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </button>
                </div>

                {/* Out Count (Just Display) */}
                <div className="flex items-center space-x-4 shrink-0 bg-black/20 rounded px-2 py-1 ml-2">
                    {/* Removed "X回表/裏" display as per request */}
                    <div className="flex space-x-1">
                        <span className={clsx("w-4 h-4 rounded-full border border-white", (currentOuts % 3) >= 1 ? "bg-red-500 border-red-500" : "bg-transparent")}></span>
                        <span className={clsx("w-4 h-4 rounded-full border border-white", (currentOuts % 3) >= 2 ? "bg-red-500 border-red-500" : "bg-transparent")}></span>
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
                        <div className="w-12 p-1 text-center border-r border-gray-300 sticky left-10 bg-gray-100 z-50 text-[10px] sm:text-xs flex flex-col items-center justify-center leading-tight">
                            <span>守備</span>
                            <span>位置</span>
                        </div>
                        <div className="w-28 p-2 text-center border-r border-gray-300 sticky left-[5.5rem] bg-gray-100 z-50">氏名</div>
                        {columnKeys.map(key => {
                            const parts = key.split('-');
                            const inningNum = parts[0];
                            const turn = parts.length > 1 ? parseInt(parts[1]) : 1;

                            // Determine if this is the last column for this specific inning
                            const isLastTurnForInning = !columnKeys.includes(`${inningNum}-${turn + 1}`);

                            return (
                                <div key={key} className="w-16 p-1 text-center border-r border-gray-300 min-w-[4rem] relative flex flex-col items-center justify-center">
                                    <span>{inningNum}回{turn > 1 ? `-${turn}` : ''}</span>
                                    {isLastTurnForInning && (
                                        <div className="absolute top-0 right-0 flex shadow-sm">
                                            {turn > 1 && (
                                                <button
                                                    onClick={() => handleRemoveBattingAroundColumn(inningNum, turn)}
                                                    className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-l opacity-50 hover:opacity-100 border-r border-red-200 leading-none"
                                                    title="列を削除"
                                                >
                                                    -
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAddBattingAroundColumn(inningNum)}
                                                className={clsx("text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 opacity-50 hover:opacity-100 leading-none", turn > 1 ? "rounded-r" : "rounded-bl")}
                                                title="打者一巡（列を追加）"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {/* Explicit Add Inning Button */}
                        <div className="w-8 p-0 text-center border-r border-gray-300 min-w-[2rem] flex flex-col items-center justify-center bg-gray-200">
                            <button
                                onClick={() => setManualMaxInning(prev => prev + 1)}
                                className="text-gray-600 hover:text-black font-bold text-lg w-full flex-1 hover:bg-gray-300 transition-colors flex items-center justify-center leading-none"
                                title="イニングを追加"
                            >
                                +
                            </button>
                            {manualMaxInning > Math.max(7, maxDataInning, game.currentInning) && (
                                <button
                                    onClick={() => setManualMaxInning(prev => Math.max(7, prev - 1))}
                                    className="text-gray-600 hover:text-black font-bold text-lg w-full flex-1 hover:bg-gray-300 transition-colors flex items-center justify-center leading-none border-t border-gray-300"
                                    title="不要なイニングを削除"
                                >
                                    -
                                </button>
                            )}
                        </div>
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
                                <div className="w-12 border-r border-gray-300 bg-white sticky left-10 z-30 flex items-center justify-center p-1">
                                    <select
                                        className="w-full h-full text-center text-sm font-bold border rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        value={player.position || ''}
                                        onChange={(e) => handlePositionChange(index, e.target.value)}
                                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', textIndent: '1px', textOverflow: '' }} // Hack to center text in select
                                    >
                                        <option value="">-</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                        <option value="6">6</option>
                                        <option value="7">7</option>
                                        <option value="8">8</option>
                                        <option value="9">9</option>
                                        <option value="DH">DH</option>
                                    </select>
                                </div>
                                <div
                                    className="w-28 p-2 border-r border-gray-300 bg-white sticky left-[5.5rem] z-30 flex flex-col justify-center overflow-hidden cursor-pointer hover:bg-gray-50"
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
                                {columnKeys.map(key => {
                                    const result = entry?.inningResults[key] || '';
                                    const details = entry?.details[key];
                                    const isRun = details?.isRun;

                                    return (
                                        <div
                                            key={key}
                                            className="w-16 h-full border-r border-gray-300 min-w-[4rem] relative flex items-center justify-center p-1"
                                        >
                                            <ScorebookCell
                                                result={result}
                                                isRun={isRun}
                                                reachedFirst={details?.reachedFirst}
                                                reachedSecond={details?.reachedSecond}
                                                reachedThird={details?.reachedThird}
                                                // Convert string key to base inning number for UI logic if needed, 
                                                // but pass the exact key to handler to save correctly.
                                                // Note: handleCellClick currently takes a number. It needs to take a string now.
                                                onClick={() => handleCellClick(player.id, key)}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Empty separator for the Add Inning button column */}
                                <div className="w-8 border-r border-gray-300 min-w-[2rem] bg-gray-50"></div>

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

                    {/* Add/Remove Batter Controls */}
                    <div className="flex border-b border-gray-300 h-12 items-center bg-gray-100">
                        <div className="w-10 flex flex-col h-full border-r border-gray-300 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <button
                                onClick={handleAddBatter}
                                className="flex-1 bg-blue-100 text-blue-600 font-bold hover:bg-blue-200 flex items-center justify-center border-b border-blue-200"
                                title="打席を追加 (10人打ちなど)"
                            >
                                +
                            </button>
                            <button
                                onClick={handleRemoveBatter}
                                className={clsx("flex-1 font-bold flex items-center justify-center", currentLineup.length > 9 ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-gray-200 text-gray-400 cursor-not-allowed")}
                                title={currentLineup.length > 9 ? "最後の打席を削除" : "9人を下回ることはできません"}
                            >
                                -
                            </button>
                        </div>
                        <div className="px-2 w-12 sticky left-10 z-30 bg-gray-100 h-full border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] flex items-center justify-center">
                            <span className="text-[10px] text-gray-500 font-bold text-center leading-tight tracking-tighter">打順追加<br />／削除</span>
                        </div>
                        <div className="flex-1 h-full bg-gray-100"></div>
                    </div>
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
                                {Array.from({ length: Math.max(4, game.pitcherRecords?.[activeTeam]?.length || 4) }).map((_, idx) => {
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

                        {/* Add/Remove Pitcher Controls */}
                        <div className="flex border-t border-gray-300">
                            <button
                                onClick={() => {
                                    setGame(prev => {
                                        const teamKey = activeTeam;
                                        const newRecords = [...(prev.pitcherRecords?.[teamKey] || [])];
                                        // Ensure we pad up to the current visible rows before adding a new one
                                        const currentLen = Math.max(4, newRecords.length);
                                        while (newRecords.length < currentLen) newRecords.push({ id: '', name: '', innings: '', er: 0, result: '' });
                                        newRecords.push({ id: '', name: '', innings: '', er: 0, result: '' });
                                        return {
                                            ...prev,
                                            pitcherRecords: { ...prev.pitcherRecords, [teamKey]: newRecords }
                                        };
                                    });
                                }}
                                className="flex-1 p-1 bg-blue-100 text-blue-600 font-bold hover:bg-blue-200 border-r border-gray-300"
                                title="投手を追加"
                            >
                                +
                            </button>
                            <button
                                onClick={() => {
                                    setGame(prev => {
                                        const teamKey = activeTeam;
                                        const newRecords = [...(prev.pitcherRecords?.[teamKey] || [])];
                                        const currentVisibleLen = Math.max(4, newRecords.length);

                                        if (currentVisibleLen <= 4) {
                                            alert('基本の4枠を下回ることはできません。');
                                            return prev;
                                        }

                                        const lastEntry = newRecords[newRecords.length - 1];
                                        if (lastEntry && (lastEntry.name || lastEntry.innings || lastEntry.er > 0 || lastEntry.result)) {
                                            if (!window.confirm('最後の投手の記録が入力されています。本当に削除しますか？')) {
                                                return prev;
                                            }
                                        }

                                        newRecords.pop();
                                        return {
                                            ...prev,
                                            pitcherRecords: { ...prev.pitcherRecords, [teamKey]: newRecords }
                                        };
                                    });
                                }}
                                className={clsx("flex-1 p-1 font-bold",
                                    Math.max(4, game.pitcherRecords?.[activeTeam]?.length || 4) > 4
                                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed")}
                                title={Math.max(4, game.pitcherRecords?.[activeTeam]?.length || 4) > 4 ? "最後の投手を削除" : "4枠以下にはできません"}
                            >
                                -
                            </button>
                        </div>
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
