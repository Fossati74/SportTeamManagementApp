import { useState, useEffect } from "react";
import { supabase, Player, MatchSchedule as MatchScheduleType } from "../../lib/supabase";
import { Calendar, Trash2, TrendingUp, ChevronLeft, ChevronRight, UserPlus, UserMinus, Edit2, Check, X, Clock, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { SectionHeader } from "../common/SectionHeader";
import { PlayerSearchSelect } from "../common/PlayerSearchSelect"; // Import de notre nouveau composant
import { toast } from "react-hot-toast";
import { getSpecificDaysInMonth, getTargetMonthLabel } from "../../utils/date";
import { usePlayerStats } from "../../hooks/usePlayerStats";
import { formatDateFr } from "../../utils/date";

export const MatchSchedule = () => {
  const [schedules, setSchedules] = useState<MatchScheduleType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextWeekends, setNextWeekends] = useState<{ saturday: string; sunday: string }[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const { user } = useAuth();
  const isAdmin = !!user;
  const { playerStats, refreshStats } = usePlayerStats();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    generateNextWeekends();
  }, [monthOffset]);

  const generateNextWeekends = () => {
    const saturdays = getSpecificDaysInMonth(monthOffset, 6);
    const weekends = saturdays.map((satStr) => {
      const saturday = new Date(satStr + "T12:00:00");
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      return { saturday: satStr, sunday: sunday.toISOString().split("T")[0] };
    });
    setNextWeekends(weekends);
    setCurrentMonth(getTargetMonthLabel(monthOffset));
  };

  const fetchData = async () => {
    try {
      const [schedulesResponse, playersResponse] = await Promise.all([
        supabase.from("match_schedule").select("*").order("match_date", { ascending: false }),
        supabase.from("players").select("*").order("last_name", { ascending: true }),
      ]);
      setSchedules(schedulesResponse.data || []);
      setPlayers(playersResponse.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWeekend = async (saturdayDate: string, satPersons: string[], sunPersons: string[]) => {
    const existing = schedules.find((s) => s.match_date.startsWith(saturdayDate));
    const updateData = {
      match_date: saturdayDate,
      location: "A définir",
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
      if (existing) {
        await supabase.from("match_schedule").update(updateData).eq("id", existing.id);
      } else {
        await supabase.from("match_schedule").insert(updateData);
      }
      toast.success("Planning mis à jour !");
      fetchData();
      refreshStats();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette assignation ?")) return;
    await supabase.from("match_schedule").delete().eq("id", id);
    fetchData();
    refreshStats();
    toast.success("Assignation supprimée !");
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const historyData = schedules.filter((s) => s.match_date < todayStr);
  const displayedHistory = showAllHistory ? historyData : historyData.slice(0, 10);

  const sortedPlayersByStats = [...players]
    .filter((p) => p.scoreboard === true)
    .sort((a, b) => (playerStats[a.id]?.matchCount || 0) - (playerStats[b.id]?.matchCount || 0));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Table de Marque</h2>
        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-sm font-bold text-white min-w-[140px] text-center capitalize flex-1">{currentMonth}</span>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <SectionHeader title="Calendrier des tables de marque" Icon={Calendar} />
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {nextWeekends.map((weekend) => (
                <WeekendRow
                  key={weekend.saturday}
                  weekend={weekend}
                  existingSchedule={schedules.find((s) => s.match_date.startsWith(weekend.saturday))}
                  players={players}
                  playerStats={playerStats}
                  onAssignWeekend={handleAssignWeekend}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 lg:max-h-[1px] lg:min-h-full">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <SectionHeader title="Fréquence table de marque" Icon={TrendingUp} />
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              <div className="space-y-2">
                {sortedPlayersByStats.map((player) => (
                  <div key={player.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors group">
                    <span className="text-slate-300 text-sm font-medium">{player.first_name} {player.last_name}</span>
                    <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 rounded-lg border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                      {playerStats[player.id]?.matchCount || 0}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <SectionHeader title="Historique" Icon={Clock} />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Personnes assignées</th>
                {isAdmin && <th className="px-6 py-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedHistory.length === 0 ? (
                <tr><td colSpan={isAdmin ? 3 : 2} className="px-6 py-10 text-center text-slate-500 italic text-sm">Aucun historique</td></tr>
              ) : (
                displayedHistory.map((schedule) => (
                  <tr key={schedule.id} className="text-sm hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                      {formatDateFr(schedule.match_date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {[schedule.saturday_person1_id, schedule.saturday_person2_id, schedule.saturday_person3_id, schedule.saturday_person4_id, schedule.sunday_person1_id, schedule.sunday_person2_id, schedule.sunday_person3_id, schedule.sunday_person4_id]
                          .filter(Boolean).map((id, i) => {
                            const p = players.find(player => player.id === id);
                            return p ? (
                              <span key={i} className="bg-slate-900/50 text-slate-300 px-3 py-1 rounded-lg text-xs border border-slate-700 min-w-[120px] text-center">
                                {p.first_name} {p.last_name}
                              </span>
                            ) : null;
                          })}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(schedule.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {historyData.length > 10 && (
          <div className="p-4 bg-slate-900/20 border-t border-slate-700 text-center">
            <button onClick={() => setShowAllHistory(!showAllHistory)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto">
              {showAllHistory ? "Réduire l'historique" : `Voir les ${historyData.length - 10} autres week-ends`}
              <ChevronDown size={14} className={showAllHistory ? "rotate-180" : ""} />
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
  playerStats: any;
  onAssignWeekend: (satDate: string, satP: string[], sunP: string[]) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const WeekendRow = ({ weekend, existingSchedule, players, playerStats, onAssignWeekend, onDelete, isAdmin }: WeekendRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [satPersons, setSatPersons] = useState<string[]>(["", "", "", ""]);
  const [sunPersons, setSunPersons] = useState<string[]>(["", "", "", ""]);
  const [satCount, setSatCount] = useState(1);
  const [sunCount, setSunCount] = useState(1);

  useEffect(() => {
    if (existingSchedule) {
      const s1 = [existingSchedule.saturday_person1_id || "", existingSchedule.saturday_person2_id || "", existingSchedule.saturday_person3_id || "", existingSchedule.saturday_person4_id || ""];
      const s2 = [existingSchedule.sunday_person1_id || "", existingSchedule.sunday_person2_id || "", existingSchedule.sunday_person3_id || "", existingSchedule.sunday_person4_id || ""];
      setSatPersons(s1);
      setSunPersons(s2);
      setSatCount(Math.max(1, s1.filter(Boolean).length));
      setSunCount(Math.max(1, s2.filter(Boolean).length));
    } else {
      setSatPersons(["", "", "", ""]);
      setSunPersons(["", "", "", ""]);
      setSatCount(1);
      setSunCount(1);
    }
    setIsEditing(false);
  }, [existingSchedule, weekend.saturday]);

  const isValid = () => {
    const s1 = satPersons.slice(0, satCount).filter(id => id !== "");
    const s2 = sunPersons.slice(0, sunCount).filter(id => id !== "");
    
    // Vérification des remplissages
    if (s1.length !== satCount || s2.length !== sunCount) return false;
    
    // Vérification des doublons par jour
    if (new Set(s1).size !== s1.length) return false;
    if (new Set(s2).size !== s2.length) return false;

    return true;
  };

  const handleSave = () => {
    onAssignWeekend(weekend.saturday, satPersons, sunPersons);
    setIsEditing(false);
  };

  const handleRemovePerson = (day: "sat" | "sun", index: number) => {
    if (day === "sat") {
      const newP = [...satPersons];
      newP[index] = ""; 
      setSatPersons(newP);
      setSatCount((prev) => Math.max(1, prev - 1));
    } else {
      const newP = [...sunPersons];
      newP[index] = "";
      setSunPersons(newP);
      setSunCount((prev) => Math.max(1, prev - 1));
    }
  };

  const renderDisplay = (personIds: string[]) => {
    const assigned = personIds.filter(Boolean).map((id) => players.find((p) => p.id === id)).filter(Boolean);
    if (assigned.length === 0) return <span className="text-slate-500 italic text-xs">Libre</span>;
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
    <div className={`p-5 rounded-2xl border transition-all duration-300 ${existingSchedule ? "bg-slate-900/60 border-slate-700 shadow-lg" : "bg-slate-900/20 border-slate-800 border-dashed"}`}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${existingSchedule ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}></span>
          Week-end du {new Date(weekend.saturday + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
        </p>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all">
            <Edit2 size={16} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 underline decoration-green-500/30 underline-offset-4">Samedi {new Date(weekend.saturday + "T12:00:00").getDate()}</p>
          {isEditing ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              {Array.from({ length: satCount }).map((_, i) => (
                <div key={`${weekend.saturday}-sat-${i}`} className="flex gap-2">
                  <div className="flex-1">
                    <PlayerSearchSelect 
                      key={`sat-p-${i}-${weekend.saturday}`}
                      label={`Responsable ${i+1}`}
                      value={satPersons[i]}
                      onSelect={(id: string) => {
                        const newP = [...satPersons];
                        newP[i] = id;
                        setSatPersons(newP);
                      }}
                      players={players}
                      playerStats={playerStats}
                      allSelectedIds={satPersons} // Grise les doublons du samedi
                      statKey="matchCount"
                    />
                  </div>
                  {satCount > 1 && (
                    <button onClick={() => handleRemovePerson("sat", i)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              ))}
              {satCount < 4 && (
                <button onClick={() => setSatCount(satCount + 1)} className="text-[10px] text-green-400 flex items-center gap-1 font-bold uppercase py-1 hover:text-green-300 transition-colors">
                  <UserPlus size={14} /> Ajouter
                </button>
              )}
            </div>
          ) : renderDisplay(satPersons)}
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 underline decoration-blue-500/30 underline-offset-4">Dimanche {new Date(weekend.sunday + "T12:00:00").getDate()}</p>
          {isEditing ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              {Array.from({ length: sunCount }).map((_, i) => (
                <div key={`${weekend.saturday}-sun-${i}`} className="flex gap-2">
                  <div className="flex-1">
                    <PlayerSearchSelect 
                      key={`sun-p-${i}-${weekend.saturday}`}
                      label={`Responsable ${i+1}`}
                      value={sunPersons[i]}
                      onSelect={(id: string) => {
                        const newP = [...sunPersons];
                        newP[i] = id;
                        setSunPersons(newP);
                      }}
                      players={players}
                      playerStats={playerStats}
                      allSelectedIds={sunPersons} // Grise les doublons du dimanche
                      statKey="matchCount"
                    />
                  </div>
                  {sunCount > 1 && (
                    <button onClick={() => handleRemovePerson("sun", i)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              ))}
              {sunCount < 4 && (
                <button onClick={() => setSunCount(sunCount + 1)} className="text-[10px] text-blue-400 flex items-center gap-1 font-bold uppercase py-1 hover:text-blue-300 transition-colors">
                  <UserPlus size={14} /> Ajouter
                </button>
              )}
            </div>
          ) : renderDisplay(sunPersons)}
        </div>
      </div>
      {isEditing && (
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
          <button 
            disabled={!isValid()}
            onClick={handleSave} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest shadow-lg ${isValid() ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'}`}
          >
            <Check size={18} /> Valider
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all">
            <X size={18} />
          </button>
          {existingSchedule && (
            <button onClick={() => onDelete(existingSchedule.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 border border-red-500/20 transition-all">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};