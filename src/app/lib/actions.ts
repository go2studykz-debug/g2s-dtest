
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

// Хелпер для сериализации данных для предотвращения ошибок Next.js 15
function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getTests(): Promise<Test[]> {
  try {
    return serializeData(Object.values(testsStore));
  } catch (e) {
    return [];
  }
}

export async function getTestById(id: string): Promise<Test | null> {
  try {
    const test = testsStore[id];
    return test ? serializeData(test) : null;
  } catch (e) {
    return null;
  }
}

export async function getQuestions(classNumber: number, language: Language): Promise<Question[]> {
  try {
    const all = questionsStore['all'] || [];
    return serializeData(all.filter(q => {
      const test = testsStore[q.test_id];
      return test && test.class_number === classNumber && test.language === language;
    }));
  } catch (e) {
    return [];
  }
}

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  try {
    const all = questionsStore['all'] || [];
    return serializeData(all.filter(q => q.test_id === testId));
  } catch (e) {
    return [];
  }
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
  
  // Возвращаем вопросы без правильных ответов для безопасности фронтенда
  const secureQuestions = questions.map(({ correct_answer, ...q }) => q as Question);
  
  return serializeData({ result, questions: secureQuestions });
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
  const result = resultsStore[data.resultId];
  if (!result || result.status === 'completed') return;

  const all = questionsStore['all'] || [];
  const question = all.find(q => q.id === data.questionId);
  if (!question) return;

  const existingAnswers = answersStore[data.resultId] || [];
  const existingIdx = existingAnswers.findIndex(a => a.question_id === data.questionId);
  
  // Накопительный учет времени: прибавляем новое время к уже потраченному
  let totalTime = data.timeSpent;
  if (existingIdx !== -1) {
    totalTime += existingAnswers[existingIdx].time_spent_seconds;
  }

  const studentAnswer: StudentAnswer = {
    id: Math.random().toString(36).substr(2, 9),
    result_id: data.resultId,
    question_id: data.questionId,
    question_number: question.question_number,
    subject: question.subject,
    student_answer: data.answer,
    correct_answer: question.correct_answer || '',
    is_correct: data.answer === question.correct_answer,
    time_spent_seconds: totalTime,
  };

  if (!answersStore[data.resultId]) answersStore[data.resultId] = [];
  
  if (existingIdx !== -1) {
    answersStore[data.resultId][existingIdx] = studentAnswer;
  } else {
    answersStore[data.resultId].push(studentAnswer);
  }
  
  return serializeData({ success: true });
}

export async function finishTest(resultId: string): Promise<StudentResult> {
  const result = resultsStore[resultId];
  if (!result) throw new Error('Result not found');
  if (result.status === 'completed') return serializeData(result);

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

export async function getResultDetail(id: string) {
  try {
    const res = resultsStore[id];
    if (!res) return null;
    const ans = answersStore[id] || [];
    const logs = logsStore[id] || [];
    const all = questionsStore['all'] || [];
    const testQuestions = all.filter(q => q.test_id === res.test_id);
    return serializeData({ result: res, answers: ans, logs, testQuestions });
  } catch (e) {
    return null;
  }
}

export async function getAllResults() {
  try {
    return serializeData(Object.values(resultsStore));
  } catch (e) {
    return [];
  }
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

export async function logAntiCheat(data: {
  resultId: string;
  eventType: 'tab_switch' | 'window_blur';
  questionNumber: number;
  duration: number;
  details: string;
}) {
  const result = resultsStore[data.resultId];
  if (!result || result.status === 'completed') return;

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
  return serializeData({ success: true });
}

export async function analyzeResult(resultId: string) {
  const result = resultsStore[resultId];
  if (!result || result.status !== 'completed') throw new Error('Result not ready');

  const answers = answersStore[resultId] || [];
  const logs = logsStore[resultId] || [];
  const allQuestions = questionsStore['all'] || [];
  const testQuestions = allQuestions.filter(q => q.test_id === result.test_id);

  // Формируем полный список вопросов для AI, включая пропущенные
  const analysisInput = {
    studentName: result.student_name,
    classNumber: result.class_number,
    percentage: result.percentage,
    totalCorrect: result.total_correct,
    totalQuestions: result.total_questions,
    answers: testQuestions.map(q => {
      const answer = answers.find(a => a.question_id === q.id);
      return {
        questionNumber: q.question_number,
        subject: q.subject,
        questionText: q.question_text,
        studentAnswer: answer?.student_answer || null,
        correctAnswer: q.correct_answer || '',
        isCorrect: answer ? answer.is_correct : false,
        timeSpentSeconds: answer ? answer.time_spent_seconds : 0,
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
    console.error("AI Analysis failed:", error);
    throw error;
  }
}

export async function saveTest(test: Test): Promise<Test> {
  testsStore[test.id] = test;
  return serializeData(test);
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
