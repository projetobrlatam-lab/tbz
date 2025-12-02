import React, { useState } from 'react';
import { isValidEmail, isValidPhone, sanitizeString } from '../utils/validation';

interface LeadCaptureScreenProps {
  onSubmit: (data: { name: string; email: string; phone: string }) => void;
}

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const LeadCaptureScreen: React.FC<LeadCaptureScreenProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!sanitizeString(name)) {
      newErrors.name = 'Por favor, informe seu nome completo';
    }

    if (!sanitizeString(email)) {
      newErrors.email = 'Por favor, informe seu e-mail';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Por favor, informe um e-mail válido';
    }

    if (!sanitizeString(phone)) {
      newErrors.phone = 'Por favor, informe seu telefone';
    } else if (!isValidPhone(phone)) {
      newErrors.phone = 'Por favor, informe um telefone válido (DDD + número)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const sanitizedData = {
        name: sanitizeString(name),
        email: sanitizeString(email),
        phone: sanitizeString(phone),
      };
      
      await onSubmit(sanitizedData);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setErrors({ submit: 'Ocorreu um erro ao enviar seus dados. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-background rounded-3xl shadow-elegant-xl p-8 md:p-10 text-center border border-border relative overflow-hidden">
          {/* Decoração de fundo */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent/10 to-transparent rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/10 to-transparent rounded-full translate-y-16 -translate-x-16"></div>
          
          {/* Ícone de sucesso */}
          <div className="relative z-10 mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-accent to-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-elegant">
              <SparkleIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl sm:text-4xl font-black mb-4 relative z-10">
            <span className="bg-gradient-to-r from-accent to-accent-dark bg-clip-text text-transparent">
              Seu diagnóstico está pronto!
            </span>
          </h1>
          
          <p className="text-lg text-text-secondary mb-8 relative z-10 leading-relaxed">
            Para receber sua análise personalizada e o plano de resgate, 
            preencha os campos abaixo.
          </p>
          
          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Campo Nome */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-surface border-2 ${
                    errors.name ? 'border-red-500' : 'border-border'
                  } focus:border-primary focus:ring-4 focus:ring-primary/20 text-text-primary placeholder-text-muted rounded-2xl py-4 pl-12 pr-4 text-lg transition-all duration-300 focus:outline-none`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Campo Email */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MailIcon className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-surface border-2 ${
                    errors.email ? 'border-red-500' : 'border-border'
                  } focus:border-primary focus:ring-4 focus:ring-primary/20 text-text-primary placeholder-text-muted rounded-2xl py-4 pl-12 pr-4 text-lg transition-all duration-300 focus:outline-none`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Campo Telefone */}
            <div>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <PhoneIcon className="h-5 w-5 text-text-muted" />
                </div>
                <span className="inline-flex items-center px-3 rounded-l-2xl bg-surface border-2 border-r-0 border-border text-text-secondary text-lg h-full py-4 pl-12">
                  +55
                </span>
                <input
                  type="tel"
                  placeholder="Seu telefone (com DDD)"
                  value={phone}
                  onChange={handlePhoneChange}
                  className={`w-full bg-surface border-2 ${
                    errors.phone ? 'border-red-500' : 'border-border'
                  } focus:border-primary focus:ring-4 focus:ring-primary/20 text-text-primary placeholder-text-muted rounded-r-2xl py-4 pr-4 pl-3 text-lg transition-all duration-300 focus:outline-none`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
            
            {/* Erro geral */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm font-medium">{errors.submit}</p>
              </div>
            )}

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="lead group w-full bg-gradient-to-r from-accent to-accent-dark text-white font-bold text-xl py-5 px-8 rounded-2xl shadow-elegant-lg hover:shadow-elegant-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-dark to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center justify-center space-x-3">
                <SparkleIcon className="w-6 h-6" />
                <span>{isSubmitting ? 'Processando...' : 'RECEBER MEU DIAGNÓSTICO AGORA'}</span>
                <SparkleIcon className="w-6 h-6" />
              </span>
            </button>
          </form>

          {/* Nota de privacidade */}
          <div className="mt-8 p-4 bg-surface rounded-xl relative z-10">
            <p className="text-xs text-text-muted flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v-7m8 0V3a4 4 0 00-8 0v4z" />
              </svg>
              <span>Respeitamos sua privacidade. Seus dados estão seguros conosco.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureScreen;