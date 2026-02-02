import { useState, useEffect } from 'react';
import { supabase, FineType } from '../../lib/supabase';
import { Euro, Plus, Trash2 } from 'lucide-react';
import { logActivity } from '../../lib/activityLog';

interface FineTypeManagerProps {
  onUpdate: () => void;
}

export const FineTypeManager = ({ onUpdate }: FineTypeManagerProps) => {
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [payeTonPack, setPayeTonPack] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPrice = (amount: number) => {
    return amount % 1 === 0 ? `${amount}` : amount.toFixed(2);
  };

  useEffect(() => {
    fetchFineTypes();
  }, []);

  const fetchFineTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('fine_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFineTypes(data || []);
    } catch (error) {
      console.error('Error fetching fine types:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('fine_types')
        .insert({
          name,
          amount: parseFloat(amount),
          custom_label: customLabel || null,
          paye_ton_pack: payeTonPack,
        });

      if (error) throw error;

      await logActivity(
        'fine_type_added',
        `Type d'amende "${name}" ajouté (${formatPrice(parseFloat(amount))}€)${customLabel ? ` - "${customLabel}"` : ''}${payeTonPack ? ' + Paye ton pack' : ''}`
      );

      setName('');
      setAmount('');
      setCustomLabel('');
      setPayeTonPack(false);
      fetchFineTypes();
      onUpdate();
    } catch (error) {
      console.error('Error adding fine type:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce type d\'amende ?')) return;

    try {
      const fineType = fineTypes.find(ft => ft.id === id);

      const { error } = await supabase
        .from('fine_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(
        'fine_type_deleted',
        `Type d'amende "${fineType?.name}" supprimé`
      );

      fetchFineTypes();
      onUpdate();
    } catch (error) {
      console.error('Error deleting fine type:', error);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Euro size={20} />
        Types d'amendes
      </h3>

      <form onSubmit={handleAdd} className="space-y-3 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'amende"
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant (€)"
            className="w-28 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </div>
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Texte personnalisé (optionnel)"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="paye-ton-pack"
            checked={payeTonPack}
            onChange={(e) => setPayeTonPack(e.target.checked)}
            className="w-4 h-4 bg-slate-900 border-slate-600 rounded focus:ring-2 focus:ring-green-500"
          />
          <label htmlFor="paye-ton-pack" className="text-sm text-slate-300 cursor-pointer">
            Paye ton pack
          </label>
        </div>
      </form>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {fineTypes.map((type) => (
          <div
            key={type.id}
            className="flex justify-between items-center bg-slate-900 px-4 py-2 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">{type.name}</span>
                {type.paye_ton_pack && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Pack
                  </span>
                )}
              </div>
              {type.custom_label && (
                <span className="text-slate-400 text-xs italic">"{type.custom_label}"</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400 font-semibold text-sm">
                {formatPrice(Number(type.amount))} €
              </span>
              <button
                onClick={() => handleDelete(type.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
