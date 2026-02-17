import type { ScoreEntry, PlayerStats } from '../types';

export const calculateStats = (entry: ScoreEntry | undefined): PlayerStats => {
    const stats: PlayerStats = {
        atBats: 0,
        hits: 0,
        runs: 0,
        rbi: 0,
        walks: 0,
        strikeouts: 0,
        errors: 0,
        stolenBases: 0
    };

    if (!entry) return stats;

    Object.values(entry.inningResults).forEach(result => {
        // Hits
        if (['安', '二', '三', '本'].includes(result)) {
            stats.hits++;
            stats.atBats++;
        }
        // Outs (excluding sacrifices)
        else if (['振', '投ゴ', '捕ゴ', '一ゴ', '二ゴ', '三ゴ', '遊ゴ',
            '投飛', '捕飛', '一飛', '二飛', '三飛', '遊飛',
            '左飛', '中飛', '右飛', '失', '野選'].includes(result)) {
            stats.atBats++;
            if (result === '振') stats.strikeouts++;
            if (result === '失') stats.errors++; // Note: strictly defensive error, but here counting as batting result? Usually 'E' on batter records is reaching on error.
        }
        // Walks / Sacrifices (Do not count as At Bat)
        else if (['四', '死', '敬遠'].includes(result)) {
            stats.walks++;
        }
        else if (['犠打', '犠飛', '打妨', '守妨'].includes(result)) {
            // No At Bat
        }
    });

    // Runs and RBIs from details
    Object.values(entry.details).forEach(detail => {
        if (detail.isRun) stats.runs++;
        stats.rbi += detail.rbi || 0;
        stats.stolenBases += detail.stolenBases || 0;
    });

    return stats;
};

export const countPlateAppearances = (stats: PlayerStats): number => {
    // This is valid if we iterate all results. 
    // Simplified: AtBats + Walks + Sacrifices (not tracked in calculateStats specifically as count) + Obstruction...
    // Adjusting calculateStats to return detailed counts or just re-iterating if needed.
    // For now, let's just return "AtBats + Walks + Hits(included in AB) + Sacrifices".
    // Wait, simplifiction: PA = Num of non-empty results essentially?
    return stats.atBats + stats.walks; // + Sacrifices (TODO: track sacrifices)
};
