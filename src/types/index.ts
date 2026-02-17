export type InningResult =
    | ''
    | '安' | '二' | '三' | '本'  // Hits
    | '四' | '死' | '振'          // Walks/Strikeouts
    | '投ゴ' | '捕ゴ' | '一ゴ' | '二ゴ' | '三ゴ' | '遊ゴ' // Groundouts
    | '投飛' | '捕飛' | '一飛' | '二飛' | '三飛' | '遊飛' // Flyouts
    | '左飛' | '中飛' | '右飛' // Outfield Flyouts
    | '犠飛' | '犠打' | '打妨' | '守妨' // Others
    | '失' | '野選'; // Errors/FC

export interface PlayerStats {
    atBats: number; // 打数
    hits: number;   // 安打
    runs: number;   // 得点
    rbi: number;    // 打点
    walks: number;  // 四死球
    strikeouts: number; // 三振
    errors: number; // 失策
    stolenBases: number;
}

export interface Player {
    id: string;
    name: string;
    number: string;
}

export interface Team {
    id: string;
    name: string;
    players: Player[];
}

export interface ScoreEntry {
    playerId: string;
    inningResults: { [inning: number]: InningResult };
    details: {
        [inning: number]: {
            rbi: number;
            isRun: boolean;
            // Runner advancement flags
            reachedFirst?: boolean;
            reachedSecond?: boolean;
            reachedThird?: boolean;
            stolenBases?: number; // Number of SBs in this inning
        }
    };
}

export interface Game {
    id: string;
    date: string;
    location?: string;
    teams: {
        visitor: Team;
        home: Team;
    };
    visitorLineup: (Player & { order: number })[];
    homeLineup: (Player & { order: number })[];
    scores: {
        visitor: ScoreEntry[];
        home: ScoreEntry[];
    };
    currentInning: number;
    pitcherRecords: {
        visitor: PitcherEntry[];
        home: PitcherEntry[];
    };
}

export interface PitcherEntry {
    id: string;
    name: string;
    innings: string; // e.g., "5 1/3"
    result: 'win' | 'lose' | 'save' | '';
}
