import { useState, useEffect } from "react";
import { supabase, Expense, Player } from "../../lib/supabase";
import { Plus, Trash2, Euro, Calendar, Users, X, Check } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { logActivity } from "../../lib/activityLog";
import { SectionHeader } from "../common/SectionHeader";
import { toast } from "react-hot-toast";

interface ExpenseManagerProps {
  onUpdate: () => void;
}

export const ExpenseManager = ({ onUpdate }: ExpenseManagerProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchExpenses();
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
      const allPlayerIds = new Set((data || []).map((p) => p.id));
      setSelectedPlayers(allPlayerIds);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_participants(
            id,
            player_id,
            players(id, first_name, last_name)
          )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || selectedPlayers.size === 0) return;
    
    setIsSubmitting(true);
    const totalAmount = parseFloat(amount);
    const amountPerPerson = Math.ceil(totalAmount / selectedPlayers.size);

    try {
      // 1. Enregistre la dépense dans 'expenses' (Baisse le solde global)
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          description,
          amount: totalAmount,
          date,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // 2. Enregistre les participants pour la traçabilité (table de liaison)
      const participantsToInsert = Array.from(selectedPlayers).map((playerId) => ({
        expense_id: expenseData.id,
        player_id: playerId,
      }));

      const { error: participantsError } = await supabase
        .from("expense_participants")
        .insert(participantsToInsert);

      if (participantsError) throw participantsError;

      // 3. LOGIQUE CONDITIONNELLE + LIEN : Créer une dette SEULEMENT pour les non-cotisants
      const nonContributors = players.filter(
        (p) => selectedPlayers.has(p.id) && !p.participates_in_fund
      );

      if (nonContributors.length > 0) {
        const debtEntries = nonContributors.map((p) => ({
          player_id: p.id,
          amount: amountPerPerson,
          status: 'unpaid',
          expense_id: expenseData.id, // LIEN AVEC LA TABLE EXPENSES
          created_at: new Date().toISOString()
        }));

        const { error: debtError } = await supabase
          .from("event_debts")
          .insert(debtEntries);

        if (debtError) throw debtError;
      }

      await logActivity(
        "expense_added",
        `Dépense ajoutée : ${description} (${amount}€). ${nonContributors.length} dettes créées.`
      );

      resetForm();
      fetchExpenses();
      onUpdate();
      toast.success("Dépense enregistrée et liée à l'historique !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    const allPlayerIds = new Set(players.map((p) => p.id));
    setSelectedPlayers(allPlayerIds);
    setShowForm(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Attention : Supprimer cette dépense supprimera également les dettes liées dans l'historique des joueurs.")) return;
    try {
      const expense = expenses.find((e) => e.id === id);
      
      // Suppression des dettes liées d'abord (si pas de cascade en base)
      await supabase.from("event_debts").delete().eq("expense_id", id);
      
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;

      await logActivity("expense_deleted", `Dépense et dettes supprimées : ${expense?.description}`);
      fetchExpenses();
      onUpdate();
      toast.success("Dépense et dettes supprimées !");
    } catch (error) {
      console.error(error);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) newSet.delete(playerId);
      else newSet.add(playerId);
      return newSet;
    });
  };

  const toggleAllPlayers = () => {
    if (selectedPlayers.size === players.length) setSelectedPlayers(new Set());
    else setSelectedPlayers(new Set(players.map((p) => p.id)));
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(amount);
  };

  if (!user) return null;

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
      <SectionHeader title="Dépenses" Icon={Euro}>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`p-2 rounded-xl transition-all ${showForm ? "bg-slate-700 text-white" : "bg-green-600/20 text-green-400 hover:bg-green-600/30"}`}
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
        </button>
      </SectionHeader>
      <div className="p-6">
        {showForm && (
          <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-3 shadow-inner">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Libellé de la dépense..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-green-500"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                value={amount}
                placeholder="Montant global €"
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:ring-1 focus:ring-green-500"
                required
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white outline-none focus:ring-1 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500">Participants ({selectedPlayers.size})</label>
                <button type="button" onClick={toggleAllPlayers} className="text-xs text-green-400 font-bold hover:text-green-300">
                  {selectedPlayers.size === players.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl p-2 space-y-1 custom-scrollbar shadow-inner">
                {players.map((player) => {
                  const isSelected = selectedPlayers.has(player.id);
                  return (
                    <label key={player.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-green-600/10' : 'hover:bg-slate-700'}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isSelected} onChange={() => togglePlayerSelection(player.id)} className="w-4 h-4 text-green-600 bg-slate-700 border-slate-500 rounded focus:ring-green-500" />
                        <span className="text-xs text-white">{player.first_name} {player.last_name}</span>
                      </div>
                      {player.participates_in_fund && isSelected && (
                        <span className="text-[8px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded uppercase">Cotisant</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              {isSubmitting ? "Traitement..." : <><Check size={16} /> Valider la dépense</>}
            </button>
          </form>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {expenses.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm italic">Aucune dépense enregistrée</p>
          ) : (
            expenses.map((expense) => {
              const pCount = expense.expense_participants?.length || 0;
              return (
                <div key={expense.id} className="bg-slate-900/50 border border-slate-700/50 px-4 py-3 rounded-xl hover:bg-slate-900 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{expense.description}</span>
                        <span className="text-red-400 font-bold text-sm">-{formatPrice(Number(expense.amount))} €</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[10px] uppercase font-bold mt-1">
                        <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(expense.date).toLocaleDateString("fr-FR")}</div>
                        {pCount > 0 && <div className="flex items-center gap-1"><Users size={12} /> {pCount} pers. <span className="text-slate-600">({formatPrice(Number(expense.amount) / pCount)}€/p)</span></div>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteExpense(expense.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};