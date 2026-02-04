import { useState, useEffect } from 'react';
import { supabase, Carpool, Player, CarpoolProposal } from '../../lib/supabase';
import { 
  Plus, TrendingUp, Trash2, Calendar, Clock, X,
  ChevronLeft, ChevronRight, UserPlus, UserMinus,
  Check, Edit2, ChevronDown, Users 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
    .filter((p: Player) => p.carpooling === true)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Covoiturage</h2>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
            <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
            <span className="text-sm font-bold text-white min-w-[120px] text-center capitalize flex-1">{currentMonth}</span>
            <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                <Calendar size={20} className="text-green-400" /> Calendrier des covoiturages
              </h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
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
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                <TrendingUp size={20} className="text-green-400" /> Fréquence covoiturage
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              <div className="space-y-2">
                {sortedPlayersByCount.map((player: Player) => (
                  <div key={player.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors group">
                    <span className="text-slate-300 text-sm font-medium">{player.first_name} {player.last_name}</span>
                    <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 rounded-lg border border-green-500/20">
                      {getPlayerAssignmentCount(player.id)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase"><Clock size={18} className="text-green-400" /> Historique des covoiturages</h3>
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
                  <td colSpan={user ? 3 : 2} className="px-6 py-12 text-center text-slate-500 italic text-sm">Aucun historique disponible</td>
                </tr>
              ) : (
                displayedHistory.map((item) => {
                  const assignedIds = [
                    item.team1_player1_id, item.team1_player2_id, item.team1_player3_id, item.team1_player4_id, item.team1_player5_id,
                    item.team2_player1_id, item.team2_player2_id, item.team2_player3_id, item.team2_player4_id, item.team2_player5_id,
                  ].filter(Boolean);

                  return (
                    <tr key={item.id} className="text-sm hover:bg-slate-700/20 transition-colors group">
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                        {item.weekend_date ? new Date(item.weekend_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {assignedIds.map((id, i) => {
                            const p = players.find((player: Player) => player.id === id);
                            return p ? (
                              <span key={i} className="bg-slate-900/50 text-slate-300 px-3 py-1 rounded-lg text-xs border border-slate-700 min-w-[120px] text-center">
                                {p.first_name} {p.last_name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </td>
                      {user && (
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
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
            <button onClick={() => setShowAllHistory(!showAllHistory)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto uppercase tracking-widest">
              {showAllHistory ? "Réduire" : `Voir les ${historyData.length - 10} autres`}
              <ChevronDown size={14} className={showAllHistory ? 'rotate-180' : ''} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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
    const assigned = ids.filter(Boolean).map(id => players.find((player: Player) => player.id === id)).filter(Boolean);
    if (assigned.length === 0) return <span className="text-slate-500 italic text-xs">Non défini</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {assigned.map((p, i) => (
          <span key={i} className="bg-slate-700/50 text-white px-4 py-1.5 rounded-xl text-[11px] font-bold border border-slate-600 min-w-[110px] text-center">
            {p?.first_name} {p?.last_name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all ${existing ? 'bg-slate-900/60 border-slate-700 shadow-lg' : 'bg-slate-900/20 border-slate-800 border-dashed'}`}>
      <div className="flex justify-between items-center mb-5">
        <p className="text-white font-bold text-sm uppercase tracking-wide">Week-end du {new Date(weekendDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"><Edit2 size={16} /></button>
        )}
      </div>

      {proposals.length > 0 && isAdmin && !isEditing && (
        <div className="mb-4 space-y-2">
          {proposals.map((p) => (
            <div key={p.id} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
               <span className="text-amber-500 text-xs font-bold uppercase tracking-tight">{p.players?.first_name} est volontaire</span>
               <div className="flex gap-2">
                <button onClick={() => handleValidateProposal(p)} className="p-1.5 text-green-500 hover:bg-green-500/20 rounded-lg"><Check size={16}/></button>
                <button onClick={async () => { await supabase.from('carpool_proposals').delete().eq('id', p.id); onRefresh(); }} className="p-1.5 text-red-500 hover:bg-red-500/20 rounded-lg"><X size={16}/></button>
               </div>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && (
        <div className="mb-5">
          {!showProposalForm ? (
            <button onClick={() => setShowProposalForm(true)} className="w-full py-2.5 bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-600/30 transition-all uppercase tracking-widest">
              <UserPlus size={16} /> Je suis disponible
            </button>
          ) : (
            <div className="flex gap-2">
               <select value={selectedProposalPlayer} onChange={(e) => setSelectedProposalPlayer(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Sélectionner votre nom</option>
                  {players.filter((p: Player) => p.carpooling).map((p: Player) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
               </select>
               <button onClick={handlePropose} className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all"><Check size={18}/></button>
               <button onClick={() => setShowProposalForm(false)} className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all"><X size={18}/></button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 underline decoration-green-500/30 underline-offset-4"><Users size={14} className="text-green-500" /> Voiture 1</p>
          {isEditing ? (
            <div className="space-y-2">
              {team1.map((id, i) => (
                <div key={i} className="flex gap-2">
                  <select value={id} onChange={e => { const n = [...team1]; n[i] = e.target.value; setTeam1(n); }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Choisir...</option>
                    {players.filter((p: Player) => p.carpooling).map((p: Player) => {
                        const isChosen = [...team1, ...team2].some((cid) => cid === p.id && id !== p.id);
                        return <option key={p.id} value={p.id} disabled={isChosen}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x) {isChosen ? '(Occupé)' : ''}</option>
                    })}
                  </select>
                  {team1.length > 1 && <button onClick={() => setTeam1(team1.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16} /></button>}
                </div>
              ))}
              {team1.length < 5 && <button onClick={() => setTeam1([...team1, ''])} className="text-[10px] text-green-400 flex items-center gap-1 hover:text-green-300 font-bold uppercase tracking-tighter py-1 transition-all"><Plus size={12} /> Ajouter un passager</button>}
            </div>
          ) : renderNames(team1)}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 underline decoration-blue-500/30 underline-offset-4"><Users size={14} className="text-blue-500" /> Voiture 2</p>
          {isEditing ? (
            <div className="space-y-2">
              {team2.map((id, i) => (
                <div key={i} className="flex gap-2">
                  <select value={id} onChange={e => { const n = [...team2]; n[i] = e.target.value; setTeam2(n); }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Choisir...</option>
                    {players.filter((p: Player) => p.carpooling).map((p: Player) => {
                        const isChosen = [...team1, ...team2].some((cid) => cid === p.id && id !== p.id);
                        return <option key={p.id} value={p.id} disabled={isChosen}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x) {isChosen ? '(Occupé)' : ''}</option>
                    })}
                  </select>
                  {team2.length > 1 && <button onClick={() => setTeam2(team2.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16} /></button>}
                </div>
              ))}
              {team2.length < 5 && <button onClick={() => setTeam2([...team2, ''])} className="text-[10px] text-blue-400 flex items-center gap-1 hover:text-blue-300 font-bold uppercase tracking-tighter py-1 transition-all"><Plus size={12} /> Ajouter un passager</button>}
            </div>
          ) : renderNames(team2)}
        </div>
      </div>

      {isEditing && (
        <div className="mt-6 pt-5 border-t border-slate-800 flex gap-3">
          <button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-green-900/20">
            <Check size={18} /> Valider
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all"><X size={18} /></button>
          {existing && <button onClick={() => onDelete(existing.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 border border-red-500/20 transition-all"><Trash2 size={18} /></button>}
        </div>
      )}
    </div>
  );
};