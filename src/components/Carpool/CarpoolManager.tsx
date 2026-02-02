import { useState, useEffect } from 'react';
import { supabase, Carpool, Player, CarpoolProposal } from '../../lib/supabase';
import { Car, Users, ChevronLeft, ChevronRight, UserPlus, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const CarpoolManager = () => {
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [proposals, setProposals] = useState<(CarpoolProposal & { players?: Player })[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
  const [weekends, setWeekends] = useState<Date[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    generateMonthWeekends();
  }, [monthOffset]);

  const fetchData = async () => {
    try {
      const [carpoolsResponse, playersResponse, proposalsResponse] = await Promise.all([
        supabase
          .from('carpools')
          .select('*')
          .order('weekend_date', { ascending: true }),
        supabase
          .from('players')
          .select('*')
          .order('last_name', { ascending: true }),
        supabase
          .from('carpool_proposals')
          .select('*, players(*)')
          .order('created_at', { ascending: false }),
      ]);

      if (carpoolsResponse.error) throw carpoolsResponse.error;
      if (playersResponse.error) throw playersResponse.error;
      if (proposalsResponse.error) throw proposalsResponse.error;

      setCarpools(carpoolsResponse.data || []);
      setPlayers(playersResponse.data || []);
      setProposals(proposalsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthWeekends = () => {
    const saturdays: Date[] = [];
    const today = new Date();

    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    setCurrentMonth(targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 6) {
        saturdays.push(date);
      }
    }

    setWeekends(saturdays);
  };

  const handleAssignTeam = async (
    weekendDate: Date,
    teamPlayers: { [key: string]: string | null }
  ) => {
    if (!user) return;

    const dateStr = weekendDate.toISOString().split('T')[0];
    const existing = carpools.find((c) => c.weekend_date === dateStr);

    try {
      if (existing) {
        const { error } = await supabase
          .from('carpools')
          .update(teamPlayers)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('carpools')
          .insert({
            weekend_date: dateStr,
            ...teamPlayers,
          });

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error('Error assigning team:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Supprimer ce covoiturage ?')) return;

    try {
      const { error } = await supabase
        .from('carpools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error deleting carpool:', error);
    }
  };

  const getPlayerAssignmentCount = (playerId: string) => {
    return carpools.filter(carpool => {
      return [
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
      ].includes(playerId);
    }).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const sortedPlayersByCount = [...players].filter(p => p.has_license || !p.is_coach).sort((a, b) => {
    const countA = getPlayerAssignmentCount(a.id);
    const countB = getPlayerAssignmentCount(b.id);
    return countA - countB;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Car size={28} />
          Covoiturage
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setMonthOffset(0)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors text-sm min-w-[150px]"
          >
            {currentMonth || 'Aujourd\'hui'}
          </button>
          <button
            onClick={() => setMonthOffset(monthOffset + 1)}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {weekends.map((weekend, idx) => {
              const dateStr = weekend.toISOString().split('T')[0];
              const existing = carpools.find((c) => c.weekend_date === dateStr);
              const weekendProposals = proposals.filter(p => p.weekend_date === dateStr);

              return (
                <WeekendCard
                  key={idx}
                  weekend={weekend}
                  existing={existing}
                  players={players}
                  carpools={carpools}
                  proposals={weekendProposals}
                  onAssign={handleAssignTeam}
                  onRefresh={fetchData}
                  isAdmin={!!user}
                  onDeleteCarpool={handleDelete}
                />
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 h-fit">
          <h3 className="text-white font-semibold mb-4">Qui a le moins fait</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedPlayersByCount.map((player) => {
              const count = getPlayerAssignmentCount(player.id);
              return (
                <div
                  key={player.id}
                  className="flex justify-between items-center bg-slate-900 px-4 py-2 rounded-lg"
                >
                  <span className="text-white text-sm">
                    {player.first_name} {player.last_name}
                    {player.has_license && ' 🚗'}
                  </span>
                  <span className="text-green-400 font-semibold text-sm">
                    {count}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface WeekendCardProps {
  weekend: Date;
  existing?: Carpool;
  players: Player[];
  carpools: Carpool[];
  proposals: (CarpoolProposal & { players?: Player })[];
  onAssign: (weekendDate: Date, teamPlayers: { [key: string]: string | null }) => void;
  onRefresh: () => void;
  isAdmin: boolean;
  onDeleteCarpool: (id: string) => void;
}

const WeekendCard = ({ weekend, existing, players, carpools, proposals, onAssign, onRefresh, isAdmin, onDeleteCarpool }: WeekendCardProps) => {
  const [team1Players, setTeam1Players] = useState<string[]>([
    existing?.team1_player1_id || '',
    existing?.team1_player2_id || '',
    existing?.team1_player3_id || '',
    existing?.team1_player4_id || '',
    existing?.team1_player5_id || '',
  ]);

  const [team2Players, setTeam2Players] = useState<string[]>([
    existing?.team2_player1_id || '',
    existing?.team2_player2_id || '',
    existing?.team2_player3_id || '',
    existing?.team2_player4_id || '',
    existing?.team2_player5_id || '',
  ]);

  const getPlayerAssignmentCount = (playerId: string) => {
    return carpools.filter(carpool => {
      return [
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
      ].includes(playerId);
    }).length;
  };

  const getPlayerLabel = (player: Player) => {
    const count = getPlayerAssignmentCount(player.id);
    return `${player.first_name} ${player.last_name} (${count}x)${player.has_license ? ' 🚗' : ''}`;
  };

  const playersWithLicense = players.filter(p => p.has_license && !p.is_coach);

  const sortedPlayersWithLicense = [...playersWithLicense].sort((a, b) => {
    const countA = getPlayerAssignmentCount(a.id);
    const countB = getPlayerAssignmentCount(b.id);
    return countA - countB;
  });

  const sortedAllPlayers = [...players].filter(p => !p.is_coach).sort((a, b) => {
    const countA = getPlayerAssignmentCount(a.id);
    const countB = getPlayerAssignmentCount(b.id);
    return countA - countB;
  });

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedProposalPlayer, setSelectedProposalPlayer] = useState('');

  const handlePropose = async () => {
    if (!selectedProposalPlayer) return;

    const dateStr = weekend.toISOString().split('T')[0];
    try {
      const { error } = await supabase
        .from('carpool_proposals')
        .insert({
          weekend_date: dateStr,
          player_id: selectedProposalPlayer,
        });

      if (error) throw error;
      setShowProposalForm(false);
      setSelectedProposalPlayer('');
      onRefresh();
    } catch (error) {
      console.error('Error creating proposal:', error);
    }
  };

  const handleValidateProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('carpool_proposals')
        .update({ is_validated: true })
        .eq('id', proposalId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error validating proposal:', error);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('carpool_proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
    }
  };

  useEffect(() => {
    setTeam1Players([
      existing?.team1_player1_id || '',
      existing?.team1_player2_id || '',
      existing?.team1_player3_id || '',
      existing?.team1_player4_id || '',
      existing?.team1_player5_id || '',
    ]);
    setTeam2Players([
      existing?.team2_player1_id || '',
      existing?.team2_player2_id || '',
      existing?.team2_player3_id || '',
      existing?.team2_player4_id || '',
      existing?.team2_player5_id || '',
    ]);
  }, [existing]);

  const handleTeam1Change = (index: number, playerId: string) => {
    const newTeam = [...team1Players];
    newTeam[index] = playerId;
    setTeam1Players(newTeam);
  };

  const handleTeam2Change = (index: number, playerId: string) => {
    const newTeam = [...team2Players];
    newTeam[index] = playerId;
    setTeam2Players(newTeam);
  };

  const handleSave = () => {
    const teamData: { [key: string]: string | null } = {};
    team1Players.forEach((id, i) => {
      teamData[`team1_player${i + 1}_id`] = id || null;
    });
    team2Players.forEach((id, i) => {
      teamData[`team2_player${i + 1}_id`] = id || null;
    });

    onAssign(weekend, teamData);
  };

  const handleDeleteWeekend = () => {
    if (existing) {
      onDeleteCarpool(existing.id);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-white font-semibold mb-4 text-lg">
        Week-end du {weekend.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </h3>

      {proposals.length > 0 && (
        <div className="mb-4 bg-slate-900 rounded-lg p-4 border border-slate-600">
          <h4 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
            <UserPlus size={18} />
            Propositions ({proposals.length})
          </h4>
          <div className="space-y-2">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="flex items-center justify-between bg-slate-800 rounded p-2">
                <span className="text-white text-sm">
                  {proposal.players?.first_name} {proposal.players?.last_name}
                  {proposal.players?.has_license && ' 🚗'}
                </span>
                <div className="flex items-center gap-2">
                  {proposal.is_validated ? (
                    <span className="text-green-400 text-xs">Validé</span>
                  ) : isAdmin ? (
                    <>
                      <button
                        onClick={() => handleValidateProposal(proposal.id)}
                        className="text-green-400 hover:text-green-300 transition-colors"
                        title="Valider"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => handleRejectProposal(proposal.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Refuser"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs">En attente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="mb-4">
          {!showProposalForm ? (
            <button
              onClick={() => setShowProposalForm(true)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              Proposer un joueur pour ce weekend
            </button>
          ) : (
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
              <h4 className="text-white font-semibold mb-3">Proposer un joueur</h4>
              <div className="flex gap-2">
                <select
                  value={selectedProposalPlayer}
                  onChange={(e) => setSelectedProposalPlayer(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Sélectionner un joueur</option>
                  {sortedAllPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.first_name} {player.last_name} {player.has_license && '🚗'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePropose}
                  disabled={!selectedProposalPlayer}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setShowProposalForm(false);
                    setSelectedProposalPlayer('');
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
          <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
            <Users size={18} />
            Équipe 1
          </h4>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <select
                key={`team1-${index}`}
                value={team1Players[index]}
                onChange={(e) => handleTeam1Change(index, e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Joueur {index + 1}</option>
                {sortedPlayersWithLicense.map((player) => (
                  <option key={player.id} value={player.id}>
                    {getPlayerLabel(player)}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
          <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
            <Users size={18} />
            Équipe 2
          </h4>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <select
                key={`team2-${index}`}
                value={team2Players[index]}
                onChange={(e) => handleTeam2Change(index, e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Joueur {index + 1}</option>
                {sortedPlayersWithLicense.map((player) => (
                  <option key={player.id} value={player.id}>
                    {getPlayerLabel(player)}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            {existing ? 'Modifier' : 'Assigner'}
          </button>
          {existing && (
            <button
              onClick={handleDeleteWeekend}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  );
};
