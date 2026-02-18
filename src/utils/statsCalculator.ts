import type { Game, PlayerAggregatedStats, PitcherAggregatedStats } from '../types';

export const calculateBattingStats = (games: Game[], teamId?: string, startDate?: Date, endDate?: Date): PlayerAggregatedStats[] => {
    const statsMap = new Map<string, PlayerAggregatedStats>();

    games.forEach(game => {
        // Date Filtering
        const gameDate = new Date(game.date);
        if (startDate && gameDate < startDate) return;
        if (endDate && gameDate > endDate) return;

        // Determine which team to process
        // If teamId is provided, only process that team. If not, process both.
        const teamsToProcess = [];
        if (!teamId || game.teams.visitor.id === teamId) teamsToProcess.push({ side: 'visitor' as const, teamId: game.teams.visitor.id });
        if (!teamId || game.teams.home.id === teamId) teamsToProcess.push({ side: 'home' as const, teamId: game.teams.home.id });

        teamsToProcess.forEach(({ side, teamId: currentTeamId }) => {
            const scores = side === 'visitor' ? game.scores.visitor : game.scores.home;
            const lineup = side === 'visitor' ? game.visitorLineup : game.homeLineup;

            scores.forEach(score => {
                const player = lineup.find(p => p.id === score.playerId);
                // Skip if player name is empty (Test data cleanup)
                if (!player || !player.name || player.name.trim() === '') return;

                const playerName = player.name;

                if (!statsMap.has(score.playerId)) {
                    statsMap.set(score.playerId, {
                        playerId: score.playerId,
                        name: playerName,
                        teamId: currentTeamId,
                        gamesPlayed: 0,
                        plateAppearances: 0,
                        atBats: 0,
                        hits: 0,
                        doubles: 0,
                        triples: 0,
                        homeRuns: 0,
                        runs: 0,
                        rbi: 0,
                        walks: 0,
                        strikeouts: 0,
                        stolenBases: 0,
                        sacrificeBunts: 0,
                        sacrificeFlies: 0,
                        errors: 0,
                        average: 0,
                        onBasePercentage: 0,
                        sluggingPercentage: 0,
                        ops: 0
                    });
                }

                const stats = statsMap.get(score.playerId)!;
                stats.gamesPlayed++;
                stats.errors += score.defensiveErrors || 0;

                // Process each inning
                Object.values(score.inningResults).forEach((result) => {
                    if (!result) return;

                    stats.plateAppearances++;

                    // At Bats
                    if (!['四', '死', '敬遠', '犠飛', '犠打', '打妨', '守妨'].includes(result)) {
                        stats.atBats++;
                    }

                    // Hits
                    if (['安', '二', '三', '本'].includes(result)) {
                        stats.hits++;
                    }
                    if (result === '二') stats.doubles++;
                    if (result === '三') stats.triples++;
                    if (result === '本') stats.homeRuns++;

                    // Walks
                    if (['四', '死', '敬遠'].includes(result)) {
                        stats.walks++;
                    }

                    // Strikeouts
                    if (result === '振' || result === '逃振') { // "逃振" might not be in generic types but good to handle if expanded
                        stats.strikeouts++;
                    }

                    // Sacrifices
                    if (result === '犠打') stats.sacrificeBunts++;
                    if (result === '犠飛') stats.sacrificeFlies++;
                });

                // Runs & RBI & SB
                Object.values(score.details).forEach(detail => {
                    if (detail.isRun) stats.runs++;
                    stats.rbi += detail.rbi || 0;
                    stats.stolenBases += detail.stolenBases || 0;
                });
            });
        });
    });

    // Calculate derived stats
    return Array.from(statsMap.values()).map(stats => {
        const avg = stats.atBats > 0 ? stats.hits / stats.atBats : 0;
        const obp = (stats.atBats + stats.walks + stats.sacrificeFlies) > 0
            ? (stats.hits + stats.walks) / (stats.atBats + stats.walks + stats.sacrificeFlies)
            : 0;

        // Slugging: (1B + 2*2B + 3*3B + 4*HR) / AB
        const singles = stats.hits - stats.doubles - stats.triples - stats.homeRuns;
        const totalBases = singles + (2 * stats.doubles) + (3 * stats.triples) + (4 * stats.homeRuns);
        const slg = stats.atBats > 0 ? totalBases / stats.atBats : 0;

        return {
            ...stats,
            average: avg,
            onBasePercentage: obp,
            sluggingPercentage: slg,
            ops: obp + slg
        };
    });
};

