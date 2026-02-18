import React, { useState, useEffect } from 'react';
import { loadTeams } from '../utils/storage';
import type { Team, Game } from '../types';
import { Users, PlayCircle, Calendar } from 'lucide-react';

interface Props {
    onNavigateTeams: () => void;
    onNavigateHistory?: () => void;
    onStartGame: (game: Game) => void;
}

export const Home: React.FC<Props> = ({ onNavigateTeams, onNavigateHistory, onStartGame }) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [visitorId, setVisitorId] = useState('');
    const [homeId, setHomeId] = useState('');

    useEffect(() => {
        setTeams(loadTeams());
    }, []);

    const handleStart = () => {
        if (!visitorId || !homeId) {
            alert('チームを選択してください');
            return;
        }
        const visitor = teams.find(t => t.id === visitorId)!;
        const home = teams.find(t => t.id === homeId)!;

        const newGame: Game = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            teams: { visitor, home },
            visitorLineup: Array(9).fill(null).map((_, i) => ({ id: `visitor-${crypto.randomUUID()}`, name: '', number: '', order: i + 1 })),
            homeLineup: Array(9).fill(null).map((_, i) => ({ id: `home-${crypto.randomUUID()}`, name: '', number: '', order: i + 1 })),
            scores: { visitor: [], home: [] },
            pitcherRecords: { visitor: [], home: [] },
            currentInning: 1
        };
        onStartGame(newGame);
    };

    return (
        <div className="max-w-md mx-auto p-6 space-y-8 flex flex-col justify-center min-h-screen">
            <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">野球スコアブック</h1>

            <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
                <h2 className="text-xl font-bold flex items-center border-b pb-2 text-gray-700">
                    <PlayCircle className="mr-2" /> 新しい試合
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-600">先攻チーム</label>
                        <select
                            className="w-full p-3 border rounded-lg bg-gray-50 text-xl font-medium"
                            value={visitorId}
                            onChange={(e) => setVisitorId(e.target.value)}
                        >
                            <option value="">選択してください</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="text-center font-bold text-gray-400 text-xl">VS</div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-600">後攻チーム</label>
                        <select
                            className="w-full p-3 border rounded-lg bg-gray-50 text-xl font-medium"
                            value={homeId}
                            onChange={(e) => setHomeId(e.target.value)}
                        >
                            <option value="">選択してください</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-xl shadow hover:bg-blue-700 transition duration-200 mt-4"
                    >
                        試合開始
                    </button>
                </div>
            </div>

            <button
                onClick={onNavigateTeams}
                className="w-full bg-white p-4 rounded-xl shadow border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-50 text-lg"
            >
                <Users className="mr-2" /> チーム・選手管理
            </button>

            <button
                onClick={() => onNavigateHistory?.()}
                className="w-full bg-white p-4 rounded-xl shadow border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-50 text-lg"
            >
                <Calendar className="mr-2" /> 試合履歴
            </button>

            <div className="text-center text-gray-400 text-sm mt-8">
                ver 0.1.0
            </div>
        </div >
    );
};
