import { useState, useEffect } from "react";
import { supabase, Player, FineType, Fine } from "../../lib/supabase";
import {
  Plus, TrendingUp, Trash2, Bell, Search, Calendar, Clock,
  ShieldAlert, X, Edit, Check,
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
  const [fines, setFines] = useState<any[]>([]);
  const [beers, setBeers] = useState<any[]>([]);
  const [eventDebts, setEventDebts] = useState<any[]>([]);
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [transactionType, setTransactionType] = useState<"fine" | "beers">("fine");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedBeerPlayers, setSelectedBeerPlayers] = useState<string[]>([]);
  const [selectedFineType, setSelectedFineType] = useState("");
  const [beerAmount, setBeerAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ fines: "0", events: "0", beers: "0" });
  const [editingPaidAmount, setEditingPaidAmount] = useState<string | null>(null);
  const [paidAmountValue, setPaidAmountValue] = useState("0");

  const { user } = useAuth();
  const isAdmin = !!user;
  const { refreshStats } = usePlayerStats();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterParticipation, setFilterParticipation] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [beerSearchQuery, setBeerSearchQuery] = useState("");
  const [historyTab, setHistoryTab] = useState<"fines" | "beers" | "events">("fines");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const season = getCurrentSeason();

  useEffect(() => {
    fetchData();
  }, []);

  // OPTIMISATION : Vider la sélection au changement d'onglet
  useEffect(() => {
    setSelectedRows([]);
  }, [historyTab]);

  const fetchData = async () => {
    try {
      const [finesRes, beersRes, eventsRes, typesRes, playersRes] = await Promise.all([
        supabase.from("fines").select("*, players(*), fine_types(*)").order("date", { ascending: false }),
        supabase.from("beers").select("*, players(*)").order("date", { ascending: false }),
        supabase.from("event_debts").select("*, players(*)").order("created_at", { ascending: false }),
        supabase.from("fine_types").select("*").order("name", { ascending: true }),
        supabase.from("players").select("*").order("last_name", { ascending: true }),
      ]);
      setFines(finesRes.data || []);
      setBeers(beersRes.data || []);
      setEventDebts(eventsRes.data || []);
      setFineTypes(typesRes.data || []);
      setPlayers(playersRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerBalance = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    const finesTotal = fines
      .filter((f) => f.player_id === playerId)
      .reduce((sum, f) => sum + (f.fine_types?.amount || 0) * (f.quantity || 1), 0);
    const beersTotal = beers
      .filter((b) => b.player_id === playerId)
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const eventsTotal = eventDebts
      .filter((e) => e.player_id === playerId)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const paid = player?.paid_amount || 0;
    const due = finesTotal + beersTotal + eventsTotal;

    return {
      due,
      paid,
      balance: due - paid,
      details: { finesTotal, beersTotal, eventsTotal },
    };
  };

  const handleDeleteEntry = async (id: string, tab: string) => {
    const table = tab === "events" ? "event_debts" : tab;
    if (!confirm("Supprimer cette ligne de l'historique ?")) return;
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      toast.success("Supprimé !");
      fetchData();
      refreshStats();
    } catch (error) {
      toast.error("Erreur suppression");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRows.length || !confirm(`Supprimer les ${selectedRows.length} éléments sélectionnés ?`)) return;
    try {
      const table = historyTab === "events" ? "event_debts" : historyTab;
      const { error } = await supabase.from(table).delete().in("id", selectedRows);
      if (error) throw error;
      toast.success("Suppression réussie");
      setSelectedRows([]);
      fetchData();
      refreshStats();
    } catch (error) {
      toast.error("Erreur lors de la suppression groupée");
    }
  };

  const handleUpdatePaidAmount = async (playerId: string, newPaidTotal: number) => {
    try {
      await supabase.from("players").update({ paid_amount: newPaidTotal }).eq("id", playerId);

      const pFines = fines.filter(f => f.player_id === playerId).map(f => ({ id: f.id, table: 'fines', total: (f.fine_types?.amount || 0) * (f.quantity || 1), date: f.date }));
      const pBeers = beers.filter(b => b.player_id === playerId).map(b => ({ id: b.id, table: 'beers', total: b.amount, date: b.date }));
      const pEvents = eventDebts.filter(e => e.player_id === playerId).map(e => ({ id: e.id, table: 'event_debts', total: e.amount, date: e.created_at }));

      const allTx = [...pFines, ...pBeers, ...pEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let remaining = newPaidTotal;
      const updates: Record<string, { paid: string[], unpaid: string[] }> = {
        fines: { paid: [], unpaid: [] },
        beers: { paid: [], unpaid: [] },
        event_debts: { paid: [], unpaid: [] }
      };

      allTx.forEach(tx => {
        if (remaining >= tx.total) {
          updates[tx.table].paid.push(tx.id);
          remaining -= tx.total;
        } else {
          updates[tx.table].unpaid.push(tx.id);
        }
      });

      // Exécution groupée pour optimiser les performances
      await Promise.all(Object.keys(updates).flatMap(table => [
        updates[table].paid.length > 0 && supabase.from(table).update({ status: 'paid' }).in('id', updates[table].paid),
        updates[table].unpaid.length > 0 && supabase.from(table).update({ status: 'unpaid' }).in('id', updates[table].unpaid)
      ].filter(Boolean)));

      setEditingPaidAmount(null);
      fetchData();
      refreshStats();
      toast.success("Statuts mis à jour !");
    } catch (error) {
      toast.error("Erreur synchro");
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (transactionType === "fine") {
        await supabase.from("fines").insert({ player_id: selectedPlayer, fine_type_id: selectedFineType, date: selectedDate, quantity: 1 });
      } else {
        const amount = parseFloat(beerAmount);
        await supabase.from("beers").insert(selectedBeerPlayers.map((id) => ({ player_id: id, amount, date: selectedDate, status: "unpaid" })));
      }
      toast.success("Enregistré !");
      setSelectedPlayer(""); setSelectedBeerPlayers([]); setSelectedFineType(""); setBeerAmount("");
      fetchData(); refreshStats();
    } catch (error) { toast.error("Erreur"); }
  };

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
          <StatCard title="Total Dû" value={`${formatPrice(players.reduce((t, p) => t + getPlayerBalance(p.id).due, 0))} €`} color="text-white" />
          <StatCard title="Total Payé" value={`${formatPrice(players.reduce((t, p) => t + (p.paid_amount || 0), 0))} €`} color="text-green-400" />
          <StatCard title="Solde" value={`${formatPrice(players.reduce((t, p) => t + getPlayerBalance(p.id).balance, 0))} €`} color="text-red-400" />
          <StatCard title="En Caisse" value={`${formatPrice(players.reduce((t, p) => t + (p.paid_amount || 0), 0))} €`} color="text-white" isHighlight />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
              <SectionHeader title="Nouvelle transaction" Icon={Bell}>
                <button onClick={() => setShowAddForm(!showAddForm)} className={`p-2 rounded-xl transition-all ${showAddForm ? "bg-slate-700 text-white" : "bg-green-600/20 text-green-400"}`}>
                  {showAddForm ? <X size={20} /> : <Plus size={20} />}
                </button>
              </SectionHeader>
              {showAddForm && (
                <div className="p-6">
                  <form onSubmit={handleTransactionSubmit} className="space-y-4">
                    <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                      <button type="button" onClick={() => setTransactionType("fine")} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${transactionType === "fine" ? "bg-amber-500 text-black shadow-lg" : "text-slate-500"}`}>Amende</button>
                      <button type="button" onClick={() => setTransactionType("beers")} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${transactionType === "beers" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}>Fût</button>
                    </div>
                    <PlayerSearchSelect label="Joueur..." value={selectedPlayer} onSelect={setSelectedPlayer} players={players} />
                    {transactionType === "fine" ? (
                      <PlayerSearchSelect label="Amende..." value={selectedFineType} onSelect={setSelectedFineType} players={fineTypes} statLabel="€" statKey="amount" />
                    ) : (
                      <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {players.filter((p) => fuzzyMatch(`${p.first_name} ${p.last_name}`, beerSearchQuery, true)).map((player) => (
                              <label key={player.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedBeerPlayers.includes(player.id) ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}>
                                <input type="checkbox" className="hidden" checked={selectedBeerPlayers.includes(player.id)} onChange={() => selectedBeerPlayers.includes(player.id) ? setSelectedBeerPlayers(selectedBeerPlayers.filter((id) => id !== player.id)) : setSelectedBeerPlayers([...selectedBeerPlayers, player.id])} />
                                <span className="text-xs font-medium">{player.first_name} {player.last_name}</span>
                              </label>
                            ))}
                        </div>
                        <input type="number" placeholder="Prix/tête (€)..." value={beerAmount} onChange={(e) => setBeerAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    )}
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-green-500" required />
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl uppercase text-xs transition-transform active:scale-95 shadow-lg">Enregistrer</button>
                  </form>
                </div>
              )}
            </div>
            <FineTypeManager onUpdate={fetchData} />
            <ExpenseManager onUpdate={fetchData} />
          </div>
        )}

        <div className={`${isAdmin ? "lg:col-span-2" : "lg:col-span-3"} lg:relative min-h-[500px]`}>
          <div className="lg:absolute lg:inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
            <SectionHeader title="Montant par joueur" Icon={TrendingUp}>
              <div />
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Chercher un joueur..." className="w-full pl-10 pr-4 h-[38px] bg-slate-900 border border-slate-700 rounded-xl text-[10px] font-bold uppercase text-white outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-slate-500" />
                </div>
                <select value={filterParticipation} onChange={(e) => setFilterParticipation(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 h-[38px] text-[10px] font-bold uppercase text-white outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-64 transition-all">
                  <option value="all">Tous les joueurs</option>
                  <option value="contributing">Participants Caisse</option>
                  <option value="non-contributing">Non Participants</option>
                </select>
              </div>
            </SectionHeader>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}>
                {players.filter((p) => {
                    if (filterParticipation === "contributing") return p.participates_in_fund;
                    if (filterParticipation === "non-contributing") return !p.participates_in_fund;
                    return true;
                  }).filter((p) => fuzzyMatch(`${p.first_name} ${p.last_name}`, searchQuery, true))
                  .sort((a, b) => getPlayerBalance(b.id).balance - getPlayerBalance(a.id).balance)
                  .map((player) => {
                    const stats = getPlayerBalance(player.id);
                    const isEditing = editingPlayerId === player.id;
                    return (
                      <div key={player.id} className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between hover:border-slate-500 transition-all shadow-inner">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-white font-bold text-sm">{player.first_name} {player.last_name}</p>
                              <p className={`text-xl font-black ${stats.balance > 0 ? "text-red-400" : "text-green-400"}`}>{formatPrice(stats.balance)} €</p>
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Balance actuelle</p>
                            </div>
                            {isAdmin && (
                              <button onClick={() => { if (isEditing) fetchData(); else { setEditingPlayerId(player.id); setEditValues({ fines: stats.details.finesTotal.toString(), events: stats.details.eventsTotal.toString(), beers: stats.details.beersTotal.toString() }); } }} className="text-[10px] text-slate-400 hover:text-white underline uppercase">{isEditing ? "OK" : "Ajuster"}</button>
                            )}
                          </div>
                          <div className="space-y-1 mt-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                            <DetailRow label="Amendes" value={stats.details.finesTotal} isEditing={isEditing} editValue={editValues.fines} color="text-amber-500" onChange={(v: any) => setEditValues({ ...editValues, fines: v })} />
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase"><span className="text-slate-500">Évènements</span><span className="text-purple-400">{formatPrice(stats.details.eventsTotal)} €</span></div>
                            <DetailRow label="Fût" value={stats.details.beersTotal} isEditing={isEditing} editValue={editValues.beers} color="text-blue-400" onChange={(v: any) => setEditValues({ ...editValues, beers: v })} />
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 mt-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                          <span className="text-slate-500">Total dû: {formatPrice(stats.due)} €</span>
                          <div className="flex items-center gap-1.5 text-green-500 group relative">
                            <span>Réglé: {formatPrice(player.paid_amount || 0)} €</span>
                            {isAdmin && <button onClick={() => { setEditingPaidAmount(player.id); setPaidAmountValue(player.paid_amount?.toString() || "0"); }} className="text-slate-500 hover:text-green-400 transition-colors"><Edit size={12} /></button>}
                          </div>
                        </div>
                        {editingPaidAmount === player.id && (
                          <div className="flex gap-2 mt-2">
                            <input type="number" value={paidAmountValue} onChange={(e) => setPaidAmountValue(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none" />
                            <button onClick={() => handleUpdatePaidAmount(player.id, parseFloat(paidAmountValue))} className="bg-green-600 px-3 py-1 rounded text-white text-[10px] font-bold uppercase">OK</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <SectionHeader title="Historique" Icon={Clock}>
          <div className="hidden lg:block">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
              {["fines", "beers", "events"].map((t) => (
                <button key={t} onClick={() => setHistoryTab(t as any)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${historyTab === t ? "bg-green-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}>
                  {t === "beers" ? "Fûts" : t === "events" ? "Événements" : "Amendes"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full">
            <div className="lg:hidden flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner self-start">
              {["fines", "beers", "events"].map((t) => (
                <button key={t} onClick={() => setHistoryTab(t as any)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${historyTab === t ? "bg-green-600 text-white shadow-lg" : "text-slate-500"}`}>
                  {t === "beers" ? "Fûts" : t === "events" ? "Événements" : "Amendes"}
                </button>
              ))}
            </div>
            <div className="flex flex-col lg:flex-row gap-2 w-full lg:items-center">
              <div className="w-full lg:flex-1"><PlayerSearchSelect label="Joueur..." value={filterPlayer} onSelect={setFilterPlayer} players={players} /></div>
              {historyTab === "fines" && (
                <div className="w-full lg:w-48">
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 text-[10px] font-bold uppercase text-white outline-none h-[38px] w-full focus:ring-2 focus:ring-green-500 transition-all">
                    <option value="">Tous les types</option>
                    {fineTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2 w-full lg:w-auto">
                <button onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")} className={`flex-1 lg:w-12 h-[38px] flex items-center justify-center border rounded-xl transition-all ${sortOrder === "asc" ? "bg-green-600 border-green-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"}`}><Calendar size={16} /></button>
                {filterPlayer && <button onClick={() => setFilterPlayer("")} className="flex-1 lg:w-12 h-[38px] flex items-center justify-center bg-slate-900 border border-slate-700 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"><X size={16} /></button>}
              </div>
            </div>
          </div>
        </SectionHeader>

        <div className="overflow-x-auto">
          {isAdmin && selectedRows.length > 0 && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex justify-between items-center">
              <span className="text-red-400 text-xs font-bold uppercase ml-4">{selectedRows.length} sélectionné(s)</span>
              <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-2"><Trash2 size={14} /> Supprimer la sélection</button>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/30 text-slate-500 text-[10px] uppercase font-bold">
              <tr>
                {isAdmin && historyTab !== "events" && (
                  <th className="px-6 py-4 w-10">
                    <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-green-600 focus:ring-green-500 cursor-pointer" onChange={(e) => {
                        if (e.target.checked) {
                          const items = (historyTab === "fines" ? fines : beers).filter(i => (!filterPlayer || i.player_id === filterPlayer));
                          setSelectedRows(items.map(i => i.id));
                        } else setSelectedRows([]);
                      }} checked={selectedRows.length > 0} />
                  </th>
                )}
                <th className="px-6 py-4">Date</th><th className="px-6 py-4">Joueur</th><th className="px-6 py-4">Libellé</th><th className="px-6 py-4">Statut</th><th className="px-6 py-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {(() => {
                const data = (historyTab === "fines" ? fines : historyTab === "beers" ? beers : eventDebts)
                  .filter(i => (!filterPlayer || i.player_id === filterPlayer) && (!filterType || i.fine_type_id === filterType))
                  .sort((a, b) => {
                    const d1 = new Date(a.date || a.created_at).getTime();
                    const d2 = new Date(b.date || b.created_at).getTime();
                    return sortOrder === "desc" ? d2 - d1 : d1 - d2;
                  });

                if (!data.length) return <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">Aucun historique trouvé</td></tr>;

                return data.map((item) => {
                  const amt = historyTab === "fines" ? (item.fine_types?.amount || 0) * (item.quantity || 1) : item.amount;
                  const lbl = historyTab === "fines" ? item.fine_types?.name : (item.notes || item.description || "Dette");
                  const isPaid = item.status === "paid";
                  const isSelected = selectedRows.includes(item.id);

                  return (
                    <tr key={item.id} className={`transition-colors group ${isSelected ? "bg-green-600/10" : "hover:bg-slate-700/20"}`}>
                      {isAdmin && historyTab !== "events" && (
                        <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-green-600 focus:ring-green-500 cursor-pointer" checked={isSelected} onChange={() => setSelectedRows(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id])} /></td>
                      )}
                      <td className="px-6 py-4 text-slate-400 text-xs">{formatDateFr(item.date || item.created_at)}</td>
                      <td className="px-6 py-4 text-white font-medium text-xs">{item.players?.first_name} {item.players?.last_name}</td>
                      <td className="px-6 py-4 text-slate-300 text-xs">{lbl}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded-full font-bold uppercase text-[9px] border ${isPaid ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>{isPaid ? "Payé" : "À payer"}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`${amt > 0 ? "text-red-400" : "text-green-400"} font-bold text-xs`}>{formatPrice(amt)} €</span>
                          {isAdmin && historyTab !== "events" && <button onClick={() => handleDeleteEntry(item.id, historyTab)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, isHighlight }: any) => (
  <div className={`${isHighlight ? "bg-gradient-to-br from-green-600 to-orange-600 shadow-lg" : "bg-slate-800"} p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}>
    <p className={`text-[10px] ${isHighlight ? "text-orange-100" : "text-slate-400"} font-bold uppercase mb-1`}>{title}</p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);

const DetailRow = ({ label, value, isEditing, editValue, color, onChange }: any) => (
  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
    <span className="text-slate-500">{label}</span>
    {isEditing ? <input type="number" value={editValue} onChange={(e) => onChange(e.target.value)} className="w-14 bg-slate-900 border border-slate-700 rounded px-1 text-right outline-none text-white focus:ring-1 focus:ring-green-500" /> : <span className={color}>{formatPrice(value)} €</span>}
  </div>
);