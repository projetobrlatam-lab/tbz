import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Session } from '@supabase/supabase-js';
import React, { CSSProperties, useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client'; // Caminho atualizado
import ptBR from './pt-BR.json'; // Caminho atualizado

interface SimpleAuthScreenProps {
  onLogin: () => void;
}

interface Appearance {
  theme?: any;
  style?: {
    anchor?: CSSProperties;
    button?: CSSProperties;
    container?: CSSProperties;
    divider?: CSSProperties;
    input?: CSSProperties;
    label?: CSSProperties;
    loader?: CSSProperties;
    message?: CSSProperties;
  };
  variables?: any;
}

interface Localization {
  variables?: any;
}

type ViewType = 'sign_in' | 'sign_up' | 'forgotten_password' | 'magic_link' | 'update_password';

interface AuthLinksProps {
  setAuthView: (view: ViewType) => void;
}

export default function SimpleAuthScreen({ onLogin }: SimpleAuthScreenProps) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [view, setView] = useState<ViewType>('sign_in');

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);

    // Configurar o listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      if (event === 'SIGNED_IN' && session) {
        onLogin && onLogin();
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      subscription.unsubscribe();
    };
  }, [onLogin]);

  return (
    <div className="modern-auth-container">
      <div className="modern-auth-card">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-container">
            <img
              src="/reino-360-logo.png"
              alt="Reino 360 Logo"
              className="logo"
            />
          </div>
        </div>

        {/* Title Section */}
        <div className="title-section">
          <h1>Acesse sua conta</h1>
        </div>

        {/* Auth Form */}
        <div className="auth-form-container">
          <Auth
            supabaseClient={supabase as any}
            providers={['google']}
            view={view}
            showLinks={false}
            redirectTo={typeof window !== 'undefined' ? window.location.href : process.env.VERCEL_URL || ''}
            providerScopes={{
              google: 'https://www.googleapis.com/auth/userinfo.email'
            }}
            appearance={{
              theme: ThemeSupa,
              style: {
                container: {
                  maxWidth: '100%',
                  padding: '0',
                  margin: '0',
                },
                button: {
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  padding: '14px 20px',
                  border: 'none',
                  marginBottom: '16px',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  width: '100%',
                },
                input: {
                  borderRadius: '8px',
                  fontSize: '16px',
                  padding: '14px 16px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#F9FAFB',
                  marginBottom: '16px',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                },
                label: {
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#374151',
                  display: 'block',
                },
                message: {
                  fontSize: '14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  padding: '12px',
                },
                anchor: {
                  fontSize: '14px',
                  color: '#D4AF37',
                  fontWeight: '500',
                  textDecoration: 'none',
                },
              },
              variables: {
                default: {
                  colors: {
                    brand: '#D4AF37',
                    brandAccent: '#B8941F',
                    inputBackground: '#F9FAFB',
                    inputText: '#111827',
                    inputBorder: '#E5E7EB',
                    inputBorderFocus: '#D4AF37',
                    inputBorderHover: '#D1D5DB',
                    messageText: '#374151',
                    messageBackground: '#F3F4F6',
                    messageTextDanger: '#DC2626',
                    messageBackgroundDanger: '#FEF2F2',
                  },
                  fonts: {
                    bodyFontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                    buttonFontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                    inputFontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                    labelFontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                  },
                  space: {
                    inputPadding: '14px 16px',
                    buttonPadding: '14px 20px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '0',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                },
              },
            }}
            localization={{
              variables: {
                ...ptBR,
                sign_in: {
                  ...ptBR.sign_in,
                  email_label: 'Usuário',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  social_provider_text: 'Continuar com {{provider}}',
                  link_text: 'Já tem uma conta? Entre aqui',
                },
                sign_up: {
                  ...ptBR.sign_up,
                  email_label: 'Usuário',
                  password_label: 'Senha',
                  button_label: 'Criar conta',
                  loading_button_label: 'Criando conta...',
                  social_provider_text: 'Continuar com {{provider}}',
                  link_text: 'Não tem uma conta? Cadastre-se',
                },
              },
            }}
            theme="light"
            socialLayout="vertical"
          />

          {/* Custom Links */}
          {view === 'sign_in' && (
            <div className="auth-links">
              <button
                className="forgot-password-link"
                onClick={() => {
                  const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
                  if (emailInput?.value) {
                    supabase.auth.resetPasswordForEmail(emailInput.value, {
                      redirectTo: window.location.origin
                    });
                  } else {
                    alert('Por favor, digite seu email primeiro');
                  }
                }}
              >
                Esqueci minha senha
              </button>
              <div className="signup-link">
                Ainda não tem uma conta?
                <button className="signup-button" onClick={() => setView('sign_up')}>
                  Criar conta
                </button>
              </div>
            </div>
          )}

          {view === 'sign_up' && (
            <div className="auth-links">
              <div className="signin-link">
                Já tem uma conta?
                <button className="signin-button" onClick={() => setView('sign_in')}>
                  Entrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Access Section */}
        <div className="quick-access">
          <p>Acesso rápido</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .modern-auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #2C2C2C 0%, #1A1A1A 50%, #2C2C2C 100%);
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .modern-auth-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          padding: 40px;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 200px;
          height: 100px;
          background: linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%);
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.2);
          border: 2px solid #D4AF37;
          padding: 16px;
        }

        .logo {
          width: 180px;
          height: 80px;
          object-fit: contain;
        }

        .title-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .title-section h1 {
          color: #111827;
          font-size: 24px;
          font-weight: 600;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .auth-form-container {
          margin-bottom: 24px;
        }

        /* Override Supabase Auth UI styles */
        .auth-form-container [data-supabase] {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }

        .auth-form-container [data-supabase] input {
          background-color: #F9FAFB !important;
          border: 1px solid #E5E7EB !important;
          border-radius: 8px !important;
          padding: 14px 16px !important;
          font-size: 16px !important;
          transition: all 0.2s ease !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .auth-form-container [data-supabase] input:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1) !important;
          outline: none !important;
        }

        .auth-form-container [data-supabase] button[type="submit"] {
          background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%) !important;
          border: none !important;
          border-radius: 8px !important;
          color: white !important;
          font-weight: 600 !important;
          padding: 14px 20px !important;
          font-size: 16px !important;
          width: 100% !important;
          transition: all 0.2s ease !important;
          margin-bottom: 16px !important;
        }

        .auth-form-container [data-supabase] button[type="submit"]:hover {
          background: linear-gradient(135deg, #B8941F 0%, #9A7A1A 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4) !important;
        }

        .auth-form-container [data-supabase] button[data-provider="google"] {
          background: white !important;
          border: 1px solid #E5E7EB !important;
          color: #374151 !important;
          font-weight: 500 !important;
          padding: 14px 20px !important;
          border-radius: 8px !important;
          width: 100% !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        .auth-form-container [data-supabase] button[data-provider="google"]:hover {
          background: #F9FAFB !important;
          border-color: #D4AF37 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2) !important;
        }

        .auth-form-container [data-supabase] label {
          color: #374151 !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          margin-bottom: 8px !important;
          display: block !important;
        }

        .auth-links {
          text-align: center;
          margin-top: 24px;
        }

        .forgot-password-link {
          background: none;
          border: none;
          color: #D4AF37;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          margin-bottom: 16px;
          display: block;
          width: 100%;
          text-align: center;
          transition: color 0.2s ease;
        }

        .forgot-password-link:hover {
          color: #B8941F;
        }

        .signup-link, .signin-link {
          color: #6B7280;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .signup-button, .signin-button {
          background: none;
          border: none;
          color: #D4AF37;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease;
        }

        .signup-button:hover, .signin-button:hover {
          color: #B8941F;
        }

        .quick-access {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #F3F4F6;
        }

        .quick-access p {
          color: #9CA3AF;
          font-size: 14px;
          margin: 0;
          font-weight: 500;
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .modern-auth-card {
            padding: 24px;
            margin: 10px;
          }

          .logo-container {
            width: 160px;
            height: 80px;
            padding: 12px;
          }

          .logo {
            width: 140px;
            height: 60px;
          }

          .title-section h1 {
            font-size: 22px;
          }
        }

        /* Loading states */
        .auth-form-container [data-supabase] button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        /* Error messages */
        .auth-form-container [data-supabase] .supabase-auth-ui_ui-message {
          background: #FEF2F2 !important;
          border: 1px solid #FECACA !important;
          color: #DC2626 !important;
          border-radius: 8px !important;
          padding: 12px !important;
          margin-bottom: 16px !important;
          font-size: 14px !important;
        }

        /* Success messages */
        .auth-form-container [data-supabase] .supabase-auth-ui_ui-message--success {
          background: #F0FDF4 !important;
          border: 1px solid #BBF7D0 !important;
          color: #166534 !important;
        }
      `}</style>
    </div>
  );
}