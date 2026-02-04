import { useState, useEffect } from "react";
import {
  supabase,
  Player,
  FineType,
  Fine,
  ActivityLog,
  Expense,
} from "../../lib/supabase";
import {
  Plus,
  TrendingUp,
  Trash2,
  Bell,
  Edit,
  Search,
  Calendar,
  Clock,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { FineTypeManager } from "./FineTypeManager";
import { ExpenseManager } from "./ExpenseManager";
import { logActivity } from "../../lib/activityLog";

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
  const [playerTotals, setPlayerTotals] = useState<
    { player: Player; total: number }[]
  >([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingManualPayment, setEditingManualPayment] = useState<
    string | null
  >(null);
  const [manualPaymentValue, setManualPaymentValue] = useState("0");
  const [editingPaidAmount, setEditingPaidAmount] = useState<string | null>(
    null,
  );
  const [paidAmountValue, setPaidAmountValue] = useState("0");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const seasonStart = currentMonth >= 9 ? currentYear : currentYear - 1;
  const seasonLabel = `Saison ${seasonStart}-${seasonStart + 1}`;

  useEffect(() => {
    fetchData();
    fetchExpenses();
  }, []);

  useEffect(() => {
    calculatePlayerTotals(fines, players);
  }, [fines, players, expenses]);

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

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    setExpenses(data || []);
  };

  const calculatePlayerTotals = (finesData: any[], playerData: Player[]) => {
    const totals: { [key: string]: number } = {};
    finesData.forEach((fine) => {
      totals[fine.player_id] =
        (totals[fine.player_id] || 0) + Number(fine.fine_types?.amount || 0);
    });
    const totalExp = expenses.reduce((t, e) => t + Number(e.amount), 0);
    const expPerPlayer =
      playerData.length > 0 ? Math.ceil(totalExp / playerData.length) : 0;
    const data = playerData
      .map((p) => {
        let pTotal = (totals[p.id] || 0) + (p.manual_payment || 0);
        if (!p.participates_in_fund) pTotal += expPerPlayer;
        return { player: p, total: pTotal };
      })
      .sort((a, b) => b.total - a.total);
    setPlayerTotals(data);
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
      setSelectedPlayer("");
      setSelectedFineType("");
      setNotes("");
      fetchData();
    }
  };

  const totalPaid = players.reduce((t, p) => t + (p.paid_amount || 0), 0);
  const totalDue =
    fines.reduce((t, f) => t + Number(f.fine_types?.amount || 0), 0) +
    players.reduce((t, p) => t + (p.manual_payment || 0), 0);
  const totalExpVal = expenses.reduce((t, e) => t + Number(e.amount), 0);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-500 rounded-full" />
      </div>
    );

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert size={32} className="text-green-500" /> Boîte Noire
          </h2>
          <p className="text-slate-400 font-medium flex items-center gap-2 mt-1">
            <Calendar size={16} /> {seasonLabel}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
          <StatCard title="Total Dû" value={`${totalDue} €`} color="text-white" />
          <StatCard title="Total Payé" value={`${totalPaid} €`} color="text-green-400" />
          <StatCard title="Dépenses" value={`${totalExpVal} €`} color="text-red-400" />
          <StatCard title="Solde" value={`${totalPaid - totalExpVal} €`} color="text-white" isHighlight />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        {/* COLONNE GAUCHE (Visible uniquement en Admin) */}
        {user && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                  <Bell size={20} className="text-green-400" /> Nouvelle amende
                </h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`p-2 rounded-xl transition-all ${showAddForm ? "bg-slate-700 text-white" : "bg-green-600/20 text-green-400 hover:bg-green-600/30"}`}
                >
                  {showAddForm ? <X size={20} /> : <Plus size={20} />}
                </button>
              </div>
              {showAddForm && (
                <div className="p-6">
                  <form onSubmit={handleAddFine} className="space-y-4">
                    <select
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    >
                      <option value="">Joueur...</option>
                      {players.filter((p) => p.participates_in_fund).map((p) => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                    <select
                      value={selectedFineType}
                      onChange={(e) => setSelectedFineType(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    >
                      <option value="">Amende...</option>
                      {fineTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.amount}€)</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes..."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                      rows={2}
                    />
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg">Enregistrer</button>
                  </form>
                </div>
              )}
            </div>
            <FineTypeManager onUpdate={fetchData} />
            <ExpenseManager onUpdate={() => { fetchData(); fetchExpenses(); }} />
          </div>
        )}

        {/* SECTION ETAT DES DETTES (Largeur dynamique) */}
        <div className={`${user ? "lg:col-span-2" : "lg:col-span-3"} lg:relative min-h-[500px]`}>
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
                <TrendingUp size={20} className="text-green-500" /> État des amendes par joueur
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              <div className={`grid grid-cols-1 ${user ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
                {playerTotals
                  .filter(({ player }) =>
                    `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(({ player, total }) => (
                    <div key={player.id} className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 group">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-white font-bold text-sm">{player.first_name} {player.last_name}</p>
                        <div className="text-right">
                          <p className={`font-black text-lg ${total > 0 ? "text-red-400" : "text-green-400"}`}>{total} €</p>
                          {user && (
                            <button
                              onClick={() => {
                                setEditingManualPayment(player.id);
                                setManualPaymentValue(player.manual_payment?.toString() || "0");
                              }}
                              className="text-[10px] text-slate-500 hover:text-white underline"
                            >
                              Ajuster
                            </button>
                          )}
                        </div>
                      </div>

                      {editingManualPayment === player.id && (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="number"
                            value={manualPaymentValue}
                            onChange={(e) => setManualPaymentValue(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => {
                              supabase.from("players").update({ manual_payment: parseFloat(manualPaymentValue) || 0 }).eq("id", player.id).then(() => {
                                setEditingManualPayment(null);
                                fetchData();
                              });
                            }}
                            className="bg-green-600 px-2 rounded text-white text-xs"
                          >OK</button>
                          <button onClick={() => setEditingManualPayment(null)} className="bg-slate-700 px-2 rounded text-white text-xs"><X size={12} /></button>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Réglé :</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-500">{player.paid_amount || 0} €</span>
                          {user && (
                            <button
                              onClick={() => {
                                setEditingPaidAmount(player.id);
                                setPaidAmountValue(player.paid_amount?.toString() || "0");
                              }}
                              className="p-1 text-slate-600 hover:text-white"
                            ><Edit size={12} /></button>
                          )}
                        </div>
                      </div>

                      {editingPaidAmount === player.id && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="number"
                            value={paidAmountValue}
                            onChange={(e) => setPaidAmountValue(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => {
                              supabase.from("players").update({ paid_amount: parseFloat(paidAmountValue) || 0 }).eq("id", player.id).then(() => {
                                setEditingPaidAmount(null);
                                fetchData();
                              });
                            }}
                            className="bg-green-600 px-2 rounded text-white text-xs"
                          >OK</button>
                          <button onClick={() => setEditingPaidAmount(null)} className="bg-slate-700 px-2 rounded text-white text-xs"><X size={12} /></button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIQUE */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/50 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase">
              <Clock size={20} className="text-green-400" /> Historique complet des amendes
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={filterPlayer}
              onChange={(e) => setFilterPlayer(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none focus:ring-2 focus:ring-green-500 transition-all cursor-pointer"
            >
              <option value="">Tous les joueurs</option>
              {players.filter(p => p.participates_in_fund).map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none focus:ring-2 focus:ring-green-500 transition-all cursor-pointer"
            >
              <option value="">Toutes les amendes</option>
              {fineTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none focus:ring-2 focus:ring-green-500 transition-all cursor-pointer"
            >
              <option value="desc">Plus récent ↓</option>
              <option value="asc">Plus ancien ↑</option>
            </select>
            {(filterPlayer || filterType) && (
              <button onClick={() => { setFilterPlayer(''); setFilterType(''); }} className="p-2 text-slate-400 hover:text-red-400"><X size={18} /></button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Joueur</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Sanction</th>
                <th className="px-6 py-4 font-bold text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {(() => {
                const filteredFines = fines
                  .filter((fine) => {
                    const matchPlayer = filterPlayer ? fine.player_id === filterPlayer : true;
                    const matchType = filterType ? fine.fine_type_id === filterType : true;
                    return matchPlayer && matchType;
                  })
                  .sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
                  });

                if (filteredFines.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <Search size={24} className="opacity-20" />
                          Aucune amende ne correspond à ces critères.
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filteredFines.map((fine) => (
                  <tr key={fine.id} className="text-sm hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{new Date(fine.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4 text-white font-medium">{fine.players?.first_name} {fine.players?.last_name}</td>
                    <td className="px-6 py-4 text-slate-300">{fine.fine_types?.name}</td>
                    <td className="px-6 py-4">
                      {fine.fine_types?.sanction && (
                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20 uppercase whitespace-nowrap">{fine.fine_types.sanction}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-red-400 font-bold">{fine.fine_types?.amount} €</span>
                        {user && (
                          <button onClick={() => { if (confirm("Supprimer ?")) supabase.from("fines").delete().eq("id", fine.id).then(fetchData); }} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, isHighlight }: { title: string; value: string; color: string; isHighlight?: boolean; }) => (
  <div className={`${isHighlight ? "bg-gradient-to-br from-green-600 to-orange-600" : "bg-slate-800"} p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center justify-center`}>
    <p className={`text-[10px] ${isHighlight ? "text-orange-100" : "text-slate-400"} font-bold uppercase tracking-wider mb-1`}>{title}</p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);