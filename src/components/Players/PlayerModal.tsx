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
  const [phone_number, setPhoneNumber] = useState('');
  const [participatesInFund, setParticipatesInFund] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  
  // Nouveaux états pour les champs ajoutés
  const [carpooling, setCarpooling] = useState(true);
  const [scoreboard, setScoreboard] = useState(true);
  const [thursdayAperitif, setThursdayAperitif] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (player) {
      setFirstName(player.first_name);
      setLastName(player.last_name);
      setPhotoUrl(player.photo_url || '');
      setUnits(player.units);
      setPhoneNumber(player.phone_number || '');
      setParticipatesInFund(player.participates_in_fund ?? true);
      setIsCoach(player.is_coach ?? false);
      // Récupération des valeurs depuis la DB
      setCarpooling(player.carpooling ?? true);
      setScoreboard(player.scoreboard ?? true);
      setThursdayAperitif(player.thursday_aperitif ?? true);
    }
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const playerName = `${firstName} ${lastName}`;
      
      // Préparation des données avec la logique conditionnelle
      const playerData = {
        first_name: firstName,
        last_name: lastName,
        photo_url: photoUrl || null,
        units,
        phone_number: phone_number || null,
        participates_in_fund: participatesInFund,
        is_coach: isCoach,
        carpooling: carpooling,
        // Si pas coach, on force à true pour la DB (mais on cache le champ dans l'UI)
        scoreboard: isCoach ? scoreboard : true,
        thursday_aperitif: isCoach ? thursdayAperitif : true,
      };

      if (player) {
        const { error: updateError } = await supabase
          .from('players')
          .update(playerData)
          .eq('id', player.id);

        if (updateError) throw updateError;
        await notifyPlayerAction(phone_number || undefined, playerName, 'updated');
      } else {
        const { error: insertError } = await supabase
          .from('players')
          .insert(playerData);

        if (insertError) throw insertError;
        await notifyPlayerAction(phone_number || undefined, playerName, 'created');
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
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {player ? 'Modifier le joueur' : 'Ajouter un joueur'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Prénom</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nom</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Numéro de téléphone</label>
            <input type="tel" value={phone_number} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none" placeholder="33678748374" />
          </div>

          <div className="space-y-3 pt-2">
            {/* Coach Toggle */}
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 rounded-lg border border-slate-700/50">
              <input id="isCoach" type="checkbox" checked={isCoach} onChange={(e) => setIsCoach(e.target.checked)} className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-green-500" />
              <label htmlFor="isCoach" className="text-slate-300 font-medium">Coach</label>
            </div>

            {/* Covoiturage (Toujours visible) */}
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 rounded-lg border border-slate-700/50">
              <input id="carpooling" type="checkbox" checked={carpooling} onChange={(e) => setCarpooling(e.target.checked)} className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-green-500" />
              <label htmlFor="carpooling" className="text-slate-300 font-medium">Participe au covoiturage</label>
            </div>

            {/* Caisse Noire (Toujours visible) */}
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 rounded-lg border border-slate-700/50">
              <input id="participatesInFund" type="checkbox" checked={participatesInFund} onChange={(e) => setParticipatesInFund(e.target.checked)} className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-green-500" />
              <label htmlFor="participatesInFund" className="text-slate-300 font-medium">Participe à la caisse noire</label>
            </div>

            {/* Champs conditionnels si Coach */}
            {isCoach && (
              <div className="space-y-3 pt-2 border-t border-slate-700 animate-in fade-in slide-in-from-top-1">
                <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Missions Staff</p>
                
                <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-3 rounded-lg border border-green-500/20">
                  <input id="scoreboard" type="checkbox" checked={scoreboard} onChange={(e) => setScoreboard(e.target.checked)} className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-green-500" />
                  <label htmlFor="scoreboard" className="text-slate-300 font-medium">Table de marque</label>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-3 rounded-lg border border-green-500/20">
                  <input id="thursdayAperitif" type="checkbox" checked={thursdayAperitif} onChange={(e) => setThursdayAperitif(e.target.checked)} className="w-5 h-5 text-green-500 bg-slate-800 border-slate-600 rounded focus:ring-green-500" />
                  <label htmlFor="thursdayAperitif" className="text-slate-300 font-medium">Apéros du jeudi</label>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-green-500/20 transition-all disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};