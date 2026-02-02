import { useState, useEffect } from 'react';
import { supabase, Player } from '../../lib/supabase';
import { UserPlus, CreditCard as Edit2, Trash2, User, Car, Mail, Calendar, TrendingUp, Coffee, Euro, Wine } from 'lucide-react';
import { PlayerModal } from './PlayerModal';
import { useAuth } from '../../contexts/AuthContext';

interface PlayerStats {
  aperoCount: number;
  matchCount: number;
  carpoolCount: number;
  finesTotal: number;
  redistributionAmount: number;
}

export const PlayerList = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: PlayerStats }>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'with' | 'without'>('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchPlayers();
    fetchPlayerStats();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (month >= 8) {
      return { start: year, end: year + 1 };
    } else {
      return { start: year - 1, end: year };
    }
  };

  const isDateInSeason = (dateStr: string, season: { start: number; end: number }) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (year === season.start && month >= 8) return true;
    if (year === season.end && month <= 7) return true;

    return false;
  };

  const fetchPlayerStats = async () => {
    try {
      const [aperoResponse, matchResponse, carpoolResponse, finesResponse, expensesResponse] = await Promise.all([
        supabase.from('apero_schedule').select('person1_id, person2_id'),
        supabase.from('match_schedule').select('saturday_person1_id, saturday_person2_id, saturday_person3_id, saturday_person4_id, sunday_person1_id, sunday_person2_id, sunday_person3_id, sunday_person4_id'),
        supabase.from('carpools').select('*'),
        supabase.from('fines').select('player_id, date, fine_types(amount)'),
        supabase.from('expenses').select(`
          id,
          amount,
          expense_participants(player_id)
        `),
      ]);

      const stats: { [playerId: string]: PlayerStats } = {};
      const currentSeason = getCurrentSeason();

      if (aperoResponse.data) {
        aperoResponse.data.forEach((item) => {
          if (item.person1_id) {
            if (!stats[item.person1_id]) stats[item.person1_id] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
            stats[item.person1_id].aperoCount++;
          }
          if (item.person2_id) {
            if (!stats[item.person2_id]) stats[item.person2_id] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
            stats[item.person2_id].aperoCount++;
          }
        });
      }

      if (matchResponse.data) {
        matchResponse.data.forEach((item: any) => {
          const personIds = [
            item.saturday_person1_id,
            item.saturday_person2_id,
            item.saturday_person3_id,
            item.saturday_person4_id,
            item.sunday_person1_id,
            item.sunday_person2_id,
            item.sunday_person3_id,
            item.sunday_person4_id,
          ];

          personIds.forEach((personId) => {
            if (personId) {
              if (!stats[personId]) stats[personId] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
              stats[personId].matchCount++;
            }
          });
        });
      }

      if (carpoolResponse.data) {
        carpoolResponse.data.forEach((carpool) => {
          const playerIds = [
            carpool.team1_player1_id,
            carpool.team1_player2_id,
            carpool.team1_player3_id,
            carpool.team1_player4_id,
            carpool.team1_player5_id,
            carpool.team2_player1_id,
            carpool.team2_player2_id,
            carpool.team2_player3_id,
            carpool.team2_player4_id,
            carpool.team2_player5_id,
          ].filter(Boolean);

          playerIds.forEach((playerId) => {
            if (playerId) {
              if (!stats[playerId]) stats[playerId] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
              stats[playerId].carpoolCount++;
            }
          });
        });
      }

      if (finesResponse.data) {
        finesResponse.data.forEach((fine: any) => {
          if (fine.player_id && fine.fine_types && fine.date) {
            if (isDateInSeason(fine.date, currentSeason)) {
              if (!stats[fine.player_id]) stats[fine.player_id] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
              stats[fine.player_id].finesTotal += fine.fine_types.amount || 0;
            }
          }
        });
      }

      const { data: playersData } = await supabase.from('players').select('id, manual_payment, participates_in_fund');
      if (playersData) {
        playersData.forEach((player) => {
          if (player.manual_payment && player.manual_payment > 0) {
            if (!stats[player.id]) stats[player.id] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
            stats[player.id].finesTotal += player.manual_payment;
          }
        });
      }

      if (expensesResponse.data && playersData) {
        expensesResponse.data.forEach((expense: any) => {
          const participantIds = expense.expense_participants?.map((p: any) => p.player_id) || [];
          const participantCount = participantIds.length;

          if (participantCount > 0) {
            const perPersonAmount = Number(expense.amount) / participantCount;

            participantIds.forEach((playerId: string) => {
              const player = playersData.find(p => p.id === playerId);
              if (player && !player.participates_in_fund) {
                if (!stats[playerId]) stats[playerId] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
                stats[playerId].redistributionAmount += perPersonAmount;
              }
            });
          }
        });
      }

      setPlayerStats(stats);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) return;

    try {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      fetchPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const handleEdit = (player: Player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPlayer(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
    fetchPlayers();
    fetchPlayerStats();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const filteredPlayers = players.filter(p => {
    if (licenseFilter === 'with') return p.has_license;
    if (licenseFilter === 'without') return !p.has_license;
    return true;
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aStats = playerStats[a.id] || { aperoCount: 0, matchCount: 0, carpoolCount: 0 };
    const bStats = playerStats[b.id] || { aperoCount: 0, matchCount: 0, carpoolCount: 0 };
    const aTotal = aStats.aperoCount + aStats.carpoolCount;
    const bTotal = bStats.aperoCount + bStats.carpoolCount;
    return aTotal - bTotal;
  });

  const formatPrice = (amount: number) => {
    return amount % 1 === 0 ? `${amount}` : amount.toFixed(2);
  };

  const totalFines = Object.values(playerStats).reduce((sum, stats) => sum + stats.finesTotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Effectif</h2>
          <p className="text-slate-400 text-sm mt-1">
            Total: {sortedPlayers.length} joueur{sortedPlayers.length > 1 ? 's' : ''}
          </p>
          <p className="text-green-400 text-sm mt-1 font-semibold">
            Total amendes: {formatPrice(totalFines)} €
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={licenseFilter}
            onChange={(e) => setLicenseFilter(e.target.value as 'all' | 'with' | 'without')}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tous les joueurs</option>
            <option value="with">Avec permis</option>
            <option value="without">Sans permis</option>
          </select>
          {user && (
            <button
              onClick={handleAdd}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-2"
            >
              <UserPlus size={20} />
              Ajouter un joueur
            </button>
          )}
        </div>
      </div>

      {sortedPlayers.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <User size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Aucun joueur dans l'effectif</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-green-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={`${player.first_name} ${player.last_name}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <User size={24} className="text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-semibold">
                      {player.first_name} {player.last_name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {(playerStats[player.id]?.aperoCount || 0) > 0 && (
                        <div className="flex items-center gap-1" title="Apéro">
                          <Wine size={14} className="text-orange-400" />
                          <span className="text-xs text-slate-400">
                            {playerStats[player.id]?.aperoCount}
                          </span>
                        </div>
                      )}
                      {(playerStats[player.id]?.matchCount || 0) > 0 && (
                        <div className="flex items-center gap-1" title="Table de marque">
                          <Calendar size={14} className="text-blue-400" />
                          <span className="text-xs text-slate-400">
                            {playerStats[player.id]?.matchCount}
                          </span>
                        </div>
                      )}
                      {player.has_license && (playerStats[player.id]?.carpoolCount || 0) > 0 && (
                        <div className="flex items-center gap-1" title="Covoiturage">
                          <Car size={14} className="text-green-400" />
                          <span className="text-xs text-slate-400">
                            {playerStats[player.id]?.carpoolCount}
                          </span>
                        </div>
                      )}
                      {((playerStats[player.id]?.finesTotal || 0) > 0 || (player.paid_amount || 0) > 0) && (
                        <div className="flex items-center gap-1" title="Payé / Amendes">
                          <Euro size={14} className="text-yellow-400" />
                          <span className="text-xs text-green-400">
                            {formatPrice(player.paid_amount || 0)}€
                          </span>
                          <span className="text-xs text-slate-400">
                            / {formatPrice(playerStats[player.id]?.finesTotal || 0)}€
                          </span>
                        </div>
                      )}
                      {!player.participates_in_fund && (playerStats[player.id]?.redistributionAmount || 0) > 0 && (
                        <div className="flex items-center gap-1" title="Redistribution dépenses">
                          <Euro size={14} className="text-green-500" />
                          <span className="text-xs text-green-500">
                            +{formatPrice(playerStats[player.id]?.redistributionAmount || 0)}€
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {user && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(player)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(player.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2 border-t border-slate-700 pt-3">
                <div className="flex items-center gap-2">
                  <Car size={16} className={player.has_license ? 'text-green-400' : 'text-slate-600'} />
                  <span className={`text-sm ${player.has_license ? 'text-green-400' : 'text-slate-500'}`}>
                    {player.has_license ? 'Permis de conduire' : 'Pas de permis'}
                  </span>
                </div>
                {player.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-blue-400" />
                    <span className="text-sm text-slate-400 truncate">{player.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <PlayerModal
          player={selectedPlayer}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};
