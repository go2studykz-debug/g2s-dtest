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
import { analyzeStudentResult } from '@/ai/flows/admin-ai-result-analysis';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  Firestore,
  query,
  where
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

function getDb(): Firestore {
  const { firestore } = initializeFirebase();
  return firestore;
}

function serializeData<T>(data: T): T {
  if (!data) return data;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.seconds !== undefined && value.nanoseconds !== undefined) {
      return new Date(value.seconds * 1000).toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

export async function ensureSampleData() {
  const db = getDb();
  
  // 1. Тест для 6 класса
  const test1Id = 'test-1';
  try {
    const test1Doc = await getDoc(doc(db, 'tests', test1Id));
    if (!test1Doc.exists()) {
      await setDoc(doc(db, 'tests', test1Id), {
        name: 'Вступительная диагностика НИШ (6 класс)',
        class_number: 6,
        language: 'ru',
        is_active: true,
        total_time_minutes: 60,
        blocks: [
          { subject: 'math', question_count: 3, time_limit_minutes: 30 },
          { subject: 'logic', question_count: 3, time_limit_minutes: 30 }
        ],
        created_at: serverTimestamp()
      });
    }

    // 2. Тест для 4 класса (Русский язык)
    const test4ruId = 'test-4-ru';
    const test4Doc = await getDoc(doc(db, 'tests', test4ruId));
    if (!test4Doc.exists()) {
      await setDoc(doc(db, 'tests', test4ruId), {
        name: 'Диагностика по русскому языку (4 класс)',
        class_number: 4,
        language: 'ru',
        is_active: true,
        total_time_minutes: 45,
        blocks: [
          { subject: 'russian', question_count: 5, time_limit_minutes: 45 }
        ],
        created_at: serverTimestamp()
      });
    }

    // Гарантируем наличие вопросов для 4 класса
    const q4Snap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test4ruId)));
    if (q4Snap.empty) {
      const sampleQs4 = [
        { test_id: test4ruId, question_number: 1, subject: 'russian' as Subject, question_text: 'Выберите слово, в котором пропущена буква "О":', option_a: 'Трава', option_b: 'Гора', option_c: 'Сады', option_d: 'Река', option_e: '', correct_answer: 'B', class_number: 4, language: 'ru' },
        { test_id: test4ruId, question_number: 2, subject: 'russian' as Subject, question_text: 'Укажите существительное 3-го склонения:', option_a: 'Мама', option_b: 'Папа', option_c: 'Дочь', option_d: 'Сын', option_e: '', correct_answer: 'C', class_number: 4, language: 'ru' },
        { test_id: test4ruId, question_number: 3, subject: 'russian' as Subject, question_text: 'В каком слове пишется разделительный мягкий знак?', option_a: 'Подъезд', option_b: 'Вьюга', option_c: 'Объявление', option_d: 'Съезд', option_e: '', correct_answer: 'B', class_number: 4, language: 'ru' },
        { test_id: test4ruId, question_number: 4, subject: 'russian' as Subject, question_text: 'Найдите главные члены предложения: "Осенний лес тихо роняет листву."', option_a: 'Осенний лес', option_b: 'Лес роняет', option_c: 'Роняет листву', option_d: 'Тихо роняет', option_e: '', correct_answer: 'B', class_number: 4, language: 'ru' },
        { test_id: test4ruId, question_number: 5, subject: 'russian' as Subject, question_text: 'Какое слово является проверочным для слова "Тяжёлый"?', option_a: 'Тяжесть', option_b: 'Тяга', option_c: 'Тяжкий', option_d: 'Тянет', option_e: '', correct_answer: 'A', class_number: 4, language: 'ru' }
      ];

      for (const q of sampleQs4) {
        const qId = `q-${test4ruId}-${q.question_number}`;
        await setDoc(doc(db, 'questions', qId), q, { merge: true });
      }
    }
  } catch (error) {
    console.error("Diagnostic data initialization error:", error);
  }
}

export async function getTests(): Promise<Test[]> {
  const db = getDb();
  await ensureSampleData();
  const querySnapshot = await getDocs(collection(db, 'tests'));
  const tests = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return serializeData(tests) as any;
}

export async function getTestById(id: string): Promise<Test | null> {
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'tests', id));
  if (docSnap.exists()) {
    return serializeData({ id: docSnap.id, ...docSnap.data() }) as any;
  }
  return null;
}

export async function getQuestions(classNum?: number, lang?: string): Promise<Question[]> {
  const db = getDb();
  await ensureSampleData();
  const querySnapshot = await getDocs(collection(db, 'questions'));
  let qs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
  
  if (classNum) qs = qs.filter(q => (q as any).class_number === classNum);
  if (lang) qs = qs.filter(q => (q as any).language === lang);
  
  return serializeData(qs.sort((a, b) => a.question_number - b.question_number));
}

