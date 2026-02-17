import type { Team, Game } from '../types';

const TEAMS_KEY = 'baseball_score_pwa_teams';
const GAMES_KEY = 'baseball_score_pwa_games';

export const saveTeams = (teams: Team[]) => {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
};

export const loadTeams = (): Team[] => {
    const data = localStorage.getItem(TEAMS_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveGame = (game: Game) => {
    const games = loadGames();
    const existingIndex = games.findIndex(g => g.id === game.id);
    if (existingIndex >= 0) {
        games[existingIndex] = game;
    } else {
        games.push(game);
    }
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
};

export const loadGames = (): Game[] => {
    const data = localStorage.getItem(GAMES_KEY);
    return data ? JSON.parse(data) : [];
};
