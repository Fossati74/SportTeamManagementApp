import { useState, useEffect, useRef } from "react";
import { supabase, Player } from "../../lib/supabase";
import {
  Calendar,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Edit2,
  Check,
  X,
  UserPlus,
  UserMinus,
  ChevronDown,
  Sparkles,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fuzzyMatch } from "../../utils/search";
import { SectionHeader } from "../common/SectionHeader";
import { toast } from "react-hot-toast";
import {
  getSpecificDaysInMonth,
  getTargetMonthLabel,
  formatDateFr,
} from "../../utils/date";
import { usePlayerStats } from "../../hooks/usePlayerStats";
import { PlayerSearchSelect } from "../common/PlayerSearchSelect";

export const AperoSchedule = () => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextThursdays, setNextThursdays] = useState<string[]>([]);
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
    generateNextThursdays();
  }, [monthOffset]);

  const fetchData = async () => {
    try {
      const [scheduleRes, playersRes] = await Promise.all([
        supabase
          .from("apero_schedule")
          .select(
            "*, person1:person1_id(*), person2:person2_id(*), person3:person3_id(*)",
          )
          .order("date", { ascending: false }),
        supabase
          .from("players")
          .select("*")
          .order("last_name", { ascending: true }),
      ]);
      setSchedule(scheduleRes.data || []);
      setPlayers(playersRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateNextThursdays = () => {
    setNextThursdays(getSpecificDaysInMonth(monthOffset, 4));
    setCurrentMonth(getTargetMonthLabel(monthOffset));
  };

  const handleAutoAssign = async () => {
    const availablePlayers = players.filter((p) => p.thursday_aperitif);
    if (availablePlayers.length < 2) return;
    const unassignedThursdays = nextThursdays.filter(
      (date) => !schedule.find((s) => s.date === date),
    );
    if (unassignedThursdays.length === 0)
      return toast.error("Tous les jeudis sont déjà assignés !");

    setLoading(true);
    try {
      for (const date of unassignedThursdays) {
        const sorted = [...availablePlayers].sort(
          (a, b) =>
            (playerStats[a.id]?.aperoCount || 0) -
            (playerStats[b.id]?.aperoCount || 0),
        );
        await supabase
          .from("apero_schedule")
          .insert({ date, person1_id: sorted[0].id, person2_id: sorted[1].id });
      }
      toast.success("Assignation automatique terminée !");
      fetchData();
      refreshStats();
    } catch (e) {
      toast.error("Erreur d'assignation");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (
    date: string,
    p1: string,
    p2: string,
    p3: string,
  ) => {
    const existing = schedule.find((s) => s.date === date);
    const data = {
      date,
      person1_id: p1 || null,
      person2_id: p2 || null,
      person3_id: p3 || null,
    };
    try {
      if (existing)
        await supabase
          .from("apero_schedule")
          .update(data)
          .eq("id", existing.id);
      else await supabase.from("apero_schedule").insert(data);
      toast.success("Planning mis à jour !");
      fetchData();
      refreshStats();
    } catch (e) {
      toast.error("Erreur d'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette ligne ?")) return;
    await supabase.from("apero_schedule").delete().eq("id", id);
    fetchData();
    refreshStats();
    toast.success("Assignation supprimée");
  };

  const handleWhatsAppShare = (item: any) => {
    const dateStr = formatDateFr(item.date, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const responsibles = [item.person1, item.person2, item.person3].filter(
      (p) => p,
    );
    let msg = `*RAPPEL APÉRO DU JEUDI*\n\nSalut ! Petit rappel pour l'apéro de ce *${dateStr}*.\n\n`;
    if (responsibles.length > 0) {
      const names = responsibles
        .map((p) => `*${p.first_name} ${p.last_name.charAt(0)}.*`)
        .join(", ")
        .replace(/, ([^,]*)$/, " et $1");
      msg += `Les responsables désignés sont : ${names}.`;
    }
    msg += `\n\nÀ jeudi !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const historyData = schedule.filter((item) => item.date < todayStr);
  const displayedHistory = showAllHistory
    ? historyData
    : historyData.slice(0, 10);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" />
      </div>
    );

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
          Apéro du Jeudi
        </h2>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <button
              onClick={handleAutoAssign}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg w-full sm:w-auto justify-center"
            >
              <Sparkles size={18} /> Auto-Assigner
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setMonthOffset(monthOffset - 1)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-white min-w-[120px] text-center capitalize flex-1">
              {currentMonth}
            </span>
            <button
              onClick={() => setMonthOffset(monthOffset + 1)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* On garde items-stretch pour l'égalité des colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Colonne Gauche : CALENDRIER (Le Maître) */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full">
            <SectionHeader title="Calendrier des Apéros" Icon={Calendar} />
            <div className="p-6 space-y-4">
              {nextThursdays.map((date) => (
                <ThursdayRow
                  key={date}
                  date={date}
                  existing={schedule.find((s) => s.date === date)}
                  players={players.filter((p) => p.thursday_aperitif)}
                  playerStats={playerStats}
                  onAssign={handleAssign}
                  onDelete={handleDelete}
                  onWhatsApp={handleWhatsAppShare}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Colonne Droite : FRÉQUENCES (L'Esclave) */}
        <div className="lg:col-span-1 lg:max-h-[1px] lg:min-h-full">
          {/* L'astuce : lg:max-h-[1px] combiné à flex-1 plus bas 
              force le navigateur à ne pas agrandir ce bloc au-delà 
              de ce que la grille lui alloue (la taille du calendrier).
          */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-full flex flex-col">
            <SectionHeader title="Fréquence d'apéro" Icon={TrendingUp} />

            <div className="p-6 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
              {players
                .filter((p) => p.thursday_aperitif)
                .sort(
                  (a, b) =>
                    (playerStats[a.id]?.aperoCount || 0) -
                    (playerStats[b.id]?.aperoCount || 0),
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors group"
                  >
                    <span className="text-slate-300 text-sm font-medium">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 rounded-lg border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                      {playerStats[p.id]?.aperoCount || 0}x
                    </span>
                  </div>
                ))}
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
                <th className="px-6 py-4 font-bold">Responsables</th>
                {isAdmin && (
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedHistory.map((item) => (
                <tr
                  key={item.id}
                  className="text-sm hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                    {formatDateFr(item.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {[item.person1, item.person2, item.person3]
                        .filter((p) => p)
                        .map((p, i) => (
                          <span
                            key={i}
                            className="bg-slate-900/50 text-slate-300 px-3 py-1 rounded-lg text-xs border border-slate-700 min-w-[120px] text-center"
                          >
                            {p.first_name} {p.last_name}
                          </span>
                        ))}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {historyData.length > 10 && (
          <div className="p-4 bg-slate-900/20 border-t border-slate-700 text-center">
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
            >
              {showAllHistory
                ? "Réduire l'historique"
                : `Voir les ${historyData.length - 10} autres jeudis`}
              <ChevronDown
                size={14}
                className={showAllHistory ? "rotate-180" : ""}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================
// 3. COMPOSANT LIGNE (ThursdayRow)
// ========================================================
const ThursdayRow = ({
  date,
  existing,
  players,
  playerStats,
  onAssign,
  onDelete,
  onWhatsApp,
  isAdmin,
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    setP1(existing?.person1_id || "");
    setP2(existing?.person2_id || "");
    setP3(existing?.person3_id || "");
    setVisibleCount(existing?.person3_id ? 3 : existing?.person2_id ? 2 : 1);
    setIsEditing(false);
  }, [existing]);

  const isValid = () => {
    const ids = [p1, p2, p3].slice(0, visibleCount).filter((id) => id !== "");
    return (
      ids.length === visibleCount &&
      new Set(ids).size === ids.length &&
      players.some((p: any) => p.id === p1)
    );
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-300 ${existing ? "bg-slate-900/60 border-slate-700 shadow-md" : "bg-slate-900/20 border-slate-800 border-dashed"}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <p className="text-white font-bold text-sm capitalize flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${existing ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}
            ></span>
            {formatDateFr(date, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          {!isEditing && isAdmin && (
            <div className="flex gap-1">
              {existing && (
                <button
                  onClick={() => onWhatsApp(existing)}
                  className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                  title="Partager sur WhatsApp"
                >
                  <MessageSquare size={18} />
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200">
            <PlayerSearchSelect
              key={`${date}-resp1`} // INDISPENSABLE : la key force l'isolation
              label="Responsable 1"
              value={p1}
              onSelect={setP1}
              players={players}
              playerStats={playerStats}
              allSelectedIds={[p1, p2, p3]}
            />
            {visibleCount >= 2 && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <PlayerSearchSelect
                    key={`${date}-resp2`} // Key différente
                    label="Responsable 2"
                    value={p2}
                    onSelect={setP2}
                    players={players}
                    playerStats={playerStats}
                    allSelectedIds={[p1, p2, p3]}
                  />
                </div>
                <button
                  onClick={() => {
                    setP2("");
                    setVisibleCount(1);
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            )}
            {visibleCount >= 3 && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <PlayerSearchSelect
                    key={`${date}-resp3`} // Key différente
                    label="Responsable 3"
                    value={p3}
                    onSelect={setP3}
                    players={players}
                    playerStats={playerStats}
                    allSelectedIds={[p1, p2, p3]}
                  />
                </div>
                <button
                  onClick={() => {
                    setP3("");
                    setVisibleCount(2);
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            )}
            {visibleCount < 3 && (
              <button
                onClick={() => setVisibleCount((v) => v + 1)}
                className="text-[10px] text-blue-400 font-bold flex items-center gap-1 hover:text-blue-300 transition-colors px-1"
              >
                <UserPlus size={14} /> Ajouter un responsable
              </button>
            )}
            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button
                disabled={!isValid()}
                onClick={() => {
                  onAssign(date, p1, p2, p3);
                  setIsEditing(false);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isValid() ? "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20" : "bg-slate-600 text-slate-400 cursor-not-allowed opacity-50"}`}
              >
                <Check size={16} className="inline mr-2" /> Valider
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
              >
                <X size={16} />
              </button>
              {existing && (
                <button
                  onClick={() => onDelete(existing.id)}
                  className="px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/20 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[existing?.person1, existing?.person2, existing?.person3].filter(
              (p) => p,
            ).length > 0 ? (
              [existing?.person1, existing?.person2, existing?.person3]
                .filter((p) => p)
                .map((p, i) => (
                  <span
                    key={i}
                    className="bg-slate-700/50 text-white px-4 py-1.5 rounded-full text-xs border border-slate-600 min-w-[120px] text-center hover:bg-slate-700 transition-colors"
                  >
                    {p.first_name} {p.last_name}
                  </span>
                ))
            ) : (
              <span className="text-slate-500 italic text-sm px-1">
                Libre - Aucun désigné
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