export async function startTest(data: {
  testId: string;
  name: string;
  city: string;
  whatsapp: string;
  classNumber: number;
  language: 'kk' | 'ru';
}) {
  const db = getDb();
  await ensureSampleData();
  
  const testsSnapshot = await getDocs(collection(db, 'tests'));
  const targetTest = testsSnapshot.docs.find(d => {
    const t = d.data();
    return t.class_number === data.classNumber && t.language === data.language && t.is_active;
  });

  const testIdToUse = targetTest ? targetTest.id : 'test-1';

  const questionsSnapshot = await getDocs(collection(db, 'questions'));
  const questions = questionsSnapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as Question))
    .filter(q => q.test_id === testIdToUse);

  if (questions.length === 0) {
    throw new Error("Вопросы для выбранного класса и языка еще не добавлены.");
  }

  const resultData = {
    test_id: testIdToUse,
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
    started_at: new Date().toISOString(),
    is_analysed: false,
    anti_cheat_count: 0,
    is_contacted: false,
    is_consulted: false,
  };

  const docRef = await addDoc(collection(db, 'results'), resultData);
  revalidatePath('/admin/dashboard');
  return serializeData({ id: docRef.id, ...resultData });
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
  const db = getDb();
  const qSnap = await getDoc(doc(db, 'questions', data.questionId));
  if (!qSnap.exists()) return;
  const question = qSnap.data() as Question;

  const answerRef = doc(db, 'results', data.resultId, 'answers', data.questionId);
  await setDoc(answerRef, {
    result_id: data.resultId,
    question_id: data.questionId,
    question_number: question.question_number,
    subject: question.subject,
    student_answer: data.answer,
    correct_answer: question.correct_answer || '',
    is_correct: data.answer === question.correct_answer,
    time_spent_seconds: data.timeSpent,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

export async function finishTest(resultId: string): Promise<StudentResult> {
  const db = getDb();
  const resultRef = doc(db, 'results', resultId);
  const resultSnap = await getDoc(resultRef);
  if (!resultSnap.exists()) throw new Error('Result not found');
  
  const answersSnap = await getDocs(collection(db, 'results', resultId, 'answers'));
  const answers = answersSnap.docs.map(d => d.data());
  const correctCount = answers.filter(a => a.is_correct).length;
  
  const totalQuestions = resultSnap.data().total_questions || 0;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  await updateDoc(resultRef, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    total_correct: correctCount,
    percentage: percentage,
    total_score: correctCount * 10
  });

  revalidatePath('/admin/dashboard');
  const finalSnap = await getDoc(resultRef);
  return serializeData({ id: resultId, ...finalSnap.data() }) as any;
}

export async function getResultDetail(id: string) {
  const db = getDb();
  const resultSnap = await getDoc(doc(db, 'results', id));
  if (!resultSnap.exists()) return null;

  const answersSnap = await getDocs(collection(db, 'results', id, 'answers'));
  const logsSnap = await getDocs(collection(db, 'results', id, 'logs'));
  
  const resultData = resultSnap.data();
  
  const questionsSnap = await getDocs(collection(db, 'questions'));
  const questions = questionsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Question))
    .filter(q => q.test_id === resultData.test_id);

  return serializeData({ 
    result: { id: resultSnap.id, ...resultData }, 
    answers: answersSnap.docs.map(d => ({ id: d.id, ...d.data() })), 
    logs: logsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    testQuestions: questions 
  });
}

export async function getAllResults() {
  const db = getDb();
  const qSnapshot = await getDocs(collection(db, 'results'));
  const results = qSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return serializeData(results) as any;
}

export async function updateResultCRM(id: string, updates: { is_contacted?: boolean; is_consulted?: boolean }) {
  const db = getDb();
  await updateDoc(doc(db, 'results', id), updates);
  revalidatePath('/admin/dashboard');
  return { id, ...updates };
}

export async function logAntiCheat(data: {
  resultId: string;
  eventType: 'tab_switch' | 'window_blur';
  questionNumber: number;
  duration: number;
  details: string;
}) {
  const db = getDb();
  const resultRef = doc(db, 'results', data.resultId);
  const resultSnap = await getDoc(resultRef);
  if (!resultSnap.exists() || resultSnap.data().status === 'completed') return;

  await addDoc(collection(db, 'results', data.resultId, 'logs'), {
    result_id: data.resultId,
    event_type: data.eventType,
    question_number: data.questionNumber,
    exit_duration_seconds: data.duration,
    details: data.details,
    created_at: new Date().toISOString(),
  });

  await updateDoc(resultRef, {
    anti_cheat_count: (resultSnap.data().anti_cheat_count || 0) + 1
  });
}

export async function analyzeResult(resultId: string) {
  const detail = await getResultDetail(resultId);
  if (!detail || detail.result.status !== 'completed') throw new Error('Result not ready');

  const analysis = await analyzeStudentResult({
    studentName: detail.result.student_name,
    classNumber: detail.result.class_number,
    percentage: detail.result.percentage,
    totalCorrect: detail.result.total_correct,
    totalQuestions: detail.result.total_questions,
    answers: detail.testQuestions.map((q: any) => {
      const answer = (detail.answers as any[]).find(a => a.question_id === q.id);
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
    antiCheatLogs: (detail.logs as any[]).map(l => ({
      eventType: l.event_type,
      questionNumber: l.question_number,
      exit_duration_seconds: l.exit_duration_seconds,
      details: l.details,
      createdAt: l.created_at,
    })),
  });

  const ai_analysis = { analysis_json: analysis, student_name: detail.result.student_name, class_number: detail.result.class_number, percentage: detail.result.percentage };
  const db = getDb();
  await updateDoc(doc(db, 'results', resultId), { is_analysed: true, ai_analysis: serializeData(ai_analysis) });
  revalidatePath(`/admin/results/${resultId}`);
  return serializeData(ai_analysis);
}

export async function saveTest(test: Test): Promise<Test> {
  const db = getDb();
  const { id, ...data } = test;
  await setDoc(doc(db, 'tests', id), { ...data, updated_at: new Date().toISOString() }, { merge: true });
  revalidatePath('/admin/tests');
  return serializeData(test);
}

export async function saveQuestion(question: Question): Promise<Question> {
  const db = getDb();
  const { id, ...data } = question;
  await setDoc(doc(db, 'questions', id), data, { merge: true });
  return serializeData(question);
}

export async function deleteQuestion(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'questions', id));
}

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  const db = getDb();
  const qSnap = await getDocs(collection(db, 'questions'));
  const questions = qSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Question))
    .filter(q => q.test_id === testId);
  return serializeData(questions.sort((a, b) => a.question_number - b.question_number));
}