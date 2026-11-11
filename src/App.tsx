import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { StreamxPlayerApp } from './components/player/StreamxPlayerApp';
import { StreamxAdminApp } from './components/admin/StreamxAdminApp';
import { SplashScreen } from './components/common/SplashScreen';
import { AuthModal } from './components/auth/AuthModal';

function MainAppContent() {
  const { user, loading: authLoading } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [showInitialAuth, setShowInitialAuth] = useState(false);

  const [currentApp, setCurrentApp] = useState<'player' | 'admin'>(() => {
    return window.location.hash === '#/admin' ? 'admin' : 'player';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/admin') {
        setCurrentApp('admin');
      } else {
        setCurrentApp('player');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    // After splash, if user is not signed in and hasn't logged in this session, show login options
    if (!user && !authLoading) {
      setShowInitialAuth(true);
    }
  };

  const handleOpenAdmin = () => {
    window.location.hash = '#/admin';
    setCurrentApp('admin');
  };

  const handleBackToPlayer = () => {
    window.location.hash = '#/player';
    setCurrentApp('player');
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} durationMs={1800} />}

      {currentApp === 'admin' ? (
        <StreamxAdminApp onBackToPlayer={handleBackToPlayer} />
      ) : (
        <StreamxPlayerApp onOpenAdmin={handleOpenAdmin} />
      )}

      {/* Post-splash Login/Register/Google modal for unauthenticated viewers */}
      <AuthModal
        isOpen={showInitialAuth && !user}
        onClose={() => setShowInitialAuth(false)}
        initialMode="login"
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WatchlistProvider>
        <MainAppContent />
      </WatchlistProvider>
    </AuthProvider>
  );
}
