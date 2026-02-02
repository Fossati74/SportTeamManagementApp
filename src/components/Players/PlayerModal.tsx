import { useState, useEffect } from 'react';
import { supabase, Player } from '../../lib/supabase';
import { notifyPlayerAction } from '../../lib/notifications';
import { X } from 'lucide-react';

interface PlayerModalProps {
  player: Player | null;
  onClose: () => void;
}

export const PlayerModal = ({ player, onClose }: PlayerModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [units, setUnits] = useState(1);
  const [hasLicense, setHasLicense] = useState(false);
  const [email, setEmail] = useState('');
  const [participatesInFund, setParticipatesInFund] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  

  useEffect(() => {
    if (player) {
      setFirstName(player.first_name);
      setLastName(player.last_name);
      setPhotoUrl(player.photo_url || '');
      setUnits(player.units);
      setHasLicense(player.has_license);
      setEmail(player.email || '');
      setParticipatesInFund(player.participates_in_fund ?? true);
      setIsCoach(player.is_coach ?? false);
    }
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const playerName = `${firstName} ${lastName}`;

      if (player) {
        const { error } = await supabase
          .from('players')
          .update({
            first_name: firstName,
            last_name: lastName,
            photo_url: photoUrl || null,
            units,
            has_license: hasLicense,
            email: email || null,
            participates_in_fund: participatesInFund,
            is_coach: isCoach,
          })
          .eq('id', player.id);

        if (error) throw error;

        await notifyPlayerAction(email || undefined, playerName, 'updated');
      } else {
        const { error } = await supabase
          .from('players')
          .insert({
            first_name: firstName,
            last_name: lastName,
            photo_url: photoUrl || null,
            units,
            has_license: hasLicense,
            email: email || null,
            participates_in_fund: participatesInFund,
            is_coach: isCoach,
          });

        if (error) throw error;

        await notifyPlayerAction(email || undefined, playerName, 'created');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {player ? 'Modifier le joueur' : 'Ajouter un joueur'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
              Prénom
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
              Nom
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email (optionnel)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="joueur@example.com"
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 rounded-lg">
            <input
              id="hasLicense"
              type="checkbox"
              checked={hasLicense}
              onChange={(e) => setHasLicense(e.target.checked)}
              className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="hasLicense" className="text-slate-300 font-medium">
              Possède le permis de conduire
            </label>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 rounded-lg">
            <input
              id="participatesInFund"
              type="checkbox"
              checked={participatesInFund}
              onChange={(e) => setParticipatesInFund(e.target.checked)}
              className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="participatesInFund" className="text-slate-300 font-medium">
              Participe à la caisse noire
            </label>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 rounded-lg">
            <input
              id="isCoach"
              type="checkbox"
              checked={isCoach}
              onChange={(e) => setIsCoach(e.target.checked)}
              className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="isCoach" className="text-slate-300 font-medium">
              Coach
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
