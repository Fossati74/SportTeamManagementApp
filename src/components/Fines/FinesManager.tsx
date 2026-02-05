import { useState, useEffect, useRef } from "react";
import { supabase, Player, FineType, Fine } from "../../lib/supabase";
import {
  Plus,
  TrendingUp,
  Trash2,
  Bell,
  Search,
  Calendar,
  Clock,
  ShieldAlert,
  X,
  Edit,
  Check,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { FineTypeManager } from "./FineTypeManager";
import { ExpenseManager } from "./ExpenseManager";
import { fuzzyMatch } from "../../utils/search";
import { getCurrentSeason, formatDateFr } from "../../utils/date";
import { formatPrice } from "../../utils/format";
import { SectionHeader } from "../common/SectionHeader";
import { usePlayerStats } from "../../hooks/usePlayerStats";
import toast from "react-hot-toast";
import { PlayerSearchSelect } from "../common/PlayerSearchSelect";

export const FinesManager = () => {
  const [fines, setFines] = useState<
    (Fine & { players?: Player; fine_types?: FineType })[]
  >([]);
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedFineType, setSelectedFineType] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingManualPayment, setEditingManualPayment] = useState<
    string | null
  >(null);
  const [manualPaymentValue, setManualPaymentValue] = useState("0");
  const [editingPaidAmount, setEditingPaidAmount] = useState<string | null>(
    null,
  );
  const [paidAmountValue, setPaidAmountValue] = useState("0");

  const { user } = useAuth();
  const isAdmin = !!user;
  const { playerStats, totalFinesGlobal, refreshStats } = usePlayerStats();

  const [searchQuery, setSearchQuery] = useState("");
  const [formPlayerSearch, setFormPlayerSearch] = useState("");
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const season = getCurrentSeason();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [finesRes, typesRes, playersRes] = await Promise.all([
        supabase
          .from("fines")
          .select("*, players(*), fine_types(*)")
          .order("date", { ascending: false }),
        supabase
          .from("fine_types")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("players")
          .select("*")
          .order("last_name", { ascending: true }),
      ]);
      setFines(finesRes.data || []);
      setFineTypes(typesRes.data || []);
      setPlayers(playersRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayerValue = async (
    playerId: string,
    field: "manual_payment" | "paid_amount",
    value: string,
  ) => {
    const numValue = parseFloat(value) || 0;
    const { error } = await supabase
      .from("players")
      .update({ [field]: numValue })
      .eq("id", playerId);
    if (!error) {
      toast.success("Mis à jour !");
      setEditingManualPayment(null);
      setEditingPaidAmount(null);
      fetchData();
      refreshStats();
    }
  };

  const handleAddFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !selectedFineType) return;
    const { error } = await supabase.from("fines").insert({
      player_id: selectedPlayer,
      fine_type_id: selectedFineType,
      date: selectedDate,
      notes: notes || null,
    });
    if (!error) {
      toast.success("Amende enregistrée !");
      setSelectedPlayer("");
      setFormPlayerSearch("");
      setSelectedFineType("");
      setNotes("");
      fetchData();
      refreshStats();
    }
  };

  const totalPaid = players.reduce((t, p) => t + (p.paid_amount || 0), 0);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" />
      </div>
    );

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      {/* HEADER STATS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert size={32} className="text-green-500" /> Boîte Noire
          </h2>
          <p className="text-slate-400 font-medium flex items-center gap-2 mt-1">
            <Calendar size={16} /> {season.label}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
          <StatCard
            title="Total Dû"
            value={`${formatPrice(totalFinesGlobal)} €`}
            color="text-white"
          />
          <StatCard
            title="Total Payé"
            value={`${formatPrice(totalPaid)} €`}
            color="text-green-400"
          />
          <StatCard
            title="Solde"
            value={`${formatPrice(totalFinesGlobal - totalPaid)} €`}
            color="text-red-400"
          />
          <StatCard
            title="En Caisse"
            value={`${formatPrice(totalPaid)} €`}
            color="text-white"
            isHighlight
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
              <SectionHeader title="Nouvelle amende" Icon={Bell}>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`p-2 rounded-xl transition-all ${showAddForm ? "bg-slate-700" : "bg-green-600/20 text-green-400"}`}
                >
                  {showAddForm ? <X size={20} /> : <Plus size={20} />}
                </button>
              </SectionHeader>
              {showAddForm && (
                <div className="p-6">
                  <form onSubmit={handleAddFine} className="space-y-4">
                    <div className="relative" ref={dropdownRef}>
                      <input
                        type="text"
                        placeholder="Joueur..."
                        value={formPlayerSearch}
                        onChange={(e) => {
                          setFormPlayerSearch(e.target.value);
                          setShowPlayerList(true);
                        }}
                        className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      />
                      {showPlayerList && (
                        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl max-h-48 overflow-y-auto">
                          {players
                            .filter(
                              (p) =>
                                p.participates_in_fund &&
                                fuzzyMatch(
                                  `${p.first_name} ${p.last_name}`,
                                  formPlayerSearch,
                                  true,
                                ),
                            )
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPlayer(p.id);
                                  setFormPlayerSearch(
                                    `${p.first_name} ${p.last_name}`,
                                  );
                                  setShowPlayerList(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                              >
                                {p.first_name} {p.last_name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <select
                      value={selectedFineType}
                      onChange={(e) => setSelectedFineType(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                      required
                    >
                      <option value="">Amende...</option>
                      {fineTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.amount}€)
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-green-600 text-white font-bold py-3 rounded-xl uppercase text-xs"
                    >
                      Enregistrer
                    </button>
                  </form>
                </div>
              )}
            </div>
            <FineTypeManager onUpdate={fetchData} />
            <ExpenseManager
              onUpdate={() => {
                fetchData();
                refreshStats();
              }}
            />
          </div>
        )}
        {/* ÉTAT DES DETTES PAR JOUEUR */}
        <div
          className={`${isAdmin ? "lg:col-span-2" : "lg:col-span-3"} lg:relative min-h-[500px]`}
        >
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
            <SectionHeader
              title="Montant par joueur"
              Icon={TrendingUp}
              isSearch
            >
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={14}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </SectionHeader>

            {/* flex-1 et overflow-y-auto pour le scroll interne */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div
                className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}
              >
                {players
                  .filter(
                    (p) =>
                      p.participates_in_fund &&
                      fuzzyMatch(
                        `${p.first_name} ${p.last_name}`,
                        searchQuery,
                        true,
                      ),
                  )
                  .sort(
                    (a, b) =>
                      (playerStats[b.id]?.finesTotal || 0) -
                      (playerStats[a.id]?.finesTotal || 0),
                  )
                  .map((player) => {
                    const due = playerStats[player.id]?.finesTotal || 0;
                    const paid = player.paid_amount || 0;
                    const balance = due - paid;

                    return (
                      <div
                        key={player.id}
                        className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between hover:border-slate-500 transition-colors"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-white font-bold text-sm">
                                {player.first_name} {player.last_name}
                              </p>
                              <p
                                className={`text-xl font-black ${balance > 0 ? "text-red-400" : "text-green-400"}`}
                              >
                                {formatPrice(balance)} €
                              </p>
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                Reste à payer
                              </p>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingManualPayment(player.id);
                                  setManualPaymentValue(
                                    player.manual_payment?.toString() || "0",
                                  );
                                }}
                                className="text-[10px] text-slate-400 hover:text-white underline uppercase transition-colors"
                              >
                                Ajuster
                              </button>
                            )}
                          </div>

                          {editingManualPayment === player.id && (
                            <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-top-1">
                              <input
                                type="number"
                                value={manualPaymentValue}
                                onChange={(e) =>
                                  setManualPaymentValue(e.target.value)
                                }
                                className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none"
                              />
                              <button
                                onClick={() =>
                                  handleUpdatePlayerValue(
                                    player.id,
                                    "manual_payment",
                                    manualPaymentValue,
                                  )
                                }
                                className="bg-green-600 p-1.5 rounded text-white"
                              >
                                <Check size={14} strokeWidth={3} />
                              </button>
                              <button
                                onClick={() => setEditingManualPayment(null)}
                                className="bg-slate-700 p-1.5 rounded text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-800 mt-2">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                            <div className="flex flex-col">
                              <span className="text-slate-500">Total dû</span>
                              <span className="text-slate-300 text-xs">
                                {formatPrice(due)} €
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">Réglé</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setEditingPaidAmount(player.id);
                                      setPaidAmountValue(
                                        player.paid_amount?.toString() || "0",
                                      );
                                    }}
                                    className="text-slate-500 hover:text-green-400"
                                  >
                                    <Edit size={12} />
                                  </button>
                                )}
                              </div>
                              <span className="text-green-500 text-xs">
                                {formatPrice(paid)} €
                              </span>
                            </div>
                          </div>

                          {editingPaidAmount === player.id && (
                            <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-bottom-1">
                              <input
                                type="number"
                                value={paidAmountValue}
                                onChange={(e) =>
                                  setPaidAmountValue(e.target.value)
                                }
                                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                              />
                              <button
                                onClick={() =>
                                  handleUpdatePlayerValue(
                                    player.id,
                                    "paid_amount",
                                    paidAmountValue,
                                  )
                                }
                                className="bg-green-600 px-3 py-1 rounded text-white text-[10px] font-bold uppercase"
                              >
                                OK
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <SectionHeader title="Historique complet" Icon={Clock}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Remplacement du Select Joueur */}
            <div className="w-48">
              <PlayerSearchSelect
                label="Tous Joueurs" // Le label sert de placeholder quand rien n'est sélectionné
                value={filterPlayer}
                onSelect={setFilterPlayer}
                players={players.filter((p) => p.participates_in_fund)}
                statKey=""
                allSelectedIds={[]}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-[10px] font-bold text-white outline-none focus:ring-2 focus:ring-green-500 h-[38px]"
            >
              <option value="">Tous Types</option>
              {fineTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-[10px] font-bold text-white outline-none focus:ring-2 focus:ring-green-500 h-[38px]"
            >
              <option value="desc">Récent ↓</option>
              <option value="asc">Ancien ↑</option>
            </select>

            {/* Bouton pour réinitialiser rapidement le filtre joueur s'il est actif */}
            {filterPlayer && (
              <button
                onClick={() => setFilterPlayer("")}
                className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-900/50 rounded-lg border border-slate-700"
                title="Réinitialiser le filtre"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </SectionHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/30 text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Joueur</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Sanction</th>
                <th className="px-6 py-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {fines
                .filter(
                  (f) =>
                    (filterPlayer ? f.player_id === filterPlayer : true) &&
                    (filterType ? f.fine_type_id === filterType : true),
                )
                .sort((a, b) =>
                  sortOrder === "desc"
                    ? new Date(b.date).getTime() - new Date(a.date).getTime()
                    : new Date(a.date).getTime() - new Date(b.date).getTime(),
                )
                .map((fine) => (
                  <tr
                    key={fine.id}
                    className="hover:bg-slate-700/20 group transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {formatDateFr(fine.date)}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {fine.players?.first_name} {fine.players?.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {fine.fine_types?.name}
                    </td>
                    <td className="px-6 py-4">
                      {fine.fine_types?.sanction && (
                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20 uppercase whitespace-nowrap">
                          {fine.fine_types.sanction}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-red-400 font-bold">
                          {formatPrice(fine.fine_types?.amount || 0)} €
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm("Supprimer cette amende ?"))
                                supabase
                                  .from("fines")
                                  .delete()
                                  .eq("id", fine.id)
                                  .then(() => {
                                    fetchData();
                                    refreshStats();
                                  });
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Message si aucun résultat après filtrage */}
          {fines.filter(
            (f) =>
              (filterPlayer ? f.player_id === filterPlayer : true) &&
              (filterType ? f.fine_type_id === filterType : true),
          ).length === 0 && (
            <div className="p-10 text-center text-slate-500 italic text-sm">
              Aucune amende ne correspond à ces critères.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, isHighlight }: any) => (
  <div
    className={`${isHighlight ? "bg-gradient-to-br from-green-600 to-orange-600 shadow-lg" : "bg-slate-800"} p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}
  >
    <p
      className={`text-[10px] ${isHighlight ? "text-orange-100" : "text-slate-400"} font-bold uppercase mb-1`}
    >
      {title}
    </p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);
