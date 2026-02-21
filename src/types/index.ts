export type InningResult =
    | ''
    | '安' | '二' | '三' | '本'  // Hits
    | '四' | '死' | '振' | '逃振' // Walks/Strikeouts
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
    // Keys are strings to support "Batting Around": '1', '1-2', '2', etc. (Inning - Turn)
    inningResults: { [inningKey: string]: InningResult };
    details: {
        [inningKey: string]: {
            rbi: number;
            isRun: boolean;
            // Runner advancement flags
            reachedFirst?: boolean;
            reachedSecond?: boolean;
            reachedThird?: boolean;
            stolenBases?: number; // Number of SBs in this inning
        }
    };
    defensiveErrors?: number;
}

export interface Game {
    id: string;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    umpires?: {
        main: string;
        base1: string;
        base2: string;
        base3: string;
    };
    teams: {
        visitor: Team;
        home: Team;
    };
    visitorLineup: (Player & { order: number; position?: string })[];
    homeLineup: (Player & { order: number; position?: string })[];
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
    er: number; // Earned Runs
    result: 'win' | 'lose' | 'save' | '';
}

export interface PlayerAggregatedStats {
    playerId: string;
    name: string;
    teamId: string;
    gamesPlayed: number;
    plateAppearances: number;
    atBats: number;
    hits: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    runs: number;
    rbi: number;
    walks: number; // 四球 + 死球
    strikeouts: number;
    stolenBases: number;
    sacrificeBunts: number; // 犠打
    sacrificeFlies: number; // 犠飛
    errors: number;

    // Calculated
    average: number; // 打率
    onBasePercentage: number; // 出塁率
    sluggingPercentage: number; // 長打率
    ops: number;
}

export interface PitcherAggregatedStats {
    playerId: string;
    name: string;
    teamId: string;
    gamesPitched: number;
    wins: number;
    losses: number;
    saves: number;
    inningsPitched: number; // 投球回（アウト数で管理するか、分数で管理するか。ここでは表示用文字列ではなく計算用にトータルのアウト数などで持つのが良いが、入力が文字列なのでパースが必要）
    earnedRuns: number;

    // Calculated
    era: number; // 防御率
    winningPercentage: number; // 勝率
}

