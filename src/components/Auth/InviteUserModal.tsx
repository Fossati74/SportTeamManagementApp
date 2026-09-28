import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { inviteUser } from '../../lib/inviteUser';
import { Player } from '../../lib/supabase';
import { useCollectifId } from '../../hooks/useCollectifId';

interface InviteUserModalProps {
  onClose: () => void;
  player?: Player;
}

export const InviteUserModal = ({ onClose, player }: InviteUserModalProps) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [resultMessage, setResultMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const collectifId = useCollectifId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await inviteUser(email, 'user', collectifId ?? undefined, player?.id, firstName, lastName);
      setEmailSent(result?.emailSent !== false);
      setResultMessage(result?.message || '');
      setSuccess(true);
      setEmail('');
      setFirstName('');
      setLastName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
              <UserPlus size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {player ? `Inviter ${player.first_name} ${player.last_name}` : 'Inviter un membre'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {success ? (
          emailSent ? (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm font-medium">
              Invitation envoyée ! La personne recevra un email pour activer son compte.
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 px-4 py-3 rounded-xl text-sm font-medium">
              {resultMessage}
            </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!player && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inviteFirstName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Prénom
                  </label>
                  <input
                    id="inviteFirstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="inviteLastName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Nom
                  </label>
                  <input
                    id="inviteLastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="inviteEmail" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Email
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                placeholder="membre@club.com"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : "Envoyer l'invitation"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
