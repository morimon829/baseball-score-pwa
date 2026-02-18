import React, { useState, useEffect } from 'react';
import { loadGames, deleteGame, deleteGames } from '../utils/storage';
import type { Game } from '../types';
import { PlayCircle, Trash2, ArrowLeft, Calendar } from 'lucide-react';

interface Props {
    onSelectGame: (game: Game) => void;
    onBack: () => void;
}

export const GameList: React.FC<Props> = ({ onSelectGame, onBack }) => {
    const [games, setGames] = useState<Game[]>([]);
    const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        loadGamesData();
    }, []);

    const loadGamesData = () => {
        const loadedGames = loadGames();
        // Sort by date descending
        loadedGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setGames(loadedGames);
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedGameIds(new Set());
    };

    const toggleSelectGame = (e: React.MouseEvent, gameId: string) => {
        e.stopPropagation();
        const newSelected = new Set(selectedGameIds);
        if (newSelected.has(gameId)) {
            newSelected.delete(gameId);
        } else {
            newSelected.add(gameId);
        }
        setSelectedGameIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedGameIds.size === games.length) {
            setSelectedGameIds(new Set());
        } else {
            setSelectedGameIds(new Set(games.map(g => g.id)));
        }
    };

    const handleBulkDelete = () => {
        if (selectedGameIds.size === 0) return;
        if (confirm(`${selectedGameIds.size}件の試合記録を削除してもよろしいですか？`)) {
            deleteGames(Array.from(selectedGameIds));
            setSelectedGameIds(new Set());
            setIsSelectionMode(false);
            loadGamesData();
        }
    };

    const handleDelete = (e: React.MouseEvent, gameId: string) => {
        e.stopPropagation();
        if (confirm('この試合記録を削除してもよろしいですか？')) {
            deleteGame(gameId);
            loadGamesData();
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 min-h-screen bg-gray-100 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="p-2 mr-2 bg-white rounded-full shadow hover:bg-gray-50"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold">試合履歴</h1>
                </div>
                {games.length > 0 && (
                    <button
                        onClick={toggleSelectionMode}
                        className={`text-sm font-bold px-3 py-1 rounded ${isSelectionMode ? 'bg-gray-200 text-gray-800' : 'text-blue-600 hover:bg-blue-50'}`}
                    >
                        {isSelectionMode ? '完了' : '選択'}
                    </button>
                )}
            </div>

            {isSelectionMode && (
                <div className="bg-white p-3 rounded-lg shadow mb-4 flex justify-between items-center sticky top-2 z-10 opacity-95">
                    <label className="flex items-center font-bold text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-5 h-5 mr-2"
                            checked={selectedGameIds.size === games.length && games.length > 0}
                            onChange={toggleSelectAll}
                        />
                        すべて選択
                    </label>
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedGameIds.size === 0}
                        className={`flex items-center px-3 py-1 rounded font-bold ${selectedGameIds.size > 0 ? 'bg-red-500 text-white shadow' : 'bg-gray-100 text-gray-400'}`}
                    >
                        <Trash2 size={16} className="mr-1" />
                        削除 ({selectedGameIds.size})
                    </button>
                </div>
            )}

            {games.length === 0 ? (
                <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow p-8">
                    <p className="mb-4">保存されている試合記録はありません。</p>
                    <p className="text-sm">ホーム画面から新しい試合を開始してください。</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {games.map(game => (
                        <div
                            key={game.id}
                            onClick={(e) => isSelectionMode ? toggleSelectGame(e, game.id) : onSelectGame(game)}
                            className={`bg-white p-4 rounded-xl shadow transition-all cursor-pointer border ${selectedGameIds.has(game.id) ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:shadow-md'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center text-gray-600 text-sm font-medium">
                                    {isSelectionMode && (
                                        <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${selectedGameIds.has(game.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                            {selectedGameIds.has(game.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    )}
                                    <Calendar size={16} className="mr-1" />
                                    {game.date}
                                </div>
                                {!isSelectionMode && (
                                    <button
                                        onClick={(e) => handleDelete(e, game.id)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="削除"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-lg font-bold pl-8">
                                <div className="flex-1 text-center">
                                    {game.teams.visitor.name}
                                </div>
                                <div className="px-3 text-gray-400">vs</div>
                                <div className="flex-1 text-center">
                                    {game.teams.home.name}
                                </div>
                            </div>

                            {!isSelectionMode && (
                                <div className="mt-2 text-center text-sm text-blue-600 font-bold flex items-center justify-center">
                                    <PlayCircle size={16} className="mr-1" />
                                    再開する
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
