import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '../integrations/supabase/client';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import ErrorBoundary from './ErrorBoundary';

// Lazy load components to isolate dependencies
const SimpleAuthScreen = React.lazy(() => import('../pages/dashboard/SimpleAuthScreen'));
const DashboardScreen = React.lazy(() => import('../pages/dashboard/DashboardScreen'));

const DashboardWrapper: React.FC = () => {
  const isBrowser = typeof window !== 'undefined';

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(isBrowser ? false : null);
  const [isLoading, setIsLoading] = useState<boolean | null>(isBrowser ? true : null);

  useEffect(() => {
    if (!isBrowser) return;
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        if (!!session) {
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          localStorage.removeItem('isAuthenticated');
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        localStorage.removeItem('isAuthenticated');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const isAuth = !!session;
      setIsAuthenticated(isAuth);
      if (isAuth) {
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        localStorage.removeItem('isAuthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, [isBrowser]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
  };

  if (isLoading === null) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-800 p-4 text-center">
        <p className="text-lg font-semibold">Ocorreu um erro inesperado ao carregar o Dashboard. Por favor, tente novamente mais tarde.</p>
      </div>
    }>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
        {isAuthenticated ? (
          <DashboardScreen totalQuestions={15} />
        ) : (
          <SimpleAuthScreen onLogin={handleLogin} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
};

export default DashboardWrapper;