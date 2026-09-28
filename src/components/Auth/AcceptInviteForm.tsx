import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { KeyRound } from 'lucide-react';

interface AcceptInviteFormProps {
  onDone: () => void;
}

export const AcceptInviteForm = ({ onDone }: AcceptInviteFormProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { acceptInvite } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await acceptInvite(password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg shadow-green-900/20">
            <KeyRound size={32} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Bienvenue !
        </h2>
        <p className="text-slate-400 text-center mb-6 text-sm font-medium">
          Choisissez un mot de passe pour activer votre compte
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              placeholder="••••••••"
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
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Chargement...' : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
};
