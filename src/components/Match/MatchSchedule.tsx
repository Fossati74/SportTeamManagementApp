import { useState, useEffect } from 'react';
import { supabase, Player, MatchSchedule as MatchScheduleType } from '../../lib/supabase';
import { Calendar, Trash2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const MatchSchedule = () => {
  const [schedules, setSchedules] = useState<MatchScheduleType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextWeekends, setNextWeekends] = useState<{ saturday: string; sunday: string }[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: number }>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
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

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 6) {
        const saturday = new Date(year, month, day);
        saturday.setHours(12, 0, 0, 0);

        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);

        weekends.push({
          saturday: saturday.toISOString().split('T')[0],
          sunday: sunday.toISOString().split('T')[0],
        });
      }
    }

    setNextWeekends(weekends);
  };

  const fetchData = async () => {
    try {
      const [schedulesResponse, playersResponse] = await Promise.all([
        supabase
          .from('match_schedule')
          .select('*')
          .order('match_date', { ascending: true }),
        supabase
          .from('players')
          .select('*')
          .order('last_name', { ascending: true }),
      ]);

      if (schedulesResponse.error) throw schedulesResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      const scheduleData = schedulesResponse.data || [];
      setSchedules(scheduleData);
      setPlayers(playersResponse.data || []);

      calculatePlayerStats(scheduleData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = (scheduleData: MatchScheduleType[]) => {
    const stats: { [playerId: string]: number } = {};

    scheduleData.forEach((item) => {
      [item.saturday_person1_id, item.saturday_person2_id, item.saturday_person3_id, item.saturday_person4_id,
       item.sunday_person1_id, item.sunday_person2_id, item.sunday_person3_id, item.sunday_person4_id].forEach((id) => {
        if (id) {
          stats[id] = (stats[id] || 0) + 1;
        }
      });
    });

    setPlayerStats(stats);
  };

  const handleAssignWeekend = async (saturdayDate: string, satPersons: string[], sunPersons: string[]) => {
    try {
      const existing = schedules.find(s => s.match_date === saturdayDate);

      const updateData: any = {
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

      if (existing) {
        const { error } = await supabase
          .from('match_schedule')
          .update(updateData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('match_schedule')
          .insert(updateData);

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error('Error assigning weekend:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette assignation ?')) return;

    try {
      const { error } = await supabase
        .from('match_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const getPlayerLabel = (player: Player) => {
    const count = playerStats[player.id] || 0;
    return `${player.first_name} ${player.last_name} (${count}x)`;
  };

  const sortedPlayersByStats = [...players].filter(p => !p.is_coach).sort((a, b) => {
    const countA = playerStats[a.id] || 0;
    const countB = playerStats[b.id] || 0;
    return countA - countB;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Table de Marque</h2>
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
          {user && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
              <h3 className="text-white font-semibold mb-4">Calendrier des week-ends - {currentMonth}</h3>
              <div className="space-y-6">
                {nextWeekends.map((weekend, index) => (
                  <WeekendRow
                    key={index}
                    weekend={weekend}
                    schedules={schedules}
                    players={players}
                    playerStats={playerStats}
                    onAssignWeekend={handleAssignWeekend}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 h-fit">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Qui a le moins fait
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedPlayersByStats.map((player) => {
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
                <th className="text-left px-6 py-4 text-slate-300 font-semibold">Personnes assignées</th>
                {user && <th className="text-right px-6 py-4 text-slate-300 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={user ? 3 : 2} className="px-6 py-8 text-center text-slate-400">
                    Aucune assignation
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => {
                  const assignedPlayerIds = [
                    schedule.saturday_person1_id, schedule.saturday_person2_id,
                    schedule.saturday_person3_id, schedule.saturday_person4_id,
                    schedule.sunday_person1_id, schedule.sunday_person2_id,
                    schedule.sunday_person3_id, schedule.sunday_person4_id
                  ].filter(Boolean);

                  const assignedPlayerNames = assignedPlayerIds.map(id => {
                    const player = players.find(p => p.id === id);
                    return player ? `${player.first_name} ${player.last_name}` : '';
                  }).filter(Boolean);

                  return (
                    <tr key={schedule.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 text-white">
                        {new Date(schedule.match_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-white">
                        {assignedPlayerNames.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {assignedPlayerNames.map((name, index) => (
                              <span key={index} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Aucune personne assignée</span>
                        )}
                      </td>
                      {user && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={18} />
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
      </div>
    </div>
  );
};

interface WeekendRowProps {
  weekend: { saturday: string; sunday: string };
  schedules: MatchScheduleType[];
  players: Player[];
  playerStats: { [playerId: string]: number };
  onAssignWeekend: (saturdayDate: string, satPersons: string[], sunPersons: string[]) => void;
  onDelete: (id: string) => void;
}

const WeekendRow = ({ weekend, schedules, players, playerStats, onAssignWeekend, onDelete }: WeekendRowProps) => {
  const saturdaySchedule = schedules.find(s => s.match_date === weekend.saturday);
  const sundaySchedule = schedules.find(s => s.match_date === weekend.sunday);

  const [satPersons, setSatPersons] = useState<string[]>([
    saturdaySchedule?.saturday_person1_id || '',
    saturdaySchedule?.saturday_person2_id || '',
    saturdaySchedule?.saturday_person3_id || '',
    saturdaySchedule?.saturday_person4_id || '',
  ]);

  const [sunPersons, setSunPersons] = useState<string[]>([
    sundaySchedule?.sunday_person1_id || '',
    sundaySchedule?.sunday_person2_id || '',
    sundaySchedule?.sunday_person3_id || '',
    sundaySchedule?.sunday_person4_id || '',
  ]);

  useEffect(() => {
    setSatPersons([
      saturdaySchedule?.saturday_person1_id || '',
      saturdaySchedule?.saturday_person2_id || '',
      saturdaySchedule?.saturday_person3_id || '',
      saturdaySchedule?.saturday_person4_id || '',
    ]);
  }, [saturdaySchedule?.saturday_person1_id, saturdaySchedule?.saturday_person2_id, saturdaySchedule?.saturday_person3_id, saturdaySchedule?.saturday_person4_id, saturdaySchedule?.id]);

  useEffect(() => {
    setSunPersons([
      sundaySchedule?.sunday_person1_id || '',
      sundaySchedule?.sunday_person2_id || '',
      sundaySchedule?.sunday_person3_id || '',
      sundaySchedule?.sunday_person4_id || '',
    ]);
  }, [sundaySchedule?.sunday_person1_id, sundaySchedule?.sunday_person2_id, sundaySchedule?.sunday_person3_id, sundaySchedule?.sunday_person4_id, sundaySchedule?.id]);

  const getPlayerLabel = (player: Player) => {
    const count = playerStats[player.id] || 0;
    return `${player.first_name} ${player.last_name} (${count}x)`;
  };

  const handleSave = () => {
    onAssignWeekend(weekend.saturday, satPersons, sunPersons);
  };

  const handleDeleteWeekend = () => {
    if (saturdaySchedule) {
      onDelete(saturdaySchedule.id);
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg p-4 space-y-4">
      <div className="border-b border-slate-700 pb-3">
        <p className="text-lg font-semibold text-white">
          Week-end du {new Date(weekend.saturday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-white font-medium mb-2">
            Samedi {new Date(weekend.saturday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <select
                key={`sat-${index}`}
                value={satPersons[index]}
                onChange={(e) => {
                  const newPersons = [...satPersons];
                  newPersons[index] = e.target.value;
                  setSatPersons(newPersons);
                }}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Personne {index + 1}</option>
                {players.filter(p => !p.is_coach).map((player) => (
                  <option key={player.id} value={player.id}>
                    {getPlayerLabel(player)}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div>
          <p className="text-white font-medium mb-2">
            Dimanche {new Date(weekend.sunday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <select
                key={`sun-${index}`}
                value={sunPersons[index]}
                onChange={(e) => {
                  const newPersons = [...sunPersons];
                  newPersons[index] = e.target.value;
                  setSunPersons(newPersons);
                }}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Personne {index + 1}</option>
                {players.filter(p => !p.is_coach).map((player) => (
                  <option key={player.id} value={player.id}>
                    {getPlayerLabel(player)}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          {saturdaySchedule ? 'Modifier' : 'Assigner'}
        </button>
        {saturdaySchedule && (
          <button
            onClick={handleDeleteWeekend}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
};
