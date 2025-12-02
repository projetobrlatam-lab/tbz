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
                  brand: '#E0A800',
                  brandAccent: '#C79500',
                  inputBackground: '#FFF0F5',
                  inputBorder: '#EAD9E0',
                  inputBorderHover: '#E0A800',
                  inputBorderFocus: '#E0A800',
                  inputText: '#4C2A3A',
                  inputPlaceholder: '#4C2A3A80',
                  defaultButtonBackground: '#E0A800',
                  defaultButtonBackgroundHover: '#C79500',
                  defaultButtonText: '#4C2A3A',
                  anchorTextColor: '#E0A800',
                  anchorTextHoverColor: '#C79500',
                  messageText: '#4C2A3A',
                  messageBackground: '#FDF8FA',
                  messageBorder: '#EAD9E0',
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