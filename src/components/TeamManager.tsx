import React, { useState, useEffect } from 'react';
import type { Team, Player } from '../types';
import { loadTeams, saveTeams } from '../utils/storage';
import { Plus, Trash2, UserPlus, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { JerseyNumber } from './JerseyNumber';

interface Props {
    onBack: () => void;
}

export const TeamManager: React.FC<Props> = ({ onBack }) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null);
    const [tempTeamName, setTempTeamName] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState('');

    useEffect(() => {
        setTeams(loadTeams());
    }, []);

    const handleSaveTeams = (updatedTeams: Team[]) => {
        setTeams(updatedTeams);
        saveTeams(updatedTeams);
    };

    const startRenaming = (team: Team) => {
        setRenamingTeamId(team.id);
        setTempTeamName(team.name);
    };

    const saveTeamName = () => {
        if (!renamingTeamId || !tempTeamName.trim()) return;
        const updatedTeams = teams.map(t =>
            t.id === renamingTeamId ? { ...t, name: tempTeamName } : t
        );
        handleSaveTeams(updatedTeams);
        setRenamingTeamId(null);
        setTempTeamName('');
    };

    const cancelRenaming = () => {
        setRenamingTeamId(null);
        setTempTeamName('');
    };

    const addTeam = () => {
        if (!newTeamName.trim()) return;
        const newTeam: Team = {
            id: crypto.randomUUID(),
            name: newTeamName,
            players: []
        };
        handleSaveTeams([...teams, newTeam]);
        setNewTeamName('');
    };

    const deleteTeam = (id: string) => {
        if (confirm('チームを削除してもよろしいですか？\n登録されている選手データも削除されます。')) {
            handleSaveTeams(teams.filter(t => t.id !== id));
            if (editingTeamId === id) setEditingTeamId(null);
        }
    };

    const addPlayer = (teamId: string) => {
        if (!newPlayerName.trim()) return;
        const updatedTeams = teams.map(team => {
            if (team.id === teamId) {
                const newPlayer: Player = {
                    id: crypto.randomUUID(),
                    name: newPlayerName,
                    number: newPlayerNumber // Optional
                };
                return { ...team, players: [...team.players, newPlayer] };
            }
            return team;
        });
        handleSaveTeams(updatedTeams);
        setNewPlayerName('');
        setNewPlayerNumber('');
    };

    const deletePlayer = (teamId: string, playerId: string) => {
        const updatedTeams = teams.map(team => {
            if (team.id === teamId) {
                return { ...team, players: team.players.filter(p => p.id !== playerId) };
            }
            return team;
        });
        handleSaveTeams(updatedTeams);
    };

    return (
        <div className="p-4 max-w-2xl mx-auto bg-white min-h-screen">
            <div className="flex items-center mb-6 border-b pb-4">
                <button onClick={onBack} className="mr-4 p-2 bg-gray-200 rounded hover:bg-gray-300">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold">チーム・選手管理</h2>
            </div>

            {/* Team List / Selection */}
            {!editingTeamId ? (
                <div className="space-y-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="新しいチーム名"
                            className="flex-1 border p-3 rounded text-lg"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                        />
                        <button
                            onClick={addTeam}
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 flex items-center"
                        >
                            <Plus className="mr-2" /> 追加
                        </button>
                    </div>

                    <div className="space-y-4">
                        {teams.length === 0 && <p className="text-gray-500 text-center py-8">チームが登録されていません</p>}
                        {teams.map(team => (
                            <div key={team.id} className="border p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
                                {renamingTeamId === team.id ? (
                                    <div className="flex items-center gap-2 flex-1 w-full">
                                        <input
                                            type="text"
                                            className="border p-2 rounded flex-1"
                                            value={tempTeamName}
                                            onChange={e => setTempTeamName(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={saveTeamName} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={20} /></button>
                                        <button onClick={cancelRenaming} className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"><X size={20} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-1 w-full justify-between sm:justify-start">
                                        <span className="text-xl font-bold">{team.name}</span>
                                        <button
                                            onClick={() => startRenaming(team)}
                                            className="p-1 text-gray-400 hover:text-blue-600"
                                            title="チーム名を変更"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={() => setEditingTeamId(team.id)}
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm whitespace-nowrap"
                                    >
                                        選手編集 ({team.players.length})
                                    </button>
                                    <button
                                        onClick={() => deleteTeam(team.id)}
                                        className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                                        title="チームを削除"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Player Editing View
                <div>
                    {(() => {
                        const team = teams.find(t => t.id === editingTeamId);
                        if (!team) return null;
                        return (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-blue-50 p-4 rounded text-blue-900">
                                    <h3 className="text-xl font-bold">チーム: {team.name}</h3>
                                    <button onClick={() => setEditingTeamId(null)} className="text-sm underline">一覧に戻る</button>
                                </div>

                                <div className="bg-gray-100 p-4 rounded-lg space-y-3">
                                    <h4 className="font-bold text-lg mb-2 flex items-center"><UserPlus size={20} className="mr-2" /> 選手登録</h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="氏名 (例: 山田)"
                                            className="flex-2 border p-3 rounded text-lg w-full"
                                            value={newPlayerName}
                                            onChange={(e) => setNewPlayerName(e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="背番号"
                                            className="flex-1 border p-3 rounded text-lg w-20"
                                            value={newPlayerNumber}
                                            onChange={(e) => setNewPlayerNumber(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => addPlayer(team.id)}
                                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 flex justify-center items-center"
                                    >
                                        <Plus className="mr-2" /> 選手を追加
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {team.players.length === 0 && <p className="text-gray-500 p-4">選手が登録されていません</p>}
                                    {team.players.map(player => (
                                        <div key={player.id} className="border-b last:border-b-0 p-3 flex justify-between items-center bg-white">
                                            <div className="flex items-center gap-4">
                                                <JerseyNumber number={player.number || '-'} size={36} color="bg-blue-900" />
                                                <span className="text-lg">{player.name}</span>
                                            </div>
                                            <button
                                                onClick={() => deletePlayer(team.id, player.id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
