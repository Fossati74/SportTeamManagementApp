import { useState, useEffect } from 'react';
import { supabase, Carpool, Player, CarpoolProposal } from '../../lib/supabase';
import { 
  Car, Users, ChevronLeft, ChevronRight, UserPlus, UserMinus,
  Check, X, Trash2, Clock, TrendingUp, AlertCircle, Edit2, ChevronDown, Calendar 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const CarpoolManager = () => {
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [proposals, setProposals] = useState<(CarpoolProposal & { players?: Player })[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
  const [weekends, setWeekends] = useState<Date[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
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
        supabase.from('carpools').select('*').order('weekend_date', { ascending: false }),
        supabase.from('players').select('*').order('last_name', { ascending: true }),
        supabase.from('carpool_proposals').select('*, players(*)').order('created_at', { ascending: false }),
      ]);

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
    setCurrentMonth(targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 6) {
        date.setHours(12, 0, 0, 0);
        saturdays.push(date);
      }
    }
    setWeekends(saturdays);
  };

  const getPlayerAssignmentCount = (playerId: string) => {
    return carpools.reduce((acc, carpool) => {
      const ids = [
        carpool.team1_player1_id, carpool.team1_player2_id, carpool.team1_player3_id, carpool.team1_player4_id, carpool.team1_player5_id,
        carpool.team2_player1_id, carpool.team2_player2_id, carpool.team2_player3_id, carpool.team2_player4_id, carpool.team2_player5_id,
      ];
      return acc + (ids.includes(playerId) ? 1 : 0);
    }, 0);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const historyData = carpools.filter(c => c.weekend_date && c.weekend_date < todayStr);
  const displayedHistory = showAllHistory ? historyData : historyData.slice(0, 10);

  const sortedPlayersByCount = [...players]
    .filter(p => p.carpooling === true)
    .sort((a, b) => getPlayerAssignmentCount(a.id) - getPlayerAssignmentCount(b.id));

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce covoiturage ?')) return;
    await supabase.from('carpools').delete().eq('id', id);
    fetchData();
  };

  const handleAssignTeam = async (weekendDate: string, teamData: any) => {
    const existing = carpools.find(c => c.weekend_date && c.weekend_date.startsWith(weekendDate));
    if (existing) {
      await supabase.from('carpools').update(teamData).eq('id', existing.id);
    } else {
      await supabase.from('carpools').insert({ weekend_date: weekendDate, ...teamData });
    }
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"> Covoiturage
        </h2>
        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-sm font-bold text-white min-w-[140px] text-center capitalize flex-1">{currentMonth}</span>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700 shadow-xl h-full flex flex-col">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 underline decoration-green-500 underline-offset-8">
              <Calendar size={20} className="text-green-500" /> Calendrier des covoiturages
            </h3>
            <div className="space-y-4">
              {weekends.map((weekend) => {
                const dateStr = weekend.toISOString().split('T')[0];
                return (
                  <WeekendCard
                    key={dateStr}
                    weekendDate={dateStr}
                    existing={carpools.find((c) => c.weekend_date && c.weekend_date.startsWith(dateStr))}
                    players={players}
                    proposals={proposals.filter(p => p.weekend_date === dateStr)}
                    onAssign={handleAssignTeam}
                    onRefresh={fetchData}
                    isAdmin={!!user}
                    playerStats={players.reduce((acc, p) => ({ ...acc, [p.id]: getPlayerAssignmentCount(p.id) }), {})}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 lg:relative min-h-[400px]">
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl p-6 border border-slate-700 h-full shadow-xl flex flex-col overflow-hidden">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 shrink-0">
              <TrendingUp size={20} className="text-green-500" /> Fréquence covoiturage
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                {sortedPlayersByCount.map((player) => (
                  <div key={player.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors">
                    <span className="text-slate-300 text-sm">{player.first_name} {player.last_name}</span>
                    <span className="text-green-400 font-bold text-xs">{getPlayerAssignmentCount(player.id)}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Historique complet</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Date du week-end</th>
                <th className="px-6 py-4 font-bold">Personnes assignées</th>
                {user && <th className="px-6 py-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedHistory.length === 0 ? (
                <tr>
                  <td colSpan={user ? 3 : 2} className="px-6 py-10 text-center text-slate-500 italic text-sm">Aucun historique disponible</td>
                </tr>
              ) : (
                displayedHistory.map((item) => {
                  const assignedIds = [
                    item.team1_player1_id, item.team1_player2_id, item.team1_player3_id, item.team1_player4_id, item.team1_player5_id,
                    item.team2_player1_id, item.team2_player2_id, item.team2_player3_id, item.team2_player4_id, item.team2_player5_id,
                  ].filter(Boolean);

                  return (
                    <tr key={item.id} className="text-sm hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                        {item.weekend_date ? new Date(item.weekend_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {assignedIds.map((id, i) => {
                            const p = players.find(player => player.id === id);
                            return p ? (
                              <span key={i} className="bg-slate-900/50 text-slate-300 px-3 py-1 rounded text-xs border border-slate-700 min-w-[120px] text-center">
                                {p.first_name} {p.last_name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </td>
                      {user && (
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {historyData.length > 10 && (
          <div className="p-4 bg-slate-900/20 border-t border-slate-700 text-center">
            <button onClick={() => setShowAllHistory(!showAllHistory)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto">
              {showAllHistory ? "Réduire" : `Voir les ${historyData.length - 10} autres`}
              <ChevronDown size={14} className={showAllHistory ? 'rotate-180' : ''} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface WeekendCardProps {
  weekendDate: string;
  existing: Carpool | undefined;
  players: Player[];
  proposals: (CarpoolProposal & { players?: Player })[];
  onAssign: (weekendDate: string, teamData: any) => void;
  onRefresh: () => void;
  isAdmin: boolean;
  playerStats: Record<string, number>;
  onDelete: (id: string) => void;
}

const WeekendCard = ({ weekendDate, existing, players, proposals, onRefresh, isAdmin, playerStats, onDelete, onAssign }: WeekendCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [team1, setTeam1] = useState<string[]>(['']);
  const [team2, setTeam2] = useState<string[]>(['']);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedProposalPlayer, setSelectedProposalPlayer] = useState('');

  useEffect(() => {
    if (existing) {
      const t1 = [existing.team1_player1_id, existing.team1_player2_id, existing.team1_player3_id, existing.team1_player4_id, existing.team1_player5_id].filter(Boolean) as string[];
      const t2 = [existing.team2_player1_id, existing.team2_player2_id, existing.team2_player3_id, existing.team2_player4_id, existing.team2_player5_id].filter(Boolean) as string[];
      setTeam1(t1.length > 0 ? t1 : ['']);
      setTeam2(t2.length > 0 ? t2 : ['']);
    } else {
      setTeam1(['']); setTeam2(['']);
    }
    setIsEditing(false);
  }, [existing, weekendDate]);

  const handleSave = () => {
    const data: any = {};
    for(let i=1; i<=5; i++) { data[`team1_player${i}_id`] = team1[i-1] || null; }
    for(let i=1; i<=5; i++) { data[`team2_player${i}_id`] = team2[i-1] || null; }
    onAssign(weekendDate, data);
    setIsEditing(false);
  };

  const handlePropose = async () => {
    if (!selectedProposalPlayer) return;
    await supabase.from('carpool_proposals').insert({ weekend_date: weekendDate, player_id: selectedProposalPlayer });
    setShowProposalForm(false);
    setSelectedProposalPlayer('');
    onRefresh();
  };

  const handleValidateProposal = async (proposal: any) => {
    if (!existing) {
      onAssign(weekendDate, { team1_player1_id: proposal.player_id });
    } else {
      const cols = ['team1_player1_id', 'team1_player2_id', 'team1_player3_id', 'team1_player4_id', 'team1_player5_id', 'team2_player1_id', 'team2_player2_id', 'team2_player3_id', 'team2_player4_id', 'team2_player5_id'];
      const firstEmpty = cols.find(c => !(existing as any)[c]);
      if (firstEmpty) await supabase.from('carpools').update({ [firstEmpty]: proposal.player_id }).eq('id', existing.id);
    }
    await supabase.from('carpool_proposals').delete().eq('id', proposal.id);
    onRefresh();
  };

  const renderNames = (ids: string[]) => {
    const assigned = ids.filter(Boolean).map(id => players.find(player => player.id === id)).filter(Boolean);
    if (assigned.length === 0) return <span className="text-slate-500 italic text-sm">Non défini</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {assigned.map((p, i) => (
          <span key={i} className="bg-slate-700/50 text-white px-4 py-1.5 rounded-full text-xs border border-slate-600 min-w-[120px] text-center">
            {p?.first_name} {p?.last_name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${existing ? 'bg-slate-900/60 border-slate-700 shadow-md' : 'bg-slate-900/20 border-slate-800 border-dashed'}`}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-white font-bold text-sm">Week-end du {new Date(weekendDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
        )}
      </div>

      {proposals.length > 0 && isAdmin && !isEditing && (
        <div className="mb-4 space-y-2">
          {proposals.map((p) => (
            <div key={p.id} className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg flex items-center justify-between">
               <span className="text-yellow-500 text-xs font-bold">{p.players?.first_name} est volontaire</span>
               <div className="flex gap-2">
                <button onClick={() => handleValidateProposal(p)} className="p-1 text-green-500 hover:bg-green-500/20 rounded"><Check size={16}/></button>
                <button onClick={async () => { await supabase.from('carpool_proposals').delete().eq('id', p.id); onRefresh(); }} className="p-1 text-red-500 hover:bg-red-500/20 rounded"><X size={16}/></button>
               </div>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && (
        <div className="mb-4">
          {!showProposalForm ? (
            <button onClick={() => setShowProposalForm(true)} className="w-full py-2 bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-yellow-600/30">
              <UserPlus size={16} /> Je suis disponible pour covoiturer
            </button>
          ) : (
            <div className="flex gap-2">
               <select value={selectedProposalPlayer} onChange={(e) => setSelectedProposalPlayer(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">Sélectionner votre nom</option>
                  {players.filter((p: Player) => p.carpooling).map((p: Player) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
               </select>
               <button onClick={handlePropose} className="p-2 bg-green-600 text-white rounded-lg"><Check size={16}/></button>
               <button onClick={() => setShowProposalForm(false)} className="p-2 bg-slate-700 text-white rounded-lg"><X size={16}/></button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users size={14} className="text-green-500" /> Voiture 1</p>
          {isEditing ? (
            <div className="space-y-2">
              {team1.map((id, i) => (
                <div key={i} className="flex gap-2">
                  <select value={id} onChange={e => { const n = [...team1]; n[i] = e.target.value; setTeam1(n); }} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="">Choisir...</option>
                    {players.filter((p: Player) => p.carpooling).map((p: Player) => {
                        const isChosen = [...team1, ...team2].some((cid) => cid === p.id && id !== p.id);
                        return <option key={p.id} value={p.id} disabled={isChosen}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x) {isChosen ? '(Déjà choisi)' : ''}</option>
                    })}
                  </select>
                  {team1.length > 1 && <button onClick={() => setTeam1(team1.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16} /></button>}
                </div>
              ))}
              {team1.length < 5 && <button onClick={() => setTeam1([...team1, ''])} className="text-[10px] text-blue-400 flex items-center gap-1 hover:text-blue-300 font-medium py-1"><UserPlus size={14} /> Ajouter</button>}
            </div>
          ) : renderNames(team1)}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users size={14} className="text-blue-500" /> Voiture 2</p>
          {isEditing ? (
            <div className="space-y-2">
              {team2.map((id, i) => (
                <div key={i} className="flex gap-2">
                  <select value={id} onChange={e => { const n = [...team2]; n[i] = e.target.value; setTeam2(n); }} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="">Choisir...</option>
                    {players.filter((p: Player) => p.carpooling).map((p: Player) => {
                        const isChosen = [...team1, ...team2].some((cid) => cid === p.id && id !== p.id);
                        return <option key={p.id} value={p.id} disabled={isChosen}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x) {isChosen ? '(Déjà choisi)' : ''}</option>
                    })}
                  </select>
                  {team2.length > 1 && <button onClick={() => setTeam2(team2.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16} /></button>}
                </div>
              ))}
              {team2.length < 5 && <button onClick={() => setTeam2([...team2, ''])} className="text-[10px] text-blue-400 flex items-center gap-1 hover:text-blue-300 font-medium py-1"><UserPlus size={14} /> Ajouter</button>}
            </div>
          ) : renderNames(team2)}
        </div>
      </div>

      {isEditing && (
        <div className="mt-6 pt-4 border-t border-slate-700 flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
            <Check size={16} /> Valider les options
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"><X size={16} /></button>
          {existing && <button onClick={() => onDelete(existing.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"><Trash2 size={16} /></button>}
        </div>
      )}
    </div>
  );
};