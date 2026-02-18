import React, { useState, useEffect } from 'react';
import { loadGames, deleteGame } from '../utils/storage';
import type { Game } from '../types';
import { PlayCircle, Trash2, ArrowLeft, Calendar } from 'lucide-react';

interface Props {
    onSelectGame: (game: Game) => void;
    onBack: () => void;
}

export const GameList: React.FC<Props> = ({ onSelectGame, onBack }) => {
    const [games, setGames] = useState<Game[]>([]);

    useEffect(() => {
        loadGamesData();
    }, []);

    const loadGamesData = () => {
        const loadedGames = loadGames();
        // Sort by date descending
        loadedGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setGames(loadedGames);
    };

    const handleDelete = (e: React.MouseEvent, gameId: string) => {
        e.stopPropagation();
        if (confirm('この試合記録を削除してもよろしいですか？')) {
            deleteGame(gameId);
            loadGamesData();
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 min-h-screen bg-gray-100">
            <div className="flex items-center mb-6">
                <button
                    onClick={onBack}
                    className="p-2 mr-2 bg-white rounded-full shadow hover:bg-gray-50"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">試合履歴</h1>
            </div>

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
                            onClick={() => onSelectGame(game)}
                            className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center text-gray-600 text-sm font-medium">
                                    <Calendar size={16} className="mr-1" />
                                    {game.date}
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, game.id)}
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="削除"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-lg font-bold">
                                <div className="flex-1 text-center">
                                    {game.teams.visitor.name}
                                </div>
                                <div className="px-3 text-gray-400">vs</div>
                                <div className="flex-1 text-center">
                                    {game.teams.home.name}
                                </div>
                            </div>

                            <div className="mt-2 text-center text-sm text-blue-600 font-bold flex items-center justify-center">
                                <PlayCircle size={16} className="mr-1" />
                                再開する
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
