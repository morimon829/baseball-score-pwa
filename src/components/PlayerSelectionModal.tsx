import React from 'react';
import type { Team, Player } from '../types';
import { X } from 'lucide-react';
import { JerseyNumber } from './JerseyNumber';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    team: Team;
    onSelect: (player: Player) => void;
}

export const PlayerSelectionModal: React.FC<Props> = ({ isOpen, onClose, team, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
                <div className="bg-blue-900 text-white p-4 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold">{team.name} - 選手選択</h3>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {team.players.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            登録されている選手がいません。
                            <br />
                            ホーム画面からチーム管理を行ってください。
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {team.players.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => onSelect(player)}
                                    className="flex items-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors text-left"
                                >
                                    <div className="mr-3">
                                        <JerseyNumber number={player.number} size={36} color="bg-blue-900" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">{player.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
