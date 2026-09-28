import { useEffect, useState } from 'react';
import { LogIn, LogOut, Plus, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Collectif, Player } from '../../lib/supabase';
import { inviteUser } from '../../lib/inviteUser';

export const SuperAdminDashboard = () => {
  const { signOut, enterCollectif } = useAuth();
  const [collectifs, setCollectifs] = useState<Collectif[]>([]);
  const [members, setMembers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCollectifName, setNewCollectifName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedMemberByCollectif, setSelectedMemberByCollectif] = useState<{ [id: string]: string }>({});
  const [inviteEmailByCollectif, setInviteEmailByCollectif] = useState<{ [id: string]: string }>({});
  const [inviteStatusByCollectif, setInviteStatusByCollectif] = useState<{ [id: string]: string }>({});
  const [successMessageByCollectif, setSuccessMessageByCollectif] = useState<{ [id: string]: string }>({});

  const fetchData = async () => {
    setLoading(true);
    const [{ data: collectifsData }, { data: membersData }] = await Promise.all([
      supabase.from('collectifs').select('*').order('created_at'),
      supabase.from('members').select('*').order('last_name'),
    ]);
    setCollectifs(collectifsData ?? []);
    setMembers(membersData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCollectif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectifName.trim()) return;

    setCreating(true);
    const { error } = await supabase.from('collectifs').insert({ name: newCollectifName.trim() });
    setCreating(false);

    if (!error) {
      setNewCollectifName('');
      fetchData();
    }
  };

  const handleRemoveAdmin = async (collectifId: string, memberId: string) => {
    setInviteStatusByCollectif((prev) => ({ ...prev, [collectifId]: 'loading' }));

    try {
      const result = await inviteUser(undefined, 'user', collectifId, memberId);
      setInviteStatusByCollectif((prev) => ({ ...prev, [collectifId]: 'success' }));
      setSuccessMessageByCollectif((prev) => ({ ...prev, [collectifId]: result.message }));
      fetchData();
    } catch (err) {
      setInviteStatusByCollectif((prev) => ({
        ...prev,
        [collectifId]: err instanceof Error ? err.message : 'Erreur',
      }));
    }
  };

  const handleSetAdmin = async (collectifId: string) => {
    const memberId = selectedMemberByCollectif[collectifId];
    if (!memberId) return;

    const member = members.find((m) => m.id === memberId);
    const email = inviteEmailByCollectif[collectifId]?.trim();

    if (!member?.user_id && !email) return;

    setInviteStatusByCollectif((prev) => ({ ...prev, [collectifId]: 'loading' }));

    try {
      const result = await inviteUser(email || undefined, 'admin', collectifId, memberId);
      setInviteStatusByCollectif((prev) => ({ ...prev, [collectifId]: 'success' }));
      setSuccessMessageByCollectif((prev) => ({ ...prev, [collectifId]: result.message }));
      setInviteEmailByCollectif((prev) => ({ ...prev, [collectifId]: '' }));
      setSelectedMemberByCollectif((prev) => ({ ...prev, [collectifId]: '' }));
      fetchData();
    } catch (err) {
      setInviteStatusByCollectif((prev) => ({
        ...prev,
        [collectifId]: err instanceof Error ? err.message : 'Erreur',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <h1 className="text-white text-xl font-bold">Super Admin</h1>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-white font-bold text-lg mb-4">Créer un collectif</h2>
          <form onSubmit={handleCreateCollectif} className="flex gap-3">
            <input
              type="text"
              value={newCollectifName}
              onChange={(e) => setNewCollectifName(e.target.value)}
              placeholder="Nom du collectif"
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            />
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
            >
              <Plus size={18} />
              Créer
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-bold text-lg">Collectifs</h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Chargement...</p>
          ) : collectifs.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun collectif pour le moment.</p>
          ) : (
            collectifs.map((collectif) => {
              const collectifAdmins = members.filter((m) => m.collectif_id === collectif.id && m.role === 'admin');
              const collectifMembers = members.filter(
                (m) => m.collectif_id === collectif.id && m.role !== 'admin' && m.role !== 'super_admin'
              );
              const selectedMemberId = selectedMemberByCollectif[collectif.id] ?? '';
              const selectedMember = collectifMembers.find((m) => m.id === selectedMemberId);
              const needsEmail = !!selectedMember && !selectedMember.user_id;

              return (
              <div
                key={collectif.id}
                onClick={() => enterCollectif(collectif.id)}
                className="bg-slate-800 rounded-2xl border border-slate-700 p-6 cursor-pointer hover:border-green-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">{collectif.name}</h3>
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <LogIn size={16} />
                    Entrer dans ce collectif
                  </div>
                </div>
                {collectifAdmins.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
                    {collectifAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-1.5 py-1.5 text-sm text-slate-200"
                      >
                        {admin.first_name} {admin.last_name}
                        <button
                          onClick={() => handleRemoveAdmin(collectif.id, admin.id)}
                          disabled={inviteStatusByCollectif[collectif.id] === 'loading'}
                          title="Retirer le rôle admin"
                          className="p-1 text-red-400 hover:bg-red-400/10 rounded disabled:opacity-50"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={selectedMemberId}
                    onChange={(e) =>
                      setSelectedMemberByCollectif((prev) => ({ ...prev, [collectif.id]: e.target.value }))
                    }
                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                  >
                    <option value="">Choisir un membre...</option>
                    {collectifMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}{m.user_id ? '' : ' (pas encore de compte)'}
                      </option>
                    ))}
                  </select>
                  {needsEmail && (
                    <input
                      type="email"
                      value={inviteEmailByCollectif[collectif.id] ?? ''}
                      onChange={(e) =>
                        setInviteEmailByCollectif((prev) => ({ ...prev, [collectif.id]: e.target.value }))
                      }
                      placeholder="email@membre.com"
                      className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                    />
                  )}
                  <button
                    onClick={() => handleSetAdmin(collectif.id)}
                    disabled={!selectedMemberId || inviteStatusByCollectif[collectif.id] === 'loading'}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                    {needsEmail ? 'Inviter comme admin' : 'Définir comme admin'}
                  </button>
                </div>
                {inviteStatusByCollectif[collectif.id] === 'success' && (
                  <p className="text-green-400 text-xs mt-2 font-medium">
                    {successMessageByCollectif[collectif.id]}
                  </p>
                )}
                {inviteStatusByCollectif[collectif.id] &&
                  inviteStatusByCollectif[collectif.id] !== 'loading' &&
                  inviteStatusByCollectif[collectif.id] !== 'success' && (
                    <p className="text-red-400 text-xs mt-2 font-medium">
                      {inviteStatusByCollectif[collectif.id]}
                    </p>
                  )}
              </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};
