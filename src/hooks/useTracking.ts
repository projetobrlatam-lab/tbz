import { useCallback } from 'react';
import { EventType } from '../types';
import * as api from '../api/client';
import { useParams } from 'react-router-dom';

// Flag de módulo para garantir que a visita seja registrada apenas uma vez por carregamento de página
let visitTrackedInPageLoad = false;

export const useTracking = (sessionId: string, produto: string, fonteDeTrafego: string, tipoDeFunil: string, instagramId: string | null) => {
  const finalFonteDeTrafego = fonteDeTrafego; // Usa o valor das UTMs sem fallback

  const trackEvent = useCallback(async (eventType: EventType, payload?: any): Promise<any> => {
    try {
      const response = await api.trackEvent(eventType, {
        ...payload,
        produto,
        // ✅ REMOVIDO: fonte_de_trafego e traffic_id agora são derivados dos UTMs no client.ts
        tipo_de_funil: tipoDeFunil,
      });
      return response;
    } catch (error) {
      console.error('Erro no tracking:', error);
      throw error;
    }
  }, [sessionId, produto, tipoDeFunil]); // ✅ CORRIGIDO: Removidas dependências desnecessárias

  const trackVisit = useCallback(async () => {
    // Garante que a visita seja enviada apenas uma vez por carregamento da página (F5 resetará isso)
    if (visitTrackedInPageLoad) return;

    visitTrackedInPageLoad = true;
    await trackEvent(EventType.VISIT);
  }, [trackEvent]);

  const trackQuizStart = useCallback(async (): Promise<{ lead_id?: string } | undefined> => {
    const response = await trackEvent(EventType.QUIZ_START);
    return response;
  }, [trackEvent]);

  const trackQuestionView = useCallback(async (questionId: number) => {
    await trackEvent(EventType.QUESTION_VIEW, { questionId });
  }, [trackEvent]);

  const trackLeadSubmit = useCallback(async (leadData: any, diagnosisLevel: number, diagnosticResult?: any): Promise<{ lead_id?: string } | undefined> => {
    if (!sessionStorage.getItem('lead_submit_tracked')) {
      sessionStorage.setItem('lead_submit_tracked', 'true');

      const response = await trackEvent(EventType.LEAD_SUBMIT, { ...leadData, diagnosisLevel, diagnosticResult });
      return response;
    }
    return undefined;
  }, [trackEvent]);

  const trackOfferClick = useCallback(async (leadId: string) => {
    if (!sessionStorage.getItem('offer_click_tracked')) {
      sessionStorage.setItem('offer_click_tracked', 'true');
      await trackEvent(EventType.OFFER_CLICK, { leadId });
    }
  }, [trackEvent]);

  const trackQuizComplete = useCallback(async () => {
    if (!sessionStorage.getItem('quiz_complete_tracked')) {
      sessionStorage.setItem('quiz_complete_tracked', 'true');
      await trackEvent(EventType.QUIZ_COMPLETE);
    }
  }, [trackEvent]);

  const trackAbandonment = useCallback(async (step: string, reason: string = 'fechamento_janela', leadEmail?: string) => {
    await api.recordAbandonment(step, reason, produto, finalFonteDeTrafego, tipoDeFunil, leadEmail, instagramId);
  }, [produto, finalFonteDeTrafego, tipoDeFunil, instagramId]);

  return {
    trackEvent,
    trackVisit,
    trackQuizStart,
    trackQuestionView,
    trackLeadSubmit,
    trackOfferClick,
    trackQuizComplete,
    trackAbandonment,
  };
};