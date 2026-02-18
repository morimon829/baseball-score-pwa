import React, { useState, useEffect } from 'react';
import type { Game, Team } from '../types';
import { X, Clock, MapPin, User } from 'lucide-react';
import { loadTeams } from '../utils/storage';

interface Props {
    game: Game;
    onSave: (updates: Partial<Game>) => void;
    onClose: () => void;
}

export const GameInfoModal: React.FC<Props> = ({ game, onSave, onClose }) => {
    const [date, setDate] = useState(game.date || '');
    const [startTime, setStartTime] = useState(game.startTime || '');
    const [endTime, setEndTime] = useState(game.endTime || '');
    const [location, setLocation] = useState(game.location || '松戸第六中学校グラウンド');
    const [umpires, setUmpires] = useState(game.umpires || { main: '', base1: '', base2: '', base3: '' });

    const [allTeams, setAllTeams] = useState<Team[]>([]);

    useEffect(() => {
        setAllTeams(loadTeams());
    }, []);

    // Helper to get current time in HH:mm format
    const getCurrentTime = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

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

    const UmpireSelect = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
        // Find initial team based on player name if possible, or default to ""
        const initialTeamId = allTeams.find(t => t.players.some(p => p.name === value))?.id || "";
        const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);

        // If value changes externally (e.g. reset), update team selection? 
        // For now, valid to keep as is.
        // But if we open modal with existing value, we want team selected.
        useEffect(() => {
            const foundTeam = allTeams.find(t => t.players.some(p => p.name === value));
            if (foundTeam) setSelectedTeamId(foundTeam.id);
        }, [value]);

        const filteredPlayers = selectedTeamId
            ? allTeams.find(t => t.id === selectedTeamId)?.players || []
            : [];

        return (
            <div>
                <label className="block text-sm text-gray-500 mb-1">{label}</label>
                <div className="space-y-2">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => {
                            setSelectedTeamId(e.target.value);
                            onChange(""); // Reset player when team changes
                        }}
                        className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                    >
                        <option value="">チームを選択...</option>
                        {allTeams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                        <option value="other">その他</option>
                    </select>

                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        disabled={!selectedTeamId}
                    >
                        <option value="">
                            {selectedTeamId === 'other' ? '審判員を選択' : '選手を選択'}
                        </option>
                        {selectedTeamId === 'other' ? (
                            <option value="審判員">審判員</option>
                        ) : (
                            filteredPlayers.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))
                        )}
                    </select>
                </div>
            </div>
        );
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
                            <UmpireSelect
                                label="球審 (Main)"
                                value={umpires.main}
                                onChange={(val) => setUmpires({ ...umpires, main: val })}
                            />
                            <UmpireSelect
                                label="一塁塁審"
                                value={umpires.base1}
                                onChange={(val) => setUmpires({ ...umpires, base1: val })}
                            />
                            <UmpireSelect
                                label="二塁塁審"
                                value={umpires.base2}
                                onChange={(val) => setUmpires({ ...umpires, base2: val })}
                            />
                            <UmpireSelect
                                label="三塁塁審"
                                value={umpires.base3}
                                onChange={(val) => setUmpires({ ...umpires, base3: val })}
                            />
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
