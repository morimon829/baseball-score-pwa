import React, { useRef, useState } from 'react';
import { loadTeams, saveTeams, loadGames } from '../utils/storage';
import { ArrowLeft, Download, Upload, FileJson, FileText, AlertTriangle } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const DataManager: React.FC<Props> = ({ onBack }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleBackup = () => {
        const teams = loadTeams();
        const games = loadGames();
        const data = { teams, games, version: '1.0' };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baseball_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'バックアップファイルをダウンロードしました' });
    };

    const handleExportCSV = () => {
        const teams = loadTeams();
        let csvContent = "";

        teams.forEach(team => {
            team.players.forEach(player => {
                csvContent += `${team.name},${player.number || ''},${player.name}\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `players_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: '選手データをCSVとしてエクスポートしました' });
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();

        try {
            if (file.name.endsWith('.json')) {
                // JSON Restore
                const data = JSON.parse(text);
                if (!data.teams || !data.games) throw new Error('Invalid backup format');

                if (confirm('現在のデータをすべて上書きして復元しますか？\nこの操作は取り消せません。')) {
                    saveTeams(data.teams);
                    // Clear existing games and save imported ones
                    localStorage.setItem('baseball_score_pwa_games', JSON.stringify(data.games));
                    setMessage({ type: 'success', text: 'データの復元が完了しました' });
                }
            } else if (file.name.endsWith('.csv')) {
                // CSV Import
                const lines = text.split(/\r\n|\n/);
                const teams = loadTeams();
                let importedCount = 0;

                lines.forEach(line => {
                    const [teamName, number, playerName] = line.split(',').map(s => s.trim());
                    if (!teamName || !playerName) return;

                    let team = teams.find(t => t.name === teamName);
                    if (!team) {
                        team = { id: crypto.randomUUID(), name: teamName, players: [] };
                        teams.push(team);
                    }

                    // Check duplicate player
                    if (!team.players.some(p => p.name === playerName && p.number === number)) {
                        team.players.push({
                            id: crypto.randomUUID(),
                            name: playerName,
                            number: number || ''
                        });
                        importedCount++;
                    }
                });

                if (importedCount > 0) {
                    saveTeams(teams);
                    setMessage({ type: 'success', text: `${importedCount}件の選手データをインポートしました` });
                } else {
                    setMessage({ type: 'error', text: 'インポートできるデータがありませんでした' });
                }
            } else {
                setMessage({ type: 'error', text: '非対応のファイル形式です (.json, .csv)' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'ファイルの読み込みに失敗しました' });
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                <h1 className="text-xl font-bold">データ管理</h1>
            </div>

            <div className="space-y-6">
                {/* Backup / Restore */}
                <div className="bg-white p-6 rounded-xl shadow space-y-4">
                    <h2 className="font-bold flex items-center text-lg border-b pb-2">
                        <FileJson className="mr-2 text-blue-600" /> バックアップと復元
                    </h2>
                    <p className="text-sm text-gray-500">
                        すべてのデータ（チーム・選手・試合記録）をJSONファイルとして保存・復元します。
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleBackup}
                            className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200"
                        >
                            <Download className="mb-2" />
                            バックアップ
                        </button>
                        <button
                            onClick={handleRestoreClick}
                            className="flex flex-col items-center justify-center p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 border border-orange-200"
                        >
                            <Upload className="mb-2" />
                            復元 (JSON)
                        </button>
                    </div>
                </div>

                {/* CSV Import */}
                <div className="bg-white p-6 rounded-xl shadow space-y-4">
                    <h2 className="font-bold flex items-center text-lg border-b pb-2">
                        <FileText className="mr-2 text-green-600" /> 選手一括登録
                    </h2>
                    <p className="text-sm text-gray-500">
                        CSVファイルから選手を一括登録します。<br />
                        形式: <code>チーム名, 背番号, 氏名</code>
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleRestoreClick}
                            className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 font-bold"
                        >
                            <Download className="mr-2" /> CSVインポート
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center justify-center p-4 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 border border-teal-200 font-bold"
                        >
                            <Upload className="mr-2" /> CSVエクスポート
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg flex items-start ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'error' && <AlertTriangle className="mr-2 shrink-0" size={20} />}
                        {message.text}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json,.csv"
                onChange={handleFileChange}
            />
        </div>
    );
};
