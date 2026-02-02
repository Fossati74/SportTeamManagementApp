import { useState, useEffect } from "react";
import { supabase, Player } from "../../lib/supabase";
import {
  UserPlus,
  CreditCard as Edit2,
  Trash2,
  User,
  Car,
  Mail,
  Calendar,
  Wine,
  Euro,
  Search,
  X as CloseIcon,
} from "lucide-react";
import { PlayerModal } from "./PlayerModal";
import { useAuth } from "../../contexts/AuthContext";

interface PlayerStats {
  aperoCount: number;
  matchCount: number;
  carpoolCount: number;
  finesTotal: number;
  redistributionAmount: number;
}

export const PlayerList = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: PlayerStats }>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [licenseFilter, setLicenseFilter] = useState<"all" | "with" | "without">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();
  const isAdmin = !!user;

  useEffect(() => {
    fetchPlayers();
    fetchPlayerStats();
  }, []);

  // --- RECHERCHE FLOUE (FUZZY SEARCH) ---
  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const getLevenshteinDistance = (a: string, b: string) => {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 8 ? { start: year, end: year + 1 } : { start: year - 1, end: year };
  };

  const isDateInSeason = (dateStr: string, season: { start: number; end: number }) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (year === season.start && month >= 8) return true;
    if (year === season.end && month <= 7) return true;
    return false;
  };

  const fetchPlayerStats = async () => {
    try {
      const [aperoResponse, matchResponse, carpoolResponse, finesResponse, expensesResponse] = await Promise.all([
        supabase.from("apero_schedule").select("person1_id, person2_id"),
        supabase.from("match_schedule").select("saturday_person1_id, saturday_person2_id, saturday_person3_id, saturday_person4_id, sunday_person1_id, sunday_person2_id, sunday_person3_id, sunday_person4_id"),
        supabase.from("carpools").select("*"),
        supabase.from("fines").select("player_id, date, fine_types(amount)"),
        supabase.from("expenses").select(`id, amount, expense_participants(player_id)`),
      ]);

      const stats: { [playerId: string]: PlayerStats } = {};
      const currentSeason = getCurrentSeason();

      const initStat = (id: string) => {
        if (!stats[id]) stats[id] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
      };

      aperoResponse.data?.forEach(item => {
        if (item.person1_id) { initStat(item.person1_id); stats[item.person1_id].aperoCount++; }
        if (item.person2_id) { initStat(item.person2_id); stats[item.person2_id].aperoCount++; }
      });

      matchResponse.data?.forEach((item: any) => {
        [item.saturday_person1_id, item.saturday_person2_id, item.saturday_person3_id, item.saturday_person4_id, item.sunday_person1_id, item.sunday_person2_id, item.sunday_person3_id, item.sunday_person4_id].forEach(id => {
          if (id) { initStat(id); stats[id].matchCount++; }
        });
      });

      carpoolResponse.data?.forEach(carpool => {
        [carpool.team1_player1_id, carpool.team1_player2_id, carpool.team1_player3_id, carpool.team1_player4_id, carpool.team1_player5_id, carpool.team2_player1_id, carpool.team2_player2_id, carpool.team2_player3_id, carpool.team2_player4_id, carpool.team2_player5_id].forEach(id => {
          if (id) { initStat(id); stats[id].carpoolCount++; }
        });
      });

      finesResponse.data?.forEach((fine: any) => {
        if (fine.player_id && fine.fine_types && fine.date && isDateInSeason(fine.date, currentSeason)) {
          initStat(fine.player_id);
          stats[fine.player_id].finesTotal += fine.fine_types.amount || 0;
        }
      });

      const { data: pData } = await supabase.from("players").select("id, manual_payment, participates_in_fund");
      pData?.forEach(p => {
        if (Number(p.manual_payment) > 0) { 
          initStat(p.id); 
          stats[p.id].finesTotal += Number(p.manual_payment); 
        }
      });

      expensesResponse.data?.forEach((exp: any) => {
        const parts = exp.expense_participants?.map((p: any) => p.player_id) || [];
        if (parts.length > 0) {
          const perPerson = Number(exp.amount) / parts.length;
          parts.forEach((pId: string) => {
            const playerData = pData?.find(pd => pd.id === pId); // Correction de la variable ici
            if (playerData && !playerData.participates_in_fund) {
              initStat(pId);
              stats[pId].redistributionAmount += perPerson;
            }
          });
        }
      });

      setPlayerStats(stats);
    } catch (error) {
      console.error("Error stats:", error);
    }
  };

  const handleModalClose = () => { setIsModalOpen(false); setSelectedPlayer(null); fetchPlayers(); fetchPlayerStats(); };
  const handleDelete = async (id: string) => { if (!confirm("Supprimer ce joueur ?")) return; try { await supabase.from("players").delete().eq("id", id); fetchPlayers(); } catch (e) { console.error(e); } };

  const filteredPlayers = players.filter((p) => {
    const matchesLicense = licenseFilter === "all" ? true : (licenseFilter === "with" ? p.carpooling : !p.carpooling);
    if (!searchQuery) return matchesLicense;

    const searchNorm = normalizeText(searchQuery);
    const firstNorm = normalizeText(p.first_name);
    const lastNorm = normalizeText(p.last_name);
    const fullNorm = `${firstNorm} ${lastNorm}`;

    if (fullNorm.includes(searchNorm)) return matchesLicense;

    const threshold = searchQuery.length > 4 ? 2 : 1;
    return matchesLicense && (getLevenshteinDistance(searchNorm, firstNorm) <= threshold || getLevenshteinDistance(searchNorm, lastNorm) <= threshold);
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aTotal = (playerStats[a.id]?.aperoCount || 0) + (playerStats[a.id]?.carpoolCount || 0);
    const bTotal = (playerStats[b.id]?.aperoCount || 0) + (playerStats[b.id]?.carpoolCount || 0);
    return aTotal - bTotal;
  });

  const formatPrice = (n: number) => n % 1 === 0 ? `${n}` : n.toFixed(2);
  const totalFines = Object.values(playerStats).reduce((s, st) => s + st.finesTotal, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Effectif</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-400">
            <span>Total: {sortedPlayers.length}</span>
            <span className="text-green-400 font-semibold">Amendes: {formatPrice(totalFines)} €</span>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => { setSelectedPlayer(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all">
            <UserPlus size={18} /> Nouveau joueur
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <CloseIcon size={18} />
            </button>
          )}
        </div>
        <select
          value={licenseFilter}
          onChange={(e) => setLicenseFilter(e.target.value as any)}
          className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">Tous les joueurs</option>
          <option value="with">Covoiturage actif</option>
          <option value="without">Pas de covoiturage</option>
        </select>
      </div>

      {sortedPlayers.length === 0 ? (
        <div className="bg-slate-800/40 rounded-2xl p-12 text-center border border-dashed border-slate-700">
          <p className="text-slate-500">Aucun joueur trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlayers.map((player) => (
            <div key={player.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-green-500/40 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  {player.photo_url ? (
                    <img src={player.photo_url} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-slate-400"><User size={24} /></div>
                  )}
                  <div className="truncate">
                    <h3 className="text-white font-bold truncate">{player.first_name} {player.last_name}</h3>
                    <div className="flex gap-3 mt-1 text-slate-400">
                      {player.thursday_aperitif && <div className="flex items-center gap-1"><Wine size={14} className="text-orange-400" /> <span className="text-xs">{playerStats[player.id]?.aperoCount || 0}</span></div>}
                      {player.scoreboard && <div className="flex items-center gap-1"><Calendar size={14} className="text-blue-400" /> <span className="text-xs">{playerStats[player.id]?.matchCount || 0}</span></div>}
                      {player.carpooling && <div className="flex items-center gap-1"><Car size={14} className="text-green-400" /> <span className="text-xs">{playerStats[player.id]?.carpoolCount || 0}</span></div>}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedPlayer(player); setIsModalOpen(true); }} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(player.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {((playerStats[player.id]?.finesTotal || 0) > 0 || (player.paid_amount || 0) > 0) && (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    <Euro size={12} className="text-yellow-500" />
                    <span className="text-xs font-bold text-green-400">{formatPrice(player.paid_amount || 0)}€</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-xs text-slate-300">{formatPrice(playerStats[player.id]?.finesTotal || 0)}€</span>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className={`mt-4 pt-3 ${player.email ? 'border-t border-slate-700/50' : ''}`}>
                  {player.email ? (
                    <div className="flex items-center gap-2 overflow-hidden text-slate-400">
                      <Mail size={14} className="text-blue-400 shrink-0" />
                      <span className="text-xs truncate">{player.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border-t border-slate-700/50 pt-3 text-slate-500 italic text-xs">
                      <Mail size={14} className="shrink-0" /> Email indisponible
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {isModalOpen && <PlayerModal player={selectedPlayer} onClose={handleModalClose} />}
    </div>
  );
};