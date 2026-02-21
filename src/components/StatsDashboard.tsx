import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Calendar } from 'lucide-react';
import { loadGames, loadTeams } from '../utils/storage';
import { calculateBattingStats, calculatePitchingStats } from '../utils/statsCalculator';
import type { Game, Team } from '../types';
import { PlayerStatsDetail } from './PlayerStatsDetail';

interface Props {
    onBack: () => void;
}

export const StatsDashboard: React.FC<Props> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'batting' | 'pitching'>('batting');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
    const [filterPeriod, setFilterPeriod] = useState<'all' | 'year' | 'custom'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
    // Custom range
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
        start: `${new Date().getFullYear()}-01-01`,
        end: `${new Date().getFullYear()}-12-31`
    });

    const [games, setGames] = useState<Game[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<{ id: string, name: string } | null>(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'average', direction: 'desc' });

    useEffect(() => {
        const loadedGames = loadGames();
        setGames(loadedGames);
        setTeams(loadTeams());

        // Extract unique years from games
        const years = Array.from(new Set(loadedGames.map(g => {
            const d = new Date(g.date);
            return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
        }))).sort((a, b) => b - a); // descending

        if (years.length > 0) {
            setAvailableYears(years);
            if (!years.includes(selectedYear)) {
                setSelectedYear(years[0]);
            }
        }
    }, []);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Calculate and Sort Data
    const sortedBattingStats = React.useMemo(() => {
        let stats = calculateBattingStats(games, selectedTeamId === 'all' ? undefined : selectedTeamId,
            filterPeriod === 'year' ? new Date(selectedYear, 0, 1) : filterPeriod === 'custom' ? new Date(dateRange.start) : undefined,
            filterPeriod === 'year' ? new Date(selectedYear, 11, 31, 23, 59, 59) : filterPeriod === 'custom' ? new Date(dateRange.end) : undefined
        );

        return stats.sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [games, selectedTeamId, filterPeriod, selectedYear, dateRange, sortConfig]);

    const sortedPitchingStats = React.useMemo(() => {
        let stats = calculatePitchingStats(games, selectedTeamId === 'all' ? undefined : selectedTeamId,
            filterPeriod === 'year' ? new Date(selectedYear, 0, 1) : filterPeriod === 'custom' ? new Date(dateRange.start) : undefined,
            filterPeriod === 'year' ? new Date(selectedYear, 11, 31, 23, 59, 59) : filterPeriod === 'custom' ? new Date(dateRange.end) : undefined
        );

        return stats.sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [games, selectedTeamId, filterPeriod, selectedYear, dateRange, sortConfig]);

    // Helper to render sort arrow
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">⇅</span>;
        return <span className="ml-1 text-blue-600">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const tooltipMap: Record<string, string> = {
        'average': '打率 = 安打 ÷ 打数',
        'ops': 'OPS = 出塁率 + 長打率 (打席での貢献度)',
        'era': '防御率 = (自責点 × 7) ÷ 投球回 ※草野球の7回制想定',
        'winningPercentage': '勝率 = 勝利数 ÷ (勝利数 + 敗北数)',
        'plateAppearances': '打席数 (全打席)',
        'atBats': '打数 (四死球・犠打飛等を除いた打席数)',
        'earnedRuns': '自責点 (投手の責任による失点)',
        'saves': 'セーブ数'
    };

    // Helper for table header
    const Th = ({ label, sortKey, minWidth }: { label: string, sortKey: string, minWidth?: string }) => {
        const tooltip = tooltipMap[sortKey];
        return (
            <th
                className={`p-2 cursor-pointer hover:bg-gray-200 transition select-none ${minWidth ? minWidth : ''} ${label === '氏名' ? 'text-left sticky left-0 bg-gray-100 z-10' : ''}`}
                onClick={() => handleSort(sortKey)}
                title={tooltip}
            >
                <div className="flex items-center justify-center">
                    {label}
                    {tooltip && <span className="ml-1 text-white bg-gray-400 rounded-full w-3 h-3 flex items-center justify-center text-[10px] font-normal leading-none" title={tooltip}>?</span>}
                    <SortIcon columnKey={sortKey} />
                </div>
            </th>
        );
    };

    if (selectedPlayer) {
        return <PlayerStatsDetail
            playerId={selectedPlayer.id}
            playerName={selectedPlayer.name}
            games={games}
            onBack={() => setSelectedPlayer(null)}
        />;
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-blue-900 text-white p-4 sticky top-0 z-20 shadow flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-blue-800 rounded-full">
                        <ArrowLeft />
                    </button>
                    <h1 className="text-xl font-bold">成績管理</h1>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 shadow-sm space-y-4">
                {/* Team Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <Filter size={18} className="text-gray-500 shrink-0" />
                    <button
                        className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${selectedTeamId === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setSelectedTeamId('all')}
                    >
                        全チーム
                    </button>
                    {teams.map(team => (
                        <button
                            key={team.id}
                            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${selectedTeamId === team.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                            onClick={() => setSelectedTeamId(team.id)}
                        >
                            {team.name}
                        </button>
                    ))}
                </div>

                {/* Period Filter */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-600 font-bold">
                        <Calendar size={16} />
                        <span>期間:</span>
                    </div>
                    <select
                        value={filterPeriod}
                        onChange={(e) => setFilterPeriod(e.target.value as any)}
                        className="border rounded p-1"
                    >
                        <option value="all">全期間</option>
                        <option value="year">年指定</option>
                        <option value="custom">期間指定</option>
                    </select>

                    {filterPeriod === 'year' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="border rounded p-1"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}年</option>
                            ))}
                        </select>
                    )}

                    {filterPeriod === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border rounded p-1"
                            />
                            <span>~</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border rounded p-1"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white mt-2 sticky top-[60px] z-10">
                <button
                    className={`flex-1 py-3 text-center font-bold border-b-2 ${activeTab === 'batting' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    onClick={() => { setActiveTab('batting'); setSortConfig({ key: 'average', direction: 'desc' }); }}
                >
                    打撃成績
                </button>
                <button
                    className={`flex-1 py-3 text-center font-bold border-b-2 ${activeTab === 'pitching' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                    onClick={() => { setActiveTab('pitching'); setSortConfig({ key: 'era', direction: 'asc' }); }}
                >
                    投手成績
                </button>
            </div>

            {/* Content */}
            <div className="p-2 overflow-x-auto">
                {activeTab === 'batting' ? (
                    <table className="w-full text-sm bg-white rounded shadow text-center whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-gray-100 min-w-[100px] z-10 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                                    氏名 <SortIcon columnKey="name" />
                                </th>
                                <Th label="率" sortKey="average" />
                                <Th label="試合" sortKey="gamesPlayed" />
                                <Th label="打席" sortKey="plateAppearances" />
                                <Th label="打数" sortKey="atBats" />
                                <Th label="安打" sortKey="hits" />
                                <Th label="二塁" sortKey="doubles" />
                                <Th label="三塁" sortKey="triples" />
                                <Th label="本塁" sortKey="homeRuns" />
                                <Th label="打点" sortKey="rbi" />
                                <Th label="得点" sortKey="runs" />
                                <Th label="四死" sortKey="walks" />
                                <Th label="三振" sortKey="strikeouts" />
                                <Th label="盗塁" sortKey="stolenBases" />
                                <Th label="犠打" sortKey="sacrificeBunts" />
                                <Th label="犠飛" sortKey="sacrificeFlies" />
                                <Th label="失策" sortKey="errors" />
                                <Th label="OPS" sortKey="ops" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedBattingStats.map((stat, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-2 text-left sticky left-0 bg-white font-medium border-r">
                                        <button
                                            onClick={() => setSelectedPlayer({ id: stat.playerId, name: stat.name })}
                                            className="text-blue-600 underline hover:text-blue-800 focus:outline-none"
                                        >
                                            {stat.name}
                                        </button>
                                    </td>
                                    <td className="p-2 font-bold text-red-600">{stat.average.toFixed(3)}</td>
                                    <td className="p-2">{stat.gamesPlayed}</td>
                                    <td className="p-2">{stat.plateAppearances}</td>
                                    <td className="p-2">{stat.atBats}</td>
                                    <td className="p-2">{stat.hits}</td>
                                    <td className="p-2 text-gray-500">{stat.doubles}</td>
                                    <td className="p-2 text-gray-500">{stat.triples}</td>
                                    <td className="p-2 font-bold text-blue-600">{stat.homeRuns}</td>
                                    <td className="p-2 font-bold">{stat.rbi}</td>
                                    <td className="p-2">{stat.runs}</td>
                                    <td className="p-2">{stat.walks}</td>
                                    <td className="p-2">{stat.strikeouts}</td>
                                    <td className="p-2">{stat.stolenBases}</td>
                                    <td className="p-2 text-gray-400">{stat.sacrificeBunts}</td>
                                    <td className="p-2 text-gray-400">{stat.sacrificeFlies}</td>
                                    <td className="p-2 text-gray-400">{stat.errors}</td>
                                    <td className="p-2 text-gray-500">{stat.ops.toFixed(3)}</td>
                                </tr>
                            ))}
                            {sortedBattingStats.length === 0 && (
                                <tr>
                                    <td colSpan={18} className="p-8 text-center text-gray-500">データがありません</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm bg-white rounded shadow text-center whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-gray-100 min-w-[100px] z-10 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                                    氏名 <SortIcon columnKey="name" />
                                </th>
                                <Th label="防" sortKey="era" />
                                <Th label="登板" sortKey="gamesPitched" />
                                <Th label="勝" sortKey="wins" />
                                <Th label="負" sortKey="losses" />
                                <Th label="S" sortKey="saves" />
                                <Th label="回" sortKey="inningsPitched" />
                                <Th label="自責" sortKey="earnedRuns" />
                                <Th label="率" sortKey="winningPercentage" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPitchingStats.map((stat, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-2 text-left sticky left-0 bg-white font-medium border-r">
                                        <button
                                            onClick={() => setSelectedPlayer({ id: stat.playerId, name: stat.name })}
                                            className="text-blue-600 underline hover:text-blue-800 focus:outline-none"
                                        >
                                            {stat.name}
                                        </button>
                                    </td>
                                    <td className="p-2 font-bold text-red-600">{stat.era.toFixed(2)}</td>
                                    <td className="p-2">{stat.gamesPitched}</td>
                                    <td className="p-2">{stat.wins}</td>
                                    <td className="p-2">{stat.losses}</td>
                                    <td className="p-2">{stat.saves}</td>
                                    <td className="p-2 font-bold">{formatInnings(stat.inningsPitched)}</td>
                                    <td className="p-2">{stat.earnedRuns}</td>
                                    <td className="p-2">{stat.winningPercentage.toFixed(3)}</td>
                                </tr>
                            ))}
                            {sortedPitchingStats.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">データがありません</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// Helper for display 5.333 -> 5 1/3
const formatInnings = (innings: number): string => {
    const whole = Math.floor(innings);
    const fraction = innings - whole;
    if (fraction < 0.1) return String(whole);
    if (fraction < 0.4) return `${whole} 1/3`; // 0.333
    if (fraction < 0.7) return `${whole} 2/3`; // 0.666
    return String(Math.round(innings));
};
