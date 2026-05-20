
'use server';

import { 
  StudentResult, 
  Question, 
  StudentAnswer, 
  AntiCheatLog, 
  AIAnalysis 
} from './types';
import { MOCK_TESTS, MOCK_QUESTIONS } from './mock-data';
import { analyzeStudentResult } from '@/ai/flows/admin-ai-result-analysis';

// Use global object to persist data between hot reloads in development
const globalForStore = global as unknown as {
  resultsStore: Record<string, StudentResult>;
  answersStore: Record<string, StudentAnswer[]>;
  logsStore: Record<string, AntiCheatLog[]>;
};

const resultsStore = globalForStore.resultsStore || {};
const answersStore = globalForStore.answersStore || {};
const logsStore = globalForStore.logsStore || {};

if (process.env.NODE_ENV !== 'production') {
  globalForStore.resultsStore = resultsStore;
  globalForStore.answersStore = answersStore;
  globalForStore.logsStore = logsStore;
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
  const test = MOCK_TESTS.find(t => t.id === data.testId);
  
  if (!test) throw new Error('Test not found');

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
    total_questions: MOCK_QUESTIONS[data.testId]?.length || 0,
    percentage: 0,
    total_score: 0,
    started_at: new Date(),
    is_analysed: false,
    anti_cheat_count: 0,
  };

  resultsStore[resultId] = result;
  
  // SECURE DATA FILTER: Remove correct_answer from client payload
  const questions = (MOCK_QUESTIONS[data.testId] || []).map(({ correct_answer, ...q }) => q as Question);

  return { result, questions };
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
  const result = resultsStore[data.resultId];
  if (!result) throw new Error('Result not found');

  const testQuestions = MOCK_QUESTIONS[result.test_id];
  const question = testQuestions.find(q => q.id === data.questionId);
  if (!question) throw new Error('Question not found');

  const studentAnswer: StudentAnswer = {
    id: Math.random().toString(36).substr(2, 9),
    result_id: data.resultId,
    question_id: data.questionId,
    question_number: question.question_number,
    subject: question.subject,
    student_answer: data.answer,
    correct_answer: question.correct_answer,
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
  
  result.status = 'completed';
  result.completed_at = new Date();
  result.total_correct = correctCount;
  result.percentage = Math.round((correctCount / result.total_questions) * 100);
  result.total_score = correctCount * 10;

  return result;
}

export async function analyzeResult(resultId: string) {
  const result = resultsStore[resultId];
  const answers = answersStore[resultId] || [];
  const logs = logsStore[resultId] || [];

  if (!result) throw new Error('Result not found');

  const analysisInput = {
    studentName: result.student_name,
    classNumber: result.class_number,
    percentage: result.percentage,
    totalCorrect: result.total_correct,
    totalQuestions: result.total_questions,
    answers: answers.map(a => {
      const qObj = MOCK_QUESTIONS[result.test_id].find(q => q.id === a.question_id);
      return {
        questionNumber: a.question_number,
        subject: a.subject,
        questionText: qObj?.question_text || "",
        optionA: qObj?.option_a,
        optionB: qObj?.option_b,
        optionC: qObj?.option_c,
        optionD: qObj?.option_d,
        optionE: qObj?.option_e,
        studentAnswer: a.student_answer,
        correctAnswer: a.correct_answer,
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

  return result.ai_analysis;
}

export async function getAllResults() {
  return Object.values(resultsStore);
}

export async function getResultDetail(id: string) {
  const res = resultsStore[id];
  const ans = answersStore[id] || [];
  const logs = logsStore[id] || [];
  return { result: res, answers: ans, logs };
}
