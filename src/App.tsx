import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { AcceptInviteForm } from './components/Auth/AcceptInviteForm';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { MainLayout } from './components/Layout/MainLayout';
import { PlayerList } from './components/Players/PlayerList';
import { AperoSchedule } from './components/Apero/AperoSchedule';
import { MatchSchedule } from './components/Match/MatchSchedule';
import { CarpoolManager } from './components/Carpool/CarpoolManager';
import { FinesManager } from './components/Fines/FinesManager';

function AppContent() {
  const { loading, user, profile, actingCollectifId } = useAuth();
  const [currentView, setCurrentView] = useState('players');
  const [inviteAccepted, setInviteAccepted] = useState(false);
  // Captured once, on first render - before supabase-js's own async URL parsing
  // strips these params from the address bar. GitHub Pages can't route a real
  // "/accept-invite" path (static hosting, no server-side rewrite), so instead of
  // a dedicated path we detect the invite/recovery link via the hash Supabase
  // already attaches to it (#...&type=invite), and redirect to the site root.
  const [initialHash] = useState(() => window.location.hash);

  const isAcceptInvitePath = initialHash.includes('type=invite') || initialHash.includes('type=recovery');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (isAcceptInvitePath && !inviteAccepted) {
    return (
      <AcceptInviteForm
        onDone={() => {
          setInviteAccepted(true);
          window.history.replaceState({}, '', import.meta.env.BASE_URL);
        }}
      />
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <p className="text-slate-400 text-center">
          Aucun profil n'est associé à ce compte. Contactez un administrateur.
        </p>
      </div>
    );
  }

  if (profile.role === 'super_admin' && !actingCollectifId) {
    return <SuperAdminDashboard />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'players': return <PlayerList />;
      case 'apero': return <AperoSchedule />;
      case 'matches': return <MatchSchedule />;
      case 'carpool': return <CarpoolManager />;
      case 'fines': return <FinesManager />;
      default: return <PlayerList />;
    }
  };

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
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
