import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, Car, AlertCircle, Wine, LogOut, Menu, X, LogIn } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onShowLogin?: () => void;
}

export const MainLayout = ({ children, currentView, onViewChange, onShowLogin }: MainLayoutProps) => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Effectif', view: 'players', icon: Users },
    { name: 'Apéro du Jeudi', view: 'apero', icon: Wine },
    { name: 'Table de Marque', view: 'matches', icon: Calendar },
    { name: 'Covoiturage', view: 'carpool', icon: Car },
    { name: 'Boîte Noire', view: 'fines', icon: AlertCircle },
  ];

  const handleViewChange = (view: string) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                <Users size={24} className="text-white" />
              </div>
              <h1 className="text-white text-xl font-bold hidden sm:block">Team Manager</h1>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleViewChange(item.view)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      currentView === item.view
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="hidden md:flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm">Déconnexion</span>
                </button>
              ) : onShowLogin && (
                <button
                  onClick={onShowLogin}
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  <LogIn size={18} />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleViewChange(item.view)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      currentView === item.view
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 transition-all"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Déconnexion</span>
                </button>
              ) : onShowLogin && (
                <button
                  onClick={onShowLogin}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                >
                  <LogIn size={20} />
                  <span className="font-medium">Connexion Admin</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-slate-900/80 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              Team Manager - Gestion de club sportif
            </p>
            {user ? (
              <p className="text-green-400 text-sm font-medium">Mode Admin</p>
            ) : (
              <p className="text-slate-400 text-sm">Mode Lecture seule</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
