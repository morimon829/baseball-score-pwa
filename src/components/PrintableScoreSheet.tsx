import React from 'react';
import type { Game } from '../types';

interface Props {
    game: Game;
}

export const PrintableScoreSheet: React.FC<Props> = ({ game }) => {
    // A4 Landscape is approximately 297mm x 210mm. 
    // At 96 DPI, this is 1123px x 794px. We will use these fixed pixel dimensions for the container
    // so that html2canvas generates a perfectly scaled A4 image regardless of device zoom.

    // Helper to calculate total runs and per-inning runs
    const getScoreData = (team: 'visitor' | 'home') => {
        const scores = game.scores[team];
        const runsPerInning: number[] = [0, 0, 0, 0, 0, 0, 0];
        let total = 0;

        scores.forEach(s => {
            Object.entries(s.details).forEach(([inning, detail]) => {
                if (detail.isRun) {
                    const inningNum = parseInt(inning.split('-')[0]);
                    if (inningNum >= 1 && inningNum <= 7) {
                        runsPerInning[inningNum - 1]++;
                    }
                    total++;
                }
            });
        });

        const battedInning = [false, false, false, false, false, false, false];
        scores.forEach(s => {
            Object.keys(s.inningResults).forEach(inning => {
                const inningNum = parseInt(inning.split('-')[0]);
                if (inningNum >= 1 && inningNum <= 7) {
                    battedInning[inningNum - 1] = true;
                }
            });
        });

        return { runsPerInning, total, battedInning };
    };

    const visitorScore = getScoreData('visitor');
    const homeScore = getScoreData('home');

    const renderBattingTable = (team: 'visitor' | 'home', title: string) => {
        const teamData = game.teams[team];
        const lineup = team === 'visitor' ? game.visitorLineup : game.homeLineup;
        const scores = game.scores[team];
        const rowCount = 14;

        return (
            <div className="flex-1 flex flex-col border-2 border-black mx-1 bg-white">
                {/* Team Name Header */}
                <div className="flex border-b-2 border-black h-8 shrink-0">
                    <div className="w-16 border-r border-black flex items-center justify-center font-bold text-xs">{title}</div>
                    <div className="flex-1 pl-2 flex items-center font-bold">{teamData.name}</div>
                </div>

                {/* Table Header */}
                <div className="flex border-b border-black h-10 shrink-0 text-[11px] text-center font-bold leading-tight">
                    <div className="w-6 border-r border-black flex items-center justify-center">打<br />順</div>
                    <div className="w-28 border-r border-black flex items-center justify-center">氏 名</div>
                    <div className="w-6 border-r border-black flex items-center justify-center">背<br />番</div>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="flex-1 border-r border-black flex items-center justify-center">{i}<br />回</div>
                    ))}
                    <div className="w-[26px] border-r border-black flex items-center justify-center text-[10px]">打<br />席</div>
                    <div className="w-[26px] border-r border-black flex items-center justify-center text-[10px]">打<br />数</div>
                    <div className="w-[26px] border-r border-black flex items-center justify-center text-[10px]">安<br />打</div>
                    <div className="w-[26px] border-r border-black flex items-center justify-center text-[10px]">得<br />点</div>
                    <div className="w-[26px] flex items-center justify-center text-[10px]">盗<br />塁</div>
                </div>

                {/* 14 Rows */}
                {Array.from({ length: rowCount }).map((_, idx) => {
                    const player = lineup[idx];
                    const entry = player ? scores.find(s => s.playerId === player.id) : null;

                    // Basic Stats
                    let pa = 0; let ab = 0; let h = 0; let r = 0; let sb = 0;
                    if (entry) {
                        const results = Object.values(entry.inningResults).filter(Boolean);
                        pa = results.length;
                        ab = results.filter(res => !['四', '死', '敬遠', '犠', '犠飛', 'ギ'].includes(res)).length;
                        h = results.filter(res => ['安', '二', '三', '本'].includes(res)).length;
                        r = Object.values(entry.details).filter(d => d.isRun).length;
                        sb = Object.values(entry.details).reduce((sum, d) => sum + (d.stolenBases || 0), 0);
                    }

                    return (
                        <div key={idx} className={`flex border-b border-black flex-1 ${idx === rowCount - 1 ? 'border-b-0' : ''}`}>
                            <div className="w-6 border-r border-black flex items-center justify-center text-[11px]">{idx + 1}</div>
                            <div className="w-28 border-r border-black flex items-center px-1 text-[11px] truncate">{player?.name || ''}</div>
                            <div className="w-6 border-r border-black flex items-center justify-center text-[11px]">{player?.number || ''}</div>

                            {[1, 2, 3, 4, 5, 6, 7].map(i => {
                                const keys = entry ? Object.keys(entry.inningResults).filter(k => k.startsWith(`${i}`) && (k === `${i}` || k.includes('-'))) : [];
                                const cellResults = keys.map(k => entry!.inningResults[k]).filter(Boolean);

                                return (
                                    <div key={i} className="flex-1 border-r border-black flex flex-col items-center justify-center text-[10px] leading-tight overflow-hidden px-0.5 whitespace-nowrap">
                                        {cellResults.map((rStr, rIdx) => (
                                            <span key={rIdx}>{rStr}</span>
                                        ))}
                                    </div>
                                );
                            })}

                            <div className="w-[26px] border-r border-black flex items-center justify-center text-[11px]">{pa > 0 ? pa : ''}</div>
                            <div className="w-[26px] border-r border-black flex items-center justify-center text-[11px]">{ab > 0 ? ab : ''}</div>
                            <div className="w-[26px] border-r border-black flex items-center justify-center text-[11px]">{h > 0 ? h : ''}</div>
                            <div className="w-[26px] border-r border-black flex items-center justify-center text-[11px]">{r > 0 ? r : ''}</div>
                            <div className="w-[26px] flex items-center justify-center text-[11px]">{sb > 0 ? sb : ''}</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div id="pdf-export-container" className="bg-white text-black font-sans absolute top-0 left-0" style={{ width: '1123px', height: '794px', zIndex: -100, boxSizing: 'border-box', padding: '15px 25px' }}>
            {/* Top Title */}
            <div className="text-center mb-3">
                <h1 className="text-2xl tracking-[0.5em] font-bold">松戸ミドルリーグ公式戦記録</h1>
            </div>

            {/* Top Section: Info, Scoreboard, Pitchers */}
            <div className="flex mb-2 h-32">
                {/* Left Info */}
                <div className="w-56 flex flex-col justify-between text-sm pr-4">
                    <div className="flex justify-between border-b border-black pb-1">
                        <span>実施日</span>
                        <span>年</span>
                        <span>月</span>
                        <span>日</span>
                    </div>
                    <div className="mt-2 flex items-end">
                        <span className="w-16 pb-1">主審名</span>
                        <span className="flex-1 text-center border-b border-black pb-1.5">{game.umpires?.main || ''}</span>
                    </div>
                    <div className="mt-2 flex items-end">
                        <span className="w-16 pb-1">記録者</span>
                        <span className="flex-1 text-center border-b border-black pb-1.5">{game.recorder || ''}</span>
                    </div>
                </div>

                {/* Center Scoreboard */}
                <div className="flex-1 flex px-4">
                    <div className="border-2 border-black flex flex-col w-full h-full">
                        <div className="flex h-1/3 border-b-2 border-black text-center font-bold text-sm bg-gray-100">
                            <div className="w-24 border-r-2 border-black flex items-center justify-center">チーム名</div>
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div key={i} className="flex-1 border-r border-black flex items-center justify-center">{i}</div>
                            ))}
                            <div className="w-10 border-l-2 border-black flex items-center justify-center">計</div>
                        </div>
                        <div className="flex h-1/3 border-b border-black text-center">
                            <div className="w-24 border-r-2 border-black flex items-center justify-center px-1 text-xs truncate bg-gray-50">{game.teams.visitor.name}</div>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex-1 border-r border-black flex items-center justify-center text-lg font-bold">{visitorScore.battedInning[i] ? visitorScore.runsPerInning[i] : ''}</div>
                            ))}
                            <div className="w-10 border-l-2 border-black flex items-center justify-center font-bold text-lg">{visitorScore.total}</div>
                        </div>
                        <div className="flex h-1/3 text-center">
                            <div className="w-24 border-r-2 border-black flex items-center justify-center px-1 text-xs truncate bg-gray-50">{game.teams.home.name}</div>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex-1 border-r border-black flex items-center justify-center text-lg font-bold">{homeScore.battedInning[i] ? homeScore.runsPerInning[i] : ''}</div>
                            ))}
                            <div className="w-10 border-l-2 border-black flex items-center justify-center font-bold text-lg">{homeScore.total}</div>
                        </div>
                    </div>
                </div>

                {/* Right Pitcher Records */}
                <div className="w-[300px] pl-4 flex flex-col">
                    <div className="text-right text-[11px] mb-2.5 tracking-widest leading-none">投 手 記 録</div>
                    <div className="border-2 border-black flex flex-col flex-1 bg-white">
                        <div className="flex flex-1 border-b-2 border-black text-center font-bold text-xs bg-gray-100 items-center">
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center">先発</div>
                            <div className="w-8 border-r-2 border-black h-full flex items-center justify-center">回数</div>
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center">救援</div>
                            <div className="w-8 border-r-2 border-black h-full flex items-center justify-center">回数</div>
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center">救援</div>
                            <div className="w-8 h-full flex items-center justify-center">回数</div>
                        </div>
                        <div className="flex flex-1 border-b border-black text-center text-xs items-center">
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center truncate px-1">{game.pitcherRecords?.visitor?.[0]?.name || ''}</div>
                            <div className="w-8 border-r-2 border-black h-full flex items-center justify-center">{game.pitcherRecords?.visitor?.[0]?.innings || ''}</div>
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center truncate px-1">{game.pitcherRecords?.visitor?.[1]?.name || ''}</div>
                            <div className="w-8 border-r-2 border-black h-full flex items-center justify-center">{game.pitcherRecords?.visitor?.[1]?.innings || ''}</div>
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center truncate px-1">{game.pitcherRecords?.visitor?.[2]?.name || ''}</div>
                            <div className="w-8 h-full flex items-center justify-center">{game.pitcherRecords?.visitor?.[2]?.innings || ''}</div>
                        </div>
                        <div className="flex flex-1 text-center text-xs items-center">
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center truncate px-1">{game.pitcherRecords?.home?.[0]?.name || ''}</div>
                            <div className="w-8 border-r-2 border-black h-full flex items-center justify-center">{game.pitcherRecords?.home?.[0]?.innings || ''}</div>
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center truncate px-1">{game.pitcherRecords?.home?.[1]?.name || ''}</div>
                            <div className="w-8 border-r-2 border-black h-full flex items-center justify-center">{game.pitcherRecords?.home?.[1]?.innings || ''}</div>
                            <div className="flex-1 border-r border-black h-full flex items-center justify-center truncate px-1">{game.pitcherRecords?.home?.[2]?.name || ''}</div>
                            <div className="w-8 h-full flex items-center justify-center">{game.pitcherRecords?.home?.[2]?.innings || ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Main Batting Tables */}
            <div className="flex h-[525px] w-full mt-1">
                {renderBattingTable('visitor', '先攻チーム名')}
                {renderBattingTable('home', '後攻チーム名')}
            </div>

            {/* Footer Legend */}
            <div className="h-[55px] mt-2 flex items-start text-[11px] font-bold px-4 gap-8">
                <div className="flex flex-col gap-0.5 leading-tight">
                    <span>安 → シングルヒット</span>
                    <span>二 → 二塁打</span>
                    <span>三 → 三塁打</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-tight">
                    <span>本 → 本塁打</span>
                    <span>四 → 四球</span>
                    <span>死 → 死球</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-tight">
                    <span>失 → エラー</span>
                    <span>〇 → 得点</span>
                    <span>ギ → バント・犠牲フライ</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-tight">
                    <span>Ⅰ → 1アウト</span>
                    <span>Ⅱ → 2アウト</span>
                    <span>Ⅲ → 3アウト</span>
                </div>
                <div className="flex flex-col font-normal text-[10.5px] ml-auto leading-normal mt-1 text-gray-800">
                    <span>* 打席・打数・安打・得点・盗塁は「正」の字で記入ください。</span>
                    <span>* 助っ人は、背番号欄に記入せず「助」と記入ください。</span>
                    <span>* 「ギ」と記入したバント・犠牲フライは打数に含まれません。</span>
                </div>
            </div>
        </div>
    );
};

