import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { QuizState, EventType } from './types';
import { quizQuestions, progressSteps } from './constants/quizData';
import { useSession } from './hooks/useSession';
import { useTracking } from './hooks/useTracking';
import { isValidEmail, isValidPhone, sanitizeString } from './utils/validation';
import { analyzeDiagnostic, type QuizAnswer, type DiagnosticResult } from './utils/diagnosticAnalysis';
import { supabase } from './integrations/supabase/client';

import WelcomeScreen from './components/WelcomeScreen';
import QuizScreen from './components/QuizScreen';
import * as api from './api/client';
const LeadCaptureScreen = React.lazy(() => import('./components/LeadCaptureScreen'));
const ResultScreen = React.lazy(() => import('./components/ResultScreen'));

// Componentes de loading memoizados
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
  </div>
));

const AnalyzingScreen = React.memo(() => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-6"></div>
    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Analisando suas respostas...</h2>
    <p className="text-lg text-text-secondary mt-2">Gerando seu diagnóstico personalizado.</p>
  </div>
));

const App: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const actualProduct = productSlug || '';

  const [view, setView] = useState<QuizState>(QuizState.WELCOME);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisLevel, setDiagnosisLevel] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [currentLeadEmail, setCurrentLeadEmail] = useState<string | null>(null);
  const [isLeadIdReady, setIsLeadIdReady] = useState(false);

  // Refs to access latest state in async callbacks
  const currentLeadIdRef = React.useRef<string | null>(null);
  const isLeadIdReadyRef = React.useRef(false);

  useEffect(() => {
    currentLeadIdRef.current = currentLeadId;
  }, [currentLeadId]);

  useEffect(() => {
    isLeadIdReadyRef.current = isLeadIdReady;
  }, [isLeadIdReady]);

  const { sessionId, produto, fonteDeTrafego, tipoDeFunil, instagramId, isSessionReady } = useSession();
  const tracking = useTracking(sessionId, produto, fonteDeTrafego, tipoDeFunil, instagramId);

  // Função para detectar se estamos no dashboard (rota raiz)
  const isDashboardRoute = () => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname === '/';
  };

  const getCurrentStep = useCallback(() => {
    switch (view) {
      case QuizState.WELCOME: return 'pagina_inicial';
      case QuizState.QUIZ: return `pergunta_${currentQuestionIndex + 1}`;
      case QuizState.LEAD_CAPTURE: return 'cadastro_lead';
      case QuizState.RESULTS: return 'quiz_completo';
      default: return 'unknown';
    }
  }, [view, currentQuestionIndex]);

  // Efeito para resetar o índice da pergunta se a view for WELCOME
  useEffect(() => {
    if (view === QuizState.WELCOME) {
      setCurrentQuestionIndex(0);
    }
  }, [view]);

  // Prefetch das telas finais para reduzir latência na transição
  useEffect(() => {
    if (view === QuizState.QUIZ && currentQuestionIndex >= quizQuestions.length - 2) {
      import('./components/LeadCaptureScreen');
    }
  }, [view, currentQuestionIndex]);

  useEffect(() => {
    if (isAnalyzing) {
      import('./components/ResultScreen');
    }
  }, [isAnalyzing]);

  // Effect para tracking de abandono - desde página inicial até pergunta 15
  useEffect(() => {
    // Abandono funciona desde WELCOME até pergunta 15 do QUIZ
    // NÃO registra abandono em LEAD_CAPTURE nem RESULTS (página de vendas)
    const shouldTrackAbandonment =
      view === QuizState.WELCOME ||
      (view === QuizState.QUIZ && currentQuestionIndex <= 14); // pergunta 15 = index 14

    if (!shouldTrackAbandonment) return;

    const fireAbandonment = () => {
      // Verifica novamente o contexto no momento do disparo
      const currentShouldTrack =
        view === QuizState.WELCOME ||
        (view === QuizState.QUIZ && currentQuestionIndex <= 14);

      if (!currentShouldTrack) return;

      // Bloqueios: já enviado ou ações que não são abandono
      if (sessionStorage.getItem('abandonment_sent') === 'true') return;
      if (sessionStorage.getItem('offer_click_tracked') === 'true') return;
      if (sessionStorage.getItem('quiz_complete_tracked') === 'true') return;
      if (sessionStorage.getItem('lead_submit_tracked') === 'true') return;

      // Supressão: clique recente no checkout (navegação legítima)
      const recentOfferClickTs = Number(sessionStorage.getItem('recent_offer_click_ts') || '0');
      if (recentOfferClickTs && Date.now() - recentOfferClickTs < 5000) return;

      // NOVA VERIFICAÇÃO: Não disparar se a página foi carregada há menos de 3 segundos
      const pageLoadTime = Number(sessionStorage.getItem('page_load_time') || '0');
      if (pageLoadTime && Date.now() - pageLoadTime < 3000) {
        console.log('🚫 [DEBUG] Abandono bloqueado - página carregada há menos de 3 segundos');
        return;
      }

      // Marca e envia
      sessionStorage.setItem('abandonment_sent', 'true');
      console.log('🔥 [DEBUG] Disparando abandono:', getCurrentStep());
      tracking.trackAbandonment(getCurrentStep(), 'fechamento_janela', currentLeadEmail || undefined);
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('🔥 [DEBUG] beforeunload disparado, view:', view, 'questionIndex:', currentQuestionIndex);
      fireAbandonment();
    };

    // Somente beforeunload — não usa pagehide/visibilitychange para evitar falsos positivos
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [view, currentQuestionIndex, tracking, currentLeadEmail, getCurrentStep]);

  // Dispara o tracking de visita somente uma vez, no primeiro carregamento do componente
  useEffect(() => {
    // Marca o timestamp de carregamento da página para proteção contra abandono prematuro
    sessionStorage.setItem('page_load_time', Date.now().toString());

    void (async () => {
      try {
        await tracking.trackVisit();
      } catch (error) {
        console.error('Erro ao registrar visita:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuizStart = useCallback(() => {
    // Inicia diretamente o quiz sem registrar uma nova visita
    setView(QuizState.QUIZ);
    void (async () => {
      try {
        const response = await tracking.trackQuizStart();
        const leadIdFromEvent = response?.lead_id;
        if (leadIdFromEvent) {
          setCurrentLeadId(leadIdFromEvent);
        }
      } catch (error) {
        console.error("Erro ao iniciar tracking do quiz, prosseguindo mesmo assim:", error);
      }
    })();
  }, [tracking]);


  const handleAnswer = useCallback((answer: string) => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    console.log(`🔥 [DEBUG App.tsx] Resposta selecionada: ${answer} para pergunta ${currentQuestion.id}`);

    // Encontrar o índice da opção selecionada
    const selectedOptionIndex = currentQuestion.options.findIndex(option => option === answer);

    if (selectedOptionIndex !== -1) {
      // Armazenar a resposta
      const newAnswer: QuizAnswer = {
        questionId: currentQuestion.id,
        selectedOption: selectedOptionIndex
      };

      setQuizAnswers(prev => {
        // Remove resposta anterior para a mesma pergunta (se existir) e adiciona a nova
        const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
        return [...filtered, newAnswer];
      });

      console.log(`🔥 [DEBUG App.tsx] Resposta armazenada: questionId=${currentQuestion.id}, selectedOption=${selectedOptionIndex}`);
    }

    void tracking.trackQuestionView(currentQuestion.id);

    if (currentQuestionIndex < quizQuestions.length - 1) {
      console.log(`🔥 [DEBUG App.tsx] Avançando para próxima pergunta: ${currentQuestionIndex + 1}`);
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      console.log(`🔥 [DEBUG App.tsx] Quiz completo! Transicionando para formulário de lead`);
      void tracking.trackQuizComplete();
      setView(QuizState.LEAD_CAPTURE);
    }
  }, [currentQuestionIndex, tracking]);

  const handleLeadSubmit = useCallback(async (leadData: { name: string; email: string; phone: string }) => {
    const sanitizedData = {
      name: sanitizeString(leadData.name),
      email: sanitizeString(leadData.email),
      phone: sanitizeString(leadData.phone),
    };

    if (!sanitizedData.name || !isValidEmail(sanitizedData.email) || !isValidPhone(sanitizedData.phone)) {
      throw new Error('Por favor, preencha todos os campos corretamente.');
    }

    // Atualizar URL com os parâmetros do lead
    const cleanPhone = sanitizedData.phone.replace(/\D/g, '');
    const params = new URLSearchParams(window.location.search);
    params.set('name', sanitizedData.name);
    params.set('email', sanitizedData.email);
    params.set('phonenumber', cleanPhone);

    // Manter UTMs se existirem
    if (instagramId) params.set('utm_medium', instagramId);
    if (fonteDeTrafego) params.set('utm_source', fonteDeTrafego);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Iniciar análise imediatamente para evitar qualquer percepção de atraso
    setIsAnalyzing(true);

    // Calcular diagnóstico real baseado nas respostas
    console.log(`🎯 [DEBUG App.tsx] Calculando diagnóstico com ${quizAnswers.length} respostas:`, quizAnswers);
    const diagnostic = analyzeDiagnostic(quizAnswers);
    console.log(`🎯 [DEBUG App.tsx] Resultado do diagnóstico:`, diagnostic);

    setDiagnosticResult(diagnostic);

    // Mapear urgência para diagnosisLevel para compatibilidade
    const levelMap = { 'high': 0, 'critical': 1, 'emergency': 2 };
    const calculatedLevel = levelMap[diagnostic.urgencyLevel] || 0;
    setDiagnosisLevel(calculatedLevel);

    // Tracking em segundo plano, sem bloquear transição
    void (async () => {
      try {
        console.log(`🎯 [DEBUG App.tsx] Dados sanitizados para lead_submit:`, sanitizedData);
        console.log(`🎯 [DEBUG App.tsx] Diagnosis level:`, diagnosisLevel);
        console.log(`🎯 [DEBUG App.tsx] SessionId atual:`, sessionId);

        const response = await tracking.trackLeadSubmit(sanitizedData, calculatedLevel, diagnostic);
        console.log(`🎯 [DEBUG App.tsx] Resposta do trackLeadSubmit:`, response);

        if (response && typeof response === 'object' && 'lead_id' in response) {
          console.log(`✅ [DEBUG App.tsx] Lead ID recebido:`, response.lead_id);
          console.log(`🎯 [DEBUG App.tsx] Definindo currentLeadId para:`, response.lead_id);
          const leadId = (response as { lead_id: string }).lead_id;
          setCurrentLeadId(leadId);
          currentLeadIdRef.current = leadId; // Atualização imediata do ref
          console.log(`🎯 [DEBUG App.tsx] setCurrentLeadId chamado com:`, response.lead_id);
          setIsLeadIdReady(true);
          isLeadIdReadyRef.current = true;
        } else {
          console.warn("❌ [DEBUG App.tsx] trackLeadSubmit did not return lead_id in expected format. Falling back to sessionId.");
          console.log(`🔄 [DEBUG App.tsx] Usando sessionId como fallback:`, sessionId);
          console.log(`🎯 [DEBUG App.tsx] Definindo currentLeadId para sessionId:`, sessionId);
          setCurrentLeadId(sessionId);
          currentLeadIdRef.current = sessionId;
          console.log(`🎯 [DEBUG App.tsx] setCurrentLeadId chamado com sessionId:`, sessionId);
          setIsLeadIdReady(true);
          isLeadIdReadyRef.current = true;
        }
        setCurrentLeadEmail(sanitizedData.email);

        // Log final do currentLeadId definido
        setTimeout(() => {
          console.log(`🎯 [DEBUG App.tsx] CurrentLeadId final definido:`, response?.lead_id || sessionId);
        }, 100);
      } catch (error) {
        console.error("❌ [DEBUG App.tsx] Erro ao registrar evento de lead_submit ou obter leadId:", error);
        console.log(`🔄 [DEBUG App.tsx] Usando sessionId como fallback por erro:`, sessionId);
        console.log(`🎯 [DEBUG App.tsx] Definindo currentLeadId para sessionId por erro:`, sessionId);
        setCurrentLeadId(sessionId);
        currentLeadIdRef.current = sessionId;
        console.log(`🎯 [DEBUG App.tsx] setCurrentLeadId chamado com sessionId por erro:`, sessionId);
        setCurrentLeadEmail(sanitizedData.email);
        setIsLeadIdReady(true);
        isLeadIdReadyRef.current = true;
      }
    })();

    setTimeout(() => {
      setIsAnalyzing(false);
      setView(QuizState.RESULTS);
    }, 2500);
  }, [tracking, sessionId, diagnosisLevel, instagramId, fonteDeTrafego]);

  const handleOfferClick = useCallback(async () => {
    console.log(`🛒 [DEBUG CHECKOUT] ==================== INÍCIO DO CHECKOUT ====================`);
    console.log(`🛒 [DEBUG CHECKOUT] Botão checkout clicado!`);

    // Usar refs para ver estado atualizado sem depender de closures antigas
    console.log(`🛒 [DEBUG CHECKOUT] IsLeadIdReady (Ref):`, isLeadIdReadyRef.current);
    console.log(`🛒 [DEBUG CHECKOUT] CurrentLeadId (Ref):`, currentLeadIdRef.current);

    // Aguardar o leadId estar pronto usando check periódico
    if (!isLeadIdReadyRef.current) {
      console.log(`⏳ [DEBUG CHECKOUT] Aguardando leadId estar pronto...`);
      // Aguardar até 5 segundos para o leadId estar pronto
      let attempts = 0;
      while (!isLeadIdReadyRef.current && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      console.log(`🔄 [DEBUG CHECKOUT] Após aguardar - IsLeadIdReady:`, isLeadIdReadyRef.current);
      console.log(`🔄 [DEBUG CHECKOUT] Após aguardar - CurrentLeadId:`, currentLeadIdRef.current);
    }

    const actualLeadId = currentLeadIdRef.current;

    // Verificações finais
    if (!actualLeadId) {
      console.warn("⚠️ [DEBUG CHECKOUT] Timeout aguardando lead ID. Usando session ID como última tentativa:", sessionId);
    }

    const idToTrack = actualLeadId || sessionId;
    console.log("🛒 [DEBUG CHECKOUT] idToTrack:", idToTrack);

    try {
      console.log("🛒 [DEBUG CHECKOUT] Chamando tracking.trackOfferClick...");
      await tracking.trackOfferClick(idToTrack);
      console.log("✅ [DEBUG CHECKOUT] tracking.trackOfferClick concluído");

      // Atualizar o campo iniciar_checkout para true no lead
      if (actualLeadId) {
        console.log("🛒 [DEBUG CHECKOUT] Atualizando campo iniciar_checkout para currentLeadId:", actualLeadId);
        try {
          const { data, error } = await supabase
            .schema('tbz')
            .from('leads')
            .update({ checkout_initiated: true }) // Ensure mapping is correct if column is named differently, checking schema first
            .eq('id', actualLeadId)
            .select();

          if (error) {
            console.error("❌ [DEBUG CHECKOUT] Erro ao atualizar iniciar_checkout:", error);
          } else {
            console.log("✅ [DEBUG CHECKOUT] Campo iniciar_checkout atualizado para true");
            console.log("🛒 [DEBUG CHECKOUT] Dados atualizados:", data);
          }
        } catch (updateError) {
          console.error("❌ [DEBUG CHECKOUT] Erro ao atualizar lead:", updateError);
        }
      } else {
        console.warn("⚠️ [DEBUG CHECKOUT] actualLeadId é null - não é possível atualizar o lead");
        console.log("💡 [DEBUG CHECKOUT] Certifique-se de que o lead foi criado corretamente no lead_submit");
      }
    } catch (error) {
      console.error("❌ [DEBUG CHECKOUT] Erro ao registrar clique na oferta:", error);
    }
    // Marca timestamp do clique para suprimir abandono ao navegar para checkout
    sessionStorage.setItem('recent_offer_click_ts', Date.now().toString());

    const currentParams = new URLSearchParams(window.location.search);

    // Parâmetros permitidos no checkout
    const allowedKeys = ['name', 'email', 'phoneac', 'phonenumber', 'utm_medium', 'utm_source'];

    const hotmartParams = new URLSearchParams();
    allowedKeys.forEach((key) => {
      const value = currentParams.get(key);
      if (value) {
        hotmartParams.append(key, value);
      }
    });

    const baseUrl = 'https://payment.ticto.app/O1A7E5B31';
    const queryString = hotmartParams.toString();
    const hotmartUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    window.location.href = hotmartUrl;
  }, [tracking, currentLeadId, sessionId, isLeadIdReady]);

  if (!isSessionReady) {
    return <LoadingSpinner />;
  }

  if (isAnalyzing) {
    return <AnalyzingScreen />;
  }

  switch (view) {
    case QuizState.WELCOME:
      return (
        <WelcomeScreen
          onStart={handleQuizStart}
        />
      );
    case QuizState.QUIZ:
      return (
        <QuizScreen
          questions={quizQuestions}
          currentQuestionIndex={currentQuestionIndex}
          onAnswer={handleAnswer}
          trackQuestionView={() => { }}
        />
      );
    case QuizState.LEAD_CAPTURE:
      return (
        <React.Suspense fallback={<LoadingSpinner />}>
          <LeadCaptureScreen onSubmit={handleLeadSubmit} />
        </React.Suspense>
      );
    case QuizState.RESULTS:
      return (
        <React.Suspense fallback={<LoadingSpinner />}>
          <ResultScreen
            diagnosisLevel={diagnosisLevel}
            diagnosticResult={diagnosticResult}
            onOfferClick={handleOfferClick}
          />
        </React.Suspense>
      );
    default:
      return (
        <WelcomeScreen
          onStart={() => setView(QuizState.QUIZ)}
        />
      );
  }
};

export default App;