import { useState, useEffect } from 'react';
import { supabase, Expense, Player } from '../../lib/supabase';
import { Plus, Trash2, Euro, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLog';

interface ExpenseManagerProps {
  onUpdate: () => void;
}

export const ExpenseManager = ({ onUpdate }: ExpenseManagerProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    fetchExpenses();
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);

      const allPlayerIds = new Set((data || []).map(p => p.id));
      setSelectedPlayers(allPlayerIds);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_participants(
            id,
            player_id,
            players(id, first_name, last_name)
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || selectedPlayers.size === 0) return;

    try {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description,
          amount: parseFloat(amount),
          date,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const participantsToInsert = Array.from(selectedPlayers).map(playerId => ({
        expense_id: expenseData.id,
        player_id: playerId,
      }));

      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(participantsToInsert);

      if (participantsError) throw participantsError;

      await logActivity(
        'expense_added',
        `Dépense ajoutée : ${description} - ${amount}€ (${selectedPlayers.size} participants)`
      );

      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      const allPlayerIds = new Set(players.map(p => p.id));
      setSelectedPlayers(allPlayerIds);
      setShowForm(false);
      fetchExpenses();
      onUpdate();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;

    try {
      const expense = expenses.find(e => e.id === id);

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(
        'expense_deleted',
        `Dépense supprimée : ${expense?.description}`
      );

      fetchExpenses();
      onUpdate();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const toggleAllPlayers = () => {
    if (selectedPlayers.size === players.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(players.map(p => p.id)));
    }
  };

  const formatPrice = (amount: number) => {
    return amount % 1 === 0 ? `${amount}` : amount.toFixed(2);
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  if (!user) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Euro size={20} />
            Dépenses
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Total dépensé : {formatPrice(totalExpenses)} €
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddExpense} className="mb-4 space-y-3 bg-slate-900 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Repas de Noël"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Montant (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">
                Joueurs concernés
              </label>
              <button
                type="button"
                onClick={toggleAllPlayers}
                className="text-xs text-green-400 hover:text-green-300"
              >
                {selectedPlayers.size === players.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg p-2 space-y-1">
              {players.map(player => (
                <label
                  key={player.id}
                  className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayers.has(player.id)}
                    onChange={() => togglePlayerSelection(player.id)}
                    className="w-4 h-4 text-green-600 bg-slate-700 border-slate-500 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-white">
                    {player.first_name} {player.last_name}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {selectedPlayers.size} joueur{selectedPlayers.size > 1 ? 's' : ''} sélectionné{selectedPlayers.size > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={selectedPlayers.size === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {expenses.length === 0 ? (
          <p className="text-slate-500 text-center py-4">Aucune dépense enregistrée</p>
        ) : (
          expenses.map((expense) => {
            const participantCount = expense.expense_participants?.length || 0;
            const perPersonAmount = participantCount > 0 ? Number(expense.amount) / participantCount : 0;

            return (
              <div
                key={expense.id}
                className="bg-slate-900 px-4 py-3 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{expense.description}</span>
                      <span className="text-red-400 font-semibold">
                        {formatPrice(Number(expense.amount))} €
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-xs mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </div>
                      {participantCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
                          <span className="text-orange-400">
                            ({formatPrice(perPersonAmount)}€/pers)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
