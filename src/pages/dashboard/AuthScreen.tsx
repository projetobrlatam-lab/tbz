import React from 'react';
import { supabase } from '../../integrations/supabase/client'; // Caminho atualizado
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const AuthScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-sm bg-brand-card-bg rounded-2xl shadow-xl p-8 text-center border border-pink-100/10">
        <h1 className="text-3xl font-extrabold text-brand-accent mb-3">
          Acesso Restrito
        </h1>
        <p className="text-lg text-brand-card-text-muted mb-8">
          Por favor, faça login para acessar o dashboard.
        </p>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#FF5F5D', // Primary
                  brandAccent: '#E64A48', // Primary Dark
                  inputBackground: '#FFFFFF',
                  inputBorder: '#E2E8F0',
                  inputBorderHover: '#FF5F5D',
                  inputBorderFocus: '#FF5F5D',
                  inputText: '#3F7C85', // Text Primary
                  inputPlaceholder: '#9CA3AF',
                  defaultButtonBackground: '#FF5F5D',
                  defaultButtonBackgroundHover: '#E64A48',
                  defaultButtonText: '#FFFFFF',
                  anchorTextColor: '#3F7C85', // Secondary
                  anchorTextHoverColor: '#2A5A60',
                  messageText: '#3F7C85',
                  messageBackground: '#F8FAFC',
                  messageBorder: '#E2E8F0',
                },
              },
            },
          }}
          theme="light"
        />
      </div>
    </div>
  );
};

export default AuthScreen;