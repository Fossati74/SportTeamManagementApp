import { useState, useEffect } from 'react';
import { supabase, Player, FineType, Fine, ActivityLog, Expense } from '../../lib/supabase';
import { AlertCircle, Plus, Euro, TrendingUp, Trash2, Bell, Edit, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FineTypeManager } from './FineTypeManager';
import { ExpenseManager } from './ExpenseManager';
import { logActivity } from '../../lib/activityLog';

export const FinesManager = () => {
  const [fines, setFines] = useState<(Fine & { players?: Player; fine_types?: FineType })[]>([]);
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedFineType, setSelectedFineType] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [playerTotals, setPlayerTotals] = useState<{ player: Player; total: number; packs: number }[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingFine, setEditingFine] = useState<Fine | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingManualPayment, setEditingManualPayment] = useState<string | null>(null);
  const [manualPaymentValue, setManualPaymentValue] = useState('0');
  const [editingPaidAmount, setEditingPaidAmount] = useState<string | null>(null);
  const [paidAmountValue, setPaidAmountValue] = useState('0');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    fetchExpenses();
  }, []);

  useEffect(() => {
    calculatePlayerTotals(fines, players);
  }, [selectedMonth, fines, players]);

  const fetchData = async () => {
    try {
      const [finesResponse, fineTypesResponse, playersResponse] = await Promise.all([
        supabase
          .from('fines')
          .select('*, players(*), fine_types(*)')
          .order('date', { ascending: false }),
        supabase
          .from('fine_types')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('players')
          .select('*')
          .order('last_name', { ascending: true }),
      ]);

      if (finesResponse.error) throw finesResponse.error;
      if (fineTypesResponse.error) throw fineTypesResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      setFines(finesResponse.data || []);
      setFineTypes(fineTypesResponse.data || []);
      setPlayers(playersResponse.data || []);

      calculatePlayerTotals(finesResponse.data || [], playersResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const calculatePlayerTotals = (finesData: (Fine & { fine_types?: FineType })[], playerData: Player[]) => {
    const totals: { [key: string]: number } = {};
    const packs: { [key: string]: number } = {};

    const filteredFines = finesData.filter((fine) => {
      const fineMonth = fine.date.slice(0, 7);
      return fineMonth === selectedMonth;
    });

    filteredFines.forEach((fine) => {
      const amount = fine.fine_types?.amount || 0;
      totals[fine.player_id] = (totals[fine.player_id] || 0) + Number(amount);

      if (fine.fine_types?.paye_ton_pack) {
        packs[fine.player_id] = (packs[fine.player_id] || 0) + 1;
      }
    });

    const totalExpenses = getTotalExpenses();
    const totalPlayers = playerData.length;
    const expensePerPlayer = totalPlayers > 0 ? Math.ceil(totalExpenses / totalPlayers) : 0;

    const playerTotalsData = playerData
      .map((player) => {
        let playerTotal = (totals[player.id] || 0) + (player.manual_payment || 0);
        debugger
        if (!player.participates_in_fund) {
          playerTotal += expensePerPlayer;
        }

        return {
          player,
          total: playerTotal,
          packs: packs[player.id] || 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    setPlayerTotals(playerTotalsData);
  };

  const handleAddFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !selectedFineType) return;

    try {
      const player = players.find(p => p.id === selectedPlayer);
      const fineType = fineTypes.find(ft => ft.id === selectedFineType);

      const { error } = await supabase
        .from('fines')
        .insert({
          player_id: selectedPlayer,
          fine_type_id: selectedFineType,
          date: selectedDate,
          notes: notes || null,
        });

      if (error) throw error;

      await logActivity(
        'fine_added',
        `Amende "${fineType?.name}" attribuée à ${player?.first_name} ${player?.last_name}${fineType?.paye_ton_pack ? ' (+ pack)' : ''}`
      );

      setSelectedPlayer('');
      setSelectedFineType('');
      setNotes('');
      fetchData();
    } catch (error) {
      console.error('Error adding fine:', error);
    }
  };

  const handleEditFine = (fine: Fine & { players?: Player; fine_types?: FineType }) => {
    setEditingFine(fine);
    setShowEditModal(true);
  };

  const handleUpdateFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFine) return;

    try {
      const player = players.find(p => p.id === editingFine.player_id);
      const fineType = fineTypes.find(ft => ft.id === editingFine.fine_type_id);

      const { error } = await supabase
        .from('fines')
        .update({
          player_id: editingFine.player_id,
          fine_type_id: editingFine.fine_type_id,
          date: editingFine.date,
          notes: editingFine.notes || null,
        })
        .eq('id', editingFine.id);

      if (error) throw error;

      await logActivity(
        'fine_updated',
        `Amende "${fineType?.name}" modifiée pour ${player?.first_name} ${player?.last_name}`
      );

      setShowEditModal(false);
      setEditingFine(null);
      fetchData();
    } catch (error) {
      console.error('Error updating fine:', error);
    }
  };

  const handleDeleteFine = async (id: string) => {
    if (!confirm('Supprimer cette amende ?')) return;

    try {
      const fine = fines.find(f => f.id === id);

      const { error } = await supabase
        .from('fines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(
        'fine_deleted',
        `Amende "${fine?.fine_types?.name}" supprimée pour ${fine?.players?.first_name} ${fine?.players?.last_name}`
      );

      fetchData();
    } catch (error) {
      console.error('Error deleting fine:', error);
    }
  };

  const formatPrice = (amount: number) => {
    return amount;
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (month >= 8) {
      return { start: year, end: year + 1 };
    } else {
      return { start: year - 1, end: year };
    }
  };

  const isDateInSeason = (dateStr: string, season: { start: number; end: number }) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (year === season.start && month >= 8) return true;
    if (year === season.end && month <= 7) return true;

    return false;
  };

  const getTotalCagnotte = () => {
    const currentSeason = getCurrentSeason();
    const finesTotal = fines
      .filter((fine) => isDateInSeason(fine.date, currentSeason))
      .reduce((total, fine) => {
        return total + Number(fine.fine_types?.amount || 0);
      }, 0);

    const manualPaymentsTotal = players.reduce((total, player) => {
      return total + (player.manual_payment || 0);
    }, 0);

    const totalExpenses = getTotalExpenses();
    const totalPlayers = players.length;
    const expensePerPlayer = totalPlayers > 0 ? Math.ceil(totalExpenses / totalPlayers) : 0;
    const nonParticipatingPlayers = players.filter(p => !p.participates_in_fund).length;
    const redistributedAmount = nonParticipatingPlayers * expensePerPlayer;

    return finesTotal + manualPaymentsTotal + redistributedAmount;
  };

  const handleUpdateManualPayment = async (playerId: string, amount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ manual_payment: amount })
        .eq('id', playerId);

      if (error) throw error;

      await logActivity('manual_payment_updated', `Montant manuel modifié pour un joueur: ${formatPrice(amount)} €`);
      setEditingManualPayment(null);
      fetchData();
    } catch (error) {
      console.error('Error updating manual payment:', error);
    }
  };

  const handleUpdatePaidAmount = async (playerId: string, amount: number) => {
    if (!user) return;

    try {
      const player = players.find(p => p.id === playerId);
      const { error } = await supabase
        .from('players')
        .update({ paid_amount: amount })
        .eq('id', playerId);

      if (error) throw error;

      await logActivity(
        'paid_amount_updated',
        `Montant payé modifié pour ${player?.first_name} ${player?.last_name}: ${formatPrice(amount)} €`
      );
      setEditingPaidAmount(null);
      fetchData();
    } catch (error) {
      console.error('Error updating paid amount:', error);
    }
  };

  const startEditManualPayment = (playerId: string, currentAmount: number) => {
    setEditingManualPayment(playerId);
    setManualPaymentValue(currentAmount.toString());
  };

  const cancelEditManualPayment = () => {
    setEditingManualPayment(null);
    setManualPaymentValue('0');
  };

  const startEditPaidAmount = (playerId: string, currentAmount: number) => {
    setEditingPaidAmount(playerId);
    setPaidAmountValue(currentAmount.toString());
  };

  const cancelEditPaidAmount = () => {
    setEditingPaidAmount(null);
    setPaidAmountValue('0');
  };

  const getTotalPaid = () => {
    return players.reduce((total, player) => total + (player.paid_amount || 0), 0);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Boîte Noire</h2>
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowActivityLog(true);
              fetchActivityLogs();
            }}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Bell size={20} />
            <span>Historique des actions</span>
          </button>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 rounded-lg">
            <p className="text-white text-sm font-semibold mb-2">Cagnotte {getCurrentSeason().start}-{getCurrentSeason().end}</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-white text-xs">Total dû:</span>
                <span className="text-white font-semibold">{formatPrice(getTotalCagnotte())} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white text-xs">Total payé:</span>
                <span className="text-green-200 font-semibold">{formatPrice(getTotalPaid())} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white text-xs">Total utilisé:</span>
                <span className="text-red-200 font-semibold">{formatPrice(getTotalExpenses())} €</span>
              </div>
              <div className="border-t border-orange-400 pt-1 mt-1 flex justify-between items-center">
                <span className="text-white text-xs font-bold">Reste:</span>
                <span className="text-white text-lg font-bold">{formatPrice(getTotalPaid() - getTotalExpenses())} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Plus size={20} />
                Attribuer une amende
              </h3>
              <form onSubmit={handleAddFine} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Joueur
                  </label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Sélectionner un joueur</option>
                    {players.filter(player => player.participates_in_fund).map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type d'amende
                  </label>
                  <select
                    value={selectedFineType}
                    onChange={(e) => setSelectedFineType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    {fineTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.amount}€
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  Attribuer l'amende
                </button>
              </form>
            </div>

            {user && <FineTypeManager onUpdate={fetchData} />}
            {user && <ExpenseManager onUpdate={() => { fetchData(); fetchExpenses(); }} />}
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Dû par joueur
          </h3>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {playerTotals
              .filter(({ player }) => {
                const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
                return fullName.includes(searchQuery.toLowerCase());
              })
              .map(({ player, total, packs }) => (
              <div
                key={player.id}
                className="bg-slate-900 px-4 py-3 rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white">
                    {player.first_name} {player.last_name}
                  </span>
                  <div className="flex items-center gap-3">
                    {packs > 0 && (
                      <span className="text-amber-400 text-sm font-medium">
                        {packs} pack{packs > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`font-semibold ${total > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatPrice(total)} €
                    </span>
                    {user && (
                      <button
                        onClick={() => startEditManualPayment(player.id, player.manual_payment || 0)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Modifier montant manuel"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {editingManualPayment === player.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={manualPaymentValue}
                      onChange={(e) => setManualPaymentValue(e.target.value)}
                      className="flex-1 bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-600 focus:border-green-500 focus:outline-none text-sm"
                      placeholder="Montant manuel"
                    />
                    <button
                      onClick={() => handleUpdateManualPayment(player.id, parseFloat(manualPaymentValue) || 0)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditManualPayment}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                    >
                      ✗
                    </button>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Déjà payé:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-medium text-sm">
                      {formatPrice(player.paid_amount || 0)} €
                    </span>
                    {user && (
                      <button
                        onClick={() => startEditPaidAmount(player.id, player.paid_amount || 0)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Modifier montant payé"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {editingPaidAmount === player.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmountValue}
                      onChange={(e) => setPaidAmountValue(e.target.value)}
                      className="flex-1 bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-600 focus:border-green-500 focus:outline-none text-sm"
                      placeholder="Montant payé"
                    />
                    <button
                      onClick={() => handleUpdatePaidAmount(player.id, parseFloat(paidAmountValue) || 0)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditPaidAmount}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                    >
                      ✗
                    </button>
                  </div>
                )}

                {player.manual_payment > 0 && editingManualPayment !== player.id && (
                  <div className="mt-1 text-xs text-slate-400">
                    (dont {formatPrice(player.manual_payment)} € ajusté manuellement)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {fines.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <AlertCircle size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Aucune amende enregistrée</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Date</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Joueur</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Type</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Montant</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Notes</th>
                  {user && <th className="text-right px-6 py-4 text-slate-300 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {fines.filter((fine) => fine.date.slice(0, 7) === selectedMonth).map((fine) => (
                  <tr key={fine.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white">
                      {new Date(fine.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {fine.players?.first_name} {fine.players?.last_name}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {fine.fine_types?.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-semibold">
                          {formatPrice(Number(fine.fine_types?.amount || 0))} €
                        </span>
                        {fine.fine_types?.paye_ton_pack && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                            + pack
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {fine.notes || '-'}
                    </td>
                    {user && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditFine(fine)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteFine(fine.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    {showActivityLog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-xl font-semibold flex items-center gap-2">
              <Bell size={24} />
              Historique des actions
            </h3>
            <button
              onClick={() => setShowActivityLog(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {activityLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Aucune activité enregistrée
              </div>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                  >
                    <p className="text-white text-sm">{log.description}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(log.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {showEditModal && editingFine && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-xl font-semibold flex items-center gap-2">
              <Edit size={24} />
              Modifier l'amende
            </h3>
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingFine(null);
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleUpdateFine} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Joueur
              </label>
              <select
                value={editingFine.player_id}
                onChange={(e) => setEditingFine({ ...editingFine, player_id: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Sélectionner un joueur</option>
                {players.filter(player => player.participates_in_fund).map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type d'amende
              </label>
              <select
                value={editingFine.fine_type_id}
                onChange={(e) => setEditingFine({ ...editingFine, fine_type_id: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Sélectionner un type</option>
                {fineTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.amount}€
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={editingFine.date}
                onChange={(e) => setEditingFine({ ...editingFine, date: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={editingFine.notes || ''}
                onChange={(e) => setEditingFine({ ...editingFine, notes: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFine(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};
