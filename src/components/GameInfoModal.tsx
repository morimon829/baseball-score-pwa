import React, { useState } from 'react';
import type { Game, Team } from '../types';
import { X, Clock, MapPin, User } from 'lucide-react';

interface Props {
    game: Game;
    teams: { visitor: Team; home: Team };
    onSave: (updates: Partial<Game>) => void;
    onClose: () => void;
}

export const GameInfoModal: React.FC<Props> = ({ game, teams, onSave, onClose }) => {
    const [date, setDate] = useState(game.date || '');
    const [startTime, setStartTime] = useState(game.startTime || '');
    const [endTime, setEndTime] = useState(game.endTime || '');
    const [location, setLocation] = useState(game.location || '');
    const [umpires, setUmpires] = useState(game.umpires || { main: '', base1: '', base2: '', base3: '' });

    // Helper to get current time in HH:mm format
    const getCurrentTime = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    // Helper to get all players from both teams for selection
    const allPlayers = [
        ...teams.visitor.players.map(p => ({ ...p, teamName: teams.visitor.name })),
        ...teams.home.players.map(p => ({ ...p, teamName: teams.home.name }))
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            date,
            startTime,
            endTime,
            location,
            umpires
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                    <h2 className="text-lg font-bold">試合情報の編集</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Date & Time */}
                    <div className="space-y-4">
                        <h3 className="font-bold flex items-center text-gray-700">
                            <Clock className="mr-2" size={18} /> 日時
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">試合日</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">開始時刻</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setStartTime(getCurrentTime())}
                                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                                            title="現在時刻"
                                        >
                                            <Clock size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">終了時刻</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setEndTime(getCurrentTime())}
                                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                                            title="現在時刻"
                                        >
                                            <Clock size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                        <h3 className="font-bold flex items-center text-gray-700">
                            <MapPin className="mr-2" size={18} /> 球場・場所
                        </h3>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="球場名を入力"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>

                    {/* Umpires */}
                    <div className="space-y-4">
                        <h3 className="font-bold flex items-center text-gray-700">
                            <User className="mr-2" size={18} /> 審判
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">球審 (Main)</label>
                                <select
                                    value={umpires.main}
                                    onChange={(e) => setUmpires({ ...umpires, main: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="">選択なし</option>
                                    <optgroup label="登録選手">
                                        {allPlayers.map(p => (
                                            <option key={`${p.teamName}-${p.id}`} value={p.name}>
                                                {p.name} ({p.teamName})
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="その他">
                                        <option value="審判員">審判員</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">一塁塁審</label>
                                <select
                                    value={umpires.base1}
                                    onChange={(e) => setUmpires({ ...umpires, base1: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="">選択なし</option>
                                    {allPlayers.map(p => (
                                        <option key={`${p.teamName}-${p.id}`} value={p.name}>
                                            {p.name} ({p.teamName})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">二塁塁審</label>
                                <select
                                    value={umpires.base2}
                                    onChange={(e) => setUmpires({ ...umpires, base2: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="">選択なし</option>
                                    {allPlayers.map(p => (
                                        <option key={`${p.teamName}-${p.id}`} value={p.name}>
                                            {p.name} ({p.teamName})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">三塁塁審</label>
                                <select
                                    value={umpires.base3}
                                    onChange={(e) => setUmpires({ ...umpires, base3: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="">選択なし</option>
                                    {allPlayers.map(p => (
                                        <option key={`${p.teamName}-${p.id}`} value={p.name}>
                                            {p.name} ({p.teamName})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow"
                        >
                            保存する
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
