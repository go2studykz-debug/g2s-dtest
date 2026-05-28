
export type Subject = 
  | 'math' 
  | 'quantitative' 
  | 'logic' 
  | 'science' 
  | 'kazakh' 
  | 'russian' 
  | 'english';

export type Language = 'kz' | 'ru';
export type ResultStatus = 'in_progress' | 'completed';

export interface TestBlock {
  subject: Subject;
  question_count: number;
  time_limit_minutes: number;
}

export interface Test {
  id: string;
  name: string;
  class_number: number;
  language: Language;
  is_active: boolean;
  total_time_minutes: number;
  blocks: TestBlock[];
  created_at: Date;
}

export interface Question {
  id: string;
  test_id: string;
  question_number: number;
  subject: Subject;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string | null;
  correct_answer?: string;
  image_url?: string | null;
  points?: number;
  topic?: string | null;
}

export interface StudentResult {
  id: string;
  test_id: string;
  student_name: string;
  student_city: string;
  parent_whatsapp: string;
  class_number: number;
  language: Language;
  status: ResultStatus;
  total_correct: number;
  total_questions: number;
  percentage: number;
  total_score: number;
  max_score?: number;
  started_at: Date;
  completed_at?: Date | null;
  is_analysed: boolean;
  anti_cheat_count: number;
  ai_analysis?: AIAnalysis | null;
  is_contacted: boolean;
  is_consulted: boolean;
  consultation_refused?: boolean;
}

export interface StudentAnswer {
  id: string;
  result_id: string;
  question_id: string;
  question_number: number;
  subject: Subject;
  student_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface AIAnalysis {
  id: string;
  result_id: string;
  analysis_json: any;
  student_name: string;
  class_number: number;
  percentage: number;
}

export interface AntiCheatLog {
  id: string;
  result_id: string;
  event_type: 'tab_switch' | 'window_blur';
  question_number: number;
  exit_duration_seconds: number;
  details: string;
  created_at: Date;
}
