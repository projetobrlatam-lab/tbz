export enum QuizState {
  WELCOME,
  QUIZ,
  LEAD_CAPTURE,
  RESULTS,
  DASHBOARD,
  AUTH,
}

export enum EventType {
  VISIT = 'visit',
  QUIZ_START = 'quiz_start',
  QUESTION_VIEW = 'question_view',
  LEAD_SUBMIT = 'lead_submit',
  OFFER_CLICK = 'checkout_click',
  QUIZ_COMPLETE = 'quiz_complete',
  ABANDONMENT = 'abandonment',
}

export interface Question {
  id: number;
  category: 'A REALIDADE ATUAL' | 'SINAIS DE ALERTA' | 'O FUTURO DELES' | 'SUA DECISÃO';
  text: string;
  options: string[];
  icon: string;
}

// Interfaces para o Dashboard
export interface ConversionRates {
  visit_to_quiz_start: number;
  quiz_start_to_lead: number;
  lead_to_quiz_complete: number; // CORRIGIDO: Adicionado
  quiz_complete_to_checkout: number;
  sales_conversion_from_leads: number;
}

export interface FunnelStep {
  step: string;
  count: number;
}

export interface AbandonmentStats {
  abandoned_count: number;
}

export interface DashboardMetrics {
  total_visits: number;
  total_quiz_starts: number;
  total_leads: number;
  total_quiz_complete: number;
  total_checkout_starts: number;
  total_sales: number;
  total_sales_value: number;
  total_abandonments: number;
  total_comments: number;
  comments_to_visits_conversion: number;
  conversion_rates: ConversionRates;
  funnel_data: FunnelStep[];
  abandonment_by_step: { [key: string]: AbandonmentStats };
  abandonment_rate: number;
}

export interface Visit {
  id: string;
  session_id: string;
  ip_address: string;
  country_code: string;
  city: string;
  country_name: string;
  region_name: string | null; // NOVO CAMPO
  user_agent: string;
  created_at: string;
  referrer: string;
  landing_page: string;
  produto: string;
  fonte_de_trafego: string | null; // Renomeado
  tipo_de_funil: string | null; // Novo campo
}

export interface Sale {
  id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  product_value: number | null;
  purchase_date: string;
  created_at: string;
  produto: string;
}

// Nova interface para a tabela oreino360-lead_products
export interface LeadProductInteraction {
  id: string;
  lead_id: string;
  produto: string;
  tipo_de_funil: string | null; // Novo campo
  last_interaction_at: string;
  created_at: string;
  updated_at: string;
}

// Nova interface para a tabela oreino360-lead_traffic_details
export interface LeadTrafficDetail {
  id: string;
  lead_id: string;
  fonte_de_trafego: string; // Renomeado
  tipo_de_funil: string | null; // Novo campo
  created_at: string;
}

// NOVAS INTERFACES PARA TAGS (AJUSTADAS)
export interface Tag {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface LeadTagAssignment {
  id: string;
  lead_id: string;
  tag_id: string;
  tag_name: string; // Para facilitar a exibição no frontend
  tag_category_inferred: string; // Categoria inferida para exibição
  tag_source_inferred: string; // Origem inferida para exibição (baseada no tipo_de_funil)
  produto: string;
  assigned_at: string;
}

// Interface para Leads com Tags para o Dashboard (AJUSTADA)
export interface LeadWithTags {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  traffic_id: string | null;
  created_at: string;
  produto: string; // O produto principal associado ao lead
  fonte_de_trafego: string | null; // Renomeado
  tipo_de_funil: string | null; // Novo campo
  urgency_level: string | null; // Nível de urgência: ALTA, CRÍTICA ou EMERGENCIAL
  iniciar_checkout: boolean; // Campo para indicar se o lead iniciou o checkout
  tags: LeadTagAssignment[]; // As tags atribuídas a este lead
  ai_analysis_data: any | null; // Análise de IA em JSONB
  ai_tag_name: string | null; // Novo campo para a tag de status da IA
}


// Novas interfaces para tipagem das funções Edge (mantidas, mas as acima são as que faltavam)
export interface QuizAbandonment {
  id: string; // UUID
  session_id: string; // UUID
  reason: string;
  step_where_abandoned: string;
  time_spent_minutes: number;
  created_at: string;
}

export interface QuizSession {
  id: string; // UUID
  session_id: string;
  ip_address: string;
  country_code: string;
  current_step: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
  produto: string; // Adicionado para consistência
  fingerprint_hash: string; // Adicionado para consistência
  fonte_de_trafego?: string; // Novo campo
  tipo_de_funil?: string; // Novo campo
}

export interface QuestionAbandonmentStats {
  abandoned_count: number;
  completion_rate: number;
  drop_off_rate: number;
}

export type AbandonmentByQuestion = {
  [key: string]: QuestionAbandonmentStats;
};

export interface WelcomeScreenProps {
  onStart: () => void;
}

export interface QuizScreenProps {
  questions: Question[];
  currentQuestionIndex: number;
  onAnswer: (answer: string) => void;
  trackQuestionView: (questionId: number) => void;
}

export interface ResultScreenProps {
  diagnosisLevel: number;
  onOfferClick: () => Promise<void>;
}

export interface LeadCaptureScreenProps {
  onSubmit: (data: { name: string; email: string; phone: string }) => void;
}

export interface SimpleAuthScreenProps {
  onLogin: () => void;
}

export interface DashboardScreenProps {
  totalQuestions: number;
}

export interface IconProps {
  className?: string;
}