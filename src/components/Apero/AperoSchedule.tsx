import { useState, useEffect } from 'react';
import { supabase, Player, AperoSchedule as AperoScheduleType } from '../../lib/supabase';
import { 
  Calendar, Trash2, ChevronLeft, ChevronRight, 
  MessageSquare, Edit2, Check, X, UserPlus, UserMinus, ChevronDown, Sparkles, Clock, TrendingUp 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AperoSchedule = () => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextThursdays, setNextThursdays] = useState<string[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: number }>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    generateNextThursdays();
  }, [monthOffset]);

  const fetchData = async () => {
    try {
      const { data: scheduleData } = await supabase.from('apero_schedule').select(`
          *,
          person1:person1_id(*),
          person2:person2_id(*),
          person3:person3_id(*)
        `).order('date', { ascending: false });
        
      const { data: playersData } = await supabase.from('players').select('*').order('last_name', { ascending: true });
      
      setSchedule(scheduleData || []);
      setPlayers(playersData || []);
      
      const stats: { [playerId: string]: number } = {};
      scheduleData?.forEach((item: any) => {
        if (item.person1_id) stats[item.person1_id] = (stats[item.person1_id] || 0) + 1;
        if (item.person2_id) stats[item.person2_id] = (stats[item.person2_id] || 0) + 1;
        if (item.person3_id) stats[item.person3_id] = (stats[item.person3_id] || 0) + 1;
      });
      setPlayerStats(stats);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const generateNextThursdays = () => {
    const thursdays: string[] = [];
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    setCurrentMonth(targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    const lastDay = new Date(year, month + 1, 0);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 4) {
        date.setHours(12, 0, 0, 0);
        thursdays.push(date.toISOString().split('T')[0]);
      }
    }
    setNextThursdays(thursdays);
  };

  const handleAutoAssign = async () => {
    const availablePlayers = players.filter(p => p.thursday_aperitif === true);
    if (availablePlayers.length < 2) return;
    const unassignedThursdays = nextThursdays.filter(date => !schedule.find(s => s.date === date));
    if (unassignedThursdays.length === 0) return;
    setLoading(true);
    const currentStats = { ...playerStats };
    for (const date of unassignedThursdays) {
      const sorted = [...availablePlayers].sort((a, b) => (currentStats[a.id] || 0) - (currentStats[b.id] || 0));
      await supabase.from('apero_schedule').insert({ date, person1_id: sorted[0].id, person2_id: sorted[1].id });
      currentStats[sorted[0].id] = (currentStats[sorted[0].id] || 0) + 1;
      currentStats[sorted[1].id] = (currentStats[sorted[1].id] || 0) + 1;
    }
    await fetchData();
  };

  const handleAssign = async (date: string, p1: string, p2: string, p3: string) => {
    const existing = schedule.find(s => s.date === date);
    const data = { date, person1_id: p1 || null, person2_id: p2 || null, person3_id: p3 || null };
    if (existing) await supabase.from('apero_schedule').update(data).eq('id', existing.id);
    else await supabase.from('apero_schedule').insert(data);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette ligne ?')) return;
    await supabase.from('apero_schedule').delete().eq('id', id);
    fetchData();
  };

  const handleWhatsAppShare = (item: any) => {
    const dateStr = new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const responsibles = [item.person1, item.person2, item.person3].filter(p => p);
    const getLevenshteinDistance = (a: string, b: string): number => {
      const tmp = [];
      for (let i = 0; i <= a.length; i++) tmp[i] = [i];
      for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(tmp[i-1][j]+1, tmp[i][j-1]+1, tmp[i-1][j-1]+(a[i-1].toLowerCase()===b[j-1].toLowerCase()?0:1));
        }
      }
      return tmp[a.length][b.length];
    };
    let msg = `*RAPPEL APÉRO DU JEUDI*\n\nSalut ! Petit rappel pour l'apéro de ce *${dateStr}*.\n\n`;
    if (responsibles.length > 0) {
      const formattedNames = responsibles.map((p) => {
        const competitors = players.filter(player => player.id !== p.id && getLevenshteinDistance(player.first_name, p.first_name) <= 1);
        let displayName = p.first_name;
        if (competitors.length > 0) {
          const initialConflict = competitors.some(other => other.last_name.charAt(0).toUpperCase() === p.last_name.charAt(0).toUpperCase());
          displayName = initialConflict ? `${p.first_name} ${p.last_name}` : `${p.first_name} ${p.last_name.charAt(0).toUpperCase()}.`;
        }
        return `*${displayName}*`;
      });
      msg += `Les responsables désignés sont : ${formattedNames.join(', ').replace(/, ([^,]*)$/, ' et $1')}.`;
    }
    msg += `\n\nÀ jeudi !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const historyData = schedule.filter(item => item.date < todayStr);
  const displayedHistory = showAllHistory ? historyData : historyData.slice(0, 10);
  const sortedPlayersByStats = [...players].filter(p => p.thursday_aperitif === true).sort((a, b) => (playerStats[a.id] || 0) - (playerStats[b.id] || 0));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Apéro du Jeudi</h2>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {user && (
            <button onClick={handleAutoAssign} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg w-full sm:w-auto justify-center">
              <Sparkles size={18} /> Auto-Assigner
            </button>
          )}
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
                <Calendar size={20} className="text-green-400" /> Calendrier des Jeudis
              </h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {nextThursdays.map(date => (
                <ThursdayRow key={date} date={date} existing={schedule.find(s => s.date === date)} players={players.filter(p => p.thursday_aperitif === true)} playerStats={playerStats} onAssign={handleAssign} onDelete={handleDelete} onWhatsApp={handleWhatsAppShare} isAdmin={!!user} />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 lg:relative min-h-[400px]">
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                <TrendingUp size={20} className="text-green-400" /> Fréquence d'apéro
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              <div className="space-y-2">
                {sortedPlayersByStats.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors group">
                    <span className="text-slate-300 text-sm font-medium">{p.first_name} {p.last_name}</span>
                    <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 rounded-lg border border-green-500/20">{playerStats[p.id] || 0}x</span>
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
            <Clock size={18} className="text-green-400" /> Historique des apéros</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Responsables</th>
                {user && <th className="px-6 py-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedHistory.map(item => (
                <tr key={item.id} className="text-sm hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">{new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {[item.person1, item.person2, item.person3].filter(p => p).map((p, i) => (
                        <span key={i} className="bg-slate-900/50 text-slate-300 px-3 py-1 rounded text-xs border border-slate-700 min-w-[120px] text-center">
                          {p.first_name} {p.last_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  {user && <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={16} /></button></td>}
                </tr>
              ))}
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

const ThursdayRow = ({ date, existing, players, playerStats, onAssign, onDelete, onWhatsApp, isAdmin }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [p1, setP1] = useState(existing?.person1_id || '');
  const [p2, setP2] = useState(existing?.person2_id || '');
  const [p3, setP3] = useState(existing?.person3_id || '');
  const [visibleCount, setVisibleCount] = useState(existing?.person3_id ? 3 : (existing?.person2_id ? 2 : 1));

  useEffect(() => {
    setP1(existing?.person1_id || ''); setP2(existing?.person2_id || ''); setP3(existing?.person3_id || '');
    setVisibleCount(existing?.person3_id ? 3 : (existing?.person2_id ? 2 : 1));
  }, [existing]);

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const renderDisplay = () => {
    const assigned = [existing?.person1, existing?.person2, existing?.person3].filter(p => p);
    if (assigned.length === 0) return <span className="text-slate-500 italic text-sm">Libre - Aucun désigné</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {assigned.map((p, i) => (
          <span key={i} className="bg-slate-700/50 text-white px-4 py-1.5 rounded-full text-xs border border-slate-600 min-w-[120px] text-center">
            {p.first_name} {p.last_name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${existing ? 'bg-slate-900/60 border-slate-700 shadow-md' : 'bg-slate-900/20 border-slate-800 border-dashed'}`}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <p className="text-white font-bold text-sm capitalize flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${existing ? 'bg-green-500' : 'bg-slate-600'}`}></span>
            {displayDate}
          </p>
          {!isEditing && isAdmin && (
            <div className="flex gap-1">
              {existing && <button onClick={() => onWhatsApp(existing)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-all"><MessageSquare size={18} /></button>}
              <button onClick={() => setIsEditing(true)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"><Edit2 size={18} /></button>
            </div>
          )}
        </div>
        <div className="w-full">
          {isEditing ? (
            <div className="space-y-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <div className="space-y-2">
                <select value={p1} onChange={e => setP1(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none">
                  <option value="">Responsable 1</option>
                  {players.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x)</option>)}
                </select>
                {visibleCount >= 2 && (
                  <div className="flex gap-2">
                    <select value={p2} onChange={e => setP2(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                      <option value="">Responsable 2</option>
                      {players.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x)</option>)}
                    </select>
                    <button onClick={() => { setP2(''); setVisibleCount(1); }} className="p-2 text-slate-500"><UserMinus size={16} /></button>
                  </div>
                )}
                {visibleCount >= 3 && (
                  <div className="flex gap-2">
                    <select value={p3} onChange={e => setP3(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                      <option value="">Responsable 3</option>
                      {players.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({playerStats[p.id]||0}x)</option>)}
                    </select>
                    <button onClick={() => { setP3(''); setVisibleCount(2); }} className="p-2 text-slate-500"><UserMinus size={16} /></button>
                  </div>
                )}
              </div>
              {visibleCount < 3 && <button onClick={() => setVisibleCount(prev => prev + 1)} className="flex items-center gap-2 text-[10px] text-blue-400 hover:text-blue-300 font-medium py-1"><UserPlus size={14} /> Ajouter</button>}
              <div className="flex gap-2 pt-2 border-t border-slate-700">
                <button onClick={() => { onAssign(date, p1, p2, p3); setIsEditing(false); }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors"><Check size={16} /> Enregistrer</button>
                <button onClick={() => { setIsEditing(false); }} className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"><X size={16} /></button>
                {existing && <button onClick={() => { onDelete(existing.id); setIsEditing(false); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"><Trash2 size={16} /></button>}
              </div>
            </div>
          ) : renderDisplay()}
        </div>
      </div>
    </div>
  );
};