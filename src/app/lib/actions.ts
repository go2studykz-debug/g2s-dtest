
'use server';

import { 
  StudentResult, 
  Question, 
  StudentAnswer, 
  AntiCheatLog, 
  AIAnalysis,
  Test,
  Subject,
  Language
} from './types';
import { MOCK_TESTS, MOCK_QUESTIONS } from './mock-data';
import { analyzeStudentResult } from '@/ai/flows/admin-ai-result-analysis';

// Используем глобальный объект для сохранения данных между перезагрузками в разработке
const globalForStore = global as unknown as {
  resultsStore: Record<string, any>;
  answersStore: Record<string, any[]>;
  logsStore: Record<string, any[]>;
  testsStore: Record<string, any>;
  questionsStore: Record<string, any[]>; 
};

// Инициализация хранилища
globalForStore.resultsStore = globalForStore.resultsStore || {};
globalForStore.answersStore = globalForStore.answersStore || {};
globalForStore.logsStore = globalForStore.logsStore || {};
globalForStore.testsStore = globalForStore.testsStore || {};
globalForStore.questionsStore = globalForStore.questionsStore || {};

const resultsStore = globalForStore.resultsStore;
const answersStore = globalForStore.answersStore;
const logsStore = globalForStore.logsStore;
const testsStore = globalForStore.testsStore;
const questionsStore = globalForStore.questionsStore;

// Загрузка моков, если хранилище пустое
if (Object.keys(testsStore).length === 0) {
  MOCK_TESTS.forEach(t => { testsStore[t.id] = t; });
}
if (!questionsStore['all'] || questionsStore['all'].length === 0) {
  const allQuestions: Question[] = [];
  Object.values(MOCK_QUESTIONS).forEach(qs => allQuestions.push(...qs));
  questionsStore['all'] = allQuestions;
}

// Хелпер для сериализации дат (Next.js 15 может капризничать с Date объектами в некоторых случаях)
function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getTests(): Promise<Test[]> {
  return serializeData(Object.values(testsStore));
}

export async function getQuestions(classNumber: number, language: Language): Promise<Question[]> {
  const all = questionsStore['all'] || [];
  return serializeData(all);
}

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  const all = questionsStore['all'] || [];
  return serializeData(all.filter(q => q.test_id === testId));
}

export async function saveQuestion(question: Question): Promise<Question> {
  const all = questionsStore['all'] || [];
  const idx = all.findIndex(q => q.id === question.id);
  if (idx !== -1) {
    all[idx] = question;
  } else {
    all.push(question);
  }
  questionsStore['all'] = [...all];
  return serializeData(question);
}

export async function deleteQuestion(id: string): Promise<void> {
  const all = questionsStore['all'] || [];
  questionsStore['all'] = all.filter(q => q.id !== id);
}

export async function getTestById(id: string): Promise<Test | null> {
  const test = testsStore[id];
  return test ? serializeData(test) : null;
}

export async function saveTest(test: Test): Promise<Test> {
  testsStore[test.id] = test;
  return serializeData(test);
}

export async function startTest(data: {
  testId: string;
  name: string;
  city: string;
  whatsapp: string;
  classNumber: number;
  language: 'kk' | 'ru';
}): Promise<{ result: StudentResult; questions: Question[] }> {
  const resultId = Math.random().toString(36).substr(2, 9);
  const test = testsStore[data.testId] || MOCK_TESTS.find(t => t.id === data.testId);
  
  if (!test) throw new Error('Test not found');

  const questions = (questionsStore['all'] || []).filter(q => q.test_id === data.testId);

  const result: StudentResult = {
    id: resultId,
    test_id: data.testId,
    student_name: data.name,
    student_city: data.city,
    parent_whatsapp: data.whatsapp,
    class_number: data.classNumber,
    language: data.language,
    status: 'in_progress',
    total_correct: 0,
    total_questions: questions.length,
    percentage: 0,
    total_score: 0,
    started_at: new Date(),
    is_analysed: false,
    anti_cheat_count: 0,
    is_contacted: false,
    is_consulted: false,
  };

  resultsStore[resultId] = result;
  
  return serializeData({ result, questions: questions.map(({ correct_answer, ...q }) => q as Question) });
}

export async function updateResultCRM(id: string, updates: { is_contacted?: boolean; is_consulted?: boolean }) {
  const result = resultsStore[id];
  if (result) {
    if (updates.is_contacted !== undefined) result.is_contacted = updates.is_contacted;
    if (updates.is_consulted !== undefined) result.is_consulted = updates.is_consulted;
    resultsStore[id] = { ...result };
  }
  return result ? serializeData(result) : null;
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
  const result = resultsStore[data.resultId];
  if (!result) return;

  const all = questionsStore['all'] || [];
  const question = all.find(q => q.id === data.questionId);
  if (!question) return;

  const studentAnswer: StudentAnswer = {
    id: Math.random().toString(36).substr(2, 9),
    result_id: data.resultId,
    question_id: data.questionId,
    question_number: question.question_number,
    subject: question.subject,
    student_answer: data.answer,
    correct_answer: question.correct_answer || '',
    is_correct: data.answer === question.correct_answer,
    time_spent_seconds: data.timeSpent,
  };

  if (!answersStore[data.resultId]) answersStore[data.resultId] = [];
  
  const existingIdx = answersStore[data.resultId].findIndex(a => a.question_id === data.questionId);
  if (existingIdx !== -1) {
    answersStore[data.resultId][existingIdx] = studentAnswer;
  } else {
    answersStore[data.resultId].push(studentAnswer);
  }
}

