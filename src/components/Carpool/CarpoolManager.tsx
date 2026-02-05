import { useState, useEffect } from "react";
import { supabase, Carpool, Player, CarpoolProposal } from "../../lib/supabase";
import { 
  Plus, TrendingUp, Trash2, Calendar, Clock, X,
  ChevronLeft, ChevronRight, UserPlus, UserMinus,
  Check, Edit2, ChevronDown, Users 
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { SectionHeader } from "../common/SectionHeader";
import { PlayerSearchSelect } from "../common/PlayerSearchSelect";
import toast from "react-hot-toast";
import { getSpecificDaysInMonth, getTargetMonthLabel, formatDateFr } from "../../utils/date";
import { usePlayerStats } from "../../hooks/usePlayerStats";

export const CarpoolManager = () => {
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [proposals, setProposals] = useState<(CarpoolProposal & { players?: Player })[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState("");
  const [weekends, setWeekends] = useState<string[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const { user } = useAuth();
  const isAdmin = !!user;
  const { playerStats, refreshStats } = usePlayerStats();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { generateMonthWeekends(); }, [monthOffset]);

  const fetchData = async () => {
    try {
      const [carpoolsRes, playersRes, proposalsRes] = await Promise.all([
        supabase.from("carpools").select("*").order("weekend_date", { ascending: false }),
        supabase.from("players").select("*").order("last_name", { ascending: true }),
        supabase.from("carpool_proposals").select("*, players(*)").order("created_at", { ascending: false }),
      ]);
      setCarpools(carpoolsRes.data || []);
      setPlayers(playersRes.data || []);
      setProposals(proposalsRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthWeekends = () => {
    setWeekends(getSpecificDaysInMonth(monthOffset, 6));
    setCurrentMonth(getTargetMonthLabel(monthOffset));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce covoiturage ?")) return;
    await supabase.from("carpools").delete().eq("id", id);
    fetchData(); refreshStats();
    toast.success("Covoiturage supprimé !");
  };

  const handleAssignTeam = async (weekendDate: string, teamData: any) => {
    const existing = carpools.find((c) => c.weekend_date && c.weekend_date.startsWith(weekendDate));
    try {
      if (existing) {
        await supabase.from("carpools").update(teamData).eq("id", existing.id);
      } else {
        await supabase.from("carpools").insert({ weekend_date: weekendDate, ...teamData });
      }
      toast.success("Assignation enregistrée");
      fetchData(); refreshStats();
    } catch (e) {
      toast.error("Erreur d'enregistrement");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const historyData = carpools.filter((c) => c.weekend_date && c.weekend_date < todayStr);
  const displayedHistory = showAllHistory ? historyData : historyData.slice(0, 10);

  const sortedPlayersByCount = [...players]
    .filter((p) => p.carpooling)
    .sort((a, b) => (playerStats[a.id]?.carpoolCount || 0) - (playerStats[b.id]?.carpoolCount || 0));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Covoiturage</h2>
        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold text-white min-w-[120px] text-center capitalize flex-1">{currentMonth}</span>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <SectionHeader title="Calendrier des covoiturages" Icon={Calendar} />
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {weekends.map((dateStr) => (
                <WeekendCard
                  key={dateStr}
                  weekendDate={dateStr}
                  existing={carpools.find((c) => c.weekend_date && c.weekend_date.startsWith(dateStr))}
                  players={players.filter(p => p.carpooling)}
                  proposals={proposals.filter((p) => p.weekend_date === dateStr)}
                  onAssign={handleAssignTeam}
                  onRefresh={fetchData}
                  isAdmin={isAdmin}
                  playerStats={playerStats}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 lg:max-h-[1px] lg:min-h-full">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <SectionHeader title="Fréquence covoiturage" Icon={TrendingUp} />
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              <div className="space-y-2">
                {sortedPlayersByCount.map((player) => (
                  <div key={player.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors group">
                    <span className="text-slate-300 text-sm font-medium">{player.first_name} {player.last_name}</span>
                    <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 rounded-lg border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                      {playerStats[player.id]?.carpoolCount || 0}x
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
                <th className="px-6 py-4 font-bold">Date du week-end</th>
                <th className="px-6 py-4 font-bold">Personnes assignées</th>
                {isAdmin && <th className="px-6 py-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedHistory.length === 0 ? (
                <tr><td colSpan={isAdmin ? 3 : 2} className="px-6 py-12 text-center text-slate-500 italic text-sm">Aucun historique</td></tr>
              ) : (
                displayedHistory.map((item) => {
                  const assignedIds = [
                    item.team1_player1_id, item.team1_player2_id, item.team1_player3_id, item.team1_player4_id, item.team1_player5_id,
                    item.team2_player1_id, item.team2_player2_id, item.team2_player3_id, item.team2_player4_id, item.team2_player5_id,
                  ].filter(Boolean);

                  return (
                    <tr key={item.id} className="text-sm hover:bg-slate-700/20 transition-colors group">
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">{formatDateFr(item.weekend_date!)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {assignedIds.map((id, i) => {
                            const p = players.find((player) => player.id === id);
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
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
              <ChevronDown size={14} className={showAllHistory ? "rotate-180" : ""} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WeekendCard = ({ weekendDate, existing, players, proposals, onRefresh, isAdmin, playerStats, onDelete, onAssign }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [team1, setTeam1] = useState<string[]>([""]);
  const [team2, setTeam2] = useState<string[]>([""]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedProposalPlayer, setSelectedProposalPlayer] = useState("");

  useEffect(() => {
    if (existing) {
      const t1 = [existing.team1_player1_id, existing.team1_player2_id, existing.team1_player3_id, existing.team1_player4_id, existing.team1_player5_id].filter(Boolean) as string[];
      const t2 = [existing.team2_player1_id, existing.team2_player2_id, existing.team2_player3_id, existing.team2_player4_id, existing.team2_player5_id].filter(Boolean) as string[];
      setTeam1(t1.length > 0 ? t1 : [""]);
      setTeam2(t2.length > 0 ? t2 : [""]);
    } else {
      setTeam1([""]); setTeam2([""]);
    }
    setIsEditing(false);
  }, [existing, weekendDate]);

  const isValid = () => {
    const combined = [...team1, ...team2].filter(id => id !== "");
    if (combined.length === 0) return false;
    // Vérifier si tous les champs visibles sont remplis (pas de "" au milieu)
    if (team1.some(id => id === "") || team2.some(id => id === "")) return false;
    // Vérifier les doublons globaux sur le week-end
    return new Set(combined).size === combined.length;
  };

  const handleSave = () => {
    const data: any = {};
    for (let i = 1; i <= 5; i++) data[`team1_player${i}_id`] = team1[i - 1] || null;
    for (let i = 1; i <= 5; i++) data[`team2_player${i}_id`] = team2[i - 1] || null;
    onAssign(weekendDate, data);
    setIsEditing(false);
  };

  const handlePropose = async () => {
    if (!selectedProposalPlayer) return;
    await supabase.from("carpool_proposals").insert({ weekend_date: weekendDate, player_id: selectedProposalPlayer });
    toast.success("Disponibilité envoyée !");
    setShowProposalForm(false);
    setSelectedProposalPlayer("");
    onRefresh();
  };

  const handleValidateProposal = async (proposal: any) => {
    const cols = ["team1_player1_id", "team1_player2_id", "team1_player3_id", "team1_player4_id", "team1_player5_id", "team2_player1_id", "team2_player2_id", "team2_player3_id", "team2_player4_id", "team2_player5_id"];
    
    if (!existing) {
      onAssign(weekendDate, { team1_player1_id: proposal.player_id });
    } else {
      const firstEmpty = cols.find((c) => !(existing as any)[c]);
      if (firstEmpty) await supabase.from("carpools").update({ [firstEmpty]: proposal.player_id }).eq("id", existing.id);
      else return toast.error("Plus de place dans les voitures !");
    }
    await supabase.from("carpool_proposals").delete().eq("id", proposal.id);
    onRefresh();
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 ${existing ? "bg-slate-900/60 border-slate-700 shadow-lg" : "bg-slate-900/20 border-slate-800 border-dashed"}`}>
      <div className="flex justify-between items-center mb-5">
        <p className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${existing ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}></span>
          Week-end du {formatDateFr(weekendDate, { day: 'numeric', month: 'long' })}
        </p>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"><Edit2 size={16} /></button>
        )}
      </div>

      {proposals.length > 0 && isAdmin && !isEditing && (
        <div className="mb-4 space-y-2">
          {proposals.map((p: any) => (
            <div key={p.id} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between animate-in fade-in zoom-in-95">
              <span className="text-amber-500 text-xs font-bold uppercase tracking-tight">{p.players?.first_name} est disponible</span>
              <div className="flex gap-2">
                <button onClick={() => handleValidateProposal(p)} className="p-1.5 text-green-500 hover:bg-green-500/20 rounded-lg"><Check size={16} /></button>
                <button onClick={async () => { await supabase.from("carpool_proposals").delete().eq("id", p.id); onRefresh(); }} className="p-1.5 text-red-500 hover:bg-red-500/20 rounded-lg"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && (
        <div className="mb-5">
          {!showProposalForm ? (
            <button onClick={() => setShowProposalForm(true)} className="w-full py-2.5 bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-600/30 transition-all uppercase tracking-widest shadow-lg shadow-amber-900/10">
              <UserPlus size={16} /> Je suis disponible
            </button>
          ) : (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex-1">
                <PlayerSearchSelect 
                  label="Votre nom..."
                  value={selectedProposalPlayer}
                  onSelect={setSelectedProposalPlayer}
                  players={players}
                  statKey="carpoolCount"
                />
              </div>
              <button onClick={handlePropose} className="px-4 bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20"><Check size={18} /></button>
              <button onClick={() => setShowProposalForm(false)} className="p-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all"><X size={18} /></button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[ {team: team1, setTeam: setTeam1, label: "Voiture 1", color: "green", key: "t1" }, {team: team2, setTeam: setTeam2, label: "Voiture 2", color: "blue", key: "t2" }].map((v) => (
          <div key={v.key} className="space-y-3">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 underline decoration-${v.color}-500/30 underline-offset-4`}>
              <Users size={14} className={`text-${v.color}-500`} /> {v.label}
            </p>
            {isEditing ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                {v.team.map((id, i) => (
                  <div key={`${v.key}-${i}`} className="flex gap-2">
                    <div className="flex-1">
                      <PlayerSearchSelect 
                        key={`select-${v.key}-${i}-${weekendDate}`}
                        label={`Passager ${i+1}`}
                        value={id}
                        onSelect={(newId: string) => {
                          const n = [...v.team];
                          n[i] = newId;
                          v.setTeam(n);
                        }}
                        players={players}
                        playerStats={playerStats}
                        allSelectedIds={[...team1, ...team2]}
                        statKey="carpoolCount"
                      />
                    </div>
                    {v.team.length > 1 && <button onClick={() => v.setTeam(v.team.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><UserMinus size={16} /></button>}
                  </div>
                ))}
                {v.team.length < 5 && (
                  <button onClick={() => v.setTeam([...v.team, ""])} className={`text-[10px] text-${v.color}-400 flex items-center gap-1 font-bold uppercase py-1 hover:text-${v.color}-300 transition-colors`}>
                    <Plus size={14} /> Ajouter un passager
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {v.team.filter(Boolean).length > 0 ? v.team.filter(Boolean).map((id, i) => {
                  const p = players.find((p:Player) => p.id === id);
                  return (
                    <span key={i} className="bg-slate-700/50 text-white px-4 py-1.5 rounded-xl text-[11px] font-bold border border-slate-600 min-w-[110px] text-center hover:bg-slate-700 transition-colors">
                      {p?.first_name} {p?.last_name}
                    </span>
                  );
                }) : <span className="text-slate-500 italic text-xs px-1">Non défini</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-6 pt-5 border-t border-slate-800 flex gap-3">
          <button 
            disabled={!isValid()}
            onClick={handleSave} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-lg ${isValid() ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'}`}
          >
            <Check size={18} /> Valider
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all"><X size={18} /></button>
          {existing && <button onClick={() => onDelete(existing.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 border border-red-500/20 transition-all"><Trash2 size={18} /></button>}
        </div>
      )}
    </div>
  );
};