export const calculatePitchingStats = (games: Game[], teamId?: string, startDate?: Date, endDate?: Date): PitcherAggregatedStats[] => {
    const statsMap = new Map<string, PitcherAggregatedStats>();

    games.forEach(game => {
        // Date Filtering
        const gameDate = new Date(game.date);
        if (startDate && gameDate < startDate) return;
        if (endDate && gameDate > endDate) return;

        // Determine which team to process
        const teamsToProcess = [];
        if (!teamId || game.teams.visitor.id === teamId) teamsToProcess.push({ side: 'visitor' as const, teamId: game.teams.visitor.id });
        if (!teamId || game.teams.home.id === teamId) teamsToProcess.push({ side: 'home' as const, teamId: game.teams.home.id });

        teamsToProcess.forEach(({ side, teamId: currentTeamId }) => {
            const records = game.pitcherRecords?.[side] || [];
            if (!records) return;

            records.forEach(record => {
                if (!record.name) return; // Skip empty entries

                // Use Name as ID if ID is missing (legacy data support)
                const pid = record.id || record.name;

                if (!statsMap.has(pid)) {
                    statsMap.set(pid, {
                        playerId: pid,
                        name: record.name,
                        teamId: currentTeamId,
                        gamesPitched: 0,
                        wins: 0,
                        losses: 0,
                        saves: 0,
                        inningsPitched: 0, // Store as fraction: 1.0, 1.33 (1 1/3), 1.66 (1 2/3) or just outs
                        // Let's store total outs for precision? Or simple float?
                        // Let's use simple float for display: 0.1 means 1/3, 0.2 means 2/3 is common convention but harder to calculate.
                        // Standard: Integer part = innings, Decimal = partial (0.1 = 1 out, 0.2 = 2 outs)
                        // Wait, 5.1 is 5 and 1/3? Standard notation is often 5.1 -> 5 1/3. 
                        // Let's convert "5 1/3" string to Outs count for calculation.
                        earnedRuns: 0,
                        era: 0,
                        winningPercentage: 0
                    });
                }

                const stats = statsMap.get(pid)!;
                stats.gamesPitched++;
                if (record.result === 'win') stats.wins++;
                if (record.result === 'lose') stats.losses++;
                if (record.result === 'save') stats.saves++;
                stats.earnedRuns += record.er || 0;

                // Parse Innings String "5 1/3" or "5.1" or "5"
                const outs = parseInningsToOuts(record.innings);
                stats.inningsPitched += outs;
            });
        });
    });

    return Array.from(statsMap.values()).map(stats => {
        // Calculate ERA: (ER * 7) / (Innings) -- using 7 innings for amateur baseball usually? 
        // Standard is 9, but for youth/amateur often 7.
        // Let's assume 7 for now based on the 7-inning score sheet.
        const totalInnings = stats.inningsPitched / 3;
        const era = totalInnings > 0 ? (stats.earnedRuns * 7) / totalInnings : 0;

        const decisions = stats.wins + stats.losses;
        const winPct = decisions > 0 ? stats.wins / decisions : 0;

        return {
            ...stats,
            inningsPitched: totalInnings, // Return as float innings (e.g. 5.333)
            era,
            winningPercentage: winPct
        };
    });
};

const parseInningsToOuts = (inningsStr: string): number => {
    if (!inningsStr) return 0;
    // Handle "5 1/3", "5 2/3", "5.1", "5.2", "5"
    let totalOuts = 0;
    let main = 0;
    let fraction = 0;

    if (inningsStr.includes(' ')) {
        const parts = inningsStr.split(' ');
        main = parseInt(parts[0]) || 0;
        if (parts[1] === '1/3') fraction = 1;
        if (parts[1] === '2/3') fraction = 2;
    } else if (inningsStr.includes('.')) {
        const parts = inningsStr.split('.');
        main = parseInt(parts[0]) || 0;
        if (parts[1] === '1') fraction = 1;
        if (parts[1] === '2') fraction = 2;
    } else {
        main = parseInt(inningsStr) || 0;
    }

    totalOuts = (main * 3) + fraction;
    return totalOuts;
};