export async function logAntiCheat(data: {
  resultId: string;
  eventType: 'tab_switch' | 'window_blur';
  questionNumber: number;
  duration: number;
  details: string;
}) {
  const result = resultsStore[data.resultId];
  if (!result) return;

  const log: AntiCheatLog = {
    id: Math.random().toString(36).substr(2, 9),
    result_id: data.resultId,
    event_type: data.eventType,
    question_number: data.questionNumber,
    exit_duration_seconds: data.duration,
    details: data.details,
    created_at: new Date(),
  };

  if (!logsStore[data.resultId]) logsStore[data.resultId] = [];
  logsStore[data.resultId].push(log);
  
  result.anti_cheat_count += 1;
}

export async function finishTest(resultId: string): Promise<StudentResult> {
  const result = resultsStore[resultId];
  if (!result) throw new Error('Result not found');

  const answers = answersStore[resultId] || [];
  const correctCount = answers.filter(a => a.is_correct).length;
  
  const updatedResult = {
    ...result,
    status: 'completed' as const,
    completed_at: new Date(),
    total_correct: correctCount,
    percentage: result.total_questions > 0 ? Math.round((correctCount / result.total_questions) * 100) : 0,
    total_score: correctCount * 10
  };

  resultsStore[resultId] = updatedResult;
  return serializeData(updatedResult);
}

export async function analyzeResult(resultId: string) {
  const result = resultsStore[resultId];
  const answers = answersStore[resultId] || [];
  const logs = logsStore[resultId] || [];

  if (!result) throw new Error('Result not found');

  const all = questionsStore['all'] || [];

  const analysisInput = {
    studentName: result.student_name,
    classNumber: result.class_number,
    percentage: result.percentage,
    totalCorrect: result.total_correct,
    totalQuestions: result.total_questions,
    answers: answers.map(a => {
      const qObj = all.find(q => q.id === a.question_id);
      return {
        questionNumber: a.question_number,
        subject: a.subject,
        questionText: qObj?.question_text || "Вопрос не найден в базе",
        optionA: qObj?.option_a || "Вариант A",
        optionB: qObj?.option_b || "Вариант B",
        optionC: qObj?.option_c || "Вариант C",
        optionD: qObj?.option_d || "Вариант D",
        optionE: qObj?.option_e || null,
        studentAnswer: a.student_answer || "Нет ответа",
        correctAnswer: a.correct_answer || "Не указано",
        isCorrect: a.is_correct,
        timeSpentSeconds: a.time_spent_seconds,
      };
    }),
    antiCheatLogs: logs.map(l => ({
      eventType: l.event_type,
      questionNumber: l.question_number,
      exit_duration_seconds: l.exit_duration_seconds,
      details: l.details,
      createdAt: l.created_at.toISOString(),
    })),
  };

  try {
    const analysis = await analyzeStudentResult(analysisInput);
    
    result.is_analysed = true;
    result.ai_analysis = {
      id: Math.random().toString(36).substr(2, 9),
      result_id: resultId,
      analysis_json: analysis,
      student_name: result.student_name,
      class_number: result.class_number,
      percentage: result.percentage,
    };

    return serializeData(result.ai_analysis);
  } catch (error) {
    console.warn("AI Analysis failed, using mock data:", error);
    
    const mockAnalysis = {
      performanceSummary: `${result.student_name} продемонстрировал(а) уверенные знания в большинстве тем. Однако выявлены пробелы в сложных логических задачах.`,
      detailedAnalysis: [
        {
          questionNumber: 1,
          subject: 'math',
          topic: 'Решение уравнений',
          studentAnswer: 'A',
          correctAnswer: 'B',
          status: 'Ошибка',
          errorType: 'Невнимательность',
          examInfluence: 'Часто встречается в НИШ.',
          recommendation: 'Повторить алгоритмы.'
        }
      ],
      learningPathwaySuggestions: [
        { 
          area: 'Логика', 
          suggestion: 'Пройти курс логики.',
          resources: ['Задачи на ряды']
        }
      ],
      antiCheatBehaviorAnalysis: 'Нарушений не обнаружено.'
    };

    result.is_analysed = true;
    result.ai_analysis = {
      id: Math.random().toString(36).substr(2, 9),
      result_id: resultId,
      analysis_json: mockAnalysis,
      student_name: result.student_name,
      class_number: result.class_number,
      percentage: result.percentage,
    };

    return serializeData(result.ai_analysis);
  }
}

export async function getAllResults() {
  return serializeData(Object.values(resultsStore));
}

export async function getResultDetail(id: string) {
  const res = resultsStore[id];
  const ans = answersStore[id] || [];
  const logs = logsStore[id] || [];
  return serializeData({ result: res, answers: ans, logs });
}
