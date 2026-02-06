import { useState, useEffect, useMemo } from "react"; // Ajout de useMemo
import { supabase, Player } from "../../lib/supabase";
import {
  UserPlus, CreditCard as Edit2, Trash2, User, Car, Wine, Calendar, Euro, Search, X as CloseIcon, Phone,
} from "lucide-react";
import { PlayerModal } from "./PlayerModal";
import { useAuth } from "../../contexts/AuthContext";
import { fuzzyMatch } from "../../utils/search";
import { formatPrice } from "../../utils/format";
import { usePlayerStats } from "../../hooks/usePlayerStats";
import toast from "react-hot-toast";

export const PlayerList = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [beers, setBeers] = useState<any[]>([]);
  const [eventDebts, setEventDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [licenseFilter, setLicenseFilter] = useState<"all" | "with" | "without">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();
  const isAdmin = !!user;
  const { playerStats, totalFinesGlobal, refreshStats } = usePlayerStats();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [playersRes, finesRes, beersRes, eventsRes] = await Promise.all([
        supabase.from("players").select("*").order("last_name", { ascending: true }),
        supabase.from("fines").select("*, fine_types(amount)"),
        supabase.from("beers").select("*"),
        supabase.from("event_debts").select("*"),
      ]);

      if (playersRes.error) throw playersRes.error;
      setPlayers(playersRes.data || []);
      setFines(finesRes.data || []);
      setBeers(beersRes.data || []);
      setEventDebts(eventsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMISATION : Calcul mis en cache pour éviter de ramer lors de la recherche
  const playerBalances = useMemo(() => {
    return players.reduce((acc, player) => {
      const pFines = (fines || []).filter((f) => f.player_id === player.id)
        .reduce((sum, f) => sum + (f.fine_types?.amount || 0) * (f.quantity || 1), 0);
      const pBeers = (beers || []).filter((b) => b.player_id === player.id)
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      const pEvents = (eventDebts || []).filter((e) => e.player_id === player.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const totalDue = pFines + pBeers + pEvents;
      acc[player.id] = { totalDue, paid: player.paid_amount || 0, balance: totalDue - (player.paid_amount || 0) };
      return acc;
    }, {} as Record<string, any>);
  }, [players, fines, beers, eventDebts]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
    fetchData();
    refreshStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce joueur ?")) return;
    try {
      await supabase.from("players").delete().eq("id", id);
      fetchData();
      refreshStats();
      toast.success("Joueur supprimé !");
    } catch (e) { console.error(e); }
  };

  const sortedPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesLicense = licenseFilter === "all" ? true : licenseFilter === "with" ? p.carpooling : !p.carpooling;
        return matchesLicense && fuzzyMatch(`${p.first_name} ${p.last_name}`, searchQuery, true);
      })
      .sort((a, b) => playerBalances[b.id].balance - playerBalances[a.id].balance);
  }, [players, licenseFilter, searchQuery, playerBalances]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Effectif</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-400">
            <span>Total: {sortedPlayers.length}</span>
            <span className="text-green-400 font-semibold">
              Dettes globales: {formatPrice(Object.values(playerBalances).reduce((acc, b) => acc + b.balance, 0))} €
            </span>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => { setSelectedPlayer(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
            <UserPlus size={18} /> Nouveau joueur
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Rechercher un joueur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><CloseIcon size={18} /></button>}
        </div>
        <select value={licenseFilter} onChange={(e) => setLicenseFilter(e.target.value as any)} className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500">
          <option value="all">Tous les joueurs</option>
          <option value="with">Covoiturage actif</option>
          <option value="without">Pas de covoiturage</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPlayers.map((player) => {
          const stats = playerBalances[player.id];
          return (
            <div key={player.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-green-500/40 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  {player.photo_url ? <img src={player.photo_url} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" /> : <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-slate-400"><User size={24} /></div>}
                  <div className="truncate">
                    <h3 className="text-white font-bold truncate">{player.first_name} {player.last_name}</h3>
                    <div className="flex gap-3 mt-1 text-slate-400">
                      {player.thursday_aperitif && <div className="flex items-center gap-1"><Wine size={14} className="text-orange-400" /><span className="text-xs">{playerStats[player.id]?.aperoCount || 0}</span></div>}
                      {player.scoreboard && <div className="flex items-center gap-1"><Calendar size={14} className="text-blue-400" /><span className="text-xs">{playerStats[player.id]?.matchCount || 0}</span></div>}
                      {player.carpooling && <div className="flex items-center gap-1"><Car size={14} className="text-green-400" /><span className="text-xs">{playerStats[player.id]?.carpoolCount || 0}</span></div>}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setSelectedPlayer(player); setIsModalOpen(true); }} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(player.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  <Euro size={12} className="text-yellow-500" />
                  <span className={`text-xs font-bold ${stats.balance > 0 ? "text-red-400" : "text-green-400"}`}>{formatPrice(stats.balance)}€</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-xs text-slate-300">{formatPrice(stats.totalDue)}€</span>
                </div>
                {stats.balance <= 0 && <div className="bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg"><span className="text-[9px] text-green-500 font-bold uppercase">À jour</span></div>}
                {stats.balance > 0 && <div className="bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg"><span className="text-[9px] text-red-500 font-bold uppercase">En retard</span></div>}
              </div>
              {isAdmin && player.phone_number && <div className="mt-4 pt-3 border-t border-slate-700/50"><div className="flex items-center gap-2 overflow-hidden text-slate-400"><Phone size={14} className="text-blue-400 shrink-0" /><span className="text-xs truncate">{player.phone_number}</span></div></div>}
            </div>
          );
        })}
      </div>
      {isModalOpen && <PlayerModal player={selectedPlayer} onClose={handleModalClose} />}
    </div>
  );
};