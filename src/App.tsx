import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { MainLayout } from './components/Layout/MainLayout';
import { PlayerList } from './components/Players/PlayerList';
import { AperoSchedule } from './components/Apero/AperoSchedule';
import { MatchSchedule } from './components/Match/MatchSchedule';
import { CarpoolManager } from './components/Carpool/CarpoolManager';
import { FinesManager } from './components/Fines/FinesManager';

function AppContent() {
  const { loading } = useAuth();
  const [currentView, setCurrentView] = useState('players');
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div>
        <LoginForm />
        <button
          onClick={() => setShowLogin(false)}
          className="fixed top-4 left-4 text-slate-400 hover:text-white transition-colors text-sm"
        >
          ← Retour
        </button>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'players':
        return <PlayerList />;
      case 'apero':
        return <AperoSchedule />;
      case 'matches':
        return <MatchSchedule />;
      case 'carpool':
        return <CarpoolManager />;
      case 'fines':
        return <FinesManager />;
      default:
        return <PlayerList />;
    }
  };

  return (
    <MainLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      onShowLogin={() => setShowLogin(true)}
    >
      {renderView()}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
