import { useState, useEffect } from 'react';
import { supabase, Player, AperoSchedule as AperoScheduleType } from '../../lib/supabase';
import { Calendar, Trash2, Wand2, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AperoSchedule = () => {
  const [schedule, setSchedule] = useState<AperoScheduleType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextThursdays, setNextThursdays] = useState<string[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: number }>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    generateNextThursdays();
  }, [monthOffset]);

  const generateNextThursdays = () => {
    const thursdays: string[] = [];
    const today = new Date();

    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    setCurrentMonth(targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

    const firstDay = new Date(year, month, 1);
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

  const fetchData = async () => {
    try {
      const [scheduleResponse, playersResponse] = await Promise.all([
        supabase
          .from('apero_schedule')
          .select(`
            *,
            person1:person1_id(id, first_name, last_name, photo_url, email),
            person2:person2_id(id, first_name, last_name, photo_url, email)
          `)
          .order('date', { ascending: true }),
        supabase
          .from('players')
          .select('*')
          .order('last_name', { ascending: true }),
      ]);

      if (scheduleResponse.error) throw scheduleResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      const scheduleData = scheduleResponse.data || [];
      setSchedule(scheduleData);
      setPlayers(playersResponse.data || []);

      calculatePlayerStats(scheduleData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = (scheduleData: AperoScheduleType[]) => {
    const stats: { [playerId: string]: number } = {};

    scheduleData.forEach((item) => {
      if (item.person1_id) {
        stats[item.person1_id] = (stats[item.person1_id] || 0) + 1;
      }
      if (item.person2_id) {
        stats[item.person2_id] = (stats[item.person2_id] || 0) + 1;
      }
    });

    setPlayerStats(stats);
  };

  const handleAssign = async (date: string, person1Id: string, person2Id: string) => {
    if (!person1Id && !person2Id) {
      alert('Veuillez sélectionner au moins une personne');
      return;
    }

    try {
      const existing = schedule.find(s => s.date === date);

      if (existing) {
        const { error } = await supabase
          .from('apero_schedule')
          .update({
            person1_id: person1Id || null,
            person2_id: person2Id || null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('apero_schedule')
          .insert({
            date,
            person1_id: person1Id || null,
            person2_id: person2Id || null,
          });

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error('Error assigning:', error);
    }
  };

  const handleAutoAssign = async () => {
    const nonCoachPlayers = players.filter(p => !p.is_coach);
    if (nonCoachPlayers.length < 2) {
      alert('Pas assez de joueurs disponibles');
      return;
    }

    try {
      const sortedPlayers = [...nonCoachPlayers].sort((a, b) => {
        const countA = playerStats[a.id] || 0;
        const countB = playerStats[b.id] || 0;
        return countA - countB;
      });

      for (let i = 0; i < nextThursdays.length; i++) {
        const date = nextThursdays[i];
        const existing = schedule.find(s => s.date === date);

        if (!existing) {
          const person1 = sortedPlayers[i * 2 % sortedPlayers.length];
          const person2 = sortedPlayers[(i * 2 + 1) % sortedPlayers.length];

          const { error } = await supabase
            .from('apero_schedule')
            .insert({
              date,
              person1_id: person1.id,
              person2_id: person2.id,
            });

          if (error) throw error;
        }
      }

      fetchData();
    } catch (error) {
      console.error('Error auto-assigning:', error);
      alert('Erreur lors de l\'assignation automatique');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette assignation ?')) return;

    try {
      const { error } = await supabase
        .from('apero_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleSendNotification = async (item: AperoScheduleType) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      alert('Configuration manquante pour l\'envoi d\'emails');
      return;
    }

    try {
      const person1 = item.person1;
      const person2 = item.person2;
      const dateFormatted = new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      if (person1?.email) {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: person1.email,
            subject: `Apéro du Jeudi - ${dateFormatted}`,
            message: `Bonjour ${person1.first_name},\n\nVous êtes désigné pour l'apéro du ${dateFormatted}${person2 ? ` avec ${person2.first_name} ${person2.last_name}` : ''}.\n\nÀ jeudi !`,
            playerName: `${person1.first_name} ${person1.last_name}`,
            action: 'apero_assignment',
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de l\'envoi de la notification');
        }
      }

      if (person2?.email) {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: person2.email,
            subject: `Apéro du Jeudi - ${dateFormatted}`,
            message: `Bonjour ${person2.first_name},\n\nVous êtes désigné pour l'apéro du ${dateFormatted}${person1 ? ` avec ${person1.first_name} ${person1.last_name}` : ''}.\n\nÀ jeudi !`,
            playerName: `${person2.first_name} ${person2.last_name}`,
            action: 'apero_assignment',
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de l\'envoi de la notification');
        }
      }

      alert('Notifications envoyées avec succès !');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Erreur lors de l\'envoi des notifications');
    }
  };

  const getScheduleForDate = (date: string) => {
    return schedule.find(s => s.date === date);
  };

  const getPlayerLabel = (player: Player) => {
    const count = playerStats[player.id] || 0;
    return `${player.first_name} ${player.last_name} (${count}x)`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const sortedPlayersByCount = [...players].filter(p => !p.is_coach).sort((a, b) => {
    const countA = playerStats[a.id] || 0;
    const countB = playerStats[b.id] || 0;
    return countA - countB;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Apéro du Jeudi</h2>
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
          {user && (
            <button
              onClick={handleAutoAssign}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center gap-2"
            >
              <Wand2 size={20} />
              Assignation Auto
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {user && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-white font-semibold mb-4">Calendrier des jeudis - {currentMonth}</h3>
              <div className="space-y-4">
                {nextThursdays.map((date) => {
                  const existing = getScheduleForDate(date);
                  return (
                    <ThursdayRow
                      key={date}
                      date={date}
                      existing={existing}
                      players={players}
                      playerStats={playerStats}
                      onAssign={handleAssign}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 h-fit">
          <h3 className="text-white font-semibold mb-4">Qui a le moins fait</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedPlayersByCount.map((player) => {
              const count = playerStats[player.id] || 0;
              return (
                <div
                  key={player.id}
                  className="flex justify-between items-center bg-slate-900 px-4 py-2 rounded-lg"
                >
                  <span className="text-white text-sm">
                    {player.first_name} {player.last_name}
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

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <h3 className="text-white font-semibold px-6 py-4 bg-slate-900">Historique</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="text-left px-6 py-4 text-slate-300 font-semibold">Date</th>
                <th className="text-left px-6 py-4 text-slate-300 font-semibold">Personne 1</th>
                <th className="text-left px-6 py-4 text-slate-300 font-semibold">Personne 2</th>
                {user && <th className="text-right px-6 py-4 text-slate-300 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={user ? 4 : 3} className="px-6 py-8 text-center text-slate-400">
                    Aucune assignation
                  </td>
                </tr>
              ) : (
                schedule.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white">
                      {new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {item.person1 ? `${item.person1.first_name} ${item.person1.last_name}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {item.person2 ? `${item.person2.first_name} ${item.person2.last_name}` : '-'}
                    </td>
                    {user && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendNotification(item)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Envoyer notification par email"
                          >
                            <Mail size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface ThursdayRowProps {
  date: string;
  existing?: AperoScheduleType;
  players: Player[];
  playerStats: { [playerId: string]: number };
  onAssign: (date: string, person1Id: string, person2Id: string) => void;
  onDelete: (id: string) => void;
}

const ThursdayRow = ({ date, existing, players, playerStats, onAssign, onDelete }: ThursdayRowProps) => {
  const [person1, setPerson1] = useState(existing?.person1_id || '');
  const [person2, setPerson2] = useState(existing?.person2_id || '');

  useEffect(() => {
    setPerson1(existing?.person1_id || '');
    setPerson2(existing?.person2_id || '');
  }, [existing]);

  const handleSave = () => {
    onAssign(date, person1, person2);
  };

  const getPlayerLabel = (player: Player) => {
    const count = playerStats[player.id] || 0;
    return `${player.first_name} ${player.last_name} (${count}x)`;
  };

  const sortedPlayers = [...players].filter(p => !p.is_coach).sort((a, b) => {
    const countA = playerStats[a.id] || 0;
    const countB = playerStats[b.id] || 0;
    return countA - countB;
  });

  const displayDate = new Date(date + 'T12:00:00');

  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-shrink-0 w-48">
          <p className="text-white font-medium">
            {displayDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={person1}
            onChange={(e) => setPerson1(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Personne 1</option>
            {sortedPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {getPlayerLabel(player)}
              </option>
            ))}
          </select>

          <select
            value={person2}
            onChange={(e) => setPerson2(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Personne 2 (optionnel)</option>
            {sortedPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {getPlayerLabel(player)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            {existing ? 'Modifier' : 'Assigner'}
          </button>
          {existing && (
            <button
              onClick={() => onDelete(existing.id)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
