import { useState, useEffect } from 'react';
import { supabase, Player, MatchSchedule as MatchScheduleType } from '../../lib/supabase';
import { 
  Calendar, Trash2, TrendingUp, ChevronLeft, ChevronRight, 
  UserPlus, UserMinus, Edit2, Check, X, Clock, ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const MatchSchedule = () => {
  const [schedules, setSchedules] = useState<MatchScheduleType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextWeekends, setNextWeekends] = useState<{ saturday: string; sunday: string }[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: number }>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    generateNextWeekends();
  }, [monthOffset]);

  const generateNextWeekends = () => {
    const weekends: { saturday: string; sunday: string }[] = [];
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    setCurrentMonth(targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    const lastDay = new Date(year, month + 1, 0);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 6) {
        const saturday = new Date(year, month, day);
        saturday.setHours(12, 0, 0, 0);
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        weekends.push({ saturday: saturday.toISOString().split('T')[0], sunday: sunday.toISOString().split('T')[0] });
      }
    }
    setNextWeekends(weekends);
  };

  const fetchData = async () => {
    try {
      const [schedulesResponse, playersResponse] = await Promise.all([
        supabase.from('match_schedule').select('*').order('match_date', { ascending: false }),
        supabase.from('players').select('*').order('last_name', { ascending: true }),
      ]);
      setSchedules(schedulesResponse.data || []);
      setPlayers(playersResponse.data || []);
      if (schedulesResponse.data) calculatePlayerStats(schedulesResponse.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const calculatePlayerStats = (scheduleData: MatchScheduleType[]) => {
    const stats: { [playerId: string]: number } = {};
    scheduleData.forEach((item) => {
      [item.saturday_person1_id, item.saturday_person2_id, item.saturday_person3_id, item.saturday_person4_id,
       item.sunday_person1_id, item.sunday_person2_id, item.sunday_person3_id, item.sunday_person4_id].forEach((id) => {
        if (id) stats[id] = (stats[id] || 0) + 1;
      });
    });
    setPlayerStats(stats);
  };

  const handleAssignWeekend = async (saturdayDate: string, satPersons: string[], sunPersons: string[]) => {
    const existing = schedules.find(s => s.match_date.startsWith(saturdayDate));
    const updateData = {
      match_date: saturdayDate,
      location: 'A définir',
      saturday_person1_id: satPersons[0] || null,
      saturday_person2_id: satPersons[1] || null,
      saturday_person3_id: satPersons[2] || null,
      saturday_person4_id: satPersons[3] || null,
      sunday_person1_id: sunPersons[0] || null,
      sunday_person2_id: sunPersons[1] || null,
      sunday_person3_id: sunPersons[2] || null,
      sunday_person4_id: sunPersons[3] || null,
    };
    try {
      if (existing) await supabase.from('match_schedule').update(updateData).eq('id', existing.id);
      else await supabase.from('match_schedule').insert(updateData);
      await fetchData();
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette assignation ?')) return;
    await supabase.from('match_schedule').delete().eq('id', id);
    fetchData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const historyData = schedules.filter(s => s.match_date < todayStr);
  const displayedHistory = showAllHistory ? historyData : historyData.slice(0, 10);
  const sortedPlayersByStats = [...players].filter(p => p.scoreboard === true).sort((a, b) => (playerStats[a.id] || 0) - (playerStats[b.id] || 0));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Table de Marque</h2>
        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-sm font-bold text-white min-w-[140px] text-center capitalize flex-1">{currentMonth}</span>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                <Calendar size={20} className="text-green-400" /> Calendrier des tables de marque
              </h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {nextWeekends.map((weekend) => (
                <WeekendRow
                  key={weekend.saturday} 
                  weekend={weekend}
                  existingSchedule={schedules.find(s => s.match_date.startsWith(weekend.saturday))}
                  players={players}
                  playerStats={playerStats}
                  onAssignWeekend={handleAssignWeekend}
                  onDelete={handleDelete}
                  isAdmin={!!user}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 lg:relative min-h-[400px]">
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                <TrendingUp size={20} className="text-green-400" /> Fréquence table de marque
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              <div className="space-y-2">
                {sortedPlayersByStats.map((player) => (
                  <div key={player.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors group">
                    <span className="text-slate-300 text-sm font-medium">{player.first_name} {player.last_name}</span>
                    <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 rounded-lg border border-green-500/20">{playerStats[player.id] || 0}x</span>
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
            <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
              <Clock size={18} className="text-green-400" />Historique des tables de marque</h3>
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
                displayedHistory.map((schedule) => {
                  const names = [
                    schedule.saturday_person1_id, schedule.saturday_person2_id, schedule.saturday_person3_id, schedule.saturday_person4_id,
                    schedule.sunday_person1_id, schedule.sunday_person2_id, schedule.sunday_person3_id, schedule.sunday_person4_id
                  ].filter(Boolean).map(id => {
                    const p = players.find(player => player.id === id);
                    return p ? `${p.first_name} ${p.last_name}` : '';
                  }).filter(Boolean);

                  return (
                    <tr key={schedule.id} className="text-sm hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                        {new Date(schedule.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {names.map((name, i) => (
                            <span key={i} className="bg-slate-900/50 text-slate-300 px-3 py-1 rounded text-xs border border-slate-700 min-w-[120px] text-center">
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      {user && (
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(schedule.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
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
              {showAllHistory ? "Réduire" : `Voir les ${historyData.length - 10} autres week-ends`}
              <ChevronDown size={14} className={showAllHistory ? 'rotate-180' : ''} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface WeekendRowProps {
  weekend: { saturday: string; sunday: string };
  existingSchedule: MatchScheduleType | undefined;
  players: Player[];
  playerStats: { [playerId: string]: number };
  onAssignWeekend: (saturdayDate: string, satPersons: string[], sunPersons: string[]) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const WeekendRow = ({ weekend, existingSchedule, players, playerStats, onAssignWeekend, onDelete, isAdmin }: WeekendRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [satPersons, setSatPersons] = useState<string[]>(['', '', '', '']);
  const [sunPersons, setSunPersons] = useState<string[]>(['', '', '', '']);
  const [satCount, setSatCount] = useState(1);
  const [sunCount, setSunCount] = useState(1);

  useEffect(() => {
    if (existingSchedule) {
      const s1 = [existingSchedule.saturday_person1_id || '', existingSchedule.saturday_person2_id || '', existingSchedule.saturday_person3_id || '', existingSchedule.saturday_person4_id || ''];
      const s2 = [existingSchedule.sunday_person1_id || '', existingSchedule.sunday_person2_id || '', existingSchedule.sunday_person3_id || '', existingSchedule.sunday_person4_id || ''];
      setSatPersons(s1); setSunPersons(s2);
      setSatCount(Math.max(1, s1.filter(Boolean).length));
      setSunCount(Math.max(1, s2.filter(Boolean).length));
    } else {
      setSatPersons(['', '', '', '']); setSunPersons(['', '', '', '']);
      setSatCount(1); setSunCount(1);
    }
    setIsEditing(false);
  }, [existingSchedule, weekend.saturday]);

  const handleSave = () => { onAssignWeekend(weekend.saturday, satPersons, sunPersons); setIsEditing(false); };

  const handleRemovePerson = (day: 'sat' | 'sun', index: number) => {
    if (day === 'sat') {
      const newP = [...satPersons]; newP.splice(index, 1); newP.push('');
      setSatPersons(newP); setSatCount(prev => Math.max(1, prev - 1));
    } else {
      const newP = [...sunPersons]; newP.splice(index, 1); newP.push('');
      setSunPersons(newP); setSunCount(prev => Math.max(1, prev - 1));
    }
  };

  const renderDisplay = (personIds: string[]) => {
    const assigned = personIds.filter(Boolean).map(id => players.find(p => p.id === id)).filter(Boolean);
    if (assigned.length === 0) return <span className="text-slate-500 italic text-sm">Libre</span>;
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
    <div className={`p-4 rounded-xl border transition-all ${existingSchedule ? 'bg-slate-900/60 border-slate-700 shadow-md' : 'bg-slate-900/20 border-slate-800 border-dashed'}`}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-white font-bold text-sm">Week-end du {new Date(weekend.saturday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Samedi {new Date(weekend.saturday).getDate()}</p>
          {isEditing ? (
            <div className="space-y-2">
              {Array.from({ length: satCount }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <select value={satPersons[i] || ''} onChange={(e) => { const newP = [...satPersons]; newP[i] = e.target.value; setSatPersons(newP); }} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="">Choisir...</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id} disabled={satPersons.some((id, idx) => id === p.id && idx !== i)}>{p.first_name} {p.last_name} ({playerStats[p.id] || 0}x)</option>
                    ))}
                  </select>
                  {satCount > 1 && <button onClick={() => handleRemovePerson('sat', i)} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16} /></button>}
                </div>
              ))}
              {satCount < 4 && <button onClick={() => setSatCount(satCount + 1)} className="text-[10px] text-blue-400 flex items-center gap-1"><UserPlus size={14} /> Ajouter</button>}
            </div>
          ) : renderDisplay(satPersons)}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dimanche {new Date(weekend.sunday).getDate()}</p>
          {isEditing ? (
            <div className="space-y-2">
              {Array.from({ length: sunCount }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <select key={i} value={sunPersons[i] || ''} onChange={(e) => { const newP = [...sunPersons]; newP[i] = e.target.value; setSunPersons(newP); }} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="">Choisir...</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id} disabled={sunPersons.some((id, idx) => id === p.id && idx !== i)}>{p.first_name} {p.last_name} ({playerStats[p.id] || 0}x)</option>
                    ))}
                  </select>
                  {sunCount > 1 && <button onClick={() => handleRemovePerson('sun', i)} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16} /></button>}
                </div>
              ))}
              {sunCount < 4 && <button onClick={() => setSunCount(sunCount + 1)} className="text-[10px] text-blue-400 flex items-center gap-1"><UserPlus size={14} /> Ajouter</button>}
            </div>
          ) : renderDisplay(sunPersons)}
        </div>
      </div>
      {isEditing && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-700">
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors"><Check size={16} /> Valider</button>
          <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"><X size={16} /></button>
          {existingSchedule && <button onClick={() => onDelete(existingSchedule.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"><Trash2 size={16} /></button>}
        </div>
      )}
    </div>
  );
